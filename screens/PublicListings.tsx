
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Property, PropertyStatus } from '../types';

interface PublicListingsProps {
  properties: Property[];
}

const PublicListings: React.FC<PublicListingsProps> = ({ properties }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll to shrink header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter ONLY available properties for public browsing
  const availableOnly = properties.filter(p => p.status === PropertyStatus.AVAILABLE);

  const filtered = availableOnly.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) ||
      p.address.toLowerCase().includes(filter.toLowerCase()) ||
      p.ref.toLowerCase().includes(filter.toLowerCase());

    const matchesType = typeFilter === 'all' || p.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen pb-32 bg-white dark:bg-slate-950">
      <header className={`sticky top-0 z-50 bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md px-4 sm:px-6 md:px-12 border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ${isScrolled ? 'py-3' : 'pt-8 sm:pt-12 pb-6'
        }`}>
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'mb-3' : 'mb-6'
          }`}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <h1 className={`font-extrabold uppercase tracking-tighter leading-tight font-display transition-all duration-300 ${isScrolled ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl md:text-3xl'
              }`}>Propiedades Disponibles</h1>
          </div>

          <button onClick={() => navigate('/')} className="transition-transform hover:scale-110 active:scale-95">
            <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno Logo" className="w-16 h-16 object-contain" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center max-w-3xl mx-auto sm:mx-0">
          {/* Filter Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-[2rem] p-1.5 border border-gray-100 dark:border-gray-800 w-full lg:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter('sale')}
              className={`flex-1 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === 'sale'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              Venta
            </button>
            <button
              onClick={() => setTypeFilter('rent')}
              className={`flex-1 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${typeFilter === 'rent'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              Renta
            </button>
          </div>

          {/* Search Box */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center p-4 border border-gray-100 dark:border-gray-800 shadow-inner group focus-within:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-gray-400 px-3 text-2xl group-focus-within:text-primary transition-colors">search</span>
            <input
              type="text"
              placeholder="Zona, precio o ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 border-none bg-transparent focus:ring-0 text-sm font-bold placeholder:text-gray-400"
            />
          </div>
        </div>
      </header>

      {/* List View */}
      <div className="px-4 sm:px-6 md:px-12 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filtered.map(prop => (
          <div
            key={prop.id}
            onClick={() => navigate(ref ? `/propiedad/${prop.id}?ref=${ref}` : `/propiedad/${prop.id}`)}
            className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-soft border border-gray-100 dark:border-gray-800 transition-all hover:shadow-2xl active:scale-[0.98] flex flex-col animate-in fade-in zoom-in-95 duration-500"
          >
            <div className="relative h-60 sm:h-72 flex-shrink-0">
              <img src={prop.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
              <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
                <span className="bg-white/95 dark:bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg text-primary">
                  {prop.type === 'rent' ? 'En Renta' : 'En Venta'}
                </span>
              </div>
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white drop-shadow-2xl">
                <p className="text-2xl sm:text-3xl font-black tracking-tighter">${prop.price.toLocaleString()}</p>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-90 truncate">{prop.address}</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-4 sm:mb-6 leading-tight flex-1 line-clamp-2">{prop.title}</h2>
              <div className="grid grid-cols-4 gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-50 dark:border-gray-800">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary mb-1 text-base sm:text-xl">bed</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase">{prop.specs.beds} R</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary mb-1 text-base sm:text-xl">bathtub</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase">{prop.specs.baths} B</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary mb-1 text-base sm:text-xl">square_foot</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase">{prop.specs.area}m²</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary mb-1 text-base sm:text-xl">directions_car</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase">{prop.specs.parking} E</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] shadow-soft border border-gray-50 dark:border-gray-800">
            <span className="material-symbols-outlined text-[80px] text-gray-100 mb-6">search_off</span>
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs px-10 leading-relaxed">No encontramos propiedades disponibles con ese criterio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicListings;
