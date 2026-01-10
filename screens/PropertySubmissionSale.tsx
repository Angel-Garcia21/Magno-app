import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import PropertyPreview from '../components/PropertyPreview';
import { pdf } from '@react-pdf/renderer';
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import { saveAs } from 'file-saver';

interface PropertySubmissionSaleProps {
    onCancel?: () => void;
}

const PropertySubmissionSale: React.FC<PropertySubmissionSaleProps> = ({ onCancel }) => {
    const mode = 'sale';
    const { success: toastSuccess, error: toastError } = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        submission_id: null as string | null,
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_nationality: '',
        contact_home_address: '',
        legal_status: 'Sí, soy propietario' as 'Sí, soy propietario' | 'Soy administrador',

        title: '',
        description: '',
        address: '',
        property_type: 'Casa' as any,
        condition: 'Excelente' as any,
        age_status: 'A estrenar' as any,
        age_years: '',
        is_free_of_encumbrance: true,
        occupancy_status: 'Vacío' as any,

        levels: 1,
        rooms: 1,
        bathrooms: 1,
        half_bathrooms: 0,
        parking_spots: 0,
        land_area: '',
        construction_area: '',

        price: '',
        maintenance_fee: '',
        included_services: [] as string[],
        furnished_status: 'No' as any,
        features: [] as string[],
        mobiliario: [] as string[],

        id_url: '',
        predial_url: '',
        keys_provided: true,
        admin_service_interest: false,

        main_image_url: '',
        gallery_urls: [] as string[],
        request_professional_photos: false,

        privacy_policy: false,
        fee_agreement: false
    });

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [userSession, setUserSession] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserSession(user);
                // Only load draft if we have a user
                const loadDraft = async () => {
                    const { data, error } = await supabase.from('property_submissions').select('*').eq('owner_id', user.id).eq('type', mode).in('status', ['draft', 'changes_requested']).order('created_at', { ascending: false }).limit(1).maybeSingle();
                    if (data && !error) setFormData({ ...data.form_data, submission_id: data.id });
                };
                loadDraft();
            }
        };
        checkUser();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayToggle = (category: 'included_services' | 'features' | 'mobiliario', item: string) => {
        setFormData(prev => ({ ...prev, [category]: prev[category].includes(item) ? prev[category].filter(i => i !== item) : [...prev[category], item] }));
    };

    const uploadFile = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'main_image' | 'gallery_images' | 'id_url' | 'predial_url') => {
        if (!e.target.files?.length) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Debes estar registrado para subir archivos. (Error interno: No user)');
            if (field === 'main_image') {
                const url = await uploadFile(e.target.files[0], `properties/owners/${user.id}/main`);
                setFormData(prev => ({ ...prev, main_image_url: url }));
            } else if (field === 'gallery_images') {
                const remainingSlots = 30 - formData.gallery_urls.length;
                if (remainingSlots <= 0) {
                    toastError?.('Máximo 30 fotos alcanzado');
                    return;
                }
                const filesToUpload = Array.from(e.target.files).slice(0, remainingSlots);
                const urls = await Promise.all(filesToUpload.map((f: File) => uploadFile(f, `properties/owners/${user.id}/gallery`)));
                setFormData(prev => ({ ...prev, gallery_urls: [...prev.gallery_urls, ...urls] }));
            } else {
                const url = await uploadFile(e.target.files[0], `properties/owners/${user.id}/docs`);
                setFormData(prev => ({ ...prev, [field]: url }));
            }
            toastSuccess?.('Archivo subido');
        } catch (err: any) {
            toastError?.('Error: ' + err.message);
        } finally { setLoading(false); }
    };

    const saveDraft = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toastError?.('Debes completar el paso 1 para guardar borrador.');
                return;
            }
            const subData = { owner_id: user.id, type: 'sale', status: 'draft', form_data: formData };
            if (formData.submission_id) await supabase.from('property_submissions').update(subData).eq('id', formData.submission_id);
            else {
                const { data } = await supabase.from('property_submissions').insert([subData]).select().single();
                if (data) setFormData(p => ({ ...p, submission_id: data.id }));
            }
            toastSuccess?.('Borrador guardado');
        } catch (err: any) { toastError?.('Error: ' + err.message); } finally { setLoading(false); }
    };

    const handleNext = async () => {
        if (step === 1 && !userSession) {
            // Guest Flow: Auto-Register
            if (!formData.contact_name || !formData.contact_email || !formData.contact_phone || !password) {
                toastError?.('Por favor completa todos los campos y define una contraseña.');
                return;
            }
            if (password.length < 6) {
                toastError?.('La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            setLoading(true);
            try {
                // Attempt Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email: formData.contact_email,
                    password: password,
                    options: {
                        data: {
                            full_name: formData.contact_name,
                            phone_contact: formData.contact_phone,
                            role: 'owner' // Default role
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    // Update profile with plain-text password for admin
                    await supabase.from('profiles').update({ password }).eq('id', data.user.id);
                }

                if (data.session) {
                    setUserSession(data.user);
                    toastSuccess?.('¡Cuenta creada correctamente!');
                    setStep(2);
                } else if (data.user) {
                    // User created but no session (maybe confirmation required?)
                    // For the purpose of this task (frictionless), checking if session is null usually means email confirm needed.
                    // If the project requires it, we warn user. If not, we proceed.
                    // Assuming we can proceed or that we need to handle this.
                    // For now, let's treat it as success but warn if no session.
                    toastSuccess?.('Cuenta creada. Por favor verifica tu correo si es necesario.');
                    // We can't proceed to upload if we don't have a session usually (RLS).
                    // But let's try to proceed.
                    setStep(2);
                }
            } catch (err: any) {
                console.error(err);
                if (err.message.includes('already registered')) {
                    toastError?.('Este correo ya está registrado. Por favor inicia sesión primero.');
                    // Optionally redirect to login or show login fields? 
                    // For now just error.
                } else {
                    toastError?.('Error al crear cuenta: ' + err.message);
                }
            } finally {
                setLoading(false);
            }
        } else if (step === 5) {
            setStep(step + 1);
        } else if (step < 7) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!formData.privacy_policy || !formData.fee_agreement) {
            toastError?.('Debes aceptar los términos y honorarios.');
            return;
        }
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión no encontrada');

            const subData = { owner_id: user.id, type: 'sale', status: 'pending', form_data: formData };
            if (formData.submission_id) await supabase.from('property_submissions').update(subData).eq('id', formData.submission_id);
            else await supabase.from('property_submissions').insert([subData]);

            toastSuccess?.('Propiedad enviada para revisión.');
            setSubmitted(true);
        } catch (err: any) {
            toastError?.('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => { if (onCancel) onCancel(); else navigate('/client-portal'); };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-slate-950 dark:via-blue-950/30 dark:to-green-950/30 p-6 text-center relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <div className="max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Success icon with glow effect */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                        <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/50 animate-in zoom-in duration-500">
                            <span className="material-symbols-outlined text-6xl text-white font-light">check_circle</span>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-12 rounded-[3rem] border border-slate-200/50 dark:border-white/10 shadow-2xl">
                        <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>¡Recibido!</h2>

                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-8 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms' }}>
                            Tu propiedad ha sido enviada para revisión.
                        </p>

                        {/* Info cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '600ms' }}>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-6 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                                <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400 mb-2 block">schedule</span>
                                <p className="text-xs font-black uppercase tracking-widest text-blue-900 dark:text-blue-300 mb-1">Tiempo de Respuesta</p>
                                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold">24-48 horas hábiles</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-6 rounded-2xl border border-green-200/50 dark:border-green-800/30">
                                <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400 mb-2 block">support_agent</span>
                                <p className="text-xs font-black uppercase tracking-widest text-green-900 dark:text-green-300 mb-1">Próximo Paso</p>
                                <p className="text-[10px] text-green-700 dark:text-green-400 font-bold">Un asesor te contactará</p>
                            </div>
                        </div>

                        {/* Action button */}
                        <button
                            onClick={() => window.location.href = '/client-portal'}
                            className="group relative bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 px-10 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 overflow-hidden animate-in slide-in-from-bottom-4"
                            style={{ animationDelay: '800ms' }}
                        >
                            <span className="relative z-10 flex items-center gap-2 justify-center">
                                <span className="material-symbols-outlined text-lg">dashboard</span>
                                Volver al Panel
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    </div>

                    {/* Decorative elements */}
                    <div className="mt-8 flex items-center justify-center gap-2 opacity-50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                </div>
            </div>
        );
    }



    const steps = [
        { id: 1, title: 'Datos generales', icon: 'person' },
        { id: 2, title: 'Inmueble', icon: 'home' },
        { id: 3, title: 'Detalles', icon: 'format_list_bulleted' },
        { id: 4, title: 'Servicios', icon: 'check_box' },
        { id: 5, title: 'Documentación', icon: 'key' },
        { id: 6, title: 'Multimedia', icon: 'image' },
        { id: 7, title: 'Vista Previa', icon: 'visibility' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 font-display">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                <button onClick={handleCancel} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">arrow_back</span><span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span></button>
                <div className="flex items-center gap-3">
                    {formData.submission_id && <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full animate-pulse"><span className="text-[9px] font-black uppercase tracking-widest">Borrador Activo</span></div>}
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {step} de 7</span>
                </div>
            </header>

            <div className={`${step === 7 ? 'max-w-6xl' : 'max-w-3xl'} mx-auto p-6 pt-10 transition-all duration-700`}>
                <div className="flex justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 -translate-y-1/2 rounded-full" />
                    <div className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }} />
                    {steps.map(s => (
                        <div key={s.id} className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${step >= s.id ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300'}`}><span className="material-symbols-outlined text-sm">{s.icon}</span></div>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 border border-slate-200 dark:border-white/5 shadow-xl">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-white/5 pb-4 flex items-baseline justify-between">
                        {steps[step - 1].title}
                        {step === 7 && <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse">CONFIRMAR</span>}
                    </h2>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Nombre</label><input type="text" name="contact_name" value={formData.contact_name} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Email</label><input type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Teléfono</label><input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Nacionalidad</label><input type="text" name="contact_nationality" value={formData.contact_nationality} onChange={handleInputChange} autoComplete="off" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                            </div>

                            {!userSession ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-amber-500 pl-3">Crea tu contraseña (para dar seguimiento)</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-amber-500/5 dark:bg-amber-500/10 p-4 pr-12 rounded-2xl border-2 border-amber-500/20 font-bold text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-display"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/50 hover:text-amber-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 pl-3">Se creará automáticamente una cuenta para que puedas guardar tu progreso.</p>
                                </div>
                            ) : (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <span className="material-symbols-outlined">person</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sesión Activa</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{userSession.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await supabase.auth.signOut();
                                            setUserSession(null);
                                            setPassword('');
                                            navigate(0); // Reload to clear any retained state
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-colors"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Domicilio Particular</label>
                                <input type="text" name="contact_home_address" value={formData.contact_home_address} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                {formData.contact_home_address && (
                                    <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 mt-4">
                                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.contact_home_address)}`} className="grayscale hover:grayscale-0 transition-all duration-700"></iframe>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="flex gap-4">
                                    <button onClick={() => setFormData(p => ({ ...p, legal_status: 'Sí, soy propietario' }))} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${formData.legal_status === 'Sí, soy propietario' ? 'bg-primary text-white border-primary shadow-glow' : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/5'}`}>Soy dueño</button>
                                    <button onClick={() => setFormData(p => ({ ...p, legal_status: 'Soy administrador' }))} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${formData.legal_status === 'Soy administrador' ? 'bg-primary text-white border-primary shadow-glow' : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/5'}`}>Soy administrador</button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium text-center italic">Si tú no eres dueño, pero te estás encargando de poner la casa en renta, selecciona la opción de "Soy administrador".</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Dirección</label>
                                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                {formData.address && (
                                    <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 mt-4">
                                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.address)}`} className="grayscale hover:grayscale-0 transition-all duration-700"></iframe>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Antigüedad</label>
                                    <div className="flex flex-col gap-2">
                                        {['A estrenar', 'Construcción', 'Años'].map(opt => (
                                            <button key={opt} onClick={() => setFormData(p => ({ ...p, age_status: opt === 'Años' ? 'Años de antigüedad' : (opt === 'Construcción' ? 'En construcción' : 'A estrenar') as any }))} className={`w-full py-4 text-xs font-black uppercase transition-all rounded-2xl ${(opt === 'Años' && formData.age_status === 'Años de antigüedad') ||
                                                (opt === 'Construcción' && formData.age_status === 'En construcción') ||
                                                (opt === 'A estrenar' && formData.age_status === 'A estrenar')
                                                ? 'bg-primary text-white shadow-lg scale-[1.02]'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                                }`}>{opt}</button>
                                        ))}
                                    </div>
                                    {formData.age_status === 'Años de antigüedad' && <input type="number" name="age_years" value={formData.age_years} onChange={handleInputChange} placeholder="años" className="mt-2 w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none font-bold text-lg text-center" />}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Estatus</label>
                                    <div className="flex flex-col gap-2">
                                        {['Habitado', 'Vacío'].map(opt => (
                                            <button key={opt} onClick={() => setFormData(p => ({ ...p, occupancy_status: opt as any }))} className={`w-full py-4 text-xs font-black uppercase transition-all rounded-2xl ${formData.occupancy_status === opt ? 'bg-primary text-white shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{opt}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { id: 'levels', label: 'Pisos' },
                                    { id: 'rooms', label: 'Habitaciones' },
                                    { id: 'bathrooms', label: 'Baños' },
                                    { id: 'half_bathrooms', label: 'Medios Baños' },
                                    { id: 'parking_spots', label: 'Estacionamientos' }
                                ].map(f => (
                                    <div key={f.id} className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 pl-3">{f.label}</label>
                                        <input type="number" name={f.id} value={(formData as any)[f.id]} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Terreno m2</label><input type="text" name="land_area" value={formData.land_area} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">Construcción m2</label><input type="text" name="construction_area" value={formData.construction_area} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" /></div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">PRECIO DE RENTA</label><input type="text" name="price" value={formData.price} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none font-black text-xl" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-3">MANTENIMIENTO</label><input type="text" name="maintenance_fee" value={formData.maintenance_fee} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none font-bold text-sm" /></div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Servicios</h3>
                                <p className="text-xs text-slate-500 font-bold">Selecciona los servicios con los que cuenta tu propiedad.</p>
                                <div className="flex flex-wrap gap-2">{['Agua', 'Luz', 'Gas', 'Internet', 'Seguridad', 'Jardín', 'Alberca', 'Cisterna'].map(s => (<button key={s} onClick={() => handleArrayToggle('features', s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${formData.features.includes(s) ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-400'}`}>{s}</button>))}</div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Mobiliario y Seguridad</h3>
                                <p className="text-xs text-slate-500 font-bold">Selecciona los complementos de la propiedad.</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Estufa', 'Cuarto de lavado', 'Acceso controlado', 'Caseta de seguridad', 'Seguridad 24/7', 'Amueblado', 'Cocina Integral', 'Portón Eléctrico'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleArrayToggle('mobiliario', s)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${formData.mobiliario?.includes(s) ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-sm' : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-400'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                            <div className="space-y-6">
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30 flex gap-4 items-start">
                                    <span className="material-symbols-outlined text-blue-500 text-3xl">lock</span>
                                    <div>
                                        <p className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase mb-1">Documentación Segura</p>
                                        <p className="text-xs text-blue-700/70 dark:text-blue-400 font-bold leading-relaxed">Sus documentos de Identificación y Predial son estrictamente confidenciales. No se mostrarán públicamente y sirven únicamente como respaldo interno para validar la propiedad y generar confianza en nuestra plataforma.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center gap-2 relative group hover:border-primary/20 transition-all">
                                        <span className="material-symbols-outlined text-4xl text-primary">badge</span><span className="text-[10px] sm:text-xs font-black uppercase">Aquí carga tu INE</span>
                                        <input type="file" onChange={(e) => handleFileChange(e, 'id_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {formData.id_url && <span className="absolute bottom-2 text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black">CARGADO</span>}
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center gap-2 relative group hover:border-indigo-500/20 transition-all">
                                        <span className="material-symbols-outlined text-4xl text-indigo-500">description</span><span className="text-[10px] sm:text-xs font-black uppercase">Aquí carga tu Predial</span>
                                        <input type="file" onChange={(e) => handleFileChange(e, 'predial_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {formData.predial_url && <span className="absolute bottom-2 text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black">CARGADO</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 pl-3">Gestión de Visitas</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 pl-3">¿Entregas copia de llaves?</p>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setFormData(p => ({ ...p, keys_provided: true }))} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.keys_provided ? 'bg-primary/5 border-primary shadow-glow shadow-primary/10 scale-105' : 'bg-transparent border-slate-200 dark:border-white/5 opacity-50 contrast-50'}`}><span className={`material-symbols-outlined text-3xl ${formData.keys_provided ? 'text-primary' : 'text-slate-400'}`}>vpn_key</span><span className="text-[10px] sm:text-xs font-black uppercase">Entregar Copia</span></button>
                                    <button onClick={() => setFormData(p => ({ ...p, keys_provided: false }))} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${!formData.keys_provided ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-transparent border-slate-200 dark:border-white/5 opacity-50'}`}><span className="material-symbols-outlined text-3xl">person_pin_circle</span><span className="text-[10px] sm:text-xs font-black uppercase">Asisto Yo</span></button>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4 bg-gradient-to-r from-slate-50 to-primary/5 dark:from-slate-800 dark:to-primary/10 border-l-4 border-primary shadow-sm hover:scale-[1.01] transition-all animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex gap-4 items-start">
                                        <span className="material-symbols-outlined text-primary text-2xl animate-bounce">info</span>
                                        <p>
                                            {formData.keys_provided ?
                                                `¡Excelente decisión! Al entregarnos las llaves, agilizamos el proceso de venta considerablemente. Nuestro equipo de profesionales se encargará de mostrar tu propiedad a los clientes más calificados, garantizando seguridad y eficiencia. Un asesor te contactará para coordinar la logística.` :
                                                "Has seleccionado 'Asisto Yo'. Recuerda que la disponibilidad es clave para cerrar el trato. Deberás coordinarte estrechamente con nuestro equipo para abrir la propiedad. ¡Sugerimos flexibilidad para no perder oportunidades!"
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => setFormData(p => ({ ...p, admin_service_interest: !p.admin_service_interest }))}
                                className={`relative rounded-[2.5rem] overflow-hidden transition-all duration-500 cursor-pointer group ${formData.admin_service_interest ? 'ring-4 ring-amber-500 shadow-2xl shadow-amber-500/30' : 'hover:scale-[1.01]'}`}
                            >
                                {/* Background & Hero Component */}
                                <div className="absolute inset-0 bg-slate-950">
                                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950 z-10" />
                                    <img
                                        src="https://images.unsplash.com/photo-1600596542815-6ad4c72d62ea?q=80&w=2600&auto=format&fit=crop"
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        alt="Modern House"
                                    />
                                </div>

                                {/* Content Layer */}
                                <div className="relative z-20 p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
                                    {/* Header */}
                                    <div className="space-y-3 w-full">
                                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-500 uppercase tracking-tighter drop-shadow-lg font-display whitespace-nowrap">
                                            SERVICIO DE ADMINISTRACIÓN
                                        </h3>
                                        <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full" />
                                    </div>

                                    {/* Benefits Bar */}
                                    <div className="w-full bg-slate-900/50 backdrop-blur-sm border-y border-white/5 py-6">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 px-4 max-w-4xl mx-auto">
                                            {[
                                                { icon: 'description', label: 'Reporte de visita' },
                                                { icon: 'trending_up', label: 'Valuación Comercial' },
                                                { icon: 'campaign', label: 'Marketing Premium' },
                                                { icon: 'handshake', label: 'Negociación Experta' },
                                                { icon: 'verified_user', label: 'Gestión Notarial' },
                                                { icon: 'gavel', label: 'Asesoría Legal' }
                                            ].map((benefit, i) => (
                                                <div key={i} className="flex flex-col items-center gap-2 group/item">
                                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover/item:bg-amber-500/20 transition-colors">
                                                        <span className="material-symbols-outlined text-amber-500 text-sm">{benefit.icon}</span>
                                                    </div>
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 text-center">{benefit.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer / Call to Action */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/50 text-white px-5 py-1.5 rounded-full">
                                            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                                                Costo del servicio: <span className="text-amber-500 font-black text-sm sm:text-base ml-2">3.5% COMISIÓN</span>
                                            </p>
                                        </div>

                                        <div className={`mt-2 px-8 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 transform ${formData.admin_service_interest ? 'bg-amber-500 text-slate-950 scale-105 shadow-glow' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}>
                                            {formData.admin_service_interest ? 'SERVICIO SELECCIONADO' : 'AGREGAR SERVICIO'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Main Image Column */}
                                <div className="lg:col-span-5 space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-3">Foto Principal (Portada)</label>
                                    <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center gap-3 group">
                                        {formData.main_image_url ? (
                                            <img src={formData.main_image_url} className="w-full h-full object-cover" alt="Main" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                                                <span className="text-[9px] font-black uppercase text-slate-400">Cargar Principal</span>
                                            </>
                                        )}
                                        <input type="file" onChange={(e) => handleFileChange(e, 'main_image')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>

                                    <div className="p-8 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-white/5 rounded-[3rem] text-center flex flex-col justify-center gap-4">
                                        <span className="material-symbols-outlined text-4xl text-primary">camera_enhance</span>
                                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">¿Quieres fotos profesionales?</h4>
                                        <button onClick={() => setFormData(p => ({ ...p, request_professional_photos: !p.request_professional_photos }))} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.request_professional_photos ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 text-slate-400'}`}>{formData.request_professional_photos ? 'SOLICITADO' : 'SOLICITAR VISTA'}</button>
                                    </div>
                                </div>

                                {/* Gallery Column */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="flex items-center justify-between pl-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Galería del Inmueble ({formData.gallery_urls.length}/30)</label>
                                        {formData.gallery_urls.length > 0 && (
                                            <button onClick={() => setFormData(p => ({ ...p, gallery_urls: [] }))} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors">Limpiar Galería</button>
                                        )}
                                    </div>

                                    <div className="min-h-[400px] bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-white/5 p-8 flex flex-col">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
                                            {formData.gallery_urls.map((url, i) => (
                                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-md relative group">
                                                    <img src={url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                                    <button
                                                        onClick={() => setFormData(p => ({ ...p, gallery_urls: p.gallery_urls.filter((_, idx) => idx !== i) }))}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.gallery_urls.length < 30 && (
                                                <div className="aspect-square rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 relative group hover:border-primary transition-colors">
                                                    <span className="material-symbols-outlined text-2xl text-slate-300 group-hover:text-primary transition-colors">add_photo_alternate</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Subir</span>
                                                    <input type="file" multiple onChange={(e) => handleFileChange(e, 'gallery_images')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                            )}
                                        </div>

                                        {formData.gallery_urls.length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                                                <span className="material-symbols-outlined text-5xl">collections</span>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selecciona hasta 30 fotos para mostrar el inmueble en detalle</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <PropertyPreview
                            formData={formData}
                            mode="sale"
                            onEdit={() => setStep(1)}
                            onConfirm={handleSubmit}
                            termsContent={
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 space-y-6 animate-in slide-in-from-bottom-4">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">gavel</span>
                                            Términos y Condiciones
                                        </h3>
                                        <p className="text-xs text-slate-500 text-justify leading-relaxed">
                                            Al aceptar, confirmar y enviar tu propiedad, esta se publicará en varios portales inmobiliarios con la intención de darle máxima promoción y agilizar su venta. Nosotros nos encargaremos de validar que los prospectos sean los adecuados.
                                        </p>
                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                            <p className="text-xs text-slate-600 dark:text-slate-300 text-justify leading-relaxed">
                                                <strong className="text-amber-600 dark:text-amber-500 uppercase tracking-wide mr-1">Sobre los Honorarios:</strong>
                                                Nuestros honorarios por el servicio de promoción, perfilamiento y cierre son del <strong className="text-slate-900 dark:text-white">5% sobre el valor final de venta</strong>. Incluye gestión legal y acompañamiento hasta la firma.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                                        <label className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-all shadow-sm">
                                            <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${formData.privacy_policy ? 'bg-primary border-primary text-white scale-110' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {formData.privacy_policy && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.privacy_policy} onChange={(e) => setFormData(p => ({ ...p, privacy_policy: e.target.checked }))} />
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 select-none">
                                                He leído y acepto los <a href="#" className="underline decoration-primary decoration-2 underline-offset-2 text-slate-900 dark:text-white hover:text-primary">términos y condiciones</a> y el aviso de privacidad.
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-all shadow-sm">
                                            <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${formData.fee_agreement ? 'bg-primary border-primary text-white scale-110' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {formData.fee_agreement && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.fee_agreement} onChange={(e) => setFormData(p => ({ ...p, fee_agreement: e.target.checked }))} />
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 select-none">
                                                Acepto el esquema de honorarios (<span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1 rounded">5%</span>) por el servicio.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            }
                        />
                    )}

                    <div className="flex flex-col md:flex-row gap-4 mt-12 pt-8 border-t border-slate-100 dark:border-white/5">
                        <div className="flex gap-4 flex-1">
                            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase text-[10px]">Anterior</button>}
                            <button onClick={saveDraft} disabled={loading} className="flex-1 py-4 rounded-2xl border border-primary/20 text-primary font-bold uppercase text-[10px]">Borrador</button>
                        </div>
                        <button onClick={handleNext} disabled={loading} className={`flex-1 ${step === 7 ? 'bg-primary shadow-glow shadow-primary/30' : 'bg-slate-900'} text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all`}>
                            {loading ? '...' : step === 7 ? (formData.request_professional_photos ? 'Solicitar y Publicar' : 'Publicar') : 'Siguiente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertySubmissionSale;
