
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property, PropertyStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import AuthRequiredModal from '../components/AuthRequiredModal';
import AboutMagno from '../components/AboutMagno';

interface PublicHomeProps {
  properties: Property[];
}

const PublicHome: React.FC<PublicHomeProps> = ({ properties }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSellRentClick = () => {
    navigate('/client-portal');
  };

  // Filter only Available properties for public visibility
  const availableProperties = properties.filter(p => p.status === PropertyStatus.AVAILABLE);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#101622]/90 backdrop-blur-md px-6 py-2 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate('/')} className="hover:scale-105 transition-transform shrink-0">
          <img
            src="/magno-logo.png"
            alt="Magno Logo"
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain brightness-75 dark:brightness-100"
          />
        </button>
        <div className="flex items-center gap-1 sm:gap-4">
          <button
            onClick={() => document.getElementById('somos-magno')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[9px] sm:text-sm font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors hover:scale-105 active:scale-95 px-1 sm:px-2 py-2"
          >
            Nosotros
          </button>
          <button
            onClick={() => navigate('/listings')}
            className="px-3 sm:px-6 py-2 sm:py-2.5 bg-primary text-white font-bold text-[9px] sm:text-sm uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-glow"
          >
            Propiedades
          </button>
        </div>
      </header>

      <section className="px-4 sm:px-6 py-4">
        <div
          className="relative min-h-[350px] sm:min-h-[450px] md:min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-cover bg-center shadow-2xl"
          style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200")' }}
        >
          <div className="z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-2xl">
            <h2 className="text-white text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 sm:mb-6 leading-[0.9] tracking-tighter uppercase sm:whitespace-pre-line font-display">Tu Hogar Ideal{"\n"}Empieza Aquí</h2>
            <p className="text-white/90 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-8 sm:mb-12 max-w-xs mx-auto">Liderazgo y exclusividad inmobiliaria en Jalisco</p>

            <div className="relative max-w-lg mx-auto w-full px-2 sm:px-0">
              <div className="bg-white/95 backdrop-blur-sm rounded-[1.5rem] sm:rounded-[2rem] flex items-center p-1.5 sm:p-2 shadow-2xl border border-white/20">
                <span className="material-symbols-outlined text-gray-400 px-2 sm:px-4 text-xl sm:text-2xl">search</span>
                <input
                  type="text"
                  placeholder="Zona, precio o ID..."
                  className="flex-1 border-none focus:ring-0 text-xs sm:text-base text-gray-900 placeholder:text-gray-400 bg-transparent min-w-0"
                />
                <button
                  onClick={() => navigate('/listings')}
                  className="bg-primary text-white font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-glow transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Explorar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-4">
        <section className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <button onClick={() => navigate('/listings')} className="flex flex-col gap-3 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 sm:p-8 items-start shadow-soft hover:shadow-xl active:scale-95 transition-all w-full group">
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl sm:text-2xl">home</span>
              </div>
              <div>
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Comprar / Rentar</h2>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Ver Catálogo</p>
              </div>
            </button>

            <button onClick={() => navigate('/appraise')} className="flex flex-col gap-3 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 sm:p-8 items-start shadow-soft hover:shadow-xl active:scale-95 transition-all w-full group">
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl sm:text-2xl">analytics</span>
              </div>
              <div>
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Avaluar mi inmueble</h2>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Estimación Digital</p>
              </div>
            </button>

            <button onClick={() => navigate('/login')} className="flex flex-col gap-3 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 sm:p-8 items-start shadow-soft hover:shadow-xl active:scale-95 transition-all w-full group">
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl sm:text-2xl">vpn_key</span>
              </div>
              <div>
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Soy Propietario</h2>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Acceso Privado</p>
              </div>
            </button>

            <button onClick={handleSellRentClick} className="flex flex-col gap-3 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 sm:p-8 items-start shadow-soft hover:shadow-xl active:scale-95 transition-all w-full group">
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl sm:text-2xl">add_business</span>
              </div>
              <div>
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Vender / Rentar</h2>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Registrar Casa</p>
              </div>
            </button>
          </div>
        </section>
      </section>

      <section className="py-4">
        <div className="flex justify-between items-end px-6 mb-10 animate-in fade-in slide-in-from-left-8 duration-700">
          <div>
            <h2 className="text-3xl font-extrabold uppercase tracking-tighter font-display text-slate-900 dark:text-white">Nuevos Ingresos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Descubre tu próximo espacio</p>
          </div>
          <button onClick={() => navigate('/listings')} className="group flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest hover:gap-3 transition-all">
            Ver Catálogo <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="flex overflow-x-auto gap-8 px-6 sm:px-12 no-scrollbar pb-16 snap-x snap-mandatory">
          {availableProperties.map(prop => (
            <div
              key={prop.id}
              onClick={() => navigate(`/property/${prop.id}`)}
              className="min-w-[300px] sm:min-w-[380px] bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-700 border border-slate-50 dark:border-white/5 group snap-center"
            >
              <div className="relative h-56 overflow-hidden">
                <img src={prop.mainImage || prop.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl">
                  <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{prop.type === 'sale' ? 'En Venta' : 'Renta Mensual'}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-xl uppercase tracking-tighter text-slate-900 dark:text-white truncate pr-4">{prop.title}</h3>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-6 truncate">{prop.address}</p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-white/5">
                  <p className="text-2xl font-black text-primary tracking-tighter">${prop.price.toLocaleString()}</p>
                  <div className="flex gap-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg">bed</span>
                      <span className="text-xs font-black text-slate-400">{prop.specs.beds}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg">square_foot</span>
                      <span className="text-xs font-black text-slate-400">{prop.specs.area}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {availableProperties.length === 0 && (
            <div className="min-w-full text-center py-10 text-gray-400 font-black uppercase tracking-widest">No hay propiedades disponibles</div>
          )}
        </div>
      </section>

      {/* Blog Highlights Section */}
      <section className="py-24 px-6 md:px-12 bg-slate-50 dark:bg-[#020617]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 font-display leading-none">Magno <span className="text-primary">Blog</span></h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Tendencias y noticias exclusivas</p>
            </div>
            <button
              onClick={() => navigate('/blog')}
              className="px-8 py-4 bg-white dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-white/5 shadow-xl hover:bg-primary hover:text-white transition-all active:scale-95"
            >
              Ver todo el blog
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* We'll need to fetch these or pass them from App.tsx. For now, let's assume we fetch them here for modularity */}
            <BlogHighlights navigate={navigate} />
          </div>
        </div>
      </section >

      {/* About Magno Section */}
      < AboutMagno />

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        intent="sale"
      />
    </div >
  );
};

// Sub-component for clean fetching
const BlogHighlights: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [highlights, setHighlights] = React.useState<any[]>([]);

  React.useEffect(() => {
    import('../services/supabaseClient').then(({ supabase }) => {
      supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3)
        .then(({ data }) => {
          if (data) setHighlights(data);
        });
    });
  }, []);

  if (highlights.length === 0) return null;

  return (
    <>
      {highlights.map(post => (
        <div
          key={post.id}
          onClick={() => navigate(`/blog/${post.slug}`)}
          className="group cursor-pointer flex flex-col h-full bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-500 border border-slate-50 dark:border-white/5"
        >
          <div className="relative aspect-[16/10] overflow-hidden">
            <img src={post.main_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full">
              <p className="text-[8px] font-black text-primary uppercase tracking-widest">{post.category || 'Noticias'}</p>
            </div>
          </div>
          <div className="p-10 flex flex-col flex-1">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{post.title}</h3>
            <p className="text-sm text-slate-400 line-clamp-3 mb-8 leading-relaxed">{post.excerpt}</p>
            <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l border-slate-100 dark:border-white/10 pl-4">
                  <span className="material-symbols-outlined text-xs">menu_book</span>
                  5 MIN
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className="material-symbols-outlined text-[10px] text-amber-500 fill-1">star</span>
                  ))}
                </div>
              </div>
              <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default PublicHome;
