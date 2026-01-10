import React from 'react';

interface PropertyPreviewProps {
    formData: any;
    mode: 'sale' | 'rent';
    onEdit?: () => void;
    onConfirm?: () => void;
    termsContent?: React.ReactNode;
}

const FeatureSection = ({ title, features }: { title: string; features: string[] }) => (
    <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary"></span>{title}</h3>
        <div className="flex flex-wrap gap-2">
            {features.length > 0 ? features.map((f, i) => (
                <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">{f}</span>
            )) : <span className="text-[10px] font-bold text-slate-400">No especificado</span>}
        </div>
    </div>
);

const PropertyPreview: React.FC<PropertyPreviewProps> = ({ formData, mode, onEdit, onConfirm, termsContent }) => {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-7 space-y-6">
                    <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-2xl group">
                        <img src={formData.main_image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop'} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-8 right-8 bg-white/20 backdrop-blur-2xl border border-white/30 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="material-symbols-outlined text-xl">photo_library</span>
                            {formData.gallery_urls?.length + 1} Fotos
                        </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar">
                        {formData.gallery_urls?.map((url: string, i: number) => (
                            <div key={i} className="flex-none w-24 aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-white/5"><img src={url} className="w-full h-full object-cover" alt="" /></div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">REF: MAGNO-{Math.floor(Math.random() * 90000) + 10000}</p>
                        <h1 className="text-4xl sm:text-[3.5rem] font-black uppercase tracking-tighter leading-[0.85] text-slate-950 dark:text-white">
                            {formData.title ? formData.title : <span className="text-slate-300 italic">UN ASESOR ASIGNARÁ EL TÍTULO</span>}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 pt-4"><span className="material-symbols-outlined text-primary text-base">location_on</span>{formData.address || 'Ubicación Provisoria'}</p>
                    </div>

                    <div className="py-8 border-y border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Inversión Propuesta</p>
                        <div className="flex flex-wrap items-baseline gap-3">
                            <p className="text-6xl font-black text-primary tracking-tighter">${parseFloat(formData.price || '0').toLocaleString()}</p>
                            {formData.maintenance_fee && <span className="text-xs font-bold text-slate-400">+ ${parseFloat(formData.maintenance_fee).toLocaleString()} Mant.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-white/5 space-y-1 shadow-lg">
                            <span className="material-symbols-outlined text-primary text-xl">bed</span>
                            <p className="text-sm font-black text-white leading-none">{formData.rooms}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Recs</p>
                        </div>
                        <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-white/5 space-y-1 shadow-lg">
                            <span className="material-symbols-outlined text-primary text-xl">bathtub</span>
                            <p className="text-sm font-black text-white leading-none">{formData.bathrooms}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Baños</p>
                        </div>
                        <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-white/5 space-y-1 shadow-lg">
                            <span className="material-symbols-outlined text-primary text-xl">square_foot</span>
                            <p className="text-sm font-black text-white leading-none">{formData.construction_area || '0'}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Terreno</p>
                        </div>
                        <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-white/5 space-y-1 shadow-lg">
                            <span className="material-symbols-outlined text-primary text-xl">history</span>
                            <p className="text-sm font-black text-white leading-none truncate">{formData.age_status === 'Años de antigüedad' ? `${formData.age_years} Años` : formData.age_status}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Antigüedad</p>
                        </div>
                    </div>

                    {/* Amenities moved into the sidebar */}
                    <div className="space-y-8 py-6 border-t border-slate-100 dark:border-white/5">
                        {mode === 'sale' ? (
                            <>
                                <FeatureSection title="Servicios" features={formData.features || []} />
                                <FeatureSection title="Características de la Propiedad" features={formData.mobiliario || []} />
                            </>
                        ) : (
                            <>
                                <FeatureSection title="Servicios" features={formData.included_services || []} />
                                <FeatureSection title="Equipamiento" features={formData.features || []} />
                                <FeatureSection title="Mobiliario y Seguridad" features={formData.mobiliario || []} />
                            </>
                        )}
                    </div>

                    <div className="space-y-4 opacity-40 cursor-not-allowed grayscale pt-4">
                        <button disabled className="w-full bg-slate-950 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3"><span className="material-symbols-outlined">home_work</span>{mode === 'sale' ? 'COMPRAR PROPIEDAD' : `RENTAR PROPIEDAD`}</button>
                        <button disabled className="w-full bg-green-500 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3"><span className="material-symbols-outlined">chat</span>WhatsApp Directo</button>
                    </div>
                </div>
            </div>

            <div className="space-y-10">
                <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-white/5 rounded-[3rem] p-10 sm:p-14 shadow-xl">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-10">Descripción Detallada</h2>
                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {formData.description ? formData.description : <span className="text-slate-400 italic">EN CUANTO REVISEMOS TU PROPIEDAD NOSOTROS PONDREMOS LA DESCRIPCIÓN</span>}
                    </p>

                    {/* Google Maps Integration */}
                    {/* Google Maps Integration */}
                    {formData.address && (
                        <div className="mt-12 pt-10 border-t border-slate-50 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-primary"></span>
                                Ubicación de la Propiedad
                            </h3>
                            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-inner group">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.address)}`}
                                    className="grayscale group-hover:grayscale-0 transition-all duration-700"
                                ></iframe>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-sm">location_on</span>{formData.address}</p>
                        </div>
                    )}
                </div>

                {termsContent}

                {onConfirm && (
                    <div className="bg-slate-900 border border-white/10 p-10 sm:p-16 rounded-[4rem] space-y-12 shadow-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 text-center space-y-3">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Confirmación Final</h3>
                            <p className="text-2xl sm:text-3xl font-black text-white uppercase">¿Todo listo para publicar?</p>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <button onClick={onConfirm} className="px-10 py-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-glow">
                                Confirmar y Enviar
                            </button>
                            <button onClick={onEdit} className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">
                                Volver a Editar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyPreview;
