import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const AppraisalForm: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName1: '',
    lastName2: '',
    propertyType: 'casa', // 'casa' | 'departamento'
    location: '',
    isLocationConfirmed: false,
    constArea: 0,
    landArea: 0,
    beds: 0,
    baths: 0,
    age: 0,
    furnishing: 'none', // 'none' | 'semi' | 'full'
    amenities: [] as string[],
    services: [] as string[]
  });

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Detect Location via GPS
  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Tu navegador no soporta geolocalización', 'error');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Google Geocoding API to convert coordinates to address
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=es`
          );
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            setFormData(prev => ({
              ...prev,
              location: address,
              isLocationConfirmed: true
            }));
            showToast('Ubicación detectada correctamente', 'success');
          }
        } catch (err) {
          console.error('Error in reverse geocoding:', err);
          showToast('No se pudo determinar la dirección exacta', 'error');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        console.error('GPS Error:', error);
        showToast('Error al obtener ubicación. Verifica los permisos.', 'error');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleStepChange = (nextStep: number) => {
    if (nextStep < 1) return;
    if (nextStep > 6) return;
    setStep(nextStep);
    window.scrollTo(0, 0);
  };

  const toggleItem = (list: string[], item: string, key: 'amenities' | 'services') => {
    if (list.includes(item)) {
      setFormData({ ...formData, [key]: list.filter(i => i !== item) });
    } else {
      setFormData({ ...formData, [key]: [...list, item] });
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appraisals')
        .insert([{
          first_name: formData.firstName,
          last_name_1: formData.lastName1,
          last_name_2: formData.lastName2,
          property_type: formData.propertyType,
          location: formData.location,
          const_area: formData.constArea,
          land_area: formData.landArea,
          beds: formData.beds,
          baths: formData.baths,
          age: formData.age,
          furnishing: formData.furnishing,
          amenities: formData.amenities,
          services: formData.services,
          status: 'pending'
        }]);

      if (error) throw error;

      setStep(6);
    } catch (err: any) {
      console.error('Error saving appraisal:', err);
      showToast('Error al enviar la solicitud. Por favor intente de nuevo.', 'error');
    } finally {
      setLoading(true); // Keep loading true during step transition to show the success state properly
      setTimeout(() => setLoading(false), 800);
    }
  };

  // Construct Google Maps Embed URL
  const mapUrl = formData.location
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.location)}&language=es`
    : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-24">
      <header className="px-4 sm:px-6 pt-10 sm:pt-16 pb-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 sticky top-0 z-40 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => step === 1 ? navigate(-1) : handleStepChange(step - 1)}
            className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90"
          >
            <span className="material-symbols-outlined">{step === 1 ? 'close' : 'arrow_back_ios_new'}</span>
          </button>

          <div className="flex-1 px-8">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out shadow-glow shadow-primary/40"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3 text-center">
              Paso {step} de 6
            </p>
          </div>

          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mb-8 relative">
              <span className="material-symbols-outlined text-[52px] animate-spin">data_saver_on</span>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-[2.5rem] animate-spin opacity-40" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Procesando Información</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center max-w-[280px]">Estamos organizando los datos de tu propiedad para nuestros expertos.</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* STEP 1: PERSONAL INFO */}
            {step === 1 && (
              <div className="space-y-10">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-[0.9] mb-4">
                    Queremos<br />conocerte
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Inicia el proceso de avalúo con tus datos básicos.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre(s)</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Escribe tu nombre"
                      className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primer Apellido</label>
                      <input
                        type="text"
                        value={formData.lastName1}
                        onChange={(e) => setFormData({ ...formData, lastName1: e.target.value })}
                        placeholder="Apellido Paterno"
                        className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Segundo Apellido</label>
                      <input
                        type="text"
                        value={formData.lastName2}
                        onChange={(e) => setFormData({ ...formData, lastName2: e.target.value })}
                        placeholder="Apellido Materno"
                        className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PROPERTY TYPE */}
            {step === 2 && (
              <div className="space-y-10">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-[0.9] mb-4">
                    ¿Qué tipo de<br />inmueble es?
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Selecciona la categoría que mejor describa tu propiedad.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button
                    onClick={() => setFormData({ ...formData, propertyType: 'casa' })}
                    className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${formData.propertyType === 'casa' ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-colors duration-500 ${formData.propertyType === 'casa' ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary'}`}>
                      <span className="material-symbols-outlined text-3xl">home</span>
                    </div>
                    <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${formData.propertyType === 'casa' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Casa</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Residencia Única</p>
                    {formData.propertyType === 'casa' && (
                      <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white scale-110 shadow-glow">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setFormData({ ...formData, propertyType: 'departamento' })}
                    className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${formData.propertyType === 'departamento' ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-colors duration-500 ${formData.propertyType === 'departamento' ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary'}`}>
                      <span className="material-symbols-outlined text-3xl">apartment</span>
                    </div>
                    <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${formData.propertyType === 'departamento' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Inmueble</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Depa / Local / Oficina</p>
                    {formData.propertyType === 'departamento' && (
                      <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white scale-110 shadow-glow">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LOCATION */}
            {step === 3 && (
              <div className="space-y-10">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-[0.9] mb-4">
                    ¿Dónde se<br />encuentra?
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Asegúrate de que la ubicación en el mapa sea la correcta.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary">
                        <span className="material-symbols-outlined">place</span>
                      </div>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value, isLocationConfirmed: false })}
                        placeholder="Calle, Número, Colonia, Ciudad..."
                        className="w-full h-18 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-3xl pl-16 pr-6 font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      />
                    </div>

                    <button
                      onClick={detectLocation}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-primary/10 text-primary border-2 border-primary/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95 mb-4"
                    >
                      <span className="material-symbols-outlined text-base">my_location</span>
                      Detectar mi ubicación actual (GPS)
                    </button>

                    {formData.location ? (
                      <div className="space-y-4">
                        <div className="rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl h-80 relative group">
                          <iframe
                            width="100%"
                            height="100%"
                            src={mapUrl}
                            frameBorder="0"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="w-full h-full"
                            title="Ubicación en Google Maps"
                          />
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, isLocationConfirmed: !formData.isLocationConfirmed })}
                          className={`w-full p-6 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${formData.isLocationConfirmed ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400'}`}
                        >
                          <span className="material-symbols-outlined">{formData.isLocationConfirmed ? 'check_circle' : 'radio_button_unchecked'}</span>
                          <span className="text-xs font-black uppercase tracking-[0.1em]">Sí, esta es mi propiedad</span>
                        </button>
                      </div>
                    ) : (
                      <div className="h-64 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 dark:border-white/5">
                        <span className="material-symbols-outlined text-4xl text-slate-300">map</span>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Ingresa tu dirección o usa el GPS</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PHYSICAL SPECS */}
            {step === 4 && (
              <div className="space-y-10">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-[0.9] mb-4">
                    Detalles<br />Técnicos
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Dinos qué tan grande y equipada está tu propiedad.</p>
                </div>

                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">M² Construcción</label>
                      <div className="relative group">
                        <input
                          type="number"
                          value={formData.constArea}
                          onChange={(e) => setFormData({ ...formData, constArea: Number(e.target.value) })}
                          className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 font-black text-2xl text-primary outline-none focus:border-primary transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M²</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">M² Terreno</label>
                      <div className="relative group">
                        <input
                          type="number"
                          value={formData.landArea}
                          onChange={(e) => setFormData({ ...formData, landArea: Number(e.target.value) })}
                          className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 font-black text-2xl text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M²</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 text-center space-y-3">
                      <span className="material-symbols-outlined text-slate-400">bed</span>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setFormData({ ...formData, beds: Math.max(0, formData.beds - 1) })} className="text-slate-300 hover:text-primary transition-colors">-</button>
                        <span className="text-xl font-black">{formData.beds}</span>
                        <button onClick={() => setFormData({ ...formData, beds: formData.beds + 1 })} className="text-slate-300 hover:text-primary transition-colors">+</button>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recámaras</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 text-center space-y-3">
                      <span className="material-symbols-outlined text-slate-400">bathtub</span>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setFormData({ ...formData, baths: Math.max(0, formData.baths - 1) })} className="text-slate-300 hover:text-primary transition-colors">-</button>
                        <span className="text-xl font-black">{formData.baths}</span>
                        <button onClick={() => setFormData({ ...formData, baths: formData.baths + 1 })} className="text-slate-300 hover:text-primary transition-colors">+</button>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Baños</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 text-center space-y-3">
                      <span className="material-symbols-outlined text-slate-400">history</span>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setFormData({ ...formData, age: Math.max(0, formData.age - 1) })} className="text-slate-300 hover:text-primary transition-colors">-</button>
                        <span className="text-xl font-black">{formData.age}</span>
                        <button onClick={() => setFormData({ ...formData, age: formData.age + 1 })} className="text-slate-300 hover:text-primary transition-colors">+</button>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Antigüedad (años)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: EQUIPMENT & EXTRAS */}
            {step === 5 && (
              <div className="space-y-12">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-[0.9] mb-4">
                    Equipamiento<br />y Amenidades
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Selecciona los servicios con los que cuenta la propiedad.</p>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado de amueblado</label>
                    <div className="flex p-2 bg-slate-100 dark:bg-slate-800 rounded-3xl gap-2">
                      {['none', 'semi', 'full'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setFormData({ ...formData, furnishing: m })}
                          className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.furnishing === m ? 'bg-white dark:bg-slate-900 text-primary shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {m === 'none' ? 'Sin amueblar' : m === 'semi' ? 'Semi' : 'Equipada'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amenidades Principales</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Alberca', 'Gimnasio', 'Seguridad 24/7', 'Roof Garden', 'Elevador', 'Cancha de Pádel', 'Asadores', 'Salón de Eventos'].map(amenity => (
                        <button
                          key={amenity}
                          onClick={() => toggleItem(formData.amenities, amenity, 'amenities')}
                          className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest text-left transition-all ${formData.amenities.includes(amenity) ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{amenity}</span>
                            {formData.amenities.includes(amenity) && <span className="material-symbols-outlined text-xs">done</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Servicios Disponibles</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Fibra Óptica', 'Gas Natural', 'Cisterna', 'Aire Acondicionado', 'Hidroneumático', 'Panel Solar'].map(service => (
                        <button
                          key={service}
                          onClick={() => toggleItem(formData.services, service, 'services')}
                          className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest text-left transition-all ${formData.services.includes(service) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-200'}`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: FINAL SUCCESS */}
            {step === 6 && (
              <div className="text-center py-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="space-y-6">
                  <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-500/30">
                    <span className="material-symbols-outlined text-5xl">task_alt</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none mb-4">
                      ¡Solicitud<br />Enviada!
                    </h1>
                    <div className="max-w-[320px] mx-auto space-y-6">
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
                        Gracias <span className="text-primary font-bold">{formData.firstName}</span>. Hemos recibido la información técnica de tu propiedad.
                      </p>
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30 text-left">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                          <span className="material-symbols-outlined text-base align-middle mr-2">contact_support</span>
                          Un asesor se pondrá en contacto contigo a través de <span className="font-black">WhatsApp</span> para enviarte tu avalúo cuando esté listo y manejar el tema del pago.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="px-12 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm uppercase tracking-widest rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Volver al Inicio
                </button>
              </div>
            )}

            {/* NAVIGATION BUTTONS (FOOTER) */}
            {step < 6 && (
              <div className="mt-16 pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col gap-4">
                <button
                  onClick={step === 5 ? handleFinalSubmit : () => handleStepChange(step + 1)}
                  disabled={
                    (step === 1 && (!formData.firstName || !formData.lastName1 || !formData.lastName2)) ||
                    (step === 3 && (!formData.location || !formData.isLocationConfirmed))
                  }
                  className={`w-full h-20 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-glow ${(step === 1 && (!formData.firstName || !formData.lastName1 || !formData.lastName2)) || (step === 3 && (!formData.location || !formData.isLocationConfirmed)) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02] active:scale-95 shadow-primary/30'}`}
                >
                  {step === 5 ? 'Acepto y deseo generar solicitud' : 'Continuar al siguiente paso'}
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>

                {step > 1 && (
                  <button
                    onClick={() => handleStepChange(step - 1)}
                    className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Paso Anterior
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AppraisalForm;
