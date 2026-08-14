import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

export interface ReserveFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

interface ProductReserveModalProps {
  open: boolean;
  displayTitle: string;
  form: ReserveFormState;
  loading: boolean;
  success: boolean;
  error: string | null;
  onClose: () => void;
  onChange: (form: ReserveFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ProductReserveModal({
  open,
  displayTitle,
  form,
  loading,
  success,
  error,
  onClose,
  onChange,
  onSubmit,
}: ProductReserveModalProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 space-y-6 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserve-modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
              aria-label={t("common.cancel")}
            >
              <X size={20} />
            </button>

            {success ? (
              <div className="text-center space-y-4 py-8">
                <CheckCircle2 size={48} className="text-[#c5a059] mx-auto" />
                <p className="text-lg font-serif italic">{t("product.reserve.success")}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[10px] tracking-widest uppercase text-[#c5a059] font-bold"
                >
                  {t("common.back")}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 id="reserve-modal-title" className="text-xl font-serif italic text-[#c5a059]">
                    {t("product.reserve.title")}
                  </h3>
                  <p className="text-sm text-white/50 mt-2 font-light">{t("product.reserve.desc")}</p>
                  <p className="text-xs text-white/30 mt-2 italic">{displayTitle}</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-sm">{error}</div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                        {t("contact.form.firstname")}
                      </label>
                      <input
                        required
                        value={form.firstName}
                        onChange={(e) => onChange({ ...form, firstName: e.target.value })}
                        className="mt-1 w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                        {t("contact.form.lastname")}
                      </label>
                      <input
                        required
                        value={form.lastName}
                        onChange={(e) => onChange({ ...form, lastName: e.target.value })}
                        className="mt-1 w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                      {t("contact.form.email")}
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => onChange({ ...form, email: e.target.value })}
                      className="mt-1 w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                      {t("contact.phone.title")}
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => onChange({ ...form, phone: e.target.value })}
                      className="mt-1 w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                      {t("product.reserve.message")}
                    </label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(e) => onChange({ ...form, message: e.target.value })}
                      className="mt-1 w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c5a059] text-black py-4 text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-[#d4af37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {t("product.reserve.submit")}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
