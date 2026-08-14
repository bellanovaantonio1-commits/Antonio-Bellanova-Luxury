import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { getCategoryBreadcrumb } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";

interface ProductBreadcrumbsProps {
  product: Product;
  displayTitle: string;
}

export default function ProductBreadcrumbs({ product, displayTitle }: ProductBreadcrumbsProps) {
  const { language, t } = useLanguage();
  const category = getCategoryBreadcrumb(product, language);

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-10 md:mb-14 flex flex-wrap items-center gap-x-2 gap-y-1 font-light"
    >
      <Link to="/" className="hover:text-[#c5a059] transition-colors">
        {t("product.breadcrumb.home")}
      </Link>
      <ChevronRight size={10} className="opacity-40 shrink-0" aria-hidden />
      <Link to={category.path} className="hover:text-[#c5a059] transition-colors">
        {category.label}
      </Link>
      {product.brand?.slug && product.brand?.name && (
        <>
          <ChevronRight size={10} className="opacity-40 shrink-0" aria-hidden />
          <Link to={`/brands/${product.brand.slug}`} className="hover:text-[#c5a059] transition-colors">
            {product.brand.name}
          </Link>
        </>
      )}
      <ChevronRight size={10} className="opacity-40 shrink-0" aria-hidden />
      <span className="text-[#F4F4F4]/80 truncate max-w-[14rem] md:max-w-xs" aria-current="page">
        {displayTitle}
      </span>
    </nav>
  );
}
