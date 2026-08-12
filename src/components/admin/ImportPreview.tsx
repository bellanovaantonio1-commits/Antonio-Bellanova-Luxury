import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Check, X, AlertTriangle, RefreshCw, Sparkles, Loader2,
  ChevronRight, Save, Image as ImageIcon, Calculator,
  Globe, Info, Package, ShieldCheck, Tag, Zap, Search,
  Settings, Languages, Clock, Truck, Euro, Star, Wrench, Activity
} from "lucide-react";
import { auth, db } from "../../lib/firebase.ts";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { calculatePricing, PricingResult } from "../../lib/pricing.ts";

const RANK_MAP: Record<string, { de: string; en: string }> = {
  N: { de: "Neu", en: "New" },
  S: { de: "Ungetragen", en: "Unused" },
  SA: { de: "Exzellent", en: "Excellent" },
  A: { de: "Sehr Gut", en: "Very Good" },
  AB: { de: "Gut", en: "Good" },
  B: { de: "Gebraucht", en: "Used" },
  QS: { de: "Exzellent (Vintage)", en: "Excellent (Vintage)" },
  QA: { de: "Sehr Gut (Vintage)", en: "Very Good (Vintage)" },
  QB: { de: "Gut (Vintage)", en: "Good (Vintage)" },
  QC: { de: "Gebraucht (Vintage)", en: "Used (Vintage)" },
};

function sanitizeContent(text: string): string {
  if (!text) return "";
  // Patterns to remove
  const patterns = [
    /\(?Rang [A-Z]{1,2}\)?/gi,
    /\(?Rank [A-Z]{1,2}\)?/gi,
    /Case Rank [A-Z]{1,2}/gi,
    /Band Rank [A-Z]{1,2}/gi,
    /Overall Rank [A-Z]{1,2}/gi,
    /TS Rank [A-Z]{1,2}/gi,
    /\([A-Z]{1,2}\)/g // Matches (A), (AB), etc. at end of sentences
  ];
  
  let cleaned = text;
  patterns.forEach(p => {
    cleaned = cleaned.replace(p, "");
  });
  
  // Clean up double spaces or trailing dots/spaces left after removal
  return cleaned.replace(/\s\s+/g, ' ').replace(/\s\./g, '.').trim();
}

interface ImportPreviewProps {
  data: any;
  onSave: (finalData: any) => void;
  onCancel: () => void;
}

