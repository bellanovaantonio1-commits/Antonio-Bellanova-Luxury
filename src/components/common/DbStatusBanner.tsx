import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DbStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(data => setOffline(data.db !== "connected"))
      .catch(() => setOffline(true));
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[80] bg-amber-950/95 border-b border-amber-500/30 text-amber-100 px-6 py-3 text-sm">
      <div className="max-w-4xl mx-auto flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
        <div className="flex-1">
          <p className="font-medium">Datenbank nicht verbunden</p>
          <p className="text-amber-200/70 text-xs mt-1">
            {isProduction ? (
              <>
                Auf Render: Dashboard → <strong>Environment</strong> →{" "}
                <code className="bg-black/30 px-1 rounded">DATABASE_URL</code> = Neon-Connection-String aus deiner{" "}
                <code className="bg-black/30 px-1 rounded">.env</code> eintragen → Deploy neu starten.
                Oder Blueprint syncen (legt Render-Postgres automatisch an).
              </>
            ) : (
              <>
                Trage deine Neon <code className="bg-black/30 px-1 rounded">DATABASE_URL</code> in die{" "}
                <code className="bg-black/30 px-1 rounded">.env</code> ein und führe{" "}
                <code className="bg-black/30 px-1 rounded">npm run db:setup</code> aus.
              </>
            )}
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-white shrink-0" aria-label="Schließen">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
