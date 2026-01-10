
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property, PropertyStatus } from '../types';
import { supabase } from '../services/supabaseClient';

interface PropertyRegisterProps {
  onComplete?: (p: Property) => void;
}

const PropertyRegister: React.FC<PropertyRegisterProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '',
    address: '', propertyType: 'Casa Habitación',
    beds: 0, baths: 0, area: 0, parking: 0, age: 0, levels: 1,
    services: [] as string[],
    amenities: [] as string[],
    spaces: [] as string[],
    description: ''
  });

  const SERVICE_OPTIONS = ['Agua', 'Luz', 'Drenaje', 'Gas Natural', 'Internet Fibra', 'Cisterna', 'Seguridad Privada', 'Recolección de Basura'];
  const AMENITY_OPTIONS = ['Alberca', 'Gimnasio', 'Roof Garden', 'Cancha de Pádel', 'Elevador', 'Salón de Eventos', 'Área de Juegos', 'Pet Park', 'Seguridad 24/7', 'Circuito Cerrado'];
  const SPACE_OPTIONS = ['Cocina Integral', 'Patio de Servicio', 'Terraza', 'Jardín Privado', 'Bodega', 'Estudio / Oficina', 'Cuarto de Servicio', 'Comedor', 'Sala de Estar'];

  const toggleItem = (list: 'services' | 'amenities' | 'spaces', item: string) => {
    const current = [...formData[list]];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    setFormData({ ...formData, [list]: updated });
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.from('properties').insert([{
        ref: `CAPT-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `Captación: ${formData.fullName}`,
        address: formData.address,
        status: PropertyStatus.PENDING_REVIEW,
        price: 0,
        type: 'rent',
        description: formData.description,
        specs: {
          beds: formData.beds,
          baths: formData.baths,
          parking: formData.parking,
          area: formData.area,
          age: formData.age,
          levels: formData.levels
        },
        services: formData.services,
        amenities: formData.amenities,
        spaces: formData.spaces,
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800']
      }]).select().single();

      if (error) throw error;

      const newProp: Property = {
        ...data,
        id: data.id,
        mainImage: data.main_image,
        maintenanceFee: 0,
        specs: data.specs || {},
        images: data.images || [],
        services: data.services || [],
        amenities: data.amenities || [],
        spaces: data.spaces || [],
        additionals: [],
        documents: []
      };

      if (onComplete) onComplete(newProp);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Error saving captación:", err);
      alert("Error al enviar la captación. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center font-display">
        <div className="max-w-md animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto mb-8 shadow-glow ring-8 ring-white dark:ring-slate-900">
            <span className="material-symbols-outlined text-5xl font-black">verified</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 text-slate-900 dark:text-white leading-none">¡Registro de Captación Exitoso!</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed mb-10">
            Gracias {formData.fullName.split(' ')[0]}. Hemos recibido toda la información detallada de tu propiedad. Un asistente de Magno te contactará en breve para agendar la visita técnica, toma de fotos y entrega de llaves.
          </p>
          <button onClick={() => navigate('/')} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-40 font-display">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 pt-12 pb-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined font-black">arrow_back</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Regresar</span>
        </button>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary shadow-glow' : 'bg-gray-100 dark:bg-slate-800'}`} />
          ))}
        </div>
        <div className="w-12" />
      </header>

      <div className="px-6 py-12 max-w-2xl mx-auto">
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-3 leading-none">Datos de Identidad</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em]">PASO 1 DE 4 • INFORMACIÓN DE CONTACTO</p>
            </div>
            <div className="space-y-6">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Nombre Completo del Propietario</label>
                <input required placeholder="Ej. Juan Pérez García" className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Correo Electrónico Personal</label>
                <input required type="email" placeholder="propietario@email.com" className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Teléfono de Contacto</label>
                <input required placeholder="+52 33 0000 0000" className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <button type="button" onClick={handleNext} className="w-full bg-primary text-white font-black py-7 rounded-[2.5rem] shadow-glow uppercase text-[12px] tracking-[0.4em] active:scale-95 transition-all mt-8">
              Siguiente Sección
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-3 leading-none">Geolocalización</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em]">PASO 2 DE 4 • UBICACIÓN Y TIPO</p>
            </div>
            <div className="space-y-6">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Categoría de Inmueble</label>
                <select className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-none font-black uppercase text-[11px] tracking-widest appearance-none shadow-inner" value={formData.propertyType} onChange={e => setFormData({ ...formData, propertyType: e.target.value })}>
                  <option>Casa Habitación</option>
                  <option>Departamento / Loft</option>
                  <option>Local Comercial</option>
                  <option>Oficina / Corporativo</option>
                  <option>Terreno / Lote</option>
                  <option>Bodega Industrial</option>
                </select>
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Dirección Completa</label>
                <input required placeholder="Calle, Número, Colonia, Municipio" className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div className="h-72 bg-[#020617] rounded-[3.5rem] relative overflow-hidden flex flex-col items-center justify-center text-center p-10 border border-white/5 shadow-2xl group">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent group-hover:scale-110 transition-transform duration-700" />
                <span className="material-symbols-outlined text-primary text-6xl font-black mb-4 animate-bounce">location_on</span>
                <h5 className="text-white text-[10px] font-black uppercase tracking-[0.4em] z-10">Magno Geo-Intelligence</h5>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-2 z-10 max-w-xs">{formData.address || "Ingrese dirección para verificar cobertura Magno"}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleBack} className="w-24 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black py-7 rounded-[2.5rem] uppercase text-[10px] tracking-widest">Atrás</button>
              <button onClick={handleNext} className="flex-1 bg-primary text-white font-black py-7 rounded-[2.5rem] shadow-glow uppercase text-[12px] tracking-[0.4em]">Siguiente Sección</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-3 leading-none">Ficha Técnica</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em]">PASO 3 DE 4 • ESPECIFICACIONES ARQUITECTÓNICAS</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Recámaras', key: 'beds', icon: 'bed' },
                { label: 'Baños', key: 'baths', icon: 'bathtub' },
                { label: 'Cochera', key: 'parking', icon: 'directions_car' },
                { label: 'M² Const.', key: 'area', icon: 'square_foot' },
                { label: 'Niveles', key: 'levels', icon: 'layers' },
                { label: 'Años Antig.', key: 'age', icon: 'calendar_today' },
              ].map(spec => (
                <div key={spec.key} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] flex flex-col items-center shadow-inner group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-primary/20">
                  <span className="material-symbols-outlined text-primary mb-2 text-xl">{spec.icon}</span>
                  <input type="number" className="w-full bg-transparent border-none p-0 font-black text-xl text-center focus:ring-0" onChange={e => setFormData({ ...formData, [spec.key]: Number(e.target.value) })} defaultValue={0} />
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{spec.label}</label>
                </div>
              ))}
            </div>

            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 mb-2 block">Descripción Detallada (Opcional)</label>
              <textarea placeholder="Cuéntanos los puntos fuertes de tu propiedad..." rows={4} className="w-full bg-slate-50 dark:bg-slate-900 p-8 rounded-[3rem] border-none font-bold text-sm resize-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="w-24 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black py-7 rounded-[2.5rem] uppercase text-[10px] tracking-widest">Atrás</button>
              <button onClick={handleNext} className="flex-1 bg-primary text-white font-black py-7 rounded-[2.5rem] shadow-glow uppercase text-[12px] tracking-[0.4em]">Siguiente Sección</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-3 leading-none">Equipamiento</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em]">PASO 4 DE 4 • SERVICIOS, AMENIDADES Y ESPACIOS</p>
            </div>

            <div className="space-y-10">
              <section>
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-5 ml-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">settings_input_component</span>
                  Servicios Incluidos
                </h4>
                <div className="flex flex-wrap gap-2 px-2">
                  {SERVICE_OPTIONS.map(opt => (
                    <button type="button" key={opt} onClick={() => toggleItem('services', opt)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.services.includes(opt) ? 'bg-primary border-primary text-white shadow-glow' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400 hover:border-gray-200'}`}>{opt}</button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-500 mb-5 ml-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">star</span>
                  Amenidades Destacadas
                </h4>
                <div className="flex flex-wrap gap-2 px-2">
                  {AMENITY_OPTIONS.map(opt => (
                    <button type="button" key={opt} onClick={() => toggleItem('amenities', opt)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.amenities.includes(opt) ? 'bg-amber-500 border-amber-500 text-white shadow-glow' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400 hover:border-gray-200'}`}>{opt}</button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white mb-5 ml-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">meeting_room</span>
                  Espacios del Inmueble
                </h4>
                <div className="flex flex-wrap gap-2 px-2">
                  {SPACE_OPTIONS.map(opt => (
                    <button type="button" key={opt} onClick={() => toggleItem('spaces', opt)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.spaces.includes(opt) ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white shadow-glow' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400 hover:border-gray-200'}`}>{opt}</button>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="w-24 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black py-7 rounded-[2.5rem] uppercase text-[10px] tracking-widest">Atrás</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary text-white font-black py-7 rounded-[2.5rem] shadow-glow uppercase text-[12px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                {loading ? <div className="w-5 h-5 border-4 border-white/40 border-t-white rounded-full animate-spin" /> : "Finalizar y Enviar Expediente"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyRegister;
