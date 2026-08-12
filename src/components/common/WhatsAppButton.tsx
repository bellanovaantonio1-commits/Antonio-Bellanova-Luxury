import { MessageCircle } from "lucide-react";
import { normalizePhoneForLink, useShopSettings } from "../../contexts/ShopSettingsContext.tsx";

export default function WhatsAppButton() {
  const settings = useShopSettings();
  const phone = normalizePhoneForLink(settings.whatsappNumber || settings.contactPhone || "491637607805");
  const message = encodeURIComponent("Guten Tag, ich interessiere mich für ein Produkt von Antonio Bellanova Luxury.");

  return (
    <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-green-500 transition-all hover:scale-110"
      aria-label="WhatsApp Kontakt">
      <MessageCircle size={24} />
    </a>
  );
}
