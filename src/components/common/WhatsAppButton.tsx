import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { normalizePhoneForLink, useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import { useCookieConsent } from "../../contexts/CookieConsentContext.tsx";

export default function WhatsAppButton() {
  const settings = useShopSettings();
  const location = useLocation();
  const { bannerVisible } = useCookieConsent();
  const phone = normalizePhoneForLink(settings.whatsappNumber || settings.contactPhone || "491637607805");
  const message = encodeURIComponent("Guten Tag, ich interessiere mich für ein Produkt von Antonio Bellanova Luxury.");

  const isProductPage = location.pathname.startsWith("/product/");
  const isShopPage = location.pathname.startsWith("/shop");

  if (isProductPage) {
    return null;
  }

  let bottomClass = "bottom-6";
  if (bannerVisible) {
    bottomClass = isShopPage ? "bottom-36 sm:bottom-32" : "bottom-28 sm:bottom-24";
  } else if (isShopPage) {
    bottomClass = "bottom-24 sm:bottom-6";
  }

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
