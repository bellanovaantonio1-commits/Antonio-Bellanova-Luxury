import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  const phone = "49221123456";
  const message = encodeURIComponent("Guten Tag, ich interessiere mich für ein Produkt von Antonio Bellanova Luxury.");

  return (
    <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-green-500 transition-all hover:scale-110"
      aria-label="WhatsApp Kontakt">
      <MessageCircle size={24} />
    </a>
  );
}
