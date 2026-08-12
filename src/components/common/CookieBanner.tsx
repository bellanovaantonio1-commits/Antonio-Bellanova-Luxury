import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookies-accepted")) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[70] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <p className="text-sm text-white/60 font-light leading-relaxed flex-1">
          Wir verwenden Cookies für die Funktion der Website. Mit der Nutzung stimmen Sie unserer{" "}
          <Link to="/privacy" className="text-[#c5a059] hover:underline">Datenschutzerklärung</Link> zu.
        </p>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => { localStorage.setItem("cookies-accepted", "essential"); setVisible(false); }}
            className="px-6 py-3 text-[10px] tracking-widest uppercase font-bold border border-white/20 rounded-full hover:bg-white/5 transition-all">
            Nur Notwendige
          </button>
          <button onClick={() => { localStorage.setItem("cookies-accepted", "all"); setVisible(false); }}
            className="px-6 py-3 text-[10px] tracking-widest uppercase font-bold bg-[#c5a059] text-black rounded-full hover:bg-[#d4af37] transition-all">
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
