import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen page-pt page-pb page-x flex items-center justify-center text-center">
      <div className="max-w-md space-y-8">
        <p className="text-[120px] font-serif text-[#c5a059]/20 leading-none">404</p>
        <h1 className="text-3xl font-serif italic">Seite nicht gefunden</h1>
        <p className="text-white/40 font-light">Die gesuchte Seite existiert nicht oder wurde verschoben.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="bg-[#c5a059] text-black px-8 py-4 rounded-full text-[10px] tracking-widest uppercase font-bold">Zur Startseite</Link>
          <Link to="/shop" className="border border-white/20 px-8 py-4 rounded-full text-[10px] tracking-widest uppercase font-bold hover:border-[#c5a059] transition-all">Zum Shop</Link>
        </div>
      </div>
    </div>
  );
}
