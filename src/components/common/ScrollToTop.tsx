import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-6 z-50 w-12 h-12 bg-[#c5a059] text-black rounded-full flex items-center justify-center shadow-2xl hover:bg-[#d4af37] transition-all hover:scale-110"
      aria-label="Nach oben">
      <ArrowUp size={20} />
    </button>
  );
}
