
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Property } from '../types';
import { useToast } from '../context/ToastContext';
import { generateGoogleCalendarLink } from '../services/calendarService';

const GeneralApplication: React.FC = () => {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [operationFilter, setOperationFilter] = useState<'all' | 'sale' | 'rent'>('all');
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    // Application Form State
    const [appStep, setAppStep] = useState(1);
    const [appData, setAppData] = useState({
        firstNames: '',
        lastNames: '',
        phone: '',
        email: '',

        // Rent Specific
        adults: 1,
        children: 0,
        hasPets: false,
        knowsArea: false,
        wantToKnowArea: true, // New: if they don't know it, do they want to?

        reason: '',
        urgency: 'asap',
        moveInDate: '', // New
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
        requirementsMismatch: false, // New: flag if they don't meet reqs but submit anyway
        appointmentDate: '',
        appointmentTime: '',
        calendarLink: ''
    });

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const { data, error } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('status', 'available'); // Only active properties

                if (error) throw error;

                // Basic mapping to Match Property Interface (simplified for selection)
                const mapped: Property[] = (data || []).map((p: any) => ({
                    ...p,
                    specs: p.specs || {},
                    mainImage: p.main_image,
                    maintenanceFee: p.maintenance_fee || 0
                }));
                setProperties(mapped);
            } catch (err: any) {
                console.error('Error fetching properties:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const filteredProperties = properties.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ref.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = operationFilter === 'all' || p.type === operationFilter;
        return matchesSearch && matchesType;
    });

    const submitApplication = async (type: 'rent' | 'sale') => {
        if (!selectedProperty) return;

        try {
            const fullName = `${appData.firstNames} ${appData.lastNames}`.trim();

            const commonData = {
                property_id: selectedProperty.id,
                property_ref: selectedProperty.ref,
                full_name: fullName,
                phone: appData.phone,
                email: appData.email,
                knows_area: appData.knowsArea,
                reason: appData.reason,
                appointment_date: appData.appointmentDate,
                appointment_time: appData.appointmentTime,
                status: 'pending',
                application_type: type,
                notes: appData.requirementsMismatch ? '⚠️ Cliente indicó NO cumplir con todos los requisitos.' : ''
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
                move_in_date: appData.moveInDate
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
                ? `Visita para RENTA.\n\nPropiedad: ${selectedProperty.title}\nRef: ${selectedProperty.ref}\nCliente: ${fullName}\n${appData.requirementsMismatch ? '⚠️ OJO: Cliente marcó NO cumplir requisitos.' : ''}`
                : `Visita para COMPRA.\n\nPropiedad: ${selectedProperty.title}\nRef: ${selectedProperty.ref}\nCliente: ${fullName}`;

            const calendarLink = generateGoogleCalendarLink(
                `Visita: ${selectedProperty.title} (${type === 'rent' ? 'Renta' : 'Venta'})`,
                description,
                selectedProperty.address,
                start.toISOString(),
                end.toISOString()
            );

            await supabase.from('appointments').insert([{
                property_id: selectedProperty.id,
                title: `Visita: ${selectedProperty.title} (${type === 'rent' ? 'Renta' : 'Venta'}) ${appData.requirementsMismatch ? '(Alert)' : ''}`,
                client_name: fullName,
                client_phone: appData.phone,
                client_email: appData.email,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                calendar_event_id: `gcal_${Date.now()}`,
                status: 'scheduled'
            }]);

            success('¡Solicitud enviada correctamente!');
            setAppData(prev => ({ ...prev, calendarLink: calendarLink }));
            setAppStep(7); // Show Success State

        } catch (err: any) {
            console.error(err);
            error('Error al enviar solicitud: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="hover:scale-105 transition-transform">
                        <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno" className="h-10 w-auto" />
                    </button>
                    <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    <h1 className="hidden md:block text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Agendar Visita</h1>
                </div>
                {selectedProperty && (
                    <button onClick={() => { setSelectedProperty(null); setAppStep(1); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">change_circle</span> Cambiar Propiedad
                    </button>
                )}
            </header>

            <div className="max-w-3xl mx-auto px-6 py-12">
                {!selectedProperty ? (
                    // STEP 0: SELECT PROPERTY
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-primary">
                                <span className="material-symbols-outlined text-4xl">travel_explore</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                                ¿Qué propiedad <span className="text-primary">visitarás?</span>
                            </h2>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                                Selecciona la propiedad de nuestro catálogo para iniciar tu solicitud de visita o renta de manera segura.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group max-w-xl mx-auto">
                            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por zona, nombre o referencia..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 pl-14 pr-6 py-5 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                        {/* Filter Buttons */}
                        <div className="flex justify-center gap-3 mt-8">
                            <button
                                onClick={() => setOperationFilter('all')}
                                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${operationFilter === 'all'
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                Todas
                            </button>
                            <button
                                onClick={() => setOperationFilter('sale')}
                                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${operationFilter === 'sale'
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-500'
                                    }`}
                            >
                                En Venta
                            </button>
                            <button
                                onClick={() => setOperationFilter('rent')}
                                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${operationFilter === 'rent'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-500'
                                    }`}
                            >
                                En Renta
                            </button>
                        </div>
                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            {filteredProperties.map(property => (
                                <div
                                    key={property.id}
                                    onClick={() => setSelectedProperty(property)}
                                    className="group bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all cursor-pointer flex gap-4 items-center"
                                >
                                    <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                                        <img src={property.mainImage} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${property.type === 'sale' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                {property.type === 'sale' ? 'Venta' : 'Renta'}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Ref: {property.ref}</span>
                                        </div>
                                        <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white truncate mb-1">{property.title}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 truncate">{property.address}</p>
                                        <p className="text-sm font-black text-primary mt-2">${property.price.toLocaleString()}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredProperties.length === 0 && (
                            <div className="text-center py-12 opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">sentiment_dissatisfied</span>
                                <p className="text-sm font-bold">No encontramos propiedades.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // STEP 1+: APPLICATION FORM
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5 animate-in slide-in-from-right-8 duration-500">
                        {/* Selected Property Header */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex items-center gap-6">
                            <img src={selectedProperty.mainImage} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt="" />
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2"> Solicitar {selectedProperty.type === 'sale' ? 'Compra' : 'Renta'}</h2>
                                <p className="text-xs font-bold text-slate-500">{selectedProperty.title}</p>
                                <div className="flex gap-2 mt-3">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <div key={s} className={`h-1 rounded-full transition-all ${s === appStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 md:p-12">
                            {/* SUCCESS STATE */}
                            {appStep === 7 ? (
                                <div className="text-center py-10">
                                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/30 animate-in zoom-in">
                                        <span className="material-symbols-outlined text-5xl text-white">check</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">¡Solicitud Recibida!</h3>
                                    <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                                        Tu solicitud ha sido enviada exitosamente. Un asesor revisará tu información y confirmará tu cita en breve.
                                    </p>
                                    {appData.calendarLink && (
                                        <a href={appData.calendarLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-[#4285F4] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#3367D6] transition-colors shadow-lg shadow-blue-500/30 mb-4">
                                            <span className="material-symbols-outlined">calendar_add_on</span>
                                            Agregar a Google Calendar
                                        </a>
                                    )}
                                    <button onClick={() => navigate('/')} className="block w-full text-center text-slate-400 font-bold text-xs uppercase hover:text-primary mt-8">Volver al Inicio</button>
                                </div>
                            ) : (
                                // FORM STEPS
                                <div className="space-y-8">
                                    {/* STEP 1: PERSONAL INFO */}
                                    {appStep === 1 && (
                                        <div className="space-y-6 animate-in fade-in">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Información Personal</h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombres</label>
                                                        <input type="text" value={appData.firstNames} onChange={e => setAppData({ ...appData, firstNames: e.target.value })} placeholder="Ej. Juan Carlos" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Apellidos</label>
                                                        <input type="text" value={appData.lastNames} onChange={e => setAppData({ ...appData, lastNames: e.target.value })} placeholder="Ej. Pérez González" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                                                        <input type="number" value={appData.phone} onChange={e => setAppData({ ...appData, phone: e.target.value })} placeholder="10 dígitos" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                                                        <input type="email" value={appData.email} onChange={e => setAppData({ ...appData, email: e.target.value })} placeholder="correo@ejemplo.com" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        if (!appData.firstNames || !appData.lastNames || !appData.phone || !appData.email) return error('Completa todos los campos');
                                                        if (appData.phone.length !== 10) return error('El teléfono debe tener 10 dígitos');
                                                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appData.email)) return error('Ingresa un correo válido');
                                                        setAppStep(2);
                                                    }}
                                                    className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all"
                                                >
                                                    Continuar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: PROFILE */}
                                    {appStep === 2 && (
                                        <div className="space-y-6 animate-in fade-in">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                                                {selectedProperty.type === 'rent' ? '¿Cuántas personas van a vivir en la propiedad?' : 'Perfil de Comprador'}
                                            </h3>

                                            {selectedProperty.type === 'rent' ? (
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Adultos</label>
                                                            <input type="number" placeholder="0" value={appData.adults} onChange={e => setAppData({ ...appData, adults: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Niños</label>
                                                            <input type="number" placeholder="0" value={appData.children} onChange={e => setAppData({ ...appData, children: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {/* Has Pets? Yes/No */}
                                                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">¿Tienes mascotas?</span>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setAppData({ ...appData, hasPets: true })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appData.hasPets ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>Sí</button>
                                                                <button onClick={() => setAppData({ ...appData, hasPets: false })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!appData.hasPets ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>No</button>
                                                            </div>
                                                        </div>

                                                        {/* Knows Area? Yes/No */}
                                                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">¿Conoces la zona?</span>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setAppData({ ...appData, knowsArea: true })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appData.knowsArea ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>Sí</button>
                                                                <button onClick={() => setAppData({ ...appData, knowsArea: false })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!appData.knowsArea ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>No</button>
                                                            </div>
                                                        </div>

                                                        {/* New: Why do you want to rent here? */}
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Por qué quieres rentar en esta propiedad?</label>
                                                            <textarea
                                                                value={appData.reason}
                                                                onChange={e => setAppData({ ...appData, reason: e.target.value })}
                                                                placeholder="Ej. Cercanía al trabajo, escuelas, etc."
                                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none h-24 resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <textarea placeholder="¿Cuál es tu motivo de compra?" value={appData.reason} onChange={e => setAppData({ ...appData, reason: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none h-32 resize-none" />
                                                </div>
                                            )}

                                            <div className="flex justify-between pt-4">
                                                <button onClick={() => setAppStep(1)} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600">Atrás</button>
                                                <button onClick={() => setAppStep(3)} className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">Continuar</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: FINANCIALS & MOVE PLANS */}
                                    {appStep === 3 && (
                                        <div className="space-y-6 animate-in fade-in">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Planes y Finanzas</h3>

                                            {selectedProperty.type === 'rent' ? (
                                                <div className="space-y-6">
                                                    {/* Move Plans */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha deseada de mudanza</label>
                                                            <input
                                                                type="date"
                                                                value={appData.moveInDate}
                                                                min={new Date().toISOString().split('T')[0]}
                                                                onChange={e => setAppData({ ...appData, moveInDate: e.target.value })}
                                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Urgency</label>
                                                            <select value={appData.urgency} onChange={e => setAppData({ ...appData, urgency: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                                <option value="asap">Lo antes posible</option>
                                                                <option value="15days">En 15 días</option>
                                                                <option value="30days">En 1 mes</option>
                                                                <option value="flexible">Flexible</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Tiempo de Renta</label>
                                                        <select value={appData.rentalDuration} onChange={e => setAppData({ ...appData, rentalDuration: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                            <option value="12months">12 Meses (1 año)</option>
                                                            <option value="6months">6 Meses</option>
                                                            <option value="24months">24 Meses (2 años)</option>
                                                        </select>
                                                    </div>

                                                    <hr className="border-slate-100 dark:border-white/5" />

                                                    {/* Financials */}
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Origen de Ingresos</label>
                                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 mb-2">
                                                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-base">info</span>
                                                                    Para rentar requerimos comprobar ingresos vía nómina.
                                                                </p>
                                                            </div>
                                                            <select value={appData.incomeSource} onChange={e => setAppData({ ...appData, incomeSource: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                                <option value="payroll">Nómina (Requerido)</option>
                                                                <option value="bank_statements">Estados de Cuenta</option>
                                                                <option value="other">Otro</option>
                                                            </select>
                                                        </div>

                                                        {/* 3 to 1 Ratio */}
                                                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-900 dark:text-white">Ingresos 3 a 1</p>
                                                                <p className="text-[10px] text-slate-400">¿Tus ingresos comprueban 3 veces la renta?</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setAppData({ ...appData, meetsRatio: true })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appData.meetsRatio ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>Sí</button>
                                                                <button onClick={() => setAppData({ ...appData, meetsRatio: false })} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!appData.meetsRatio ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>No</button>
                                                            </div>
                                                        </div>

                                                        {/* Bureau */}
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Buró de Crédito</label>
                                                            <select value={appData.bureauStatus} onChange={e => setAppData({ ...appData, bureauStatus: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                                <option value="clean">Buró Limpio / Sin Deudas</option>
                                                                <option value="issues">Algunos atrasos menores</option>
                                                                <option value="severe">Problemas en Buró</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // SALE Logic (Simplified for now as requested changes focused on Rent)
                                                <div className="space-y-4">
                                                    <select value={appData.incomeSource} onChange={e => setAppData({ ...appData, incomeSource: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                        <option value="payroll">Nómina</option>
                                                        <option value="bank_statements">Estados de Cuenta</option>
                                                    </select>
                                                    <select value={appData.paymentMethod} onChange={e => setAppData({ ...appData, paymentMethod: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none">
                                                        <option value="bank_loan">Crédito Bancario</option>
                                                        <option value="infonavit">Infonavit / Fovissste</option>
                                                        <option value="cash">Contado</option>
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex justify-between pt-4">
                                                <button onClick={() => setAppStep(2)} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600">Atrás</button>
                                                <button onClick={() => setAppStep(4)} className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">Continuar</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: SCHEDULE & REQUIREMENTS */}
                                    {appStep === 4 && (
                                        <div className="space-y-6 animate-in fade-in">
                                            {selectedProperty.type === 'rent' && (
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Requisitos de Renta</h3>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        {/* 1. Investigación */}
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                                <span className="material-symbols-outlined text-4xl">travel_explore</span>
                                                            </div>
                                                            <div className="relative z-10">
                                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">1. Investigación ($1,050 MXN)</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                    Revisamos buró de crédito (sin deudas graves) y antecedentes legales para asegurar la viabilidad.
                                                                    <br /><span className="font-bold text-primary">Proceso:</span> Pago de investigación → Inmueble Apartado → Resultados en 24-48 hrs.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 2. Comprobación */}
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                                <span className="material-symbols-outlined text-4xl">payments</span>
                                                            </div>
                                                            <div className="relative z-10">
                                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">2. Comprobación de Ingresos</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                    3 meses de recibos de nómina o estados de cuenta bancarios.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 3. Convenio */}
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                                <span className="material-symbols-outlined text-4xl">gavel</span>
                                                            </div>
                                                            <div className="relative z-10">
                                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">3. Convenio de Justicia ($4,500 MXN)</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                    Protección jurídica para ambas partes. Se firma tras aprobar la investigación y asegura la entrega del inmueble en óptimas condiciones.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 4. Pagos Iniciales */}
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                                <span className="material-symbols-outlined text-4xl">price_check</span>
                                                            </div>
                                                            <div className="relative z-10">
                                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">4. Pagos Iniciales</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                    1 Mes de Renta Anticipada + 1 Mes de Depósito en Garantía.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 5. Identificación */}
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                                <span className="material-symbols-outlined text-4xl">badge</span>
                                                            </div>
                                                            <div className="relative z-10">
                                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">5. Identificación Oficial</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                    INE o Pasaporte vigente.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 flex flex-col gap-3">
                                                        <button
                                                            onClick={() => {
                                                                setAppData({ ...appData, acceptedRequirements: true, requirementsMismatch: false });
                                                            }}
                                                            className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${appData.acceptedRequirements
                                                                ? 'bg-primary text-white shadow-lg scale-[1.02]'
                                                                : 'bg-slate-900 text-white shadow-xl hover:scale-105'}`}
                                                        >
                                                            {appData.acceptedRequirements ? 'Requisitos Aceptados' : 'Acepto y Deseo Continuar'}
                                                        </button>

                                                        {!appData.acceptedRequirements && (
                                                            <button
                                                                onClick={() => {
                                                                    window.open(`https://wa.me/526643643763?text=Hola, estoy interesado en ${selectedProperty.title} pero tengo dudas sobre los requisitos.`, '_blank');
                                                                }}
                                                                className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-white/10 hover:border-green-500 hover:text-green-500"
                                                            >
                                                                No cumplo con algún requisito
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {(appData.acceptedRequirements || selectedProperty.type === 'sale') && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mt-8 mb-4">Agendar Visita</h3>
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-center gap-4 mb-4">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-300">
                                                            <span className="material-symbols-outlined">calendar_month</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-blue-800 dark:text-blue-300">Sincronización Automática</p>
                                                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">La cita se bloqueará en nuestra agenda.</p>
                                                        </div>
                                                    </div>
                                                    <input type="date" value={appData.appointmentDate} min={new Date().toISOString().split('T')[0]} onChange={e => setAppData({ ...appData, appointmentDate: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none mb-4" />
                                                    {appData.appointmentDate && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                                                                <button key={t} onClick={() => setAppData({ ...appData, appointmentTime: t })} className={`py-3 rounded-xl font-bold text-xs transition-all ${appData.appointmentTime === t ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'}`}>{t}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-between pt-4">
                                                <button onClick={() => setAppStep(3)} className="text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600">Atrás</button>
                                                <button
                                                    onClick={() => submitApplication(selectedProperty.type)}
                                                    disabled={!appData.appointmentDate || !appData.appointmentTime || (!appData.acceptedRequirements && selectedProperty.type === 'rent')}
                                                    className="bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all w-full md:w-auto"
                                                >
                                                    Confirmar y Enviar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeneralApplication;
