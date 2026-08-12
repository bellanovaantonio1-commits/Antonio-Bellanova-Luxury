export interface SourceProductData {
  name: string;
  brand?: string;
  model?: string;
  reference?: string;
  sku?: string;
  price?: string;
  currency?: string;
  description?: string;
  condition?: string;
  year?: string;
  images: string[];
  specs: Record<string, string>;
  provider: string;
  url: string;
  variantId?: string;
  sourceProductId?: string;
  diagnostics?: any;
  metadata?: any;
}

export interface ImportProvider {
  canHandle(url: string): boolean;
  fetchData(url: string): Promise<SourceProductData>;
}
