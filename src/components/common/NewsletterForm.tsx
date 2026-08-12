import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <CheckCircle2 size={16} /> Erfolgreich angemeldet!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Ihre E-Mail"
        className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] rounded-lg min-w-0" />
      <button type="submit" disabled={status === "loading"}
        className="bg-[#c5a059] text-black px-4 py-3 rounded-lg hover:bg-[#d4af37] transition-all disabled:opacity-50">
        <Send size={16} />
      </button>
      {status === "error" && <p className="text-red-400 text-xs absolute mt-14">Fehler — bitte erneut versuchen.</p>}
    </form>
  );
}
