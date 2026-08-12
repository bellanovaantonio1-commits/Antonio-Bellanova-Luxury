import { ImportProvider, SourceProductData } from './types.ts';
import { TsTradingProvider } from './TsTradingProvider.ts';
import { analyzeProductImport } from '../../lib/gemini.ts';

export class ImportService {
  private providers: ImportProvider[] = [];

  constructor() {
    this.providers.push(new TsTradingProvider());
  }

  async analyzeUrl(url: string) {
    // 1. SSRF and Domain Protection
    this.validateUrl(url);

    // 2. Find Provider
    const provider = this.providers.find(p => p.canHandle(url));
    if (!provider) {
      throw new Error("No provider found for this URL. Currently supporting: ts-t.jp");
    }

    // 3. Fetch Raw Data
    const rawData = await provider.fetchData(url);

    // 4. AI Analysis & Generation
    let analysis;
    try {
      analysis = await analyzeProductImport(rawData);
      
      // Safety check: if AI returns successfully but extractedData is missing
      if (!analysis || !analysis.extractedData) {
        throw new Error("AI response missing extracted data");
      }
    } catch (e: any) {
      console.error("AI Analysis failed, using enhanced fallback logic:", e);
      
      const hasJapanese = (text: string) => /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
      
      const stripHtml = (html: string) => {
        if (!html) return "";
        return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      };

      const brand = rawData.specs?.['Brand'] || rawData.specs?.['Marke'] || '';
      const model = rawData.specs?.['Model'] || rawData.specs?.['Modell'] || '';
      const sku = rawData.sku || rawData.specs?.['Ref No.'] || rawData.specs?.['Product No.'] || '';
      
      // Clean HTML from description even in fallback
      let cleanDescription = stripHtml(rawData.description || "");
      if (hasJapanese(cleanDescription)) {
        cleanDescription = "Details are available in the source data. Please review manually.";
      }
      
      // Construct a descriptive name if the original is too generic or in Japanese
      let displayName = stripHtml(rawData.name || "");
      const genericTerms = ['product', 'item', 'watch', 'uhr', 'trading', 'ts'];
      const isGeneric = !displayName || hasJapanese(displayName) || genericTerms.some(term => displayName.toLowerCase().includes(term) && displayName.split(' ').length <= 3);
      
      if (isGeneric) {
        const parts = [brand, model, sku].filter(Boolean).filter(p => !hasJapanese(p));
        if (parts.length >= 2) {
          displayName = parts.join(' ').trim();
        } else if (parts.length === 1) {
          displayName = parts[0];
        } else {
          displayName = "Luxury Watch " + (sku || "");
        }
      }

      analysis = {
        extractedData: {
          name: displayName,
          brand: hasJapanese(brand) ? "" : brand,
          model: hasJapanese(model) ? "" : model,
          sku: sku,
          year: rawData.specs?.['Year'] || rawData.specs?.['Jahr'] || rawData.specs?.['Manufacture Year'] || '',
          price: rawData.price,
          currency: rawData.currency,
          conditionGroup: rawData.metadata?.sourceCondition?.includes('Rank N') ? 'NEW' : 
                          rawData.metadata?.sourceCondition?.includes('Rank S') ? 'UNUSED' : 'PRE_OWNED',
          sourceCondition: rawData.metadata?.sourceCondition,
          sourceRank: (rawData.metadata?.caseRank || rawData.metadata?.overallRank) || '',
          caseRank: rawData.metadata?.caseRank || '',
          bandRank: rawData.metadata?.bandRank || '',
          overallRank: rawData.metadata?.overallRank || '',
          conditionRemarks: hasJapanese(rawData.metadata?.conditionRemarks || "") ? "" : rawData.metadata?.conditionRemarks,
          maintenanceDescription: hasJapanese(rawData.metadata?.maintenanceDescription || "") ? "" : rawData.metadata?.maintenanceDescription,
          maintenancePerformed: !!rawData.metadata?.maintenanceDescription,
          dailyRateDisplay: rawData.metadata?.dailyRateDisplay,
          specifications: rawData.specs || {}
        },
        confidence: {
          name: "LOW",
          price: "MEDIUM",
          sku: "MEDIUM"
        },
        contentDe: { 
          title: displayName, 
          description: cleanDescription,
          conditionText: "Zustand siehe Quellseite."
        },
        contentEn: { 
          title: displayName, 
          description: cleanDescription,
          conditionText: "Condition see source website."
        }
      };
    }

    // Final result reconstruction with guaranteed fields
    const finalResult = {
      source: rawData,
      analysis: analysis.extractedData,
      confidence: analysis.confidence || {},
      contentDe: analysis.contentDe || { title: rawData.name, description: rawData.description },
      contentEn: analysis.contentEn || { title: rawData.name, description: rawData.description },
      diagnostics: rawData.diagnostics
    };

    // DOUBLE CHECK: If for any reason analysis or source is missing, fix it here
    if (!finalResult.analysis) {
        finalResult.analysis = { name: rawData.name, sku: rawData.sku, price: rawData.price, currency: rawData.currency };
    }

    return finalResult;
  }

  private validateUrl(url: string) {
    try {
      const parsed = new URL(url);
      
      // Block common SSRF targets
      const blockedHosts = ['localhost', '127.0.0.1', 'metadata.google.internal', '169.254.169.254'];
      if (blockedHosts.includes(parsed.hostname)) {
        throw new Error("Invalid URL: Host not allowed");
      }

      if (parsed.protocol !== 'https:') {
        throw new Error("Invalid URL: Only HTTPS allowed");
      }
    } catch (e: any) {
      throw new Error(e.message || "Invalid URL");
    }
  }
}

export const importService = new ImportService();