export default function ImportPreview({ data, onSave, onCancel }: ImportPreviewProps) {
  const [formData, setFormData] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("product");
  const [pricingResults, setPricingResults] = useState<PricingResult | null>(null);

  useEffect(() => {
    if (data && data.analysis) {
      const isTsTrading = data.source?.provider === "TS TRADING";
      const internalRank = data.analysis.overallRank || data.analysis.sourceRank || "";
      const mappedCondition = isTsTrading ? RANK_MAP[internalRank] : null;

      const initialFormData = {
        ...data.analysis,
        name: data.analysis.name || data.source?.name || "",
        brand: data.analysis.brand || "",
        model: data.analysis.model || "",
        sku: data.analysis.sku || data.source?.sku || "",
        year: data.analysis.year || "",
        descriptionDe: data.contentDe?.description || "",
        descriptionEn: data.contentEn?.description || "",
        shortDescriptionDe: data.contentDe?.shortDescription || "",
        shortDescriptionEn: data.contentEn?.shortDescription || "",
        titleDe: data.contentDe?.title || "",
        titleEn: data.contentEn?.title || "",
        conditionDe: data.contentDe?.conditionText || "",
        conditionEn: data.contentEn?.conditionText || "",
        specificationsDe: data.contentDe?.specificationsText || "",
        specificationsEn: data.contentEn?.specificationsText || "",
        scopeOfDeliveryDe: data.contentDe?.scopeOfDelivery || "",
        scopeOfDeliveryEn: data.contentEn?.scopeOfDelivery || "",
        seoTitleDe: data.contentDe?.seoTitle || "",
        seoDescriptionDe: data.contentDe?.seoDescription || "",
        seoTitleEn: data.contentEn?.seoTitle || "",
        seoDescriptionEn: data.contentEn?.seoDescription || "",
        
        // Detailed Condition
        conditionGroup: data.analysis.conditionGroup || "PRE_OWNED",
        sourceCondition: data.analysis.sourceCondition || "",
        sourceRank: data.analysis.sourceRank || data.analysis.overallRank || "",
        caseRank: data.analysis.caseRank || "",
        bandRank: data.analysis.bandRank || "",
        overallRank: data.analysis.overallRank || "",
        conditionRemarks: data.analysis.conditionRemarks || "",
        maintenancePerformed: data.analysis.maintenancePerformed || false,
        maintenanceDescription: data.analysis.maintenanceDescription || "",
        dailyRateSeconds: data.analysis.dailyRateSeconds || 0,
        dailyRateDisplay: data.analysis.dailyRateDisplay || "",

        // Pricing Inputs
        purchasePriceOriginal: data.analysis.price || 0,
        purchaseCurrency: data.analysis.currency || "EUR",
        exchangeRate: data.analysis.currency === "JPY" ? 0.0063 : 1.0,
        purchasePriceEur: data.analysis.currency === "JPY" ? ((data.analysis.price || 0) * 0.0063).toFixed(2) : (data.analysis.price || 0),
        shippingCost: 80,
        insuranceCost: 50,
        originCountry: data.analysis.currency === "JPY" ? "JP" : "DE",
        dispatchCountry: data.analysis.currency === "JPY" ? "JP" : "DE",
        destinationCountry: "DE",
        type: data.analysis.type === "WATCH" ? "WATCH" : "JEWELRY",
        hsCode: "",
        customsRatePercent: undefined, // Let engine decide or manual
        manualCustomsAmountEur: undefined, // Total override
        customsBrokerFee: 30,
        customsClearanceFee: 0,
        otherImportCosts: 0,
        taxTreatment: "CHECK",
        isInputTaxDeductible: true,
        taxRatePercent: 19,
        pricingMode: "MARGIN",
        targetMarginPercent: 23,
        manualGrossSalePrice: 0,
        
        sourceUrl: data.source?.url || "",
        sourceProvider: data.source?.provider || "TS TRADING",
        sourceProductId: data.source?.sourceProductId,
        sourceVariantId: data.source?.variantId,
        sourceData: data.source,
        status: "DRAFT",
      };

      setFormData(initialFormData);
      const allImages = data.source?.images || [];
      setSelectedImages(allImages);
      setMainImage(allImages[0] || null);
    }
  }, [data]);

  // Pricing Calculation Effect
  useEffect(() => {
    if (formData?.purchasePriceOriginal && formData?.exchangeRate) {
      const eur = (parseFloat(formData.purchasePriceOriginal) * parseFloat(formData.exchangeRate)).toFixed(2);
      // Only auto-update if it's the first time or we just changed the original inputs
      setFormData(prev => ({ ...prev, purchasePriceEur: eur }));
    }
  }, [formData?.purchasePriceOriginal, formData?.exchangeRate]);

  // Pricing Calculation Effect
  useEffect(() => {
    if (formData) {
      const results = calculatePricing({
        purchasePriceOriginal: parseFloat(formData.purchasePriceOriginal) || 0,
        purchaseCurrency: formData.purchaseCurrency || "JPY",
        exchangeRate: parseFloat(formData.exchangeRate) || 0.0063,
        purchasePriceEur: parseFloat(formData.purchasePriceEur) || 0,
        shippingCost: parseFloat(formData.shippingCost) || 0,
        insuranceCost: parseFloat(formData.insuranceCost) || 0,
        originCountry: formData.originCountry || "JP",
        dispatchCountry: formData.dispatchCountry || "JP",
        destinationCountry: "DE",
        type: formData.type || (data.analysis.type === "WATCH" ? "WATCH" : "JEWELRY"),
        material: formData.material,
        movement: formData.movement,
        hsCode: formData.hsCode,
        customsRatePercent: formData.customsRatePercent !== undefined && formData.customsRatePercent !== "" ? parseFloat(formData.customsRatePercent) : null,
        manualCustomsAmountEur: formData.manualCustomsAmountEur !== undefined && formData.manualCustomsAmountEur !== "" ? parseFloat(formData.manualCustomsAmountEur) : null,
        customsBrokerFee: parseFloat(formData.customsBrokerFee) || 0,
        customsClearanceFee: parseFloat(formData.customsClearanceFee) || 0,
        otherImportCosts: parseFloat(formData.otherImportCosts) || 0,
        taxTreatment: formData.taxTreatment || "MARGIN",
        isInputTaxDeductible: formData.isInputTaxDeductible !== undefined ? formData.isInputTaxDeductible : true,
        taxRatePercent: parseFloat(formData.taxRatePercent) || 19,
        calculationMode: formData.pricingMode === "MANUAL" ? "SALE_PRICE" : "MARGIN",
        targetMarginPercent: parseFloat(formData.targetMarginPercent) || 23,
        manualGrossSalePrice: parseFloat(formData.manualGrossSalePrice) || 0
      });
      
      setPricingResults(results);
      
      // Update form price if in margin mode to reflect the target price
      if (formData.pricingMode === "MARGIN" && results) {
        setFormData(prev => ({
          ...prev,
          price: !isNaN(results.grossSalePrice) ? results.grossSalePrice.toFixed(2) : "0.00",
          actualMargin: !isNaN(results.effectiveMarginPercent) ? results.effectiveMarginPercent.toFixed(2) : "0",
          actualProfit: !isNaN(results.profitEur) ? results.profitEur.toFixed(2) : "0"
        }));
      }
    }
  }, [
    formData?.purchasePriceOriginal, formData?.purchasePriceEur, formData?.exchangeRate, 
    formData?.shippingCost, formData?.insuranceCost, formData?.originCountry,
    formData?.hsCode, formData?.customsRatePercent, formData?.manualCustomsAmountEur, formData?.customsBrokerFee, 
    formData?.customsClearanceFee, formData?.otherImportCosts, formData?.targetMarginPercent, 
    formData?.taxTreatment, formData?.pricingMode, formData?.manualGrossSalePrice,
    formData?.isInputTaxDeductible, formData?.taxRatePercent
  ]);

  // Handle Manual Price Change
  const handleManualPriceChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      manualGrossSalePrice: parseFloat(value) || 0,
      price: value // Keep legacy price field in sync for UI
    }));
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (overrideStatus?: string, overwrite = false) => {
    const targetStatus = overrideStatus || formData.status;
    const errors = getValidationErrors();
    
    // Strict validation for publication
    if (targetStatus === "PUBLISHED" && errors.length > 0) {
      setSaveError(`Veröffentlichung nicht möglich: ${errors[0]} (und ${errors.length - 1} weitere Fehler)`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // Map form fields to schema fields
      const mappedData = {
        ...formData,
        overwrite,
        currency: "EUR",
        status: overrideStatus || formData.status,
        images: selectedImages,
        mainImage,
        
        // Final calculation results from state
        landedCost: pricingResults?.landedCost,
        purchasePriceEur: pricingResults?.purchasePriceEur,
        customsAmountEur: pricingResults?.customsAmountEur,
        importVatEur: pricingResults?.importVatEur,
        netSalePrice: pricingResults?.netSalePrice,
        grossSalePrice: pricingResults?.grossSalePrice,
        price: pricingResults?.grossSalePrice, // Map to main price field for customer view
        profitEur: pricingResults?.profitEur,
        effectiveMarginPercent: pricingResults?.effectiveMarginPercent,
        taxAmount: pricingResults?.taxAmountEur, // for backward compatibility
        
        // Ensure all pricing inputs are saved
        purchasePriceOriginal: parseFloat(formData.purchasePriceOriginal),
        purchaseCurrency: formData.purchaseCurrency,
        exchangeRate: parseFloat(formData.exchangeRate),
        shippingCost: parseFloat(formData.shippingCost),
        insuranceCost: parseFloat(formData.insuranceCost),
        type: formData.type,
        customsRatePercent: formData.customsRatePercent !== undefined && formData.customsRatePercent !== "" ? parseFloat(formData.customsRatePercent) : pricingResults?.customsRateInfo?.rate,
        manualCustomsAmountEur: formData.manualCustomsAmountEur !== undefined && formData.manualCustomsAmountEur !== "" ? parseFloat(formData.manualCustomsAmountEur) : pricingResults?.customsAmountEur,
        customsBrokerFee: parseFloat(formData.customsBrokerFee),
        customsClearanceFee: parseFloat(formData.customsClearanceFee),
        otherImportCosts: parseFloat(formData.otherImportCosts),
        targetMarginPercent: parseFloat(formData.targetMarginPercent),
        manualGrossSalePrice: parseFloat(formData.manualGrossSalePrice),
        taxRatePercent: parseFloat(formData.taxRatePercent),
        isInputTaxDeductible: formData.isInputTaxDeductible,
        taxTreatment: formData.taxTreatment,
        hsCode: formData.hsCode || pricingResults?.customsRateInfo?.hsCode
      };

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Nicht authentifiziert");

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(mappedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setSaveError("Dieses Produkt existiert bereits.");
          return;
        }
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      const result = await response.json();
      onSave(result);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (field: string) => {
    const level = data.confidence?.[field] || "LOW";
    if (level === "HIGH") return "text-green-500 bg-green-50";
    if (level === "MEDIUM") return "text-orange-500 bg-orange-50";
    return "text-red-500 bg-red-50";
  };

  const SectionHeader = ({ title, icon: Icon, badge }: any) => (
    <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
          <Icon size={18} className="text-[#D4AF37]" />
        </div>
        <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-900">{title}</h3>
      </div>
      {badge && (
        <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest rounded-full">
          {badge}
        </span>
      )}
    </div>
  );

  const InputField = ({ label, value, onChange, confidence, placeholder, type = "text", rows }: any) => {
    // If value is a rank code, display the mapped word
    const displayValue = (value && typeof value === 'string' && RANK_MAP[value]) ? RANK_MAP[value].de : (value || "");
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>
          {confidence && (
            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${getConfidenceColor(confidence)}`}>
              {data.confidence?.[confidence] || "LOW"}
            </span>
          )}
        </div>
        {rows ? (
          <textarea
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] focus:bg-white transition-all shadow-inner resize-none"
          />
        ) : (
          <input
            type={type}
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] focus:bg-white transition-all shadow-inner"
          />
        )}
      </div>
    );
  };

  const hasJapanese = (text: string) => /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);

  const getValidationErrors = () => {
    const errors = [];
    
    // Required Localized Fields
    if (!formData.titleDe || formData.titleDe.trim() === "") errors.push("Titel (DE) ist erforderlich");
    if (!formData.titleEn || formData.titleEn.trim() === "") errors.push("Title (EN) is required");
    if (!formData.descriptionDe || formData.descriptionDe.trim() === "") errors.push("Beschreibung (DE) ist erforderlich");
    if (!formData.descriptionEn || formData.descriptionEn.trim() === "") errors.push("Description (EN) is required");
    
    // Japanese Text Detection
    if (formData.titleDe && hasJapanese(formData.titleDe)) errors.push("Titel (DE) enthält japanische Schriftzeichen");
    if (formData.titleEn && hasJapanese(formData.titleEn)) errors.push("Title (EN) contains Japanese characters");
    if (formData.descriptionDe && hasJapanese(formData.descriptionDe)) errors.push("Beschreibung (DE) enthält japanische Schriftzeichen");
    if (formData.descriptionEn && hasJapanese(formData.descriptionEn)) errors.push("Description (EN) contains Japanese characters");
    if (formData.conditionDe && hasJapanese(formData.conditionDe)) errors.push("Zustand (DE) enthält japanische Schriftzeichen");
    if (formData.conditionEn && hasJapanese(formData.conditionEn)) errors.push("Condition (EN) contains Japanese characters");
    if (formData.brand && hasJapanese(formData.brand)) errors.push("Marke enthält japanische Schriftzeichen");
    if (formData.model && hasJapanese(formData.model)) errors.push("Modell enthält japanische Schriftzeichen");

    // Image Validation
    if (selectedImages.length === 0) {
      errors.push("Mindestens ein Produktbild muss ausgewählt sein");
    }
    if (!mainImage && selectedImages.length > 0) {
      errors.push("Bitte legen Sie ein Hauptbild fest");
    }

    return errors;
  };

  const validationErrors = formData ? getValidationErrors() : [];

  if (!data || !data.analysis || !data.source) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6 bg-white rounded-3xl border border-gray-100 shadow-xl">
        <div className="p-4 bg-red-50 rounded-full">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-900">Analyse unvollständig</p>
          <p className="text-[11px] text-gray-500 max-w-xs mx-auto">Die Daten konnten nicht vollständig extrahiert werden. Bitte versuchen Sie es erneut oder nutzen Sie den manuellen Modus.</p>
        </div>
        <button 
          onClick={onCancel}
          className="px-8 py-3 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
        >
          Zurück zum Import
        </button>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Bereite Analyse vor...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif tracking-tight text-gray-900">Import-Vorschau</h2>
          <div className="flex items-center gap-3 mt-3">
            <span className="px-3 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Admin Preview</span>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em]">Überprüfung der extrahierten Daten</p>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-5 bg-orange-50 rounded-2xl border border-orange-200 space-y-3 shadow-lg">
          <div className="flex items-center gap-3 text-orange-700">
            <AlertTriangle size={20} />
            <p className="text-[11px] font-black uppercase tracking-wider">Übersetzungswarnungen ({validationErrors.length})</p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-[10px] text-orange-600 flex items-center gap-2">
                <span className="w-1 h-1 bg-orange-400 rounded-full" />
                {err}
              </li>
            ))}
          </ul>
          <p className="text-[9px] text-orange-500 italic mt-2">Hinweis: Japanische Texte dürfen nicht im Shop veröffentlicht werden. Bitte übersetzen Sie diese manuell oder prüfen Sie die Extraktion.</p>
        </div>
      )}

      {saveError && (
        <div className="p-5 bg-red-50 rounded-2xl border border-red-200 flex items-center justify-between text-red-700 shadow-lg animate-in shake duration-500">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-wider">{saveError}</p>
              {saveError !== "Dieses Produkt existiert bereits." && (
                <p className="text-[10px] opacity-70">Bitte korrigieren Sie die markierten Felder.</p>
              )}
            </div>
          </div>
          {saveError === "Dieses Produkt existiert bereits." && (
            <div className="flex gap-2">
              <Link to="/admin/products" className="px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                Bestehendes Produkt öffnen
              </Link>
              <button 
                onClick={() => handleSave(undefined, true)}
                className="px-4 py-2 bg-[#D4AF37] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#C19B2E] transition-all shadow-md"
              >
                Bestehendes aktualisieren
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 space-y-12">
          {/* Section 1: Source */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#D4AF37]" />
            <SectionHeader title="Quelle & Analyse" icon={Globe} badge={formData.sourceProvider} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-400">Anbieter</span>
                <p className="text-[15px] font-black text-gray-900 flex items-center gap-2">
                  <Truck size={14} className="text-[#D4AF37]" />
                  {formData.sourceProvider}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-400">Quell-URL</span>
                <a href={formData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#D4AF37] font-bold truncate underline underline-offset-4 hover:text-[#C19B2E] transition-colors flex items-center gap-2">
                  <Search size={14} />
                  {formData.sourceUrl}
                </a>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-400">Produkt-ID</span>
                <p className="text-[13px] font-bold text-gray-900 font-mono">#{data.source.sourceProductId || data.source.sku}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-400">Variant-ID</span>
                <p className="text-[13px] font-bold text-gray-900 font-mono">{data.source.variantId || "N/A"}</p>
              </div>
            </div>
          </section>

          {/* Section 2: Images */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <SectionHeader title="Produktbilder" icon={ImageIcon} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {(data.source?.images || []).map((url: string, i: number) => (
                <div 
                  key={url} 
                  className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all group shadow-md ${mainImage === url ? 'border-[#D4AF37] scale-105 z-10 ring-4 ring-[#D4AF37]/10' : 'border-gray-100 opacity-80 hover:opacity-100'}`}
                >
                  <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  
                  {/* Selection Overlay */}
                  <div className={`absolute inset-0 transition-colors ${selectedImages.includes(url) ? 'bg-transparent' : 'bg-black/40'}`} />

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 bg-black/60 p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
                        }}
                        className={`p-2.5 rounded-full shadow-2xl transition-all active:scale-90 ${selectedImages.includes(url) ? 'bg-green-500 text-white' : 'bg-white text-gray-900'}`}
                        title={selectedImages.includes(url) ? "Abwählen" : "Auswählen"}
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => setMainImage(url)}
                        className={`p-2.5 rounded-full shadow-2xl transition-all active:scale-90 ${mainImage === url ? 'bg-[#D4AF37] text-white' : 'bg-white text-gray-900'}`}
                        title="Als Hauptbild festlegen"
                      >
                        <Star size={16} strokeWidth={3} fill={mainImage === url ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        // This removes it from the LOCAL view for this session
                        setSelectedImages(prev => prev.filter(u => u !== url));
                        if (mainImage === url) setMainImage(null);
                      }}
                      className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all"
                    >
                      Entfernen
                    </button>
                  </div>

                  {mainImage === url && (
                    <div className="absolute bottom-3 left-3 right-3 bg-[#D4AF37] text-[8px] text-white font-black px-2 py-1.5 rounded-lg shadow-lg uppercase tracking-widest text-center">Hauptbild</div>
                  )}
                  
                  {selectedImages.includes(url) && (
                    <div className="absolute top-3 left-3 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] text-gray-900 font-black uppercase tracking-widest">
                  {selectedImages.length} von {data.source.images.length} Bildern ausgewählt
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Standardmäßig sind alle echten Produktfotos ausgewählt</p>
              </div>
              <div className="flex gap-6">
                <button 
                  onClick={() => setSelectedImages(data.source.images)}
                  className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
                >
                  Alle auswählen
                </button>
                <button 
                  onClick={() => setSelectedImages([])}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline"
                >
                  Alle abwählen
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Produktdaten */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <SectionHeader title="Produktdaten" icon={Package} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <InputField 
                  label="Produkt Name" 
                  value={formData.name} 
                  onChange={(v: string) => setFormData({...formData, name: v})}
                  confidence="name"
                />
              </div>
              <InputField 
                label="Marke" 
                value={formData.brand} 
                onChange={(v: string) => setFormData({...formData, brand: v})}
                confidence="brand"
              />
              <InputField 
                label="Modell" 
                value={formData.model} 
                onChange={(v: string) => setFormData({...formData, model: v})}
                confidence="model"
              />
              <InputField 
                label="Referenz (SKU)" 
                value={formData.sku} 
                onChange={(v: string) => setFormData({...formData, sku: v})}
                confidence="sku"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Kategorie</label>
                  <select 
                    value={formData.type || "WATCH"}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="WATCH">Watch</option>
                    <option value="JEWELRY">Jewelry</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Zustand</label>
                  <select 
                    value={formData.conditionGroup || "PRE_OWNED"}
                    onChange={e => setFormData({...formData, conditionGroup: e.target.value})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="NEW">New</option>
                    <option value="UNUSED">Unused</option>
                    <option value="PRE_OWNED">Pre-Owned</option>
                    <option value="VINTAGE">Vintage</option>
                  </select>
                </div>
              </div>
              <InputField 
                label="Baujahr" 
                value={formData.year} 
                onChange={(v: string) => setFormData({...formData, year: v})}
                confidence="year"
              />
            </div>
          </section>

          {/* Section 4: Zustands-Details (Internal) */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Star size={120} />
             </div>
             <SectionHeader title="Interne Quelldaten (Internal Only)" icon={ShieldCheck} />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <InputField 
                  label="Source Condition" 
                  value={formData.sourceCondition} 
                  onChange={(v: string) => setFormData({...formData, sourceCondition: v})}
                />
                <InputField 
                  label="TS Rank (Internal)" 
                  value={formData.sourceRank} 
                  onChange={(v: string) => setFormData({...formData, sourceRank: v})}
                />
                <InputField 
                  label="Overall Rank (Internal)" 
                  value={formData.overallRank} 
                  onChange={(v: string) => setFormData({...formData, overallRank: v})}
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <InputField 
                  label="Case Rank (Internal)" 
                  value={formData.caseRank} 
                  onChange={(v: string) => setFormData({...formData, caseRank: v})}
                />
                <InputField 
                  label="Band Rank (Internal)" 
                  value={formData.bandRank} 
                  onChange={(v: string) => setFormData({...formData, bandRank: v})}
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField 
                  label="Individuelle Bemerkungen" 
                  value={formData.conditionRemarks} 
                  onChange={(v: string) => setFormData({...formData, conditionRemarks: v})}
                  rows={4}
                  placeholder="z.B. leichte Kratzer an den Bandanstößen..."
                />
                <div className="space-y-6">
                  <InputField 
                    label="Wartung / Maintenance" 
                    value={formData.maintenanceDescription} 
                    onChange={(v: string) => setFormData({...formData, maintenanceDescription: v})}
                    rows={2}
                    placeholder="z.B. leichte Politur + Timing Adjustment..."
                  />
                  <InputField 
                    label="Gangabweichung (Daily Rate)" 
                    value={formData.dailyRateDisplay} 
                    onChange={(v: string) => setFormData({...formData, dailyRateDisplay: v})}
                    placeholder="ca. +5 Sek./Tag"
                  />
                </div>
             </div>
          </section>

          {/* Section 4: Specifications */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <SectionHeader title="Technische Spezifikationen" icon={Settings} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <InputField 
                label="Spezifikationen (DE)" 
                value={formData.specificationsDe} 
                onChange={(v: string) => setFormData({...formData, specificationsDe: v})}
                rows={8}
                placeholder="Gehäuse: 41mm, Werk: Automatik..."
              />
              <InputField 
                label="Specifications (EN)" 
                value={formData.specificationsEn} 
                onChange={(v: string) => setFormData({...formData, specificationsEn: v})}
                rows={8}
                placeholder="Case: 41mm, Movement: Automatic..."
              />
            </div>
          </section>

          {/* Section 5: Condition & Scope */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <SectionHeader title="Zustand & Lieferumfang" icon={ShieldCheck} />
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <InputField 
                  label="Zustand (DE)" 
                  value={formData.conditionDe} 
                  onChange={(v: string) => setFormData({...formData, conditionDe: v})}
                  rows={4}
                />
                <InputField 
                  label="Condition (EN)" 
                  value={formData.conditionEn} 
                  onChange={(v: string) => setFormData({...formData, conditionEn: v})}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <InputField 
                  label="Lieferumfang (DE)" 
                  value={formData.scopeOfDeliveryDe} 
                  onChange={(v: string) => setFormData({...formData, scopeOfDeliveryDe: v})}
                  rows={4}
                  placeholder="Box, Originalpapiere..."
                />
                <InputField 
                  label="Scope of Delivery (EN)" 
                  value={formData.scopeOfDeliveryEn} 
                  onChange={(v: string) => setFormData({...formData, scopeOfDeliveryEn: v})}
                  rows={4}
                  placeholder="Box, Original Papers..."
                />
              </div>
            </div>
          </section>

          {/* Section 6: Description */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                  <Sparkles size={18} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-900">Shop-Beschreibung</h3>
              </div>
              <button className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                <RefreshCw size={12} /> Neu Generieren
              </button>
            </div>
            
            <div className="space-y-12">
              <div className="space-y-6">
                <InputField 
                  label="Titel (DE)" 
                  value={formData.titleDe} 
                  onChange={(v: string) => setFormData({...formData, titleDe: v})}
                />
                <InputField 
                  label="Beschreibung (DE)" 
                  value={formData.descriptionDe} 
                  onChange={(v: string) => setFormData({...formData, descriptionDe: v})}
                  rows={15}
                />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="space-y-6">
                <InputField 
                  label="Title (EN)" 
                  value={formData.titleEn} 
                  onChange={(v: string) => setFormData({...formData, titleEn: v})}
                />
                <InputField 
                  label="Description (EN)" 
                  value={formData.descriptionEn} 
                  onChange={(v: string) => setFormData({...formData, descriptionEn: v})}
                  rows={15}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-12">
          {/* 1. EINKAUF & WÄHRUNG */}
          <section className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl space-y-8">
            <SectionHeader title="1. Einkauf" icon={Euro} />
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Originalpreis</label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[12px] font-black text-gray-900">{formData.purchasePriceOriginal}</span>
                    <span className="text-[10px] font-bold text-gray-400">{formData.purchaseCurrency}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Wechselkurs</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={formData.exchangeRate}
                    onChange={e => setFormData({...formData, exchangeRate: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">Einkaufspreis EUR (Manuell editierbar)</label>
                <div className="relative">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]" size={14} />
                  <input 
                    type="number" 
                    value={formData.purchasePriceEur}
                    onChange={e => setFormData({...formData, purchasePriceEur: e.target.value})}
                    className="w-full pl-10 pr-4 py-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl text-[16px] font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-right">
                  Basis für alle nachfolgenden Berechnungen
                </p>
              </div>
            </div>
          </section>

          {/* 2. IMPORT & ZOLL */}
          <section className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl space-y-8">
            <SectionHeader title="2. Import & Zoll" icon={Truck} />
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Versand (Int.)</label>
                  <input 
                    type="number" 
                    value={formData.shippingCost}
                    onChange={e => setFormData({...formData, shippingCost: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Versicherung</label>
                  <input 
                    type="number" 
                    value={formData.insuranceCost}
                    onChange={e => setFormData({...formData, insuranceCost: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-900 rounded-2xl flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Vorläufiger Zollwert</span>
                <span className="text-[14px] font-black text-white">{pricingResults?.provisionalCustomsValue?.toFixed(2) || "0.00"} €</span>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Ursprungsland</label>
                  <input 
                    type="text" 
                    value={formData.originCountry}
                    onChange={e => setFormData({...formData, originCountry: e.target.value.toUpperCase()})}
                    className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-center text-[11px] font-black"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Zolltarifnummer (HS)</label>
                  <input 
                    type="text" 
                    placeholder={pricingResults?.customsRateInfo?.hsCode}
                    value={formData.hsCode}
                    onChange={e => setFormData({...formData, hsCode: e.target.value})}
                    className="w-32 px-3 py-1 bg-gray-50 border border-gray-200 rounded text-right text-[11px] font-black"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Zollsatz (%)</label>
                    <div className="flex items-center gap-2">
                      {pricingResults?.customsRateInfo?.needsCheck && !formData.customsRatePercent && (
                        <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black uppercase">Prüfen!</span>
                      )}
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder={pricingResults?.customsRateInfo?.rate?.toString() || "0"}
                        value={formData.customsRatePercent}
                        onChange={e => setFormData({...formData, customsRatePercent: e.target.value})}
                        className="w-20 px-3 py-1 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded text-right text-[12px] font-black text-[#D4AF37]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Zollbetrag (Manuell)</label>
                    <div className="flex items-center gap-2">
                      <Euro size={12} className="text-[#D4AF37]" />
                      <input 
                        type="number" 
                        placeholder={pricingResults?.customsAmountEur?.toFixed(2)}
                        value={formData.manualCustomsAmountEur}
                        onChange={e => setFormData({...formData, manualCustomsAmountEur: e.target.value})}
                        className="w-24 px-3 py-1 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded text-right text-[12px] font-black text-[#D4AF37]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Zollbetrag (Berechnet)</span>
                    <span className="text-[13px] font-black text-[#D4AF37]">{pricingResults?.customsAmountEur?.toFixed(2) || "0.00"} €</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. SONSTIGE IMPORTKOSTEN */}
          <section className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl space-y-6">
            <SectionHeader title="3. Weitere Kosten" icon={Settings} />
            <div className="space-y-4">
              {[
                { label: 'Zoll-Broker', field: 'customsBrokerFee' },
                { label: 'Zollabfertigung', field: 'customsClearanceFee' },
                { label: 'Sonstige Importkosten', field: 'otherImportCosts' },
              ].map(cost => (
                <div key={cost.field} className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{cost.label}</span>
                  <input 
                    type="number" 
                    value={formData[cost.field]}
                    onChange={e => setFormData({...formData, [cost.field]: e.target.value})}
                    className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right text-[11px] font-black outline-none focus:border-[#D4AF37]"
                  />
                </div>
              ))}
              <div className="pt-6 border-t border-gray-100 flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-900">EINSTAND (Landed Cost)</span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Total aller Kosten</p>
                </div>
                <span className="text-[20px] font-black text-gray-900">{pricingResults?.landedCost?.toFixed(2) || "0.00"} €</span>
              </div>
            </div>
          </section>

          {/* 4. STEUERBEHANDLUNG */}
          <section className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl space-y-8">
            <SectionHeader title="4. Steuer" icon={ShieldCheck} />
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Besteuerungsart</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'REGULAR', label: 'Regelbesteuerung 19 %' },
                    { id: 'MARGIN', label: 'Differenzbesteuerung §25a' },
                    { id: 'CHECK', label: 'Steuerbehandlung prüfen' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setFormData({...formData, taxTreatment: opt.id})}
                      className={`px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-widest border transition-all ${formData.taxTreatment === opt.id ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-[#D4AF37]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Einfuhrumsatzsteuer</span>
                  <span className="text-[12px] font-black text-gray-900">{pricingResults?.importVatEur?.toFixed(2) || "0.00"} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Vorsteuerabziehbar?</span>
                  <button 
                    onClick={() => setFormData({...formData, isInputTaxDeductible: !formData.isInputTaxDeductible})}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${formData.isInputTaxDeductible ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                  >
                    {formData.isInputTaxDeductible ? 'JA' : 'NEIN'}
                  </button>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Kosteneffekt Einstand</span>
                  <span className="text-[12px] font-black text-gray-900">+{pricingResults?.importVatImpactOnLandedCost?.toFixed(2) || "0.00"} €</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. MARGENKALKULATION */}
          <section className="bg-gray-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden border border-gray-800">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/20 blur-[80px] rounded-full -mr-24 -mt-24" />
            <SectionHeader title="5. Marge" icon={Calculator} />
            
            <div className="space-y-8 relative">
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                <button 
                  onClick={() => setFormData({...formData, pricingMode: 'MARGIN'})}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.pricingMode === 'MARGIN' ? 'bg-[#D4AF37] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Zielmarge
                </button>
                <button 
                  onClick={() => setFormData({...formData, pricingMode: 'MANUAL'})}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.pricingMode === 'MANUAL' ? 'bg-[#D4AF37] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Verkaufspreis
                </button>
              </div>

              {formData.pricingMode === 'MARGIN' ? (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Zielmarge (%)</label>
                  <input 
                    type="number" 
                    value={formData.targetMarginPercent}
                    onChange={e => setFormData({...formData, targetMarginPercent: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-[24px] font-black text-white outline-none focus:border-[#D4AF37] transition-all"
                  />
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic">System berechnet Brutto-VK rückwärts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Brutto-Verkaufspreis (€)</label>
                  <div className="relative">
                    <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4AF37]" size={20} />
                    <input 
                      type="number" 
                      value={formData.manualGrossSalePrice}
                      onChange={e => handleManualPriceChange(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl pl-14 pr-5 py-5 text-[24px] font-black text-white outline-none focus:border-[#D4AF37] transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black">Netto-Erlös</span>
                    <p className="text-[16px] font-black mt-1 text-white">{pricingResults?.netSalePrice?.toFixed(2) || "0.00"} €</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black">Steueranteil</span>
                    <p className="text-[16px] font-black mt-1 text-white">{pricingResults?.taxAmountEur?.toFixed(2) || "0.00"} €</p>
                  </div>
                </div>

                <div className="p-8 bg-[#D4AF37] rounded-[32px] text-black shadow-2xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-[0.2em] font-black opacity-60">Brutto Verkaufspreis</span>
                      <h4 className="text-3xl font-black">{pricingResults?.grossSalePrice?.toFixed(2) || "0.00"} €</h4>
                    </div>
                    <div className="p-3 bg-black/10 rounded-2xl">
                      <Tag size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 border-t border-black/10 pt-6">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Gewinn (€)</span>
                      <p className="text-xl font-black">{pricingResults?.profitEur?.toFixed(2) || "0.00"} €</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Marge (%)</span>
                      <p className="text-3xl font-black">{pricingResults?.effectiveMarginPercent?.toFixed(1) || "0.0"}%</p>
                    </div>
                  </div>
                </div>

                {pricingResults && pricingResults.profitEur < 0 && (
                  <div className="p-5 bg-red-500 text-white rounded-2xl flex items-center gap-4 animate-pulse">
                    <AlertTriangle size={24} />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest">Warnung: Verlustgeschäft!</p>
                      <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Verkauf unter Einstandspreis</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 6. ADMIN-TRANSPARENZ */}
          <section className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl space-y-8">
            <SectionHeader title="Datenblatt & Transparenz" icon={Info} />
            <div className="space-y-4 font-mono text-[10px]">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400">Zolltarifnummer:</span>
                <span className="font-black">{pricingResults?.customsRateInfo?.hsCode || "-"}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400">Ursprung:</span>
                <span className="font-black">{formData.originCountry}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400">Zollsatz:</span>
                <span className="font-black">{pricingResults?.customsRateInfo?.rate !== undefined && pricingResults?.customsRateInfo?.rate !== null ? `${pricingResults.customsRateInfo.rate}%` : "Muss geprüft werden"}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400">Berechnungsgrundlage:</span>
                <span className="font-black">{pricingResults?.provisionalCustomsValue?.toFixed(2) || "0.00"} €</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400">Datenquelle:</span>
                <span className="font-black text-[#D4AF37] uppercase">{pricingResults?.customsRateInfo?.isEstimated ? "System-Schätzung" : "Manueller Wert"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-black uppercase ${pricingResults?.customsRateInfo?.needsCheck ? 'text-red-500' : 'text-green-500'}`}>
                  {pricingResults?.customsRateInfo?.needsCheck ? "Prüfung erforderlich" : "Verifiziert"}
                </span>
              </div>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl space-y-10">
            <SectionHeader title="SEO Optimierung" icon={Zap} />
            <div className="space-y-8">
              <InputField 
                label="SEO Title (DE)" 
                value={formData.seoTitleDe} 
                onChange={(v: string) => setFormData({...formData, seoTitleDe: v})}
              />
              <InputField 
                label="SEO Description (DE)" 
                value={formData.seoDescriptionDe} 
                onChange={(v: string) => setFormData({...formData, seoDescriptionDe: v})}
                rows={3}
              />
            </div>
          </section>

          {/* Diagnostics Section */}
          {data.diagnostics && (
            <section className="bg-black text-[#D4AF37] p-8 rounded-[32px] border border-[#D4AF37]/20 font-mono text-[10px] space-y-4">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-4">
                <span className="font-bold uppercase tracking-widest">Import Pipeline Diagnostics</span>
                <span className="px-2 py-0.5 bg-[#D4AF37] text-black rounded font-black">Admin Debug</span>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                {Object.entries(data.diagnostics).map(([key, val]: [string, any]) => (
                  <div key={key} className="flex justify-between border-b border-[#D4AF37]/5 pb-1">
                    <span className="opacity-60">{key}:</span>
                    <span className="font-bold">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between border-b border-[#D4AF37]/5 pb-1 col-span-2 mt-4 opacity-40">
                  <span>PRICING ENGINE DIAGNOSTICS</span>
                </div>
                <div className="flex justify-between border-b border-[#D4AF37]/5 pb-1">
                  <span className="opacity-60">Landed Cost:</span>
                  <span className="font-bold">{pricingResults?.landedCost?.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between border-b border-[#D4AF37]/5 pb-1">
                  <span className="opacity-60">Customs Amount:</span>
                  <span className="font-bold">{pricingResults?.customsAmountEur?.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between border-b border-[#D4AF37]/5 pb-1">
                  <span className="opacity-60">HS Code:</span>
                  <span className="font-bold">{pricingResults?.customsRateInfo?.hsCode || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D4AF37]/5 pb-1">
                  <span className="opacity-60">Net Sale:</span>
                  <span className="font-bold">{pricingResults?.netSalePrice?.toFixed(2)} EUR</span>
                </div>
              </div>
            </section>
          )}

          {/* Originaldaten */}
          <section className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setActiveTab(activeTab === 'raw' ? 'product' : 'raw')}
              className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D4AF37] transition-colors"
            >
              <span>Originaldaten anzeigen</span>
              <ChevronRight size={16} className={`transition-transform ${activeTab === 'raw' ? 'rotate-90' : ''}`} />
            </button>
            {activeTab === 'raw' && (
              <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                <pre className="text-[10px] font-mono text-gray-500 overflow-x-auto">
                  {JSON.stringify(data.source, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-6">
        <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-2xl border border-gray-200 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={onCancel}
              className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              Abbrechen
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Status</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-green-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                Analyse Bereit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSave("DRAFT")} 
              disabled={saving}
              className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 active:scale-95 flex items-center gap-3"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Als Entwurf Speichern
            </button>
            <button 
              onClick={() => handleSave("ACTIVE")} 
              disabled={saving || validationErrors.length > 0}
              className={`px-12 py-4 bg-[#D4AF37] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#C19B2E] transition-all shadow-xl disabled:opacity-50 active:scale-95 flex items-center gap-3 ${validationErrors.length > 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              title={validationErrors.length > 0 ? "Veröffentlichung gesperrt: Bitte übersetzen Sie alle japanischen Texte." : ""}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
              Import & Veröffentlichen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
