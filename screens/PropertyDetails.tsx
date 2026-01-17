
import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { getNearbyAmenities } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import PropertyMap from '../components/PropertyMap';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { generateGoogleCalendarLink } from '../services/calendarService';

interface PropertyDetailsProps {
  property: Property;
}

const SpecItem: React.FC<{ icon: string; value: number | string; label: string }> = ({ icon, value, label }) => {
  if (value === undefined || value === null || value === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{value}</p>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    </div>
  );
};

const FeatureSection: React.FC<{ title: string; features?: string[] }> = ({ title, features }) => {
  if (!features || features.length === 0) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary"></span>
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {features.map((f, i) => (
          <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
};

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property }) => {
  const navigate = useNavigate();
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [amenitiesText, setAmenitiesText] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState('general');
  const [activeImageIdx, setActiveImageIdx] = useState<number | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [appStep, setAppStep] = useState(1);
  const [appData, setAppData] = useState({
    fullName: '',
    phone: '',
    email: '',
    adults: 1,
    children: 0,
    hasPets: false,
    knowsArea: false,
    reason: '',
    urgency: 'asap',
    rentalDuration: '12months',
    incomeSource: 'payroll',
    meetsRatio: false,
    bureauStatus: 'clean',
    // Sale Specific
    isBureauSevere: false,
    mortgageStatus: 'process',
    paymentMethod: 'bank_loan',
    // Shared
    acceptedRequirements: false,
    appointmentDate: '',
    appointmentTime: '',
    calendarLink: ''
  });
  const { success, error } = useToast();

  const displayImages = property.mainImage ? [property.mainImage, ...property.images] : property.images;

  const categories = [
    { id: 'general', label: 'Todo', icon: 'explore', query: 'puntos de interés' },
    { id: 'universities', label: 'Universidades', icon: 'school', query: 'universidades cercanas' },
    { id: 'parks', label: 'Parques', icon: 'park', query: 'parques y bosques' },
    { id: 'supermarkets', label: 'Súper', icon: 'shopping_cart', query: 'supermercados y tiendas' },
    { id: 'plazas', label: 'Plazas', icon: 'shopping_bag', query: 'plazas comerciales' },
    { id: 'hospitals', label: 'Hospitales', icon: 'medical_services', query: 'hospitales y salud' },
  ];

  useEffect(() => {
    fetchData('general');
  }, [property.address]);

  const fetchData = async (catId: string) => {
    setLoadingAmenities(true);
    setActiveCategory(catId);
    try {
      const categoryObj = categories.find(c => c.id === catId);
      const data = await getNearbyAmenities(property.address, categoryObj?.query || "general");
      setAmenitiesText(data.text || "No se encontró información relevante en este momento.");
    } catch (e) {
      console.error(e);
      setAmenitiesText("Magno AI está explorando... Intenta de nuevo en unos segundos.");
    } finally {
      setLoadingAmenities(false);
    }
  };

  const submitApplication = async (type: 'rent' | 'sale') => {
    try {
      const commonData = {
        property_id: property.id,
        property_ref: property.ref,
        full_name: appData.fullName,
        phone: appData.phone,
        email: appData.email,
        knows_area: appData.knowsArea,
        reason: appData.reason,
        appointment_date: appData.appointmentDate,
        appointment_time: appData.appointmentTime,
        status: 'pending',
        application_type: type
      };

      const rentData = {
        adults: appData.adults,
        children: appData.children,
        has_pets: appData.hasPets,
        urgency: appData.urgency,
        duration: appData.rentalDuration,
        income_source: appData.incomeSource,
        meets_ratio: appData.meetsRatio,
        bureau_status: appData.bureauStatus,
        accepted_requirements: appData.acceptedRequirements,
      };

      const saleData = {
        income_source: appData.incomeSource,
        bureau_status: appData.bureauStatus,
        is_bureau_severe: appData.isBureauSevere,
        mortgage_status: appData.mortgageStatus,
        payment_method: appData.paymentMethod
      };

      const { error: submitErr } = await supabase
        .from('rental_applications')
        .insert([{
          ...commonData,
          ...(type === 'rent' ? rentData : saleData)
        }]);

      if (submitErr) throw submitErr;



      // Appointment creation
      const start = new Date(`${appData.appointmentDate}T${appData.appointmentTime}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      // Generate Google Calendar content
      const description = type === 'rent'
        ? `Visita para RENTA.\n\nPropiedad: ${property.title}\nRef: ${property.ref}\nCliente: ${appData.fullName}`
        : `Visita para COMPRA.\n\nPropiedad: ${property.title}\nRef: ${property.ref}\nCliente: ${appData.fullName}`;

      const calendarLink = generateGoogleCalendarLink(
        `Visita: ${property.title} (${type === 'rent' ? 'Renta' : 'Venta'})`,
        description,
        property.address,
        start.toISOString(),
        end.toISOString()
      );

      await supabase.from('appointments').insert([{
        property_id: property.id,
        title: `Visita: ${property.title} (${type === 'rent' ? 'Renta' : 'Venta'})`,
        client_name: appData.fullName,
        client_phone: appData.phone,
        client_email: appData.email,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        calendar_event_id: `gcal_${Date.now()}`,
        status: 'scheduled'
      }]);

      success('¡Solicitud creada correctamente!');
      setAppData(prev => ({ ...prev, calendarLink: calendarLink }));
      setAppStep(7);

    } catch (err: any) {
      console.error(err);
      error('Error al enviar solicitud: ' + err.message);
    }
  };

  return (
    <div className="pb-32 min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Lightbox Modal */}
      {activeImageIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setActiveImageIdx(null)}>
          <button
            onClick={() => setActiveImageIdx(null)}
            className="absolute top-safe right-6 mt-6 text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all z-50 border border-white/10"
          >
            <span className="material-symbols-outlined text-2xl sm:text-3xl">close</span>
          </button>

          <img
            src={displayImages[activeImageIdx]}
            className="max-w-[95%] max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-[2rem] shadow-2xl scale-in-95 animate-in duration-300 object-contain"
            alt="Gallery"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageIdx(prev => (prev === null || prev === 0) ? displayImages.length - 1 : prev - 1);
            }}
            className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/5"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageIdx(prev => (prev === null || prev === displayImages.length - 1) ? 0 : prev + 1);
            }}
            className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/5"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}



      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-12 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all group p-2"
        >
          <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform font-bold">arrow_back</span>
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Volver</span>
        </button>
        <div className="flex-1 flex justify-center relative">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary truncate px-4">{property.title}</p>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <button onClick={() => navigate('/')} className="transition-transform hover:scale-110 active:scale-95">
              <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain brightness-75 dark:brightness-100" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">

          {/* Left Column: Media Hub */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div
              className="relative w-full h-[400px] sm:h-[500px] rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-2xl group cursor-zoom-in"
              onClick={() => setActiveImageIdx(0)}
            >
              <img
                src={property.mainImage || (displayImages.length > 0 ? displayImages[0] : '')}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <button
                onClick={(e) => { e.stopPropagation(); setActiveImageIdx(0); }}
                className="absolute bottom-6 sm:bottom-10 right-6 sm:right-10 bg-white/20 backdrop-blur-2xl border border-white/30 text-white px-6 py-3 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl hover:bg-white/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">photo_library</span>
                {displayImages.length} Fotos
              </button>
            </div>

            {/* Gallery Horizontal Reel */}
            <div className="relative group">
              <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-4 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 no-scrollbar snap-x scroll-smooth">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative flex-none w-28 sm:w-40 aspect-[4/3] rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 transition-all snap-start shadow-lg hover:shadow-primary/20 ${activeImageIdx === idx ? 'border-primary scale-100' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Gallery thumbnail ${idx}`} />
                  </button>
                ))}

                {/* Final "View All" Card */}
                <button
                  onClick={() => setActiveImageIdx(0)}
                  className="relative flex-none w-28 sm:w-40 aspect-[4/3] rounded-2xl sm:rounded-[2rem] bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 snap-start group-hover:border-primary/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-400">add_circle</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ver Más</span>
                </button>
              </div>

              {/* Fade Indicators for Scroll */}
              <div className="absolute top-0 left-0 bottom-4 w-12 bg-gradient-to-r from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 sm:group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 sm:group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28">
            <div className="space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Ref: {property.ref}</p>
                  <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.85] text-slate-950 dark:text-white">
                    {property.title}
                  </h1>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !property.isFeatured;
                    const { error } = await supabase
                      .from('properties')
                      .update({ is_featured: newValue })
                      .eq('id', property.id);

                    if (!error) {
                      window.location.reload();
                    }
                  }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg border shrink-0 ${property.isFeatured
                    ? 'bg-red-50 text-red-500 border-red-100'
                    : 'bg-white dark:bg-slate-900 text-slate-300 border-slate-100 dark:border-slate-800 hover:text-red-400'
                    }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${property.isFeatured ? 'fill-1' : ''}`} style={{ fontVariationSettings: property.isFeatured ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] flex items-center gap-2 mt-6">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                {property.address}
              </p>

              <div className="py-8 border-y border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Inversión Estimada</p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="text-5xl font-black text-primary tracking-tighter">${property.price.toLocaleString()}</p>
                  {property.maintenanceFee > 0 && (
                    <span className="text-xs font-bold text-slate-400">+ ${property.maintenanceFee.toLocaleString()} Mant.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <SpecMini icon="bed" value={property.specs.beds} label="Recs" />
                <SpecMini icon="bathtub" value={property.specs.baths} label="Baños" />
                <SpecMini icon="square_foot" value={property.specs.area} label="Construcción" />
                <SpecMini icon="zoom_out_map" value={property.specs.landArea} label="Terreno" />
                <SpecMini
                  icon="history"
                  value={property.specs.age === 0 ? 'A estrenar' : `${property.specs.age} años`}
                  label="Antigüedad"
                />
                {property.specs.levels && property.specs.levels > 1 && (
                  <SpecMini icon="layers" value={property.specs.levels} label="Pisos" />
                )}
              </div>

              {/* Amenities in Sidebar */}
              <div className="space-y-8 py-6 border-t border-slate-100 dark:border-slate-800">
                <FeatureSection title="Espacios" features={property.spaces} />
                <FeatureSection title="Servicios" features={property.services} />
                <FeatureSection title="Amenidades" features={property.amenities} />
              </div>

              {/* CTAs (Visible only on Desktop) */}
              <div className="hidden lg:flex flex-col gap-3 pt-4">
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="w-full bg-slate-950 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-[0.2em] shadow-2xl dark:shadow-blue-500/20 dark:border dark:border-slate-800 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">{property.type === 'sale' ? 'real_estate_agent' : 'home_work'}</span>
                  {property.type === 'sale' ? 'Quiero comprar esta propiedad' : 'Quiero rentar esta propiedad'}
                </button>
                <a
                  href={`https://wa.me/523319527172?text=${encodeURIComponent(`Hola, me interesa esta propiedad que vi en su aplicación: ${property.title} (Ref: ${property.ref})\n\nVer más: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-500 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">chat</span>
                  WhatsApp Directo
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Mobile CTA Bar */}
        <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] z-[80] animate-in slide-in-from-bottom-10 duration-700">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-4 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/5 flex gap-3">
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex-1 bg-slate-950 text-white font-black h-16 rounded-[2rem] text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
            >
              <span className="material-symbols-outlined text-lg">calendar_month</span>
              Cita
            </button>
            <a
              href={`https://wa.me/523319527172?text=${encodeURIComponent(`Hola, me interesa esta propiedad: ${property.title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-16 h-16 bg-green-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">chat</span>
            </a>
          </div>
        </div>

        {/* Detailed Description & Features */}
        <div className="mt-20 max-w-4xl mx-auto space-y-12">
          <div className="space-y-12">
            <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-[3rem] p-12 sm:p-16 shadow-xl">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-10">Descripción de la Propiedad</h2>
              <div
                className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium rich-text-content prose dark:prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: property.description }}
              />
            </div>

            {/* Location Map Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-[3rem] p-8 sm:p-12 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-2xl text-primary">location_on</span>
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Ubicación</h2>
              </div>
              {property.fullAddress && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                  📍 {property.fullAddress}
                </p>
              )}
              <PropertyMap
                properties={[property]}
                height="450px"
                className="border-2 border-slate-100 dark:border-slate-800"
                onScheduleClick={() => setShowApplicationModal(true)}
              />
            </div>
          </div>
        </div>


        {/* Application Modal */}
        {
          showApplicationModal && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 sm:px-12 py-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2">Solicitud de {property.type === 'sale' ? 'Compra' : 'Renta'}</h2>
                    <div className="flex gap-1">
                      {/* Step Indicator */}
                      {(property.type === 'sale' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6]).map((s) => (
                        <div key={s} className={`h-1 rounded-full transition-all ${s === appStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setShowApplicationModal(false); setAppStep(1); }} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all font-bold">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-8 no-scrollbar">
                  {/* STEP 1: PERSONAL INFO (SHARED) */}
                  {appStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Información Personal</h3>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre y Apellido</label>
                          <input
                            type="text"
                            value={appData.fullName}
                            onChange={(e) => setAppData({ ...appData, fullName: e.target.value })}
                            placeholder="Tu nombre completo"
                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                            <input
                              type="tel"
                              value={appData.phone}
                              onChange={(e) => setAppData({ ...appData, phone: e.target.value })}
                              placeholder="Número de celular"
                              className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                            <input
                              type="email"
                              value={appData.email}
                              onChange={(e) => setAppData({ ...appData, email: e.target.value })}
                              placeholder="correo@ejemplo.com"
                              className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {appStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                      {property.type === 'rent' ? (
                        /* RENT: OCCUPANTS */
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">¿Quiénes vivirán?</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Adultos</label>
                              <input type="number" value={appData.adults} onChange={(e) => setAppData({ ...appData, adults: parseInt(e.target.value) })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Niños</label>
                              <input type="number" value={appData.children} onChange={(e) => setAppData({ ...appData, children: parseInt(e.target.value) })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">¿Tienes mascotas?</span>
                            <button onClick={() => setAppData({ ...appData, hasPets: !appData.hasPets })} className={`w-14 h-8 rounded-full transition-all relative ${appData.hasPets ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${appData.hasPets ? 'right-1' : 'left-1 shadow-sm'}`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">¿Conoces la zona?</span>
                            <button onClick={() => setAppData({ ...appData, knowsArea: !appData.knowsArea })} className={`w-14 h-8 rounded-full transition-all relative ${appData.knowsArea ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${appData.knowsArea ? 'right-1' : 'left-1 shadow-sm'}`} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* SALE: INTEREST & LOCATION */
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Interés de Compra</h3>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Por qué motivo quieres comprar aquí?</label>
                            <textarea
                              value={appData.reason}
                              onChange={(e) => setAppData({ ...appData, reason: e.target.value })}
                              placeholder="Cuéntanos tus motivos..."
                              className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl p-5 font-bold outline-none resize-none"
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">¿Ya conoces la zona?</span>
                            <button onClick={() => setAppData({ ...appData, knowsArea: !appData.knowsArea })} className={`w-14 h-8 rounded-full transition-all relative ${appData.knowsArea ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${appData.knowsArea ? 'right-1' : 'left-1 shadow-sm'}`} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3 */}
                  {appStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                      {property.type === 'rent' ? (
                        /* RENT: MOVE PLANS */
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Planes de Mudanza</h3>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Por qué quieres rentar aquí?</label>
                            <textarea value={appData.reason} onChange={(e) => setAppData({ ...appData, reason: e.target.value })} placeholder="Cuéntanos brevemente..." className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl p-5 font-bold outline-none resize-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Qué tanto te urge mudarte?</label>
                            <select value={appData.urgency} onChange={(e) => setAppData({ ...appData, urgency: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none appearance-none">
                              <option value="asap">Lo antes posible</option>
                              <option value="important">Es importante pero no urge</option>
                              <option value="flexible">Tengo flexibilidad de tiempo</option>
                              <option value="exploring">Solo estoy explorando opciones</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Por cuánto tiempo quieres rentar?</label>
                            <select value={appData.rentalDuration} onChange={(e) => setAppData({ ...appData, rentalDuration: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none appearance-none">
                              <option value="12months">12 meses</option>
                              <option value="6months">6 meses</option>
                              <option value="3months">3 meses</option>
                              <option value="vacation">Solo vacaciones</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        /* SALE: FINANCIALS */
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Perfil Financiero</h3>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Origen de Ingresos</label>
                            <select value={appData.incomeSource} onChange={(e) => setAppData({ ...appData, incomeSource: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none">
                              <option value="payroll">Nómina</option>
                              <option value="bank_statements">Estados de Cuenta</option>
                            </select>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem]">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Situación en Buró de Crédito</label>
                            <select value={appData.bureauStatus} onChange={(e) => setAppData({ ...appData, bureauStatus: e.target.value })} className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-xl px-4 font-bold outline-none mb-4">
                              <option value="clean">Sin problemas / Al corriente</option>
                              <option value="issues">Con algunos atrasos</option>
                              <option value="severe">Problemas graves</option>
                            </select>
                            {appData.bureauStatus !== 'clean' && (
                              <div className="flex items-center gap-3 animate-in fade-in">
                                <span className="text-[10px] font-bold text-red-400">¿Es grave?</span>
                                <div className="flex gap-2">
                                  <button onClick={() => setAppData({ ...appData, isBureauSevere: true })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${appData.isBureauSevere ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-900'}`}>Sí</button>
                                  <button onClick={() => setAppData({ ...appData, isBureauSevere: false })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${!appData.isBureauSevere ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-900'}`}>No</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Estatus Hipotecario</label>
                            <select value={appData.mortgageStatus} onChange={(e) => setAppData({ ...appData, mortgageStatus: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none">
                              <option value="approved">Sí, ya tengo aprobación formal</option>
                              <option value="prequalified">Sí, cuento con pre-calificación</option>
                              <option value="process">No, pero estoy en proceso</option>
                              <option value="not_started">No, aún no he iniciado</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Crédito / Pago</label>
                            <select value={appData.paymentMethod} onChange={(e) => setAppData({ ...appData, paymentMethod: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none">
                              <option value="infonavit">Infonavit</option>
                              <option value="fovissste">Fovissste</option>
                              <option value="bank_loan">Crédito Bancario</option>
                              <option value="cash">Contado (Recursos Propios)</option>
                              <option value="advice_needed">Aún no sé / Necesito Asesoría</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4 */}
                  {appStep === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                      {property.type === 'rent' ? (
                        /* RENT: FINANCIALS */
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Situación Financiera</h3>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Origen de ingresos</label>
                            <select value={appData.incomeSource} onChange={(e) => setAppData({ ...appData, incomeSource: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none">
                              <option value="payroll">Nómina</option>
                              <option value="bank_statements">Estados de Cuenta</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div className="max-w-[70%]">
                              <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white mb-1">Ingresos 3 a 1</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">¿Tus ingresos son al menos 3 veces el valor de la renta?</p>
                            </div>
                            <button onClick={() => setAppData({ ...appData, meetsRatio: !appData.meetsRatio })} className={`w-14 h-8 rounded-full transition-all relative ${appData.meetsRatio ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${appData.meetsRatio ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Situación en Buró de Crédito</label>
                            <select value={appData.bureauStatus} onChange={(e) => setAppData({ ...appData, bureauStatus: e.target.value })} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none">
                              <option value="clean">Sin deudas / Al corriente</option>
                              <option value="issues">Con deudas pendientes</option>
                              <option value="severe">Problemas graves</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        /* SALE: SCHEDULE VISIT (Equivalent to Rent Step 6) */
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Agenda tu Visita</h3>
                            <p className="text-xs text-slate-400 font-bold">Selecciona el día y hora para conocer la propiedad.</p>
                          </div>
                          {/* Google Calendar Badge */}
                          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="#4285F4" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">Sincronización con Google Calendar</p>
                              <p className="text-[10px] text-blue-500/70 font-bold">La cita se agregará automáticamente</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Selecciona una fecha</label>
                            <input type="date" min={new Date().toISOString().split('T')[0]} value={appData.appointmentDate} onChange={(e) => setAppData({ ...appData, appointmentDate: e.target.value })} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-6 font-bold outline-none transition-all" />
                          </div>
                          {appData.appointmentDate && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Horarios Disponibles (Lapsos de 1 hora)</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                                  <button key={time} onClick={() => setAppData({ ...appData, appointmentTime: time })} className={`h-14 rounded-2xl font-black text-[10px] tracking-widest transition-all ${appData.appointmentTime === time ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{time}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {appStep === 5 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Requisitos de Renta</h3>
                          <p className="text-xs text-slate-400 font-bold">Por favor revisa y acepta los términos para continuar</p>
                        </div>

                        <div className="space-y-4">
                          {[
                            {
                              id: 1,
                              title: "Investigación Legal y Buró ($1,050)",
                              desc: "Se realiza una investigación profunda de antecedentes legales y crediticios. El pago se realiza después de ver la propiedad para apartarla.",
                              icon: "policy"
                            },
                            {
                              id: 2,
                              title: "Comprobante de Ingresos",
                              desc: "Mínimo 3 meses de antigüedad. Puede ser nómina o estados de cuenta bancarios.",
                              icon: "payments"
                            },
                            {
                              id: 3,
                              title: "Convenio de Justicia Alternativa",
                              desc: "Protección legal para ambas partes. Costo de $4,500, se paga al firmar el contrato (incluye Obligado Solidario).",
                              icon: "gavel"
                            },
                            {
                              id: 4,
                              title: "Pagos Iniciales",
                              desc: "Al firmar contrato se cubre el mes de depósito y el primer mes de renta por adelantado.",
                              icon: "receipt_long"
                            },
                            {
                              id: 5,
                              title: "Identificación Oficial",
                              desc: "INE vigente (preferencia) o Pasaporte vigente.",
                              icon: "badge"
                            }
                          ].map((req) => (
                            <div key={req.id} className="flex gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-primary/30 transition-all">
                              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">{req.icon}</span>
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">{req.id}. {req.title}</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">{req.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setAppData({ ...appData, acceptedRequirements: !appData.acceptedRequirements })}
                          className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-center gap-4 ${appData.acceptedRequirements
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'
                            }`}
                        >
                          <span className="material-symbols-outlined">
                            {appData.acceptedRequirements ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-widest">
                            Acepto los requisitos de renta
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {appStep === 6 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Agenda tu Visita</h3>
                          <p className="text-xs text-slate-400 font-bold">Selecciona el día y hora para conocer la propiedad. Se agregará automáticamente a Google Calendar.</p>
                        </div>

                        {/* Google Calendar Badge */}
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                              <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="#4285F4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">Sincronización con Google Calendar</p>
                            <p className="text-[10px] text-blue-500/70 font-bold">La cita se agregará automáticamente</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Selecciona una fecha</label>
                            <input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={appData.appointmentDate}
                              onChange={(e) => setAppData({ ...appData, appointmentDate: e.target.value })}
                              className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-6 font-bold outline-none transition-all"
                            />
                          </div>

                          {appData.appointmentDate && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Horarios Disponibles (Lapsos de 1 hora)</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                                  <button
                                    key={time}
                                    onClick={() => setAppData({ ...appData, appointmentTime: time })}
                                    className={`h-14 rounded-2xl font-black text-[10px] tracking-widest transition-all ${appData.appointmentTime === time
                                      ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      }`}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {appStep !== 7 && (
                  <div className="p-8 sm:p-12 border-t border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 flex gap-4">
                    {appStep > 1 && (
                      <button
                        onClick={() => setAppStep((prev) => prev - 1)}
                        className="flex-1 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
                      >
                        Atrás
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        // VALIDATION RULES
                        // Shared Step 1
                        if (appStep === 1) {
                          if (!appData.fullName.trim() || !appData.phone.trim() || !appData.email.trim()) {
                            error('Por favor completa todos los campos personales.');
                            return;
                          }
                        }

                        // RENT Step 2
                        if (property.type === 'rent' && appStep === 2 && appData.adults < 1) {
                          error('Debe haber al menos un adulto.');
                          return;
                        }

                        // SALE Step 2 (Reason)
                        if (property.type === 'sale' && appStep === 2 && !appData.reason.trim()) {
                          error('Por favor cuéntanos tus motivos de compra.');
                          return;
                        }

                        // RENT Step 3 (Reason)
                        if (property.type === 'rent' && appStep === 3 && !appData.reason.trim()) {
                          error('Por favor cuéntanos por qué deseas rentar aquí.');
                          return;
                        }

                        // SALE Step 4 (Date)
                        if (property.type === 'sale' && appStep === 4) {
                          if (!appData.appointmentDate || !appData.appointmentTime) {
                            error('Por favor selecciona fecha y hora para tu visita');
                            return;
                          }
                        }

                        // RENT Step 6 (Date)
                        if (property.type === 'rent' && appStep === 6) {
                          if (!appData.appointmentDate || !appData.appointmentTime) {
                            error('Por favor selecciona fecha y hora para tu visita');
                            return;
                          }
                        }

                        // NAVIGATION & SUBMISSION
                        const isRent = property.type === 'rent';
                        const isSale = property.type === 'sale';

                        // Logic for RENT
                        if (isRent) {
                          if (appStep < 5) {
                            setAppStep(prev => prev + 1);
                          } else if (appStep === 5) {
                            if (!appData.acceptedRequirements) {
                              error('Debes aceptar los requisitos para continuar');
                              return;
                            }
                            setAppStep(6);
                          } else if (appStep === 6) {
                            // SUBMIT RENT
                            await submitApplication('rent');
                          }
                        }

                        // Logic for SALE
                        else if (isSale) {
                          if (appStep < 4) {
                            setAppStep(prev => prev + 1);
                          } else if (appStep === 4) {
                            // SUBMIT SALE
                            await submitApplication('sale');
                          }
                        }
                      }}
                      className="flex-[2] h-16 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-center disabled:opacity-50"
                    >
                      {(property.type === 'rent' && appStep === 6) || (property.type === 'sale' && appStep === 4) ? 'Finalizar Solicitud' : 'Continuar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Success Modal (Step 7) */}
              {showApplicationModal && appStep === 7 && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
                  <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in duration-300 p-8 sm:p-12 space-y-8">

                    {/* Success Icon */}
                    <div className="flex justify-center">
                      <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-green-500 animate-in zoom-in duration-700 delay-150">check_circle</span>
                      </div>
                    </div>

                    {/* Success Message */}
                    <div className="text-center space-y-4">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">¡Solicitud Enviada!</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Hemos recibido tu solicitud correctamente. Tu cita ha sido agendada.</p>
                    </div>

                    {/* Appointment Details Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 space-y-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">event</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fecha</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {appData.appointmentDate && new Date(appData.appointmentDate).toLocaleDateString('es-MX', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">schedule</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Hora</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{appData.appointmentTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">location_on</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ubicación</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{property.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-4">
                      <button
                        onClick={() => window.open(appData.calendarLink, '_blank')}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                      >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="white" />
                        </svg>
                        Agregar a Calendar
                      </button>
                      <button
                        onClick={() => { setShowApplicationModal(false); setAppStep(1); }}
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        Cerrar
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )
        }
      </main >
    </div >
  );
};

export default PropertyDetails;

const SpecMini: React.FC<{ icon: string; value: number | string; label: string }> = ({ icon, value, label }) => (
  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
    <span className="material-symbols-outlined text-primary text-xl font-bold">{icon}</span>
    <div>
      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  </div>
);
