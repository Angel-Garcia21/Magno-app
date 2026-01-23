import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import PropertyPreview from '../components/PropertyPreview';
import { pdf } from '@react-pdf/renderer';
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import SignatureCanvas from 'react-signature-canvas';
import { saveAs } from 'file-saver';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface PropertySubmissionProps {
    mode: 'sale' | 'rent';
    onCancel?: () => void;
}

const PropertySubmission: React.FC<PropertySubmissionProps> = ({ mode, onCancel }) => {
    const { success: toastSuccess, error: toastError } = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [processingMessage, setProcessingMessage] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Pending Uploads State for Guests
    const [pendingUploads, setPendingUploads] = useState<{
        main_image?: File;
        gallery_images?: File[];
        id_files?: File[];
        predial_url?: File;
    }>({});


    // Form Data State
    const [formData, setFormData] = useState({
        submission_id: null as string | null,
        contact_first_names: '',
        contact_last_names: '',
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

        id_urls: [] as string[],
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
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [generatedDocs, setGeneratedDocs] = useState<{ type: string, url: string }[]>([]);
    const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const [penColor, setPenColor] = useState('black');
    const [selectedDocIdx, setSelectedDocIdx] = useState(0);
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [isEnlarged, setIsEnlarged] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [expandedDocInfo, setExpandedDocInfo] = useState<'recruitment' | 'keys' | null>(null);
    const sigCanvasRef = useRef<any>(null);
    const enlargedSigCanvasRef = useRef<any>(null);

    const resizeCanvas = (ref: React.MutableRefObject<any>) => {
        if (!ref.current) return;
        const canvas = ref.current.getCanvas();
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const { width, height } = container.getBoundingClientRect();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.getContext("2d")?.scale(ratio, ratio);
            ref.current.clear();
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserSession(user);
                const loadDraft = async () => {
                    const { data, error } = await supabase.from('property_submissions')
                        .select('*')
                        .eq('owner_id', user.id)
                        .eq('type', mode)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (data && !error) {
                        const isResumable = ['draft', 'changes_requested'].includes(data.status) || (data.status === 'pending' && !data.is_signed);
                        if (isResumable) {
                            setFormData({ ...data.form_data, submission_id: data.id });

                            // If it has unsigned docs, skip to step 9 (Signature)
                            if (data.form_data.unsigned_recruitment_url) {
                                setGeneratedDocs([
                                    { type: 'recruitment', url: data.form_data.unsigned_recruitment_url },
                                    ...(data.form_data.unsigned_keys_url ? [{ type: 'keys', url: data.form_data.unsigned_keys_url }] : [])
                                ]);
                                setStep(9);
                            } else if (data.status === 'changes_requested') {
                                setStep(8); // Show preview for feedback cases
                            }
                        }
                    }
                };
                loadDraft();
            }
        };
        checkUser();
    }, [mode]);

    // Fix for Signature Canvas offset/sizing issue
    useEffect(() => {
        if (step === 9 && sigMode === 'draw') {
            const timer = setTimeout(() => {
                resizeCanvas(sigCanvasRef);
                if (isEnlarged) resizeCanvas(enlargedSigCanvasRef);
            }, isEnlarged ? 400 : 800);

            const handleResize = () => {
                resizeCanvas(sigCanvasRef);
                if (isEnlarged) resizeCanvas(enlargedSigCanvasRef);
            };

            window.addEventListener('resize', handleResize);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [step, sigMode, isEnlarged]);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'main_image' | 'gallery_images' | 'id_urls' | 'predial_url') => {
        if (!e.target.files?.length) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // IMMEDIATE UPLOAD (Logged in Users)
            if (user) {
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
                } else if (field === 'id_urls') {
                    const remainingSlots = 2 - formData.id_urls.length;
                    if (remainingSlots <= 0) {
                        toastError?.('Máximo 2 archivos para INE');
                        return;
                    }
                    const filesToUpload = Array.from(e.target.files).slice(0, remainingSlots);
                    const urls = await Promise.all(filesToUpload.map((f: File) => uploadFile(f, `properties/owners/${user.id}/docs`)));
                    setFormData(prev => ({ ...prev, id_urls: [...prev.id_urls, ...urls] }));
                } else {
                    const url = await uploadFile(e.target.files[0], `properties/owners/${user.id}/docs`);
                    setFormData(prev => ({ ...prev, [field]: url }));
                }
                toastSuccess?.('Archivo subido');
            }
            // DEFERRED UPLOAD (Guest Users)
            else {
                if (field === 'main_image') {
                    const file = e.target.files[0];
                    const localUrl = URL.createObjectURL(file);
                    setPendingUploads(prev => ({ ...prev, main_image: file }));
                    setFormData(prev => ({ ...prev, main_image_url: localUrl }));
                } else if (field === 'gallery_images') {
                    const newFiles = Array.from(e.target.files as FileList);
                    const remainingSlots = 30 - formData.gallery_urls.length;
                    if (remainingSlots <= 0) {
                        toastError?.('Máximo 30 fotos alcanzado');
                        return;
                    }
                    const filesToKeep = newFiles.slice(0, remainingSlots);
                    const newUrls = filesToKeep.map(f => URL.createObjectURL(f));

                    setPendingUploads(prev => ({
                        ...prev,
                        gallery_images: [...(prev.gallery_images || []), ...filesToKeep]
                    }));
                    setFormData(prev => ({ ...prev, gallery_urls: [...prev.gallery_urls, ...newUrls] }));
                } else if (field === 'id_urls') {
                    const newFiles = Array.from(e.target.files as FileList);
                    const remainingSlots = 2 - formData.id_urls.length;
                    if (remainingSlots <= 0) {
                        toastError?.('Máximo 2 archivos para INE');
                        return;
                    }
                    const filesToKeep = newFiles.slice(0, remainingSlots);
                    const newUrls = filesToKeep.map(f => URL.createObjectURL(f));

                    setPendingUploads(prev => ({
                        ...prev,
                        id_files: [...(prev.id_files || []), ...filesToKeep]
                    }));
                    setFormData(prev => ({ ...prev, id_urls: [...prev.id_urls, ...newUrls] }));
                } else {
                    const file = e.target.files[0];
                    const localUrl = URL.createObjectURL(file);
                    setPendingUploads(prev => ({ ...prev, [field]: file }));
                    setFormData(prev => ({ ...prev, [field]: localUrl }));
                }
                toastSuccess?.('Archivo listo para cargar');
            }
        } catch (err: any) {
            toastError?.('Error: ' + err.message);
        } finally { setLoading(false); }
    };

    const saveDraft = async () => {
        try {
            setLoading(true);
            setProcessingMessage('Guardando borrador...');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toastError?.('Debes completar el paso 1 para guardar borrador.');
                return;
            }
            const subData = {
                owner_id: user.id,
                type: mode,
                status: step === 8 ? 'pending' : 'draft',
                form_data: formData,
                is_signed: false
            };
            if (formData.submission_id) await supabase.from('property_submissions').update(subData).eq('id', formData.submission_id);
            else {
                const { data } = await supabase.from('property_submissions').insert([subData]).select().single();
                if (data) setFormData(p => ({ ...p, submission_id: data.id }));
            }
            toastSuccess?.(step === 8 ? 'Borrador guardado. La propiedad está congelada hasta que firmes.' : 'Borrador guardado');

            if (step === 8) {
                // Return to client portal if they exit from step 8
                navigate('/client-portal');
            }
        } catch (err: any) { toastError?.('Error: ' + err.message); } finally {
            setLoading(false);
            setProcessingMessage(null);
        }
    };

    // Scroll to top on step change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const validateCurrentStep = () => {
        if (step === 1) {
            if (!formData.contact_first_names || !formData.contact_last_names) {
                toastError?.('Por favor ingresa tu nombre y apellidos completos.');
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!formData.contact_email || !emailRegex.test(formData.contact_email)) {
                toastError?.('Por favor ingresa un correo electrónico válido.');
                return false;
            }
            const phoneDigits = formData.contact_phone.replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                toastError?.('Por favor ingresa un teléfono válido (10 dígitos).');
                return false;
            }
            if (!formData.contact_nationality) {
                toastError?.('Por favor ingresa tu nacionalidad.');
                return false;
            }
            if (!formData.contact_home_address) {
                toastError?.('Por favor selecciona tu domicilio particular de la lista de sugerencias.');
                return false;
            }
            if (!userSession && password.length < 8) {
                toastError?.('La contraseña debe tener al menos 8 caracteres.');
                return false;
            }
        } else if (step === 2) {
            if (!formData.address) {
                toastError?.('Por favor selecciona la dirección de la propiedad de la lista de sugerencias.');
                return false;
            }
            if (formData.age_status === 'Años de antigüedad' && !formData.age_years) {
                toastError?.('Por favor indica los años de antigüedad.');
                return false;
            }
        } else if (step === 3) {
            if (!formData.land_area || !formData.construction_area) {
                toastError?.('Por favor completa los metros de terreno y construcción.');
                return false;
            }
        } else if (step === 4) {
            if (!formData.price) {
                toastError?.('El precio es obligatorio.');
                return false;
            }
        } else if (step === 5) {
            if (formData.id_urls.length === 0) {
                toastError?.('Es obligatorio subir tu Identificación Oficial (INE) por seguridad y procesos legales.');
                return false;
            }
        } else if (step === 6) {
            // Allow proceeding without main image if professional photos are requested
            if (!formData.main_image_url && !formData.request_professional_photos) {
                toastError?.('Debes subir al menos una foto de portada o solicitar que nosotros las tomemos.');
                return false;
            }
        }
        return true;
    };

    const handleNext = async () => {
        if (!validateCurrentStep()) return;

        if (step === 1 && !userSession) {
            // Guest Flow: Validate input but DO NOT create account yet
            if (!formData.contact_first_names || !formData.contact_last_names || !formData.contact_email || !formData.contact_phone || !password) {
                toastError?.('Por favor completa todos los campos y define una contraseña.');
                return;
            }
            if (password.length < 8) {
                toastError?.('La contraseña debe tener al menos 8 caracteres.');
                return;
            }

            // Just move to next step, validated. Account will be created at final submission.
            setStep(2);
        } else if (step < 7) {
            setStep(step + 1);
        } else if (step === 7) {
            setStep(8); // Move from Benefits to Preview
        } else if (step === 8) {
            handleSubmit(); // This now prepares for signature (from Preview to Signature)
        } else {
            // Step 9 logic handled within components or another function
        }
    };

    const handleSubmit = async () => {
        if (!formData.privacy_policy || !formData.fee_agreement) {
            toastError?.('Debes aceptar los términos y honorarios.');
            return;
        }
        try {
            setLoading(true);
            setProcessingMessage('Registrando y generando documentos...');

            let user = (await supabase.auth.getUser()).data.user;

            // 1. Auto-Register if Guest
            if (!user) {
                if (!password || !formData.contact_email) throw new Error("Faltan datos de registro");

                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.contact_email,
                    password: password,
                    options: {
                        data: {
                            full_name: `${formData.contact_first_names} ${formData.contact_last_names}`,
                            phone_contact: formData.contact_phone,
                            nationality: formData.contact_nationality,
                            home_address: formData.contact_home_address
                        }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("No se pudo crear el usuario");

                user = authData.user;
            }

            if (!user) throw new Error('Sesión no encontrada');

            // 2. Upload Deferred Files
            let updatedFormData = { ...formData };

            // Upload ID
            if (pendingUploads.id_files && pendingUploads.id_files.length > 0) {
                const realUrls = updatedFormData.id_urls.filter(u => !u.startsWith('blob:'));
                const urls = await Promise.all(pendingUploads.id_files.map(f => uploadFile(f, `properties/owners/${user.id}/docs`)));
                updatedFormData.id_urls = [...realUrls, ...urls];
            }
            // Upload Predial
            if (pendingUploads.predial_url) {
                const url = await uploadFile(pendingUploads.predial_url, `properties/owners/${user.id}/docs`);
                updatedFormData.predial_url = url;
            }
            // Upload Main Image
            if (pendingUploads.main_image) {
                const url = await uploadFile(pendingUploads.main_image, `properties/owners/${user.id}/main`);
                updatedFormData.main_image_url = url;
            }
            // Upload Gallery
            // Upload Gallery
            if (pendingUploads.gallery_images?.length) {
                const realUrls = updatedFormData.gallery_urls.filter(u => !u.startsWith('blob:'));
                const newUrls = await Promise.all(pendingUploads.gallery_images.map((f: File) => uploadFile(f, `properties/owners/${user.id}/gallery`)));
                updatedFormData.gallery_urls = [...realUrls, ...newUrls];
            }

            // 3. Prepare initial submission to get ID
            const subId = formData.submission_id || Math.random().toString(36).substring(7);

            // 4. Prepare docs data
            const docData = {
                ...updatedFormData,
                owner_id: user.id,
                ownerName: user.user_metadata?.full_name || `${formData.contact_first_names} ${formData.contact_last_names}`,
                contact_email: user.email || formData.contact_email,
                phone: formData.contact_phone || user.user_metadata?.phone_contact,
                ref: 'PENDIENTE',
                folio: 'PENDIENTE'
            };

            // 5. Generate and Upload UNSIGNED PDFs
            const docs = [];
            // Remove the previous definition of updatedFormData in block 
            // We already have updatedFormData

            try {
                // Recruitment
                const recruitmentBlob = await pdf(<RecruitmentPDF data={docData} mode={mode} />).toBlob();
                const recruitmentFilename = `recruitment_unsigned_${Date.now()}.pdf`;
                await supabase.storage.from('documents').upload(`${user.id}/submissions/${recruitmentFilename}`, recruitmentBlob);
                const recruitmentUrl = supabase.storage.from('documents').getPublicUrl(`${user.id}/submissions/${recruitmentFilename}`).data.publicUrl;
                docs.push({ type: 'recruitment', url: recruitmentUrl });
                updatedFormData.unsigned_recruitment_url = recruitmentUrl;

                // Key Receipt
                if (formData.keys_provided) {
                    const keysBlob = await pdf(<KeyReceiptPDF data={docData} />).toBlob();
                    const keysFilename = `keys_unsigned_${Date.now()}.pdf`;
                    await supabase.storage.from('documents').upload(`${user.id}/submissions/${keysFilename}`, keysBlob);
                    const keysUrl = supabase.storage.from('documents').getPublicUrl(`${user.id}/submissions/${keysFilename}`).data.publicUrl;
                    docs.push({ type: 'keys', url: keysUrl });
                    updatedFormData.unsigned_keys_url = keysUrl;
                }
            } catch (pdfErr) {
                console.error("PDF Gen/Upload Error:", pdfErr);
            }

            // 4. Update / Insert with new form_data
            const subData = {
                owner_id: user.id,
                type: mode,
                status: 'pending',
                form_data: updatedFormData,
                is_signed: false
            };

            if (formData.submission_id) {
                await supabase.from('property_submissions').update(subData).eq('id', formData.submission_id);
            } else {
                const { data, error: insErr } = await supabase.from('property_submissions').insert([subData]).select().single();
                if (insErr) throw insErr;
                if (data) {
                    setFormData({ ...updatedFormData, submission_id: data.id });
                }
            }

            setGeneratedDocs(docs);
            toastSuccess?.('Documentación generada exitosamente.');
            setStep(9); // Directly to signature
        } catch (err: any) {
            console.error(err);
            toastError?.('Error: ' + err.message);
        } finally {
            setLoading(false);
            setProcessingMessage(null);
        }
    };

    const handleCancel = () => {
        setShowExitConfirm(true);
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        if (onCancel) onCancel();
        else navigate('/client-portal');
    };

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
                            onClick={() => navigate('/client-portal')}
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
        { id: 7, title: 'Beneficios', icon: 'verified' },
        { id: 8, title: 'Vista Previa', icon: 'visibility' },
        { id: 9, title: 'Firma de Solicitud', icon: 'ink_pen' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 font-display">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                <button onClick={() => setShowExitConfirm(true)} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">arrow_back</span><span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span></button>
                <div className="flex items-center gap-3">
                    {formData.submission_id && <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full animate-pulse"><span className="text-[9px] font-black uppercase tracking-widest">Borrador Activo</span></div>}
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {step} de 8</span>
                </div>
            </header>

            <div className={`${step >= 7 ? 'max-w-6xl' : 'max-w-3xl'} mx-auto p-6 pt-10 transition-all duration-700`}>
                <div className="flex justify-between mb-12 relative overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                    <div className="absolute top-[20px] left-0 w-[800px] h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full" />
                    <div className="absolute top-[20px] left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / (steps.length - 1)) * 800}px` }} />
                    {steps.map(s => (
                        <div key={s.id} className={`w-10 h-10 rounded-full flex items-center justify-center border-4 flex-shrink-0 transition-all z-10 ${step >= s.id ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300'}`}><span className="material-symbols-outlined text-sm">{s.icon}</span></div>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 border border-slate-200 dark:border-white/5 shadow-xl">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-white/5 pb-4 flex items-baseline justify-between">
                        {steps[step - 1].title}
                        {step === 7 && <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse">CONTINUAR A FIRMA</span>}
                        {step === 8 && <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full animate-pulse">OBLIGATORIO</span>}
                    </h2>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Nombre(s)</label>
                                    <input type="text" name="contact_first_names" placeholder="Ej. Juan Andrés" value={formData.contact_first_names} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Apellidos</label>
                                    <input type="text" name="contact_last_names" placeholder="Ej. García López" value={formData.contact_last_names} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Email</label>
                                    <input type="email" name="contact_email" placeholder="correo@ejemplo.com" value={formData.contact_email} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Teléfono</label>
                                    <input type="tel" name="contact_phone" placeholder="3312345678" value={formData.contact_phone} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Nacionalidad</label>
                                    <input type="text" name="contact_nationality" placeholder="Mexicana" value={formData.contact_nationality} onChange={handleInputChange} autoComplete="off" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm" />
                                </div>
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
                                            placeholder="Mínimo 8 caracteres"
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

                            <AddressAutocomplete
                                label="Domicilio Particular"
                                name="contact_home_address"
                                value={formData.contact_home_address}
                                onChange={(addr) => setFormData(p => ({ ...p, contact_home_address: addr }))}
                                placeholder="Empieza a escribir tu dirección..."
                            />
                            {formData.contact_home_address && (
                                <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 mt-4">
                                    <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.contact_home_address)}`} className="w-full h-full"></iframe>
                                </div>
                            )}
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
                            <AddressAutocomplete
                                label="Dirección de la Propiedad"
                                name="address"
                                value={formData.address}
                                onChange={(addr) => setFormData(p => ({ ...p, address: addr }))}
                                placeholder="Ubicación exacta del inmueble..."
                            />
                            {formData.address && (
                                <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 mt-4">
                                    <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formData.address)}`} className="w-full h-full"></iframe>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                    {formData.age_status === 'Años de antigüedad' && (
                                        <input
                                            type="number"
                                            name="age_years"
                                            value={formData.age_years}
                                            onChange={handleInputChange}
                                            min="0"
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            placeholder="años"
                                            className="mt-2 w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none font-bold text-lg text-center"
                                        />
                                    )}
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
                                        <input
                                            type="number"
                                            name={f.id}
                                            value={(formData as any)[f.id]}
                                            onChange={handleInputChange}
                                            min="0"
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Terreno m2</label>
                                    <input
                                        type="number"
                                        name="land_area"
                                        value={formData.land_area}
                                        onChange={handleInputChange}
                                        min="0"
                                        onKeyDown={(e) => {
                                            if (e.key === '-' || e.key === 'e') {
                                                e.preventDefault();
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Construcción m2</label>
                                    <input
                                        type="number"
                                        name="construction_area"
                                        value={formData.construction_area}
                                        onChange={handleInputChange}
                                        min="0"
                                        onKeyDown={(e) => {
                                            if (e.key === '-' || e.key === 'e') {
                                                e.preventDefault();
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {mode === 'sale' && (
                                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase text-slate-400 pl-3">Situación Legal</label>
                                        <div className="group relative">
                                            <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">help</span>
                                            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                Un gravamen es una carga legal o deuda sobre una propiedad. Si el inmueble está libre de gravamen, significa que no tiene ninguna deuda pendiente.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">¿El inmueble está libre de gravamen?</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setFormData(p => ({ ...p, is_free_of_encumbrance: true }))} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${formData.is_free_of_encumbrance ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>Sí</button>
                                            <button onClick={() => setFormData(p => ({ ...p, is_free_of_encumbrance: false }))} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${!formData.is_free_of_encumbrance ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 pl-3">{mode === 'sale' ? 'PRECIO DE VENTA' : 'PRECIO DE RENTA'}</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        min="0"
                                        onKeyDown={(e) => {
                                            if (e.key === '-' || e.key === 'e') {
                                                e.preventDefault();
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none font-black text-xl"
                                    />
                                </div>
                                {mode === 'rent' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 pl-3">MANTENIMIENTO (Opcional)</label>
                                        <input
                                            type="number"
                                            name="maintenance_fee"
                                            value={formData.maintenance_fee}
                                            onChange={handleInputChange}
                                            min="0"
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none font-bold text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Servicios</h3>
                                <p className="text-xs text-slate-500 font-bold">Selecciona los servicios con los que cuenta tu propiedad.</p>
                                <div className="flex flex-wrap gap-2">{(mode === 'sale' ? ['Agua', 'Luz', 'Gas', 'Boiler o calentador de agua', 'Paneles solares', 'Sistema de aire acondicionado', 'Purificador de agua / sistema de ósmosis inversa', 'Sistema de seguridad (cámaras o alarmas)', 'Portón eléctrico'] : ['Agua', 'Luz', 'Gas', 'Internet', 'Seguridad', 'Jardín', 'Alberca', 'Cisterna']).map(s => (<button key={s} onClick={() => handleArrayToggle('features', s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${formData.features.includes(s) ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-400'}`}>{s}</button>))}</div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{mode === 'sale' ? 'Características de la propiedad' : 'Mobiliario y Seguridad'}</h3>
                                <p className="text-xs text-slate-500 font-bold">{mode === 'sale' ? 'Selecciona las siguientes:' : 'Selecciona los complementos de la propiedad.'}</p>
                                <div className="flex flex-wrap gap-2">
                                    {(mode === 'sale' ? ['Estufa', 'Cocina integral', 'Refrigerador', 'Campana', 'Microondas', 'Comedor', 'Lavadora', 'Secadora', 'TV', 'Clóset', 'Patio', 'Cuarto de lavado', 'Acceso controlado', 'Protecciones', 'Jardín', 'Caseta de seguridad', 'Seguridad 24/7', 'Otros'] : ['Estufa', 'Cuarto de lavado', 'Acceso controlado', 'Caseta de seguridad', 'Seguridad 24/7', 'Amueblado', 'Cocina Integral', 'Portón Eléctrico']).map(s => (
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
                                        <p className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase mb-1">Protección de Datos y Confidencialidad</p>
                                        <p className="text-xs text-blue-700/70 dark:text-blue-400 font-bold leading-relaxed">Sus documentos (INE y Predial) son utilizados exclusivamente para procesos legales internos de validación y seguridad. Esto garantiza una operación transparente tanto para usted como para los futuros interesados. Su información está protegida bajo los más altos estándares de seguridad.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center gap-2 relative group hover:border-primary/20 transition-all">
                                        <span className={`material-symbols-outlined text-4xl ${formData.id_urls.length > 0 ? 'text-green-500' : 'text-primary'}`}>badge</span>
                                        <span className={`text-[10px] sm:text-xs font-black uppercase ${formData.id_urls.length > 0 ? 'text-green-500' : ''}`}>
                                            {formData.id_urls.length > 0 ? 'LISTO' : 'Cargar INE'}
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={(e) => handleFileChange(e, 'id_urls')}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        {formData.id_urls.length > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setFormData(p => ({ ...p, id_urls: [] }));
                                                    setPendingUploads(p => ({ ...p, id_files: [] }));
                                                }}
                                                className="absolute top-2 right-2 w-5 h-5 bg-slate-400 dark:bg-slate-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-rose-500 transition-colors z-10"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center gap-2 relative group hover:border-indigo-500/20 transition-all">
                                        <span className="material-symbols-outlined text-4xl text-indigo-500">description</span><span className="text-[10px] sm:text-xs font-black uppercase">Predial (Opcional)</span>
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

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button onClick={() => setFormData(p => ({ ...p, keys_provided: true }))} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.keys_provided ? 'bg-primary/5 border-primary shadow-glow shadow-primary/10 scale-105' : 'bg-transparent border-slate-200 dark:border-white/5 opacity-50 contrast-50'}`}><span className={`material-symbols-outlined text-3xl ${formData.keys_provided ? 'text-primary' : 'text-slate-400'}`}>vpn_key</span><span className="text-[10px] sm:text-xs font-black uppercase">Entregar Copia</span></button>
                                    <button onClick={() => setFormData(p => ({ ...p, keys_provided: false }))} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${!formData.keys_provided ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-transparent border-slate-200 dark:border-white/5 opacity-50'}`}><span className="material-symbols-outlined text-3xl">person_pin_circle</span><span className="text-[10px] sm:text-xs font-black uppercase">Asisto Yo</span></button>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4 bg-gradient-to-r from-slate-50 to-primary/5 dark:from-slate-800 dark:to-primary/10 border-l-4 border-primary shadow-sm hover:scale-[1.01] transition-all animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex gap-4 items-start">
                                        <span className="material-symbols-outlined text-primary text-2xl animate-bounce">info</span>
                                        <p>
                                            {formData.keys_provided ?
                                                `¡Excelente decisión! Al entregarnos las llaves, agilizamos el proceso de renta considerablemente. Nuestro equipo de profesionales se encargará de mostrar tu propiedad a los clientes más calificados, garantizando seguridad y eficiencia. Un asesor te contactará para coordinar la logística.` :
                                                "Has seleccionado 'Asisto Yo'. Recuerda que la disponibilidad es clave para cerrar el trato. Deberás coordinarte estrechamente con nuestro equipo para abrir la propiedad. ¡Sugerimos flexibilidad para no perder oportunidades!"
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {mode === 'rent' && (
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
                                                    { icon: 'analytics', label: 'Análisis de rentabilidad' },
                                                    { icon: 'home_repair_service', label: 'Gestión de reparaciones' },
                                                    { icon: 'calendar_month', label: 'Seguimiento de renta' },
                                                    { icon: 'attach_money', label: 'Gestión de cobranza' },
                                                    { icon: 'gavel', label: 'Acceso Legal' }
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
                                                    Costo del servicio: <span className="text-amber-500 font-black text-sm sm:text-base ml-2">10% MENSUAL</span>
                                                </p>
                                            </div>

                                            <div className={`mt-2 px-8 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 transform ${formData.admin_service_interest ? 'bg-amber-500 text-slate-950 scale-105 shadow-glow' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}>
                                                {formData.admin_service_interest ? 'SERVICIO SELECCIONADO' : 'AGREGAR SERVICIO'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            {/* 1. Professional Photography Request (Top) */}
                            <div className="p-8 sm:p-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-white/5 rounded-[3.5rem] shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                                <div className="relative flex flex-col items-center text-center gap-6">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                            <span className="material-symbols-outlined text-3xl text-primary">camera_enhance</span>
                                        </div>
                                        <h4 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tighter leading-none">
                                            ¿Deseas que vayamos a tu propiedad a tomar fotos?
                                        </h4>
                                    </div>

                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-3xl mx-auto">
                                        Si aún no tienes fotografías o no te gustan las que tienes, nuestro equipo puede acudir a tu propiedad para realizar un levantamiento profesional <span className="text-primary font-black uppercase tracking-tighter underline decoration-2 underline-offset-4">SIN COSTO ADICIONAL</span>.
                                        Esto ayuda a que tu casa se {mode === 'sale' ? 'venda' : 'rente'} de manera <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter">MÁS RÁPIDA Y EFICIENTE</span>.
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl px-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData(p => ({ ...p, request_professional_photos: true }));
                                            }}
                                            className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-lg active:scale-95 ${formData.request_professional_photos ? 'bg-primary text-white shadow-glow ring-4 ring-primary/20' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-primary hover:text-white'}`}
                                        >
                                            {formData.request_professional_photos ? '✓ Visita Solicitada' : 'Solicitar Visita Gratuita'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData(p => ({ ...p, request_professional_photos: false }));
                                            }}
                                            className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-lg active:scale-95 ${(!formData.request_professional_photos && (formData.main_image_url || formData.gallery_urls.length > 0)) ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' : (formData.request_professional_photos ? 'bg-transparent border-2 border-slate-200 dark:border-white/10 text-slate-400 hover:border-indigo-500 hover:text-indigo-500' : 'bg-indigo-600 text-white ring-4 ring-indigo-500/20')}`}
                                        >
                                            Yo tengo fotos de mi propiedad
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Photo Uploaders & Tips (Conditional) */}
                            {/* We show this ONLY if they chose "Yo tengo fotos" (request_professional_photos is false) 
                                AND either already have photos or we want to force the flow. 
                                Actually, the user says "hasta que yo seleccione que yo tengo fotos".
                                Since we initialized request_professional_photos as false but the default view shows both buttons,
                                we need to know if they clicked it.
                                Let's use the fact that if they click "Request Pro", it's true. If they click "I have photos", it's false.
                                But we need a way to distinguish "default" from "active selection".
                            */}
                            {!formData.request_professional_photos && (
                                <div className="space-y-12 animate-in slide-in-from-top-10 duration-500 pb-10">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">AQUÍ CARGA TUS FOTOS</h3>
                                        <div className="w-24 h-1.5 bg-indigo-500 mx-auto rounded-full" />
                                    </div>

                                    {/* Interactive Tips Section */}
                                    <div className="bg-gradient-to-br from-indigo-500/10 via-transparent to-primary/10 p-8 sm:p-10 rounded-[3rem] border-2 border-dashed border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                            <div className="w-24 h-24 rounded-[2rem] bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                                <span className="material-symbols-outlined text-5xl">auto_awesome</span>
                                            </div>
                                            <div className="space-y-4">
                                                <h5 className="text-xl font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                    Consejos para una {mode === 'sale' ? 'venta' : 'renta'} rápida:
                                                </h5>
                                                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                                                    Para que tu propiedad destaque: procura tomar las fotos de <span className="text-indigo-600 dark:text-indigo-400 font-black decoration-2 underline underline-offset-4">DÍA</span> con las <span className="text-indigo-600 dark:text-indigo-400 font-black decoration-2 underline underline-offset-4">LUCES PRENDIDAS</span>.
                                                    Asegúrate de que la casa esté <span className="text-indigo-600 dark:text-indigo-400 font-black decoration-2 underline underline-offset-4 uppercase">LIMPIA Y ORDENADA</span>, especialmente en baños y cocina.
                                                    ¡Tómalas en formato <span className="text-indigo-600 dark:text-indigo-400 font-black decoration-2 underline underline-offset-4 uppercase">VERTICAL</span> para capturar mejor cada espacio!
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* Main Image */}
                                        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                                            <div className="flex flex-col gap-1 pl-4">
                                                <label className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Foto Principal</label>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">La primera impresión es la que cuenta</p>
                                            </div>
                                            <div className="aspect-[3/4] max-w-md mx-auto xl:max-w-none bg-slate-100 dark:bg-slate-800 rounded-[3.5rem] border-8 border-white dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center gap-4 group hover:ring-8 ring-indigo-500/20 transition-all duration-500">
                                                {formData.main_image_url ? (
                                                    <img src={formData.main_image_url} className="w-full h-full object-cover" alt="Main" />
                                                ) : (
                                                    <div className="text-center space-y-3">
                                                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                            <span className="material-symbols-outlined text-4xl text-indigo-500">photo_camera</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Subir Foto de Portada</span>
                                                    </div>
                                                )}
                                                <input type="file" onChange={(e) => handleFileChange(e, 'main_image')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>

                                        {/* Gallery */}
                                        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                                            <div className="flex items-center justify-between pl-4 pr-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Galería en Detalle</label>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">({formData.gallery_urls.length}/30 fotos cargadas)</p>
                                                </div>
                                                {formData.gallery_urls.length > 0 && (
                                                    <button onClick={() => setFormData(p => ({ ...p, gallery_urls: [] }))} className="px-4 py-2 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 transition-colors border border-rose-500/20">Limpiar Todo</button>
                                                )}
                                            </div>

                                            <div className="min-h-[500px] bg-white dark:bg-slate-900/30 rounded-[4rem] border-4 border-slate-100 dark:border-white/5 p-10 shadow-inner flex flex-col">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-10">
                                                    {formData.gallery_urls.map((url, i) => (
                                                        <div key={i} className="aspect-[3/4] rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative group active:scale-95 transition-transform">
                                                            <img src={url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                                            <button
                                                                onClick={() => setFormData(p => ({ ...p, gallery_urls: p.gallery_urls.filter((_, idx) => idx !== i) }))}
                                                                className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {formData.gallery_urls.length < 30 && (
                                                        <div className="aspect-[3/4] rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border-4 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-3 relative group hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
                                                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shadow-inner">
                                                                <span className="material-symbols-outlined text-2xl transition-colors">add_photo_alternate</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-widest transition-colors">Añadir</span>
                                                            <input type="file" multiple onChange={(e) => handleFileChange(e, 'gallery_images')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    )}
                                                </div>

                                                {formData.gallery_urls.length === 0 && (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                                                        <div className="w-32 h-32 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shadow-inner relative">
                                                            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700">style</span>
                                                            <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-20" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300 mb-2">Galería Vacía</p>
                                                            <p className="text-xs font-bold text-slate-400 max-w-xs leading-relaxed uppercase">Selecciona hasta 30 fotos detalladas para mostrar cada rincón de tu propiedad</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 7 && (
                        <div className="animate-in fade-in slide-in-from-right-8 h-full">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                                    {mode === 'sale' ? 'Venta' : 'Renta'} Rápida y Segura
                                </h3>
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed">
                                    Al {mode === 'sale' ? 'vender' : 'rentar'} tu propiedad con nosotros, publicamos en <span className="text-primary font-bold">más de 8 portales inmobiliarios</span> y redes sociales que visitan <span className="text-primary font-bold">miles de personas al día</span> para {mode === 'sale' ? 'vender' : 'rentar'} tu propiedad de manera <span className="text-slate-900 dark:text-white font-bold">rápida, segura y eficiente</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                {/* Left Column: Vertical Logo Stack */}
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 sticky top-0 bg-slate-50 dark:bg-slate-900 py-2 z-10">
                                        Publicación en
                                    </h4>
                                    {[
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519998/6_kasaob.png", cls: "h-32 scale-125" }, // Inmuebles24
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519978/1_qn2civ.png", cls: "h-32 scale-125" }, // Viva Anuncios
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768520006/8_wjmrel.png", cls: "h-32 scale-125" }, // Propiedades.com
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519496/fb_logo_sin_fondo_lf3vjn.png", cls: "h-32 scale-125" }, // Facebook
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png", cls: "h-20" }, // Magno Grupo Inmobiliario
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519993/4_rm4aiw.png", cls: "h-32 scale-125" }, // Lamudi
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519989/3_zzb5ho.png", cls: "h-32 scale-125" }, // Portal Terreno

                                        // These 3 are wider, so we boost their height/scale to match visual weight
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768520002/7_hucqn1.png", cls: "h-32 scale-125" }, // Inmoxperts
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768519985/2_hurtsn.png", cls: "h-32 scale-125" }, // Tu Portal Online
                                        { src: "https://res.cloudinary.com/dmifhcisp/image/upload/v1768520009/9_oeokit.png", cls: "h-32 scale-125" }  // Properstar
                                    ].map((logo, idx) => (
                                        <div key={idx} className="bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 flex items-center justify-center hover:shadow-md transition-all group min-h-[100px]">
                                            <img
                                                src={logo.src}
                                                alt={`Portal ${idx + 1}`}
                                                className={`${logo.cls} w-auto object-contain transition-transform duration-300 group-hover:scale-110`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Right Column: Benefits & Fees */}
                                <div className="space-y-6">
                                    {/* Fee Structure */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-800/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <span className="material-symbols-outlined text-8xl text-blue-600">payments</span>
                                        </div>
                                        <h4 className="text-xl font-black uppercase text-blue-900 dark:text-blue-100 mb-2">Honorarios Claros</h4>
                                        <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-4">
                                            {mode === 'sale' ? '5%' : '1 Mes'}
                                            <span className="text-sm font-bold text-slate-500 ml-2 uppercase block md:inline">
                                                {mode === 'sale' ? 'sobre venta final' : 'de Renta'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {mode === 'sale'
                                                ? 'Solo pagas al firmar escritura. Gestión total incluida.'
                                                : 'Se cobra al firmar contrato. Conservas los 11 meses restantes + depósito.'
                                            }
                                        </p>
                                    </div>

                                    {/* Security Section */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-8 rounded-3xl border border-green-100 dark:border-green-800/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <span className="material-symbols-outlined text-8xl text-green-600">verified_user</span>
                                        </div>
                                        <h4 className="text-xl font-black uppercase text-green-900 dark:text-green-100 mb-2">Seguridad Total</h4>
                                        <div className="space-y-3 mt-4">
                                            {[
                                                mode === 'sale' ? 'Avalúo Comercial Preliminar' : 'Investigación de Inquilino',
                                                'Contratos Notariados',
                                                'Protección Jurídica',
                                                'Filtrado de Clientes'
                                            ].map(item => (
                                                <div key={item} className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">check_circle</span>
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* MAGNIFICATE Luxury Badge */}
                                    <div className="bg-slate-900 border border-slate-800 dark:border-amber-500/20 p-8 rounded-3xl relative overflow-hidden text-center group shadow-2xl hover:shadow-amber-900/20 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900/0 to-slate-900/0 opacity-50" />

                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-amber-400 text-5xl mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 ease-out drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">diamond</span>
                                            <h3 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-amber-200 via-amber-400 to-amber-600 mb-2 filter drop-shadow-lg">
                                                MAGNIFÍCATE
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 8 && (
                        <PropertyPreview
                            formData={formData}
                            mode={mode}
                            onEdit={() => setStep(1)}
                            onConfirm={handleSubmit}
                            termsContent={
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary">gavel</span>
                                            </div>
                                            Términos y Condiciones
                                        </h3>
                                        <a
                                            href="https://drive.google.com/file/d/1BDyCu_fP-T0CsEMHVgEHeeMI5NTQRpop/view?usp=sharing"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:scale-105 transition-all shadow-lg group"
                                        >
                                            <span className="material-symbols-outlined text-sm group-hover:animate-pulse">visibility</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Ver Aviso de Privacidad</span>
                                        </a>
                                    </div>

                                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 text-justify leading-relaxed font-medium">
                                        {mode === 'sale'
                                            ? 'Al aceptar, confirmar y enviar tu propiedad, esta se publicará en varios portales inmobiliarios con la intención de darle máxima promoción y agilizar su venta. Nosotros nos encargaremos de validar que el comprador sea el adecuado.'
                                            : 'Al aceptar, confirmar y enviar tu propiedad, esta se publicará en varios portales inmobiliarios con la intención de darle máxima promoción y agilizar su renta. Nosotros nos encargaremos de validar que el inquilino sea el adecuado a través de investigaciones rigurosas de perfil y solvencia.'}
                                    </p>

                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-900/20 shadow-inner">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-3xl">payments</span>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-sm font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest">Sobre los Honorarios:</p>
                                                <p className="text-sm sm:text-base text-amber-800/80 dark:text-amber-400 font-bold leading-relaxed text-justify">
                                                    {mode === 'sale' ? (
                                                        <>{'La comisión correspondiente a nuestros servicios será del 5% calculado sobre el precio total de venta de la propiedad.'}</>
                                                    ) : (
                                                        <>Nuestros honorarios por el servicio de promoción, perfilamiento y cierre incluyen únicamente el <span className="text-slate-900 dark:text-white font-black underline decoration-2 underline-offset-4">primer mes de renta</span>. Tú conservarás los 11 meses de renta restantes y el mes de depósito íntegro.</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-blue-50 dark:bg-primary/5 rounded-3xl border border-blue-100 dark:border-primary/20">
                                        <div className="flex gap-4 items-center">
                                            <span className="material-symbols-outlined text-primary text-2xl">info</span>
                                            <p className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-wide">
                                                Al confirmar, se generarán automáticamente los documentos legales con los datos de tu propiedad, los cuales servirán como tu <span className="text-primary font-black">RESPALDO LEGAL</span> y autorización de promoción.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                        <label className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-all shadow-sm group">
                                            <div className={`mt-0.5 w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${formData.privacy_policy ? 'bg-primary border-primary text-white scale-110 shadow-glow' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {formData.privacy_policy && <span className="material-symbols-outlined text-[18px] font-black">check</span>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.privacy_policy} onChange={(e) => setFormData(p => ({ ...p, privacy_policy: e.target.checked }))} />
                                            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 select-none group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                He leído y acepto los términos y el aviso de privacidad.
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-all shadow-sm group">
                                            <div className={`mt-0.5 w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${formData.fee_agreement ? 'bg-primary border-primary text-white scale-110 shadow-glow' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {formData.fee_agreement && <span className="material-symbols-outlined text-[18px] font-black">check</span>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.fee_agreement} onChange={(e) => setFormData(p => ({ ...p, fee_agreement: e.target.checked }))} />
                                            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 select-none group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                Acepto el esquema de honorarios (<span className="text-primary">{mode === 'sale' ? '5% del valor venta' : '1 mes de renta'}</span>).
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            }
                        />
                    )}

                    {step === 9 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                            <div className="bg-blue-50/50 dark:bg-primary/5 p-12 rounded-[3rem] border border-blue-100 dark:border-primary/20 flex gap-8 items-start">
                                <span className="material-symbols-outlined text-primary text-5xl animate-pulse">ink_pen</span>
                                <div className="space-y-6 flex-1">
                                    <div>
                                        <h3 className="text-xl font-black text-primary dark:text-primary uppercase mb-3">Paso Final Obligatorio</h3>
                                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                                            Para poder publicar tu propiedad y darle difusión, necesitamos tu firma autorizando el manejo de la misma en la <span className="font-black underline decoration-4 underline-offset-4">HOJA DE RECLUTAMIENTO</span>.
                                        </p>
                                    </div>

                                    <p className="text-xs text-primary/60 dark:text-primary/60 font-black uppercase tracking-[0.2em] pt-4 border-t border-blue-100 dark:border-primary/10">
                                        Si abandonas este paso, la propiedad no será enviada para aprobación.
                                    </p>
                                </div>
                            </div>

                            {/* New Document Information Blocks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                {/* Block 1: Hoja de Reclutamiento */}
                                <div className={`group bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${expandedDocInfo === 'recruitment' ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'}`}>
                                    <div className="p-8 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${expandedDocInfo === 'recruitment' ? 'bg-primary text-white rotate-12' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-2xl">description</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Hoja de Reclutamiento</h4>
                                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Documento de Promoción</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setExpandedDocInfo(expandedDocInfo === 'recruitment' ? null : 'recruitment')}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedDocInfo === 'recruitment' ? 'bg-primary/10 text-primary rotate-180' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <span className="material-symbols-outlined">expand_more</span>
                                            </button>
                                        </div>

                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                            Te generamos automáticamente este documento para poder iniciar la promoción de tu propiedad.
                                        </p>

                                        <div className={`transition-all duration-500 overflow-hidden ${expandedDocInfo === 'recruitment' ? 'max-h-96 opacity-100 mt-6 pt-6 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0'}`}>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <span className="material-symbols-outlined text-primary text-lg">help</span>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                                                        ¿Qué es la Hoja de Reclutamiento?
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic">
                                                        "Es una hoja en la que se muestra toda la información que tú pusiste en tu formulario. La imprimimos en este documento que tú firmas para nosotros poderle darle promoción a la propiedad y saber que tú estás de acuerdo con los honorarios."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Block 2: Responsiva de Llaves (Conditional) */}
                                {formData.keys_provided && (
                                    <div className={`group bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${expandedDocInfo === 'keys' ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'}`}>
                                        <div className="p-8 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${expandedDocInfo === 'keys' ? 'bg-primary text-white rotate-12' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-2xl">vpn_key</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Responsiva de Llaves</h4>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Resguardo de Propiedad</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setExpandedDocInfo(expandedDocInfo === 'keys' ? null : 'keys')}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedDocInfo === 'keys' ? 'bg-primary/10 text-primary rotate-180' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <span className="material-symbols-outlined">expand_more</span>
                                                </button>
                                            </div>

                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                                Este respaldo legal garantiza la seguridad y el manejo profesional de tus llaves.
                                            </p>

                                            <div className={`transition-all duration-500 overflow-hidden ${expandedDocInfo === 'keys' ? 'max-h-[500px] opacity-100 mt-6 pt-6 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0'}`}>
                                                <div className="space-y-4">
                                                    <div className="flex gap-3">
                                                        <span className="material-symbols-outlined text-primary text-lg">help</span>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                                                            ¿Qué es la Responsiva de Llaves?
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic mb-4">
                                                            "Este documento se genera porque seleccionaste que nos vas a entregar las llaves de la propiedad. Te lo entregamos para que tengas el respaldo de que la propiedad queda bajo nuestro resguardo, firmado por nuestro director."
                                                        </p>
                                                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-primary text-sm">contact_support</span>
                                                            <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-tight">
                                                                Un asesor se pondrá en contacto contigo para manejar la entrega física.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
                                {/* PDF Preview Area */}
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/5 flex flex-col shadow-inner">
                                    <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-xl">
                                                    <span className="material-symbols-outlined text-primary text-xl">gavel</span>
                                                </div>
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Documentación Legal Obligatoria</h4>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-800/50">
                                                    Revisión Necesaria
                                                </div>
                                                <button
                                                    onClick={() => setIsEnlarged(true)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all group/expand"
                                                >
                                                    <span className="material-symbols-outlined text-sm group-hover/expand:scale-110 transition-transform">zoom_out_map</span>
                                                    <span className="text-[10px] font-black uppercase">Ampliar Documento</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-2 flex-1">
                                                {generatedDocs.map((doc, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedDocIdx(idx)}
                                                        className={`flex-1 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group/btn ${selectedDocIdx === idx ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <div className="flex items-center justify-center gap-2 relative z-10">
                                                            <span className="material-symbols-outlined text-sm opacity-60">
                                                                {doc.type === 'recruitment' ? 'description' : 'vpn_key'}
                                                            </span>
                                                            {doc.type === 'recruitment' ? 'Hoja Reclutamiento' : 'Responsiva Llaves'}
                                                        </div>
                                                        {selectedDocIdx === idx && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse opacity-50" />
                                                        )}
                                                        <div className={`absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300 ${selectedDocIdx === idx ? 'w-full' : 'w-0'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        {generatedDocs[selectedDocIdx] ? (
                                            <iframe src={`${generatedDocs[selectedDocIdx].url}#view=FitH`} className="w-full h-full border-none" title="PDF Preview" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                                                <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                                                <p className="text-[10px] font-bold">Generando documentos...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Signature Pad Area */}
                                <div className="space-y-6 flex flex-col">
                                    <div className="flex flex-col sm:flex-row justify-between items-end gap-4 px-3">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Método de firma</label>
                                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                                <button
                                                    onClick={() => setSigMode('draw')}
                                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${sigMode === 'draw' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <span className="material-symbols-outlined text-sm">draw</span>
                                                    Dibujar
                                                </button>
                                                <button
                                                    onClick={() => setSigMode('type')}
                                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${sigMode === 'type' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <span className="material-symbols-outlined text-sm">keyboard</span>
                                                    Texto
                                                </button>
                                            </div>
                                        </div>

                                        {sigMode === 'draw' && (
                                            <div className="flex flex-col items-end gap-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Color de tinta</label>
                                                <div className="flex gap-3">
                                                    <button onClick={() => setPenColor('black')} className={`w-6 h-6 rounded-full bg-black border-2 transition-all ${penColor === 'black' ? 'border-primary scale-110 shadow-glow' : 'border-white dark:border-slate-700'}`} title="Tinta Negra" />
                                                    <button onClick={() => setPenColor('#0026e3')} className={`w-6 h-6 rounded-full bg-blue-700 border-2 transition-all ${penColor === '#0026e3' ? 'border-primary scale-110 shadow-glow' : 'border-white dark:border-slate-700'}`} title="Tinta Azul" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-[300px] w-full bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-white/10 overflow-hidden relative group shadow-inner">
                                        {sigMode === 'draw' ? (
                                            <>
                                                <SignatureCanvas
                                                    ref={sigCanvasRef}
                                                    penColor={penColor}
                                                    backgroundColor="white"
                                                    minDistance={1}
                                                    velocityFilterWeight={0.7}
                                                    canvasProps={{
                                                        className: 'w-full h-full cursor-crosshair'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => sigCanvasRef.current?.clear()}
                                                    className="absolute top-6 right-6 p-3 bg-slate-100 text-slate-500 rounded-2xl hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-200"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white">
                                                <input
                                                    type="text"
                                                    value={typedSignature}
                                                    onChange={(e) => setTypedSignature(e.target.value)}
                                                    placeholder="Escribe tu nombre completo"
                                                    className={`w-full text-center text-5xl bg-transparent border-b-4 border-slate-100 focus:border-primary outline-none py-6 transition-all placeholder:text-slate-200`}
                                                    style={{
                                                        fontFamily: '"Dancing Script", cursive',
                                                        color: penColor === 'black' ? '#000000' : '#0026e3'
                                                    }}
                                                />
                                                <p className="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                                    Se generará una firma digital basada en tu nombre
                                                </p>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
                                            <span className="text-[80px] font-black uppercase tracking-[0.5em] -rotate-12 select-none whitespace-nowrap">FIRMA DIGITAL MAGNO</span>
                                        </div>
                                    </div>

                                    <div className="p-1">
                                        <label className="flex items-start gap-4 cursor-pointer group p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 shadow-sm">
                                            <div className="relative mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={legalAccepted}
                                                    onChange={(e) => setLegalAccepted(e.target.checked)}
                                                    className="peer appearance-none w-6 h-6 border-2 border-slate-200 dark:border-white/10 rounded-lg checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                                />
                                                <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-base opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed select-none">
                                                Confirmo que la información proporcionada es verídica y autorizo a <span className="font-black text-primary">MAGNO GRUPO INMOBILIARIO</span> a iniciar el proceso de promoción y representación legal de mi propiedad.
                                            </p>
                                        </label>
                                    </div>

                                    <button
                                        id="finish-btn-main"
                                        onClick={async () => {
                                            if (!legalAccepted) {
                                                toastError?.('Por favor acepta los términos antes de firmar.');
                                                return;
                                            }
                                            let finalSignatureDataUrl = '';

                                            if (sigMode === 'draw') {
                                                const canvas = sigCanvasRef.current;
                                                if (!canvas || canvas.isEmpty()) {
                                                    toastError?.('Por favor dibuja tu firma primero.');
                                                    return;
                                                }
                                                finalSignatureDataUrl = canvas.getCanvas().toDataURL('image/png');
                                            } else {
                                                if (!typedSignature.trim()) {
                                                    toastError?.('Por favor escribe tu nombre para la firma.');
                                                    return;
                                                }
                                                // Generate text signature image
                                                const canvas = document.createElement('canvas');
                                                canvas.width = 800;
                                                canvas.height = 300;
                                                const ctx = canvas.getContext('2d');
                                                if (ctx) {
                                                    ctx.fillStyle = 'white';
                                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                    ctx.font = 'italic 80px "Dancing Script", cursive';
                                                    ctx.fillStyle = penColor === 'black' ? '#000000' : '#0026e3';
                                                    ctx.textAlign = 'center';
                                                    ctx.textBaseline = 'middle';
                                                    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
                                                    finalSignatureDataUrl = canvas.toDataURL('image/png');
                                                }
                                            }

                                            setLoading(true);
                                            setProcessingMessage('Iniciando proceso de firma...');
                                            try {
                                                // 0. Check User Session or Create Account
                                                let currentUser = await supabase.auth.getUser().then(({ data }) => data.user);

                                                if (!currentUser) {
                                                    // This is the deferred account creation
                                                    setProcessingMessage('Creando identidad digital segura...');
                                                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                                                        email: formData.contact_email,
                                                        password: password, // This state should hold the password from Step 1
                                                        options: {
                                                            data: {
                                                                full_name: `${formData.contact_first_names} ${formData.contact_last_names}`,
                                                                phone_contact: formData.contact_phone,
                                                                role: 'owner'
                                                            }
                                                        }
                                                    });

                                                    if (signUpError) throw new Error('Error al crear cuenta: ' + signUpError.message);
                                                    if (!signUpData.user) throw new Error('No se pudo crear el usuario.');

                                                    currentUser = signUpData.user;

                                                    // Create profile manually if trigger didn't catch it or for extra safety (password storage for admin)
                                                    setProcessingMessage('Blindando perfil de usuario...');
                                                    await supabase.from('profiles').upsert({
                                                        id: currentUser.id,
                                                        full_name: `${formData.contact_first_names} ${formData.contact_last_names}`,
                                                        email: formData.contact_email,
                                                        role: 'owner',
                                                        password: password
                                                    }, { onConflict: 'id' });

                                                    // Set session context
                                                    setUserSession(currentUser);
                                                }

                                                // Update IDs and logic for final storage
                                                const subId = formData.submission_id;

                                                // 1. Generate SIGNED documents
                                                setProcessingMessage('Generando Hoja de Reclutamiento...');
                                                const docData = {
                                                    ...formData,
                                                    signatureUrl: finalSignatureDataUrl,
                                                    ownerName: currentUser.user_metadata?.full_name || `${formData.contact_first_names} ${formData.contact_last_names}`,
                                                    contact_email: currentUser.email || formData.contact_email,
                                                    phone: formData.contact_phone || currentUser.user_metadata?.phone_contact,
                                                    ref: 'PENDIENTE',
                                                    folio: 'PENDIENTE'
                                                };

                                                const recruitmentBlob = await pdf(<RecruitmentPDF data={docData} mode={mode} />).toBlob();

                                                let keysBlob = null;
                                                if (formData.keys_provided) {
                                                    setProcessingMessage('Generando Responsiva de Llaves...');
                                                    keysBlob = await pdf(<KeyReceiptPDF data={docData} />).toBlob();
                                                }

                                                // 2. Upload to Storage
                                                setProcessingMessage('Encriptando documentos...');
                                                const recruitmentFilename = `recruitment_signed_${subId}_${Date.now()}.pdf`;
                                                await supabase.storage.from('documents').upload(`${subId}/${recruitmentFilename}`, recruitmentBlob);
                                                const recruitmentUrl = supabase.storage.from('documents').getPublicUrl(`${subId}/${recruitmentFilename}`).data.publicUrl;

                                                let keysUrl = null;
                                                if (keysBlob) {
                                                    setProcessingMessage('Asegurando transferencia...');
                                                    const keysFilename = `keys_signed_${subId}_${Date.now()}.pdf`;
                                                    await supabase.storage.from('documents').upload(`${subId}/${keysFilename}`, keysBlob);
                                                    keysUrl = supabase.storage.from('documents').getPublicUrl(`${subId}/${keysFilename}`).data.publicUrl;
                                                }

                                                // 4. Update submission with signed status and URLs
                                                setProcessingMessage('Finalizando registro oficial...');
                                                const finalFormData = {
                                                    ...formData,
                                                    unsigned_recruitment_url: recruitmentUrl,
                                                    unsigned_keys_url: keysUrl || formData.unsigned_keys_url,
                                                    is_signed_at: new Date().toISOString()
                                                };

                                                await supabase.from('property_submissions').update({
                                                    is_signed: true,
                                                    status: 'pending',
                                                    form_data: finalFormData
                                                }).eq('id', subId);

                                                // 5. Create Official Signed Document records for Admin Archive
                                                const signedDocsToInsert = [
                                                    {
                                                        user_id: currentUser.id,
                                                        property_id: subId, // Link to submission ID
                                                        document_type: 'recruitment',
                                                        status: 'signed',
                                                        pdf_url: recruitmentUrl,
                                                        signed_at: new Date().toISOString()
                                                    }
                                                ];

                                                if (keysUrl) {
                                                    signedDocsToInsert.push({
                                                        user_id: currentUser.id,
                                                        property_id: subId, // Link to submission ID
                                                        document_type: 'keys',
                                                        status: 'signed',
                                                        pdf_url: keysUrl,
                                                        signed_at: new Date().toISOString()
                                                    });
                                                }

                                                await supabase.from('signed_documents').insert(signedDocsToInsert);

                                                toastSuccess?.('¡Solicitud firmada y enviada correctamente!');
                                                setSubmitted(true);
                                            } catch (err: any) {
                                                toastError?.('Error al finalizar: ' + err.message);
                                            } finally {
                                                setLoading(false);
                                                setProcessingMessage(null);
                                            }
                                        }}
                                        disabled={loading}
                                        className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-glow hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                    >
                                        <span className="material-symbols-outlined text-xl">verified</span>
                                        {loading ? 'Procesando...' : 'Firmar y Finalizar'}
                                    </button>

                                    <a
                                        href="https://wa.me/523319527172?text=Hola,%20tengo%20dudas%20sobre%20el%20proceso%20de%20firma%20de%20mi%20propiedad"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full border border-slate-200 dark:border-white/10 text-slate-500 py-4 rounded-3xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all mt-10"
                                    >
                                        <span className="material-symbols-outlined text-lg">question_mark</span>
                                        Tengo dudas (WhatsApp)
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`flex flex-col md:flex-row gap-6 ${step >= 8 ? 'mt-48 pb-12' : 'mt-12'} pt-12 border-t border-slate-100 dark:border-white/5`}>
                        <div className="flex gap-4 flex-1">
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="flex-1 py-5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Anterior
                                </button>
                            )}
                            <button
                                onClick={() => setShowExitConfirm(true)}
                                disabled={loading}
                                className="flex-1 py-5 rounded-2xl border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 transition-all focus:ring-4 focus:ring-primary/10"
                            >
                                {step >= 7 ? 'Salir' : 'Salir'}
                            </button>
                        </div>
                        {step <= 7 && (
                            <button onClick={handleNext} disabled={loading} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:bg-slate-800 hover:scale-[1.02] shadow-xl">
                                {loading ? '...' : 'Siguiente'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Processing Overlay */}
            {
                (loading || processingMessage) && (
                    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-3xl animate-pulse">description</span>
                            </div>
                        </div>
                        <div className="mt-8 text-center space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white animate-in slide-in-from-bottom-4">
                                {processingMessage || 'Procesando...'}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary animate-pulse">
                                Por favor no cierres esta ventana
                            </p>
                        </div>
                    </div>
                )
            }
            {/* Full Screen Document View */}
            {
                isEnlarged && (
                    <div className="fixed inset-0 z-[1001] bg-slate-900/95 backdrop-blur-xl flex flex-col p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary p-3 rounded-2xl shadow-glow">
                                    <span className="material-symbols-outlined text-white text-2xl">fullscreen</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Revisión de Documento</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Modo de lectura y firma ampliada</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEnlarged(false)}
                                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-3xl transition-all flex items-center gap-2 group"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Cerrar</span>
                                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden bg-white/5 p-2 md:p-4 rounded-[4rem] border border-white/10">
                            {/* Left: Huge PDF */}
                            <div className="flex-[2.5] bg-transparent rounded-[3rem] overflow-hidden relative">
                                {generatedDocs[selectedDocIdx] ? (
                                    <iframe src={`${generatedDocs[selectedDocIdx].url}#zoom=100&view=FitH`} className="w-full h-full border-none" title="PDF Enlarged Preview" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-6xl animate-spin">sync</span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Consolidated Control Sidebar */}
                            <div className="flex-1 min-w-[380px] flex flex-col gap-6 overflow-y-auto no-scrollbar pr-2">
                                {/* Document Selector */}
                                <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                                    <label className="text-[10px] font-black uppercase text-primary tracking-widest block px-2">Selecciona Documento</label>
                                    <div className="flex flex-col gap-3">
                                        {generatedDocs.map((doc, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDocIdx(idx)}
                                                className={`w-full px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 relative overflow-hidden group/btn ${selectedDocIdx === idx ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-base ${selectedDocIdx === idx ? 'text-primary' : 'opacity-40'}`}>
                                                    {doc.type === 'recruitment' ? 'description' : 'vpn_key'}
                                                </span>
                                                {doc.type === 'recruitment' ? 'Hoja Reclutamiento' : 'Responsiva Llaves'}
                                                {selectedDocIdx === idx && (
                                                    <div className="absolute right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-sm space-y-8 flex-1">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase text-primary tracking-widest block">Firma del Documento</label>
                                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                                            <button
                                                onClick={() => setSigMode('draw')}
                                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-3 ${sigMode === 'draw' ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">draw</span>
                                                Dibujar
                                            </button>
                                            <button
                                                onClick={() => setSigMode('type')}
                                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-3 ${sigMode === 'type' ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">keyboard</span>
                                                Texto
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-[240px] w-full bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 overflow-hidden relative group shadow-inner">
                                        {sigMode === 'draw' ? (
                                            <>
                                                <SignatureCanvas
                                                    ref={enlargedSigCanvasRef}
                                                    penColor={penColor}
                                                    backgroundColor="white"
                                                    minDistance={1}
                                                    velocityFilterWeight={0.7}
                                                    canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                                                />
                                                <button
                                                    onClick={() => enlargedSigCanvasRef.current?.clear()}
                                                    className="absolute top-4 right-4 p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white">
                                                <input
                                                    type="text"
                                                    value={typedSignature}
                                                    onChange={(e) => setTypedSignature(e.target.value)}
                                                    placeholder="Tu nombre"
                                                    className="w-full text-center text-4xl bg-transparent border-b-2 border-slate-100 focus:border-primary outline-none py-4 transition-all"
                                                    style={{ fontFamily: '"Dancing Script", cursive', color: penColor === 'black' ? '#000' : '#0026e3' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => setPenColor('black')} className={`w-8 h-8 rounded-full bg-black border-4 transition-all ${penColor === 'black' ? 'border-primary' : 'border-white/20'}`} />
                                        <button onClick={() => setPenColor('#0026e3')} className={`w-8 h-8 rounded-full bg-blue-700 border-4 transition-all ${penColor === '#0026e3' ? 'border-primary' : 'border-white/20'}`} />
                                    </div>

                                    <div className="space-y-6 pt-4">
                                        <label className="flex items-start gap-4 cursor-pointer group p-5 bg-white/5 rounded-2xl border border-white/10 transition-all hover:bg-white/10">
                                            <div className="relative mt-0.5 shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={legalAccepted}
                                                    onChange={(e) => setLegalAccepted(e.target.checked)}
                                                    className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded-lg checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                                />
                                                <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-sm opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                                            </div>
                                            <p className="text-[10px] text-slate-300 font-bold leading-relaxed select-none">
                                                Acepto que la información es verídica y autorizo la promoción de mi propiedad.
                                            </p>
                                        </label>

                                        <button
                                            onClick={async () => {
                                                if (!legalAccepted) {
                                                    toastError?.('Acepta los términos antes de firmar.');
                                                    return;
                                                }
                                                // Trigger the same submission logic
                                                const finishBtn = document.querySelector('button[id="finish-btn-main"]') as HTMLButtonElement;
                                                if (finishBtn) finishBtn.click();
                                            }}
                                            disabled={loading}
                                            className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                        >
                                            <span className="material-symbols-outlined">verified</span>
                                            {loading ? 'Firmando...' : 'Firmar y Finalizar'}
                                        </button>

                                        <div className="flex gap-4">
                                            <a
                                                href="https://wa.me/523319527172"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-base">chat</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest">Dudas</span>
                                            </a>
                                            <button
                                                onClick={() => setIsEnlarged(false)}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest">Cerrar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-[9px] text-center text-white/30 font-bold uppercase tracking-[0.3em] mt-4">
                            Revisión segura impulsada por Magno
                        </p>
                    </div>
                )
            }
            {/* Final Professional Signing Overlay */}
            {
                loading && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 overflow-hidden">
                        {/* Animated background layers */}
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" />

                        {/* Animated gradient orbs */}
                        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

                        <div className="relative w-full max-w-xl">
                            {/* Status Card */}
                            <div className="bg-white/5 backdrop-blur-xl rounded-[4rem] border border-white/10 p-12 shadow-2xl overflow-hidden group">
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-50" />

                                <div className="relative flex flex-col items-center text-center space-y-12">
                                    {/* Animated Icon Section */}
                                    <div className="relative">
                                        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center animate-spin-slow">
                                            <div className="w-24 h-24 bg-primary/20 rounded-full border border-primary/30 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-5xl text-primary animate-pulse">verified_user</span>
                                            </div>
                                        </div>
                                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                    </div>

                                    {/* Text Content */}
                                    <div className="space-y-4">
                                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-primary/50">
                                                Procesando Firma
                                            </span>
                                        </h2>
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-xl text-slate-400 font-bold uppercase tracking-[0.3em] h-8 flex items-center gap-3">
                                                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                                {processingMessage}
                                            </p>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">
                                                Seguridad Digital Magno • Encriptación SSL 256-bit
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Visual */}
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-blue-500 to-primary w-1/2 animate-[progress_3s_infinite_linear]"
                                            style={{
                                                backgroundImage: 'linear-gradient(90deg, rgba(234,179,8,0) 0%, rgba(234,179,8,1) 50%, rgba(234,179,8,0) 100%)',
                                                backgroundSize: '200% 100%'
                                            }}
                                        />
                                    </div>

                                    {/* Features Grid */}
                                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary text-xl">gavel</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Validez Legal</span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary text-xl">lock</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Blindaje Total</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Decorative Elements */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '4s' }} />
                            <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-blue-500/20 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '5s' }} />
                        </div>
                    </div>
                )
            }
            {/* Exit Confirmation Modal */}
            {
                showExitConfirm && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowExitConfirm(false)} />
                        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-3xl border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto ring-8 ring-red-500/5">
                                <span className="material-symbols-outlined text-4xl">warning</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white text-center mb-4 leading-tight">
                                ¿Estás seguro de salir?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-bold uppercase tracking-[0.2em] mb-10 leading-relaxed px-4">
                                Si sales ahora, se borrará toda la información que acabas de poner en el formulario para publicar tu propiedad.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmExit}
                                    className="w-full py-5 bg-red-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-red-600 hover:scale-[1.02] transition-all"
                                >
                                    Sí, estoy de acuerdo con salir
                                </button>
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                                >
                                    No, quiero continuar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PropertySubmission;
