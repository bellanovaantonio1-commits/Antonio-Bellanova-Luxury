import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { normalizePhoneForLink, useShopSettings } from "../../contexts/ShopSettingsContext.tsx";

export default function WhatsAppButton() {
  const settings = useShopSettings();
  const location = useLocation();
  const phone = normalizePhoneForLink(settings.whatsappNumber || settings.contactPhone || "491637607805");
  const message = encodeURIComponent("Guten Tag, ich interessiere mich für ein Produkt von Antonio Bellanova Luxury.");

  const isProductPage = location.pathname.startsWith("/product/");
  const isShopPage = location.pathname.startsWith("/shop");
  const cookiesPending =
    typeof window !== "undefined" && !localStorage.getItem("cookies-accepted");

  if (isProductPage) {
    return null;
  }

  const bottomClass = cookiesPending
    ? "bottom-28 sm:bottom-24"
    : isShopPage
      ? "bottom-24 sm:bottom-6"
      : "bottom-6";

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${bottomClass} right-4 sm:right-6 z-[60] w-14 h-14 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-green-500 transition-all hover:scale-110 safe-area-pb`}
      aria-label="WhatsApp Kontakt"
    >
      <MessageCircle size={24} />
    </a>
  );
}
