import * as cheerio from 'cheerio';
import { SourceProductData, ImportProvider } from './types.ts';
import { normalizeRank, extractFromDescriptionText, formatDailyRateDisplay, cleanScrapedValue, translateMaintenanceToDe, rankToGermanCondition, cleanMaintenanceSnippet } from './internalFields.ts';

export class TsTradingProvider implements ImportProvider {
  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('ts-t.jp');
    } catch {
      return false;
    }
  }

  async fetchData(url: string): Promise<SourceProductData> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch TS Trading page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Try to find Shopify Product JSON and Media
    let shopifyProduct: any = null;
    let rawMedia: { url: string; type: 'PRODUCT_MEDIA' | 'OTHER' }[] = [];

    // Check application/json scripts first as they are most reliable
    $('script[type="application/json"]').each((_, script) => {
      try {
        const content = $(script).html()?.trim() || '';
        // More robust JSON detection: look for product-like structure anywhere in the script
        if (content.includes('"images"') && (content.includes('"title"') || content.includes('"id"'))) {
          try {
            const data = JSON.parse(content);
            const product = data.product || (data.id && data.title ? data : null);
            if (product && product.images) {
              shopifyProduct = product;
              product.images.forEach((img: any) => {
                const src = typeof img === 'string' ? img : img.src;
                if (src) rawMedia.push({ url: src, type: 'PRODUCT_MEDIA' });
              });
              
              if (Array.isArray(product.media)) {
                product.media.forEach((m: any) => {
                  if (m.media_type === 'image' && (m.src || m.preview_image?.src)) {
                    rawMedia.push({ url: m.src || m.preview_image.src, type: 'PRODUCT_MEDIA' });
                  }
                });
              }
            }
          } catch (e) {
            // If direct parse fails, try finding the JSON block
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const data = JSON.parse(match[0]);
                const product = data.product || (data.id && data.title ? data : null);
                if (product && product.images) {
                  shopifyProduct = product;
                  product.images.forEach((img: any) => {
                    const src = typeof img === 'string' ? img : img.src;
                    if (src) rawMedia.push({ url: src, type: 'PRODUCT_MEDIA' });
                  });
                }
              } catch {}
            }
          }
        }
      } catch {}
    });

    $('script').each((_, script) => {
      if (shopifyProduct && rawMedia.length > 5) return; // Already found enough from reliable source
      const content = $(script).html() || '';
      
      // Target the "meta" object which is a Shopify standard for product data
      if (content.includes('var meta = {"product":')) {
        try {
          const searchStr = 'var meta =';
          const startIdx = content.indexOf(searchStr);
          if (startIdx !== -1) {
            const jsonStart = content.indexOf('{', startIdx + searchStr.length);
            if (jsonStart !== -1) {
              let depth = 0;
              let jsonEnd = -1;
              for (let i = jsonStart; i < content.length; i++) {
                if (content[i] === '{') depth++;
                else if (content[i] === '}') {
                  depth--;
                  if (depth === 0) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
              
              if (jsonEnd !== -1) {
                const jsonStr = content.substring(jsonStart, jsonEnd + 1);
                const data = JSON.parse(jsonStr);
                shopifyProduct = data.product;
                
                // Prioritize structured media array which often has type info
                if (Array.isArray(data.product?.media)) {
                  data.product.media.forEach((m: any) => {
                    if (m.media_type === 'image' && m.src) {
                      rawMedia.push({ url: m.src, type: 'PRODUCT_MEDIA' });
                    }
                  });
                }
                
                // Fallback to images array if media was empty or incomplete
                if (Array.isArray(data.product?.images)) {
                  data.product.images.forEach((src: string) => {
                    rawMedia.push({ url: src, type: 'PRODUCT_MEDIA' });
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to parse Shopify meta product data", e);
        }
      }

      // Target Shopify product JSON (often in a script with type="application/json")
      if (content.includes('"id":') && content.includes('"title":') && content.includes('"images":')) {
        try {
          const data = JSON.parse(content);
          if (data.images && Array.isArray(data.images)) {
             data.images.forEach((img: any) => {
               const src = typeof img === 'string' ? img : img.src;
               if (src) rawMedia.push({ url: src, type: 'PRODUCT_MEDIA' });
             });
          }
        } catch {}
      }

      // JSON-LD is another reliable source
      if (content.includes('"@type": "Product"')) {
        try {
          const json = JSON.parse(content);
          const items = Array.isArray(json) ? json : [json];
          items.forEach(item => {
            const product = item['@type'] === 'Product' ? item : item['@graph']?.find((g: any) => g['@type'] === 'Product');
            if (product && product.image) {
              const images = Array.isArray(product.image) ? product.image : [product.image];
              images.forEach((img: string) => rawMedia.push({ url: img, type: 'PRODUCT_MEDIA' }));
            }
          });
        } catch {}
      }
    });

    // 2. Additively check DOM Gallery - Don't use rawMedia.length === 0 check
    const gallerySelectors = [
      '.product-single__media img',
      '.product-main-image img',
      '.product-gallery img',
      '.main-image img',
      '[data-product-single-thumbnail] img',
      '.featured-image',
      '.product-photo-container img',
      '.product-single__photo img',
      '.product-single__thumbnail img',
      '.product__media img',
      '.ProductItem__Image',
      '.grid-view-item__image',
      '.aspect-ratio img'
    ];

    gallerySelectors.forEach(selector => {
      $(selector).each((_, img) => {
        const src = $(img).attr('data-photoswipe-src') || 
                    $(img).attr('data-zoom') || 
                    $(img).attr('data-src') || 
                    $(img).attr('data-image') ||
                    $(img).attr('src');
        if (src) rawMedia.push({ url: src, type: 'OTHER' });
      });
    });

    // 3. Robust Filtering & Normalization
    const EXCLUDED_KEYWORDS = [
      'badge', 'icon', 'arrow', 'pfeil', 'logo', 'payment', 'social', 
      'trust', 'placeholder', 'loading', 'sprite', 'svg', 'ui-asset',
      'theme', 'footer', 'header', 'nav', 'menu', 'breadcrumb', 'chevron',
      'star', 'rating', 'review', 'size-chart', 'check-mark', 'whatsapp',
      'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'line',
      'close', 'search', 'cart', 'account', 'plus', 'minus', 'zoom',
      'btn', 'button', 'selector', 'picker', 'swatch', 'navigation',
      'rank-table', 'rank_table', 'rank-guide', 'condition-rank',
      'rank_a', 'rank_b', 'rank_c', 'rank_s', 'rank_n', 'rank_ab', 'rank_bc'
    ];

    const processedImages = rawMedia
      .map(item => {
        let src = item.url;
        // Normalize URL
        let fullUrl = src.startsWith('//') ? `https:${src}` : src;
        try {
          // Remove Shopify image size suffixes to get original high-res
          const cleanUrl = fullUrl.replace(/(_\d+x\d+|_compact|_medium|_large|_grande|_1024x1024|_2048x2048|_master|_\d+x)\./g, '.');
          
          const urlObj = new URL(cleanUrl, url);
          if (urlObj.searchParams.has('width')) {
            urlObj.searchParams.set('width', '2048');
          }
          
          return { url: urlObj.toString(), type: item.type };
        } catch {
          return null;
        }
      })
      .filter((item): item is { url: string; type: 'PRODUCT_MEDIA' | 'OTHER' } => {
        if (!item || !item.url) return false;
        
        // Normalize for deduplication comparison (ignore query params)
        const normalizedUrl = item.url.split('?')[0].toLowerCase();
        
        // Exclude specific Rank images and tables
        const rankPatterns = ['/rank_', '/rank-', 'rank-table', 'rank_table', 'condition_rank', 'condition-rank', 'rank_guide'];
        if (rankPatterns.some(p => normalizedUrl.includes(p))) return false;

        // Exclude known non-product keywords
        if (EXCLUDED_KEYWORDS.some(kw => normalizedUrl.includes(kw))) return false;
        
        // Exclude specific system/theme patterns
        if (normalizedUrl.includes('/assets/') || 
            normalizedUrl.includes('/theme/') || 
            normalizedUrl.includes('/ui/') ||
            normalizedUrl.includes('favicon')) return false;

        // Special check for Rank images that might be in /files/ or /products/
        if (normalizedUrl.includes('rank') && (normalizedUrl.includes('.png') || normalizedUrl.includes('.jpg'))) {
          // Check if it's a specific rank icon (usually small or named like rank_a.png)
          if (/(rank[_-][ansb]|rank[_-]ab|rank[_-]bc)\./i.test(normalizedUrl)) return false;
        }

        // If it's explicitly identified as PRODUCT_MEDIA from structured data, trust it
        if (item.type === 'PRODUCT_MEDIA') return true;

        // Otherwise apply inclusion for scraped images
        const isShopifyCdn = item.url.includes('cdn.shopify.com');
        const isProductDir = item.url.includes('/products/') || (item.url.includes('/files/') && !normalizedUrl.includes('logo'));
        
        return isShopifyCdn && isProductDir;
      });

    // Final deduplication while preserving order and high-res versions
    const finalImages: string[] = [];
    const seenNormalized = new Set<string>();
    processedImages.forEach(item => {
      const normalized = item.url.split('?')[0];
      if (!seenNormalized.has(normalized)) {
        finalImages.push(item.url);
        seenNormalized.add(normalized);
      }
    });

    // Diagnostics as requested
    const diag = {
      TOTAL_SOURCE_MEDIA: rawMedia.length,
      SOURCE_IMAGES: rawMedia.filter(m => m.type === 'PRODUCT_MEDIA').length,
      PRODUCT_IMAGES_ACCEPTED: processedImages.length,
      FINAL_PRODUCT_IMAGES: finalImages.length,
      SELECTED_IMAGES: finalImages.length, // Assume all selected by default in provider
    };
    console.log("Import Diagnostics:", diag);

    // 4. Extract Product Info
    let name = shopifyProduct?.title || shopifyProduct?.name || $('h1').first().text().trim() || 'TS Trading Product';
    
    // Specs from tables with Japanese key mapping
    const specs: Record<string, string> = {};
    const keyMap: Record<string, string> = {
      'ブランド': 'Brand',
      'モデル': 'Model',
      '型番': 'Product Number',
      'シリアル': 'Serial Number',
      '文字盤': 'Dial Color',
      '素材': 'Material',
      'ケースサイズ': 'Case Size',
      '腕周り': 'Bracelet Size',
      'ムーブメント': 'Movement',
      '付属品': 'Accessories',
      '商品ランク': 'Overall Rank',
      'ケースランク': 'Case Rank',
      'ベルトランク': 'Band Rank',
      'バンドランク': 'Band Rank',
      '日差': 'Daily Rate',
      'メンテナンス情報': 'Maintenance Info',
      '備考': 'Remarks',
      'リマーク': 'Remarks',
      '製造年': 'Year',
      'ランク': 'Overall Rank',
      '商品番号': 'Product Number',
      '状態': 'Condition'
    };

    const setSpec = (key: string, val: string) => {
      const cleaned = cleanScrapedValue(val);
      if (cleaned && cleaned !== key) specs[key] = cleaned;
    };

    $('table tr, .product-spec tr, .spec-table tr').each((_, tr) => {
      const keyRaw = $(tr).find('th, td:first-child').text().trim().replace(/[:：]$/, '');
      const val = $(tr).find('td:last-child').text().trim();
      if (keyRaw && val && keyRaw !== val) {
        const mappedKey = keyMap[keyRaw] || keyRaw;
        setSpec(mappedKey, val);
      }
    });

    // dl/dt/dd spec lists (common on Shopify themes)
    $('dl').each((_, dl) => {
      $(dl).find('dt').each((_, dt) => {
        const keyRaw = $(dt).text().trim().replace(/[:：]$/, '');
        const val = $(dt).next('dd').text().trim();
        if (keyRaw && val) {
          const mappedKey = keyMap[keyRaw] || keyRaw;
          if (!specs[mappedKey]) setSpec(mappedKey, val);
        }
      });
    });

    // Shopify product body_html often contains the full spec table
    if (shopifyProduct?.body_html) {
      const $body = cheerio.load(shopifyProduct.body_html);
      $body('table tr').each((_, tr) => {
        const keyRaw = $body(tr).find('th, td:first-child').text().trim().replace(/[:：]$/, '');
        const val = $body(tr).find('td:last-child').text().trim();
        if (keyRaw && val && keyRaw !== val) {
          const mappedKey = keyMap[keyRaw] || keyRaw;
          if (!specs[mappedKey]) setSpec(mappedKey, val);
        }
      });
      $body('dl dt').each((_, dt) => {
        const keyRaw = $body(dt).text().trim().replace(/[:：]$/, '');
        const val = $body(dt).next('dd').text().trim();
        if (keyRaw && val) {
          const mappedKey = keyMap[keyRaw] || keyRaw;
          if (!specs[mappedKey]) setSpec(mappedKey, val);
        }
      });
    }

    // If name is generic, try to construct a better one from specs immediately
    const genericTerms = ['product', 'item', 'watch', 'uhr', 'trading', 'ts'];
    const isNameGeneric = !name || name === 'TS Trading Product' || genericTerms.some(term => name.toLowerCase().includes(term) && name.split(' ').length <= 2);
    
    if (isNameGeneric) {
      const brand = specs['Brand'] || specs['Marke'] || '';
      const model = specs['Model'] || specs['Modell'] || '';
      const ref = specs['Product Number'] || specs['Ref No.'] || specs['Ref.'] || '';
      const constructed = [brand, model, ref].filter(Boolean).join(' ').trim();
      if (constructed.length > 5) {
        name = constructed;
      }
    }

    const description = shopifyProduct?.description || $('div.description, .product-details, #description').text().trim();

    // Capture "Remarks", "Details", "Maintenance" from divs if not in table
    const detailSections = $('.product-description, .product-details, #description, .details');
    const fullDescription = [
      detailSections.text().trim(),
      shopifyProduct?.body_html ? cheerio.load(shopifyProduct.body_html).text().trim() : '',
      description,
    ].filter(Boolean).join('\n');

    const fromText = extractFromDescriptionText(fullDescription);
    
    // Attempt to extract specific fields from text if not in specs
    const remarksMatch = fullDescription.match(/(?:Remarks|Details|Condition Notes|備考|リマーク)[：:\s]*(.*?)(?:\n|$)/i);
    const maintenanceMatch = fullDescription.match(/(?:Maintenance|Overhaul|Repair|メンテナンス(?:情報)?|Wartung)[：:\s]*(.*?)(?:\n|$)/i);
    const dailyRateMatch = fullDescription.match(/(?:Daily rate|Timing|Accuracy|日差|Gangabweichung)[：:\s]*(.*?)(?:\n|$)/i);

    const conditionRemarks = cleanScrapedValue(specs['Remarks'] || specs['Condition Details'] || fromText.conditionRemarks || remarksMatch?.[1] || '');
    const maintenanceDescription = cleanMaintenanceSnippet(
      specs['Maintenance Info'] || specs['Maintenance'] || fromText.maintenanceDescription || maintenanceMatch?.[1] || ''
    ) || translateMaintenanceToDe(specs['Maintenance Info'] || specs['Maintenance'] || maintenanceMatch?.[1] || '');
    const dailyRateDisplay = formatDailyRateDisplay(
      specs['Daily Rate'] || fromText.dailyRateDisplay || dailyRateMatch?.[1] || specs['Timing accuracy'] || ''
    );

    // Special handling for TS Trading specific fields (ranks only — no JP prose)
    const caseRank = normalizeRank(specs['Case Rank'] || fromText.caseRank || '');
    const bandRank = normalizeRank(specs['Band Rank'] || fromText.bandRank || '') || caseRank;
    const overallRank = normalizeRank(specs['Overall Rank'] || fromText.overallRank || '') || caseRank || bandRank;
    const sourceRank = overallRank || caseRank;
    const sourceCondition =
      rankToGermanCondition(sourceRank) ||
      rankToGermanCondition(caseRank) ||
      cleanScrapedValue(specs['Condition']) ||
      "";

    // Price handling
    let price = '';
    let currency = 'JPY';

    // Extract Variant ID from URL if possible
    const urlObj = new URL(url);
    const variantId = urlObj.searchParams.get('variant');

    // Try to get price from Shopify product data (comes in cents)
    if (shopifyProduct?.variants) {
      const variants = Array.isArray(shopifyProduct.variants) ? shopifyProduct.variants : [];
      let variant = null;
      
      if (variantId) {
        variant = variants.find((v: any) => v.id?.toString() === variantId);
      }
      
      // Fallback to first variant if not found or no variant specified
      if (!variant) variant = variants[0];
      
      if (variant?.price) {
        price = (variant.price / 100).toString();
      }
    }

    if (!price) {
      const priceText = $('.price, .product-price, [data-product-price]').first().text().trim();
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) price = priceMatch[0].replace(/,/g, '');
    }

    const finalVariantId = variantId || shopifyProduct?.variants?.[0]?.id?.toString();

    return {
      name,
      description,
      images: finalImages,
      specs,
      price,
      currency,
      sku: shopifyProduct?.sku || specs['Product Number'] || specs['Ref No.'] || specs['Product No.'],
      provider: 'TS TRADING',
      url,
      variantId: finalVariantId || undefined,
      sourceProductId: shopifyProduct?.id?.toString() || url.split('/').pop()?.split('?')[0],
      diagnostics: diag,
      metadata: {
        caseRank,
        bandRank,
        overallRank,
        sourceRank,
        sourceCondition,
        conditionRemarks,
        maintenanceDescription,
        dailyRateDisplay,
        variantId: finalVariantId,
        shopifyProductId: shopifyProduct?.id?.toString(),
        fullDescription
      }
    };
  }
}
