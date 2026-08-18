import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, IceCream, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const Home: React.FC = () => {
  const { settings } = useAppContext();

  return (
    <div className="overflow-hidden">
      {/* Main Content Area with Tricolor Design */}
      <section className="grid grid-cols-1 md:grid-cols-12 min-h-[80vh] relative">
        {/* Green Left/Bottom Accent Area */}
        <div className="md:col-span-3 bg-brand-green p-10 flex flex-col justify-end text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
          <span className="text-xs uppercase tracking-[0.3em] font-sans opacity-70 mb-2">Tradition</span>
          <h2 className="text-4xl leading-tight mb-4 italic font-serif">L’Arte del Gelato</h2>
          <p className="text-sm leading-relaxed opacity-80 font-sans">Handwerkliche Perfektion seit über 20 Jahren im Herzen von Köln Nippes.</p>
          <div className="mt-8 h-px bg-white/20 w-12"></div>
        </div>

        {/* White Center Content */}
        <div className="md:col-span-6 bg-white p-12 flex flex-col justify-center items-center text-center relative">
          <div className="mb-6 px-4 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-[10px] uppercase tracking-[0.2em] font-sans text-gray-500">In Familienbesitz seit 2001</div>
          <h3 className="text-5xl md:text-7xl font-serif text-brand-green mb-4">
            Benvenuti a <br />
            <span className="text-brand-red">Capri</span>
          </h3>
          <p className="max-w-md text-gray-600 mb-8 italic text-lg leading-relaxed">
            Erleben Sie den authentischen Geschmack Italiens in jeder Kugel – von cremigem Pistazien-Eis bis hin zu fruchtigem Zitronensorbet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/menu"
              className="bg-brand-green text-white px-8 py-3 rounded-full text-xs uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-lg text-center"
            >
              Speisekarte ansehen
            </Link>
            <Link 
              to="/gallery"
              className="border border-brand-red text-brand-red px-8 py-3 rounded-full text-xs uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all text-center"
            >
              Unsere Galerie
            </Link>
          </div>
          
          {/* Featured Flavor Card */}
          <div className="mt-16 w-full max-w-sm bg-brand-cream border border-neutral-200 rounded-3xl p-6 flex gap-4 items-center shadow-sm">
            <div className="w-16 h-16 bg-brand-red/10 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-brand-red rounded-full" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-xs uppercase font-sans tracking-tight text-neutral-500">Sorte der Woche</h4>
              <p className="text-lg text-brand-red font-serif">Fragola di Bosco</p>
            </div>
          </div>
        </div>

        {/* Red Right/Top Accent Area */}
        <div className="md:col-span-3 bg-brand-red p-10 flex flex-col text-white relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/5 rounded-full blur-3xl -mb-32 -mr-32"></div>
          <div className="mt-12">
            <span className="text-xs uppercase tracking-[0.3em] font-sans opacity-70 mb-2">Qualität</span>
            <h2 className="text-4xl leading-tight mb-4 italic font-serif">Fatto in Casa</h2>
            <p className="text-sm leading-relaxed opacity-80 font-sans">Alle unsere Eissorten werden täglich frisch in unserem Laboratorium nach Originalrezeptur hergestellt.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 mb-4">Warum Capri?</h2>
            <p className="text-neutral-600">Qualität, die man schmeckt. Wir verwenden nur die besten Zutaten für unser Eis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <IceCream className="text-brand-green" size={32} />,
                title: "Täglich frisch",
                description: "Jede Sorte wird jeden Morgen frisch in unserem Laboratorium zubereitet."
              },
              {
                icon: <Clock className="text-blue-600" size={32} />,
                title: "Tradition",
                description: "Rezepturen, die von Generation zu Generation weitergegeben und verfeinert wurden."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-neutral-900 font-serif">{feature.title}</h3>
                <p className="text-neutral-600 leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-red text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-serif font-bold mb-6">Besuchen Sie uns noch heute!</h2>
          <p className="text-xl mb-10 text-rose-100 max-w-2xl mx-auto italic">
            Gönnen Sie sich eine Auszeit und genießen Sie ein Stück Italien. Wir freuen uns auf Sie!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/contact" className="px-10 py-4 bg-white text-brand-red rounded-full font-bold hover:bg-neutral-100 transition-colors uppercase text-xs tracking-widest">
              Anfahrt & Kontakt
            </Link>
            <div className="flex items-center space-x-2 text-rose-100 font-sans text-sm uppercase tracking-wider">
              <Clock size={18} />
              <span>Heute bis 22:00 Uhr geöffnet</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
