import React, { useState, useEffect } from 'react';
import PropertyPreview from './PropertyPreview';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const KEY_TRANSLATIONS: Record<string, string> = {
    'price': 'Precio',
    'rooms': 'Recámaras',
    'levels': 'Niveles',
    'address': 'Dirección',
    'bathrooms': 'Baños',
    'age_status': 'Antigüedad',
    'is_signed_at': 'Firmado el',
    'legal_status': 'Estado Legal',
    'contact_email': 'Email de Contacto',
    'contact_phone': 'Teléfono de Contacto',
    'fee_agreement': 'Acuerdo de Comisión',
    'keys_provided': 'Llaves Entregadas',
    'parking_spots': 'Estacionamientos',
    'property_type': 'Tipo de Propiedad',
    'half_bathrooms': 'Medios Baños',
    'furnished_status': 'Amueblado',
    'occupancy_status': 'Estado de Ocupación',
    'construction_area': 'Área de Construcción',
    'contact_last_names': 'Apellidos',
    'contact_first_names': 'Nombres',
    'contact_nationality': 'Nacionalidad',
    'contact_home_address': 'Dirección de Contacto',
    'ref': 'Referencia/Folio',
    'folio': 'Folio Interno',
    'main_image_url': 'URL Imagen Principal',
    'gallery_urls': 'URLs Galería',
    'recruitment_pdf_url': 'PDF Reclutamiento',
    'key_receipt_pdf_url': 'PDF Recibo Llaves',
    'admin_service_interest': 'Interés en Premium',
    'maintenance_fee': 'Mantenimiento',
    'request_professional_photos': 'Sesión Pro',
    'type': 'Tipo de Operación',
    'submission_id': 'ID de Envío',
    'land_area': 'Terreno',
    'privacy_policy': 'Política de Privacidad',
    'is_signed': 'Firmado',
    'user_id': 'ID Usuario',
    'id': 'ID Registro'
};

const translateKey = (key: string) => {
    return KEY_TRANSLATIONS[key.toLowerCase()] || key.replace(/_/g, ' ').toUpperCase();
};

interface RecruitmentDetailsModalProps {
    recruitment: any;
    onClose: () => void;
    onStatusChange: (status: string, reason?: string, feedback?: string) => void;
    onUpdateData?: (updates: any) => void;
}

const RecruitmentDetailsModal: React.FC<RecruitmentDetailsModalProps> = ({ recruitment, onClose, onStatusChange, onUpdateData }) => {
    if (!recruitment || !recruitment.form_data) return null;

    const fd = recruitment.form_data;
    const isRent = recruitment.type === 'rent';
    const [title, setTitle] = React.useState(fd.title || '');
    const [description, setDescription] = React.useState(fd.description || '');
    const [folio, setFolio] = React.useState(fd.ref || fd.folio || '');
    const [hasChanges, setHasChanges] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'marketing' | 'preview' | 'full_data'>('marketing');

    // Property Overlay State
    const [showPropertyOverlay, setShowPropertyOverlay] = useState(false);
    const [liveProperty, setLiveProperty] = useState<any>(null);
    const [loadingProperty, setLoadingProperty] = useState(false);

    // Linking State
    const [showLinkingPanel, setShowLinkingPanel] = useState(false);
    const [availableProperties, setAvailableProperties] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const { success: toastSuccess, error: toastError } = useToast();

    // Sync state if prop changes
    React.useEffect(() => {
        setTitle(fd.title || '');
        setDescription(fd.description || '');
        setFolio(fd.ref || fd.folio || '');
        setHasChanges(false);
    }, [recruitment]);

    const handleSaveData = () => {
        if (onUpdateData) {
            onUpdateData({ ...fd, title, description, ref: folio, folio });
            setHasChanges(false);
        }
    };

    const handleDownloadImages = async () => {
        const images: string[] = [];
        if (fd.main_image_url) images.push(fd.main_image_url);
        if (fd.gallery_urls && Array.isArray(fd.gallery_urls)) {
            images.push(...fd.gallery_urls);
        }

        if (images.length === 0) {
            toastError?.('No hay imágenes para descargar');
            return;
        }

        try {
            // Lazy import JSZip to keep initial bundle small
            const JSZip = (await import('jszip')).default;
            const { saveAs } = await import('file-saver');
            const zip = new JSZip();
            const folderName = `${folio || 'PROPIEDAD'}_${recruitment.profiles?.full_name || 'SIN_NOMBRE'}`.replace(/[^a-z0-9]/gi, '_').toUpperCase();
            const imgFolder = zip.folder(folderName);

            toastSuccess?.('Preparando descarga de ' + images.length + ' imágenes...');

            const downloadPromises = images.map(async (url, i) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
                    const fileName = i === 0 ? `00_PRINCIPAL.${extension}` : `${String(i).padStart(2, '0')}_GALERIA.${extension}`;
                    imgFolder?.file(fileName, blob);
                } catch (err) {
                    console.error('Error downloading image:', url, err);
                }
            });

            await Promise.all(downloadPromises);

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${folderName}.zip`);
            toastSuccess?.('¡Imágenes descargadas correctamente!');
        } catch (err: any) {
            console.error('Error generating ZIP:', err);
            toastError?.('Error al generar el archivo ZIP: ' + err.message);
        }
    };

    const fetchUnlinkedProperties = async () => {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .is('owner_id', null)
            .ilike('title', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            toastError?.('Error al buscar propiedades');
        } else {
            setAvailableProperties(data || []);
        }
    };

    useEffect(() => {
        if (showLinkingPanel) {
            fetchUnlinkedProperties();
        }
    }, [showLinkingPanel, searchTerm]);

    const fetchLiveProperty = async () => {
        if (!recruitment.linked_property_id) {
            toastError?.('No hay propiedad vinculada');
            return;
        }

        setLoadingProperty(true);
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', recruitment.linked_property_id)
                .single();

            if (error) throw error;

            if (data) {
                const transformedProperty = {
                    ...data,
                    ownerId: data.owner_id,
                    tenantId: data.tenant_id,
                    mainImage: data.main_image,
                    images: data.images || [],
                    isFeatured: data.is_featured || false,
                    specs: {
                        beds: data.specs?.beds || 0,
                        baths: data.specs?.baths || 0,
                        area: data.specs?.area || 0,
                        landArea: data.specs?.landArea || 0,
                        levels: data.specs?.levels || 1,
                        age: data.specs?.age || 0,
                        ...(data.specs || {})
                    },
                    features: data.features || [],
                    services: data.services || [],
                    amenities: data.amenities || [],
                    spaces: data.spaces || [],
                    additionals: data.additionals || [],
                    documents: [],
                    status: data.status || 'available',
                    type: data.type || 'sale',
                    maintenanceFee: data.maintenance_fee || 0,
                    accessCode: data.ref || '0000',
                    status_reason: data.status_reason
                };

                setLiveProperty(transformedProperty);
                setShowPropertyOverlay(true);
            }
        } catch (err: any) {
            toastError?.('Error al cargar la propiedad: ' + err.message);
        } finally {
            setLoadingProperty(false);
        }
    };

    const handleLinkProperty = async (propertyId: string) => {
        try {
            setIsLinking(true);

            // 1. Link Owner to Property
            const { error: propErr } = await supabase
                .from('properties')
                .update({ owner_id: recruitment.owner_id })
                .eq('id', propertyId);

            if (propErr) throw propErr;

            // 2. Update Submission Status & Link
            const { error: subErr } = await supabase
                .from('property_submissions')
                .update({
                    status: 'published',
                    linked_property_id: propertyId
                })
                .eq('id', recruitment.id);

            if (subErr) throw subErr;

            // 3. Update Signed Documents Link
            // Ensure all documents generated for this recruitment are now linked to the real property
            const { error: docsErr } = await supabase
                .from('signed_documents')
                .update({ property_id: propertyId })
                .eq('submission_id', recruitment.id); // Fixed column name from recruitment_id to submission_id

            if (docsErr) {
                console.error("Error linking documents:", docsErr);
                // We don't throw here to not block the main flow, but we rename the toast
                toastSuccess?.('Propiedad vinculada, pero hubo un error al mover los documentos.');
            } else {
                toastSuccess?.('¡Propiedad y documentos vinculados exitosamente!');
            }

            toastSuccess?.('¡Propiedad vinculada y publicada exitosamente!');
            onStatusChange('published');
            setShowLinkingPanel(false);
            onClose();
        } catch (err: any) {
            toastError?.('Error al vincular: ' + err.message);
        } finally {
            setIsLinking(false);
        }
    };

    // Mock functionality for Preview component buttons since it's just a preview
    const noop = () => { };

    return (
        <>
            {/* Property Overlay Modal */}
            {showPropertyOverlay && liveProperty && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[95vh] rounded-[2rem] overflow-hidden shadow-3xl flex flex-col border border-white/10">
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Propiedad en Vivo</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {liveProperty.ref}</p>
                            </div>
                            <button onClick={() => { setShowPropertyOverlay(false); setLiveProperty(null); }} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                <span className="material-symbols-outlined dark:text-white text-2xl">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-10 bg-slate-50 dark:bg-slate-950">
                            {/* Image Gallery */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[28rem]">
                                {/* Main Image - Left Side (Larger) */}
                                <div className="lg:col-span-8 h-full rounded-[2rem] overflow-hidden bg-black shadow-2xl flex items-center justify-center relative group">
                                    <img src={liveProperty.mainImage || liveProperty.images[0]} alt={liveProperty.title} className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>

                                {/* Thumbnails - Right Side (Vertical Stack) */}
                                <div className="lg:col-span-4 h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                                    {liveProperty.images?.length > 0 ? (
                                        liveProperty.images.map((img: string, idx: number) => (
                                            <div key={idx} className="flex-none w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200 dark:border-white/10 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer group relative">
                                                <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                            Sin galería
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property Info */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{liveProperty.title}</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2 mt-3">
                                            <span className="material-symbols-outlined text-primary">location_on</span>
                                            {liveProperty.address}
                                        </p>
                                    </div>

                                    <div className="py-6 border-y border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Precio</p>
                                        <div className="flex items-baseline gap-3">
                                            <p className="text-5xl font-black text-primary tracking-tighter">${liveProperty.price?.toLocaleString()}</p>
                                            {liveProperty.maintenanceFee > 0 && (
                                                <span className="text-sm font-bold text-slate-400">+ ${liveProperty.maintenanceFee.toLocaleString()} Mant.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {liveProperty.specs?.beds > 0 && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                <span className="material-symbols-outlined text-primary text-2xl">bed</span>
                                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{liveProperty.specs.beds}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Recámaras</p>
                                            </div>
                                        )}
                                        {liveProperty.specs?.baths > 0 && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                <span className="material-symbols-outlined text-primary text-2xl">bathtub</span>
                                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{liveProperty.specs.baths}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Baños</p>
                                            </div>
                                        )}
                                        {liveProperty.specs?.area > 0 && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                <span className="material-symbols-outlined text-primary text-2xl">square_foot</span>
                                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{liveProperty.specs.area}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">m² Construidos</p>
                                            </div>
                                        )}
                                        {liveProperty.specs?.levels > 1 && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                <span className="material-symbols-outlined text-primary text-2xl">layers</span>
                                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{liveProperty.specs.levels}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Niveles</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                        {liveProperty.services?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Servicios</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {liveProperty.services.map((s: string, i: number) => (
                                                        <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {liveProperty.amenities?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Amenidades</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {liveProperty.amenities.map((a: string, i: number) => (
                                                        <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">{a}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {liveProperty.description && (
                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Descripción</h4>
                                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3" dangerouslySetInnerHTML={{ __html: liveProperty.description }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Original Modal */}
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose} />

                <div className="relative bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-7xl max-h-[95vh] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-white/10">
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-white dark:bg-slate-950">
                        <h2 className="text-base sm:text-xl font-bold dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-lg sm:text-2xl">visibility</span>
                            Vista Previa ({isRent ? 'Renta' : 'Venta'})
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <span className="material-symbols-outlined dark:text-white">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* View Switcher Panels */}
                        {viewMode === 'marketing' ? (
                            /* Marketing View: Files & Data Summary */
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-8 pb-12">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Preview/View Property Trigger Card */}
                                        <div className={`p-1.5 bg-gradient-to-r ${recruitment.status === 'published' ? 'from-green-500/20 via-green-500/10' : 'from-primary/20 via-primary/10'} to-transparent rounded-[2rem] border ${recruitment.status === 'published' ? 'border-green-500/20' : 'border-primary/20'}`}>
                                            <button
                                                onClick={() => {
                                                    if (recruitment.status === 'published' && recruitment.linked_property_id) {
                                                        fetchLiveProperty();
                                                    } else {
                                                        setViewMode('preview');
                                                    }
                                                }}
                                                disabled={loadingProperty}
                                                className="w-full h-full py-6 bg-white dark:bg-slate-950 rounded-[1.8rem] flex flex-col items-center justify-center px-8 gap-4 group hover:scale-[1.01] transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className={`w-16 h-16 rounded-[1.4rem] ${recruitment.status === 'published' ? 'bg-green-500 shadow-green-500/30' : 'bg-primary shadow-primary/30'} text-white flex items-center justify-center shadow-glow group-hover:rotate-12 transition-transform`}>
                                                    <span className="material-symbols-outlined text-3xl">
                                                        {loadingProperty ? 'progress_activity' : (recruitment.status === 'published' ? 'open_in_new' : 'visibility')}
                                                    </span>
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                                                        {loadingProperty ? 'Cargando...' : (recruitment.status === 'published' ? 'Ver Propiedad' : 'Vista Cliente')}
                                                    </h4>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                        {recruitment.status === 'published' ? 'Abrir publicación en vivo' : 'Simular visualización'}
                                                    </p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Full Data Trigger Card */}
                                        <div className="p-1.5 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent rounded-[2rem] border border-blue-500/20">
                                            <button
                                                onClick={() => setViewMode('full_data')}
                                                className="w-full h-full py-6 bg-white dark:bg-slate-950 rounded-[1.8rem] flex flex-col items-center justify-center px-8 gap-4 group hover:scale-[1.01] transition-all shadow-2xl"
                                            >
                                                <div className="w-16 h-16 rounded-[1.4rem] bg-blue-500 text-white flex items-center justify-center shadow-glow shadow-blue-500/30 group-hover:rotate-12 transition-transform">
                                                    <span className="material-symbols-outlined text-3xl">list_alt</span>
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">Datos Enlistados</h4>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ver todas las respuestas</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-8">
                                            {/* Signature Status Banner */}
                                            {!recruitment.is_signed && recruitment.status === 'pending' && (
                                                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-6 animate-pulse">
                                                    <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                                                        <span className="material-symbols-outlined text-2xl">ink_pen</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">Propiedad Congelada</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">El propietario no ha firmado la solicitud obligatoria</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Marketing Data Edit Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-xs sm:text-sm">edit_note</span>
                                                    Datos de Marketing
                                                </h3>
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-6 shadow-xl">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-primary">Folio Magno</label>
                                                        <input
                                                            type="text"
                                                            value={folio}
                                                            onChange={(e) => { setFolio(e.target.value.toUpperCase()); setHasChanges(true); }}
                                                            placeholder="Ej: MAG-REC-001"
                                                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-primary/20 text-sm font-black text-primary focus:border-primary outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-slate-400">Título de la Publicación</label>
                                                        <input
                                                            type="text"
                                                            value={title}
                                                            onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                                                            placeholder="Ej: Casa en Renta en Juriquilla..."
                                                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold focus:border-primary outline-none"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-medium italic mt-2">La descripción detallada ahora se gestiona directamente desde Tokko.</p>
                                                    {hasChanges && (
                                                        <button
                                                            onClick={handleSaveData}
                                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all animate-in zoom-in"
                                                        >
                                                            Guardar Cambios de Marketing
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            {/* Profile Info */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Propietario</h3>
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4 shadow-xl">
                                                    <div>
                                                        <p className="text-lg font-black dark:text-white leading-tight uppercase tracking-tighter">{recruitment.profiles?.full_name || 'Usuario desconocido'}</p>
                                                        <p className="text-xs dark:text-slate-400 font-bold">{recruitment.profiles?.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-xl">call</span>
                                                        </div>
                                                        <p className="text-sm font-black dark:text-white">{fd.contact_phone || 'No proporcionado'}</p>
                                                    </div>
                                                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">ID Sistema: {recruitment.owner_id}</p>
                                                </div>
                                            </div>

                                            {/* Generated Documents */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">description</span>
                                                    Documentación Generada
                                                </h3>
                                                {(recruitment.form_data.unsigned_recruitment_url || recruitment.form_data.unsigned_keys_url) ? (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {recruitment.form_data.unsigned_recruitment_url && (
                                                            <div className="p-5 bg-primary/5 rounded-[1.8rem] border border-primary/20 flex items-center justify-between group">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${recruitment.is_signed ? 'bg-green-500 text-white shadow-glow shadow-green-500/30' : 'bg-rose-500 text-white animate-pulse'}`}>
                                                                        <span className="material-symbols-outlined">{recruitment.is_signed ? 'verified_user' : 'ink_pen'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black dark:text-white uppercase tracking-tight">Hoja de Reclutamiento</p>
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{recruitment.is_signed ? 'Propiedad Firmada' : 'Falta Firma Owner'}</p>
                                                                    </div>
                                                                </div>
                                                                <a href={recruitment.form_data.unsigned_recruitment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg">
                                                                    PDF
                                                                </a>
                                                            </div>
                                                        )}
                                                        {recruitment.form_data.unsigned_keys_url && (
                                                            <div className="p-5 bg-primary/5 rounded-[1.8rem] border border-primary/20 flex items-center justify-between group">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${recruitment.is_signed ? 'bg-green-500 text-white shadow-glow shadow-green-500/30' : 'bg-rose-500 text-white animate-pulse'}`}>
                                                                        <span className="material-symbols-outlined">{recruitment.is_signed ? 'key' : 'key'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black dark:text-white uppercase tracking-tight">Recibo de Llaves</p>
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{recruitment.is_signed ? 'Propiedad Firmada' : 'Falta Firma Owner'}</p>
                                                                    </div>
                                                                </div>
                                                                <a href={recruitment.form_data.unsigned_keys_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg">
                                                                    PDF
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/5 text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentación pendiente de generación</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:col-span-2">
                                            {/* Documents Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    Expediente de Identidad <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] text-slate-500 dark:text-slate-300 font-black">{fd.id_url || fd.predial_url ? 'COMPLETO' : 'INCOMPLETO'}</span>
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {/* INE / Identificación(es) */}
                                                    {fd.id_urls && fd.id_urls.length > 0 ? (
                                                        fd.id_urls.map((url: string, idx: number) => (
                                                            <div key={idx} className="p-5 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-200 dark:border-white/5 flex items-center justify-between group shadow-lg">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center bg-green-500/10 text-green-500">
                                                                        <span className="material-symbols-outlined text-2xl">badge</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-black dark:text-white uppercase tracking-tight">INE / IDENTIFICACIÓN {fd.id_urls.length > 1 ? `#${idx + 1}` : ''}</p>
                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">DOC. VERIFICADO</p>
                                                                    </div>
                                                                </div>
                                                                <a href={url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-indigo-500 text-white rounded-[1rem] flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                                                    <span className="material-symbols-outlined">download</span>
                                                                </a>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-5 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-200 dark:border-white/5 flex items-center justify-between group shadow-sm opacity-60">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center bg-red-500/10 text-red-500">
                                                                    <span className="material-symbols-outlined text-2xl">priority_high</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black dark:text-white uppercase tracking-tight">IDENTIFICACIÓN OFICIAL</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ARCHIVO FALTANTE</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Predial */}
                                                    <div className="p-5 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-200 dark:border-white/5 flex items-center justify-between group shadow-lg">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${fd.predial_url ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                                <span className="material-symbols-outlined text-2xl">{fd.predial_url ? 'description' : 'warning_amber'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black dark:text-white uppercase tracking-tight">RECIBO PREDIAL</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{fd.predial_url ? 'ARCHIVO CARGADO' : 'OPCIONAL - NO CARGADO'}</p>
                                                            </div>
                                                        </div>
                                                        {fd.predial_url && (
                                                            <a href={fd.predial_url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-indigo-500 text-white rounded-[1rem] flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                                                <span className="material-symbols-outlined">download</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Additional Details */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Logística y Servicios</h3>
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4 shadow-xl">
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Llaves Proporcionadas</span>
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${fd.keys_provided ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                                            {fd.keys_provided ? 'SÍ (Copia en Magno)' : 'NO (Dueño Abre)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 border-t border-slate-50 dark:border-white/5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Servicio Administrativo</span>
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${fd.admin_service_interest ? 'bg-amber-500 text-white shadow-glow shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-white/10'}`}>
                                                            {fd.admin_service_interest ? 'PREMIUM (SÍ)' : 'ESTÁNDAR (NO)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 border-t border-slate-50 dark:border-white/5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cuota de Mantenimiento</span>
                                                        <span className="text-sm font-black dark:text-white">
                                                            {fd.maintenance_fee ? `$${fd.maintenance_fee}` : '$0.00'}
                                                        </span>
                                                    </div>
                                                    {fd.request_professional_photos && (
                                                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center animate-pulse">
                                                                    <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Solicitó Sesión Pro</span>
                                                            </div>
                                                            <span className="px-3 py-1 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">PENDIENTE</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'preview' ? (
                            /* Client Preview View */
                            <div className="flex-1 bg-slate-950 overflow-y-auto relative custom-scrollbar animate-in fade-in duration-500">
                                {/* Navigation Bar for Preview */}
                                <div className="sticky top-0 z-[100] w-full p-4 flex items-center justify-between pointer-events-none">
                                    <button
                                        onClick={() => setViewMode('marketing')}
                                        className="pointer-events-auto flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full hover:bg-white/40 transition-all shadow-2xl active:scale-90 group"
                                        title="Volver"
                                    >
                                        <span className="material-symbols-outlined text-lg sm:text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                    </button>
                                    <div className="pointer-events-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">Vista Cliente</span>
                                    </div>
                                </div>

                                <div className="scale-[0.55] sm:scale-[0.75] lg:scale-[0.82] origin-top mx-auto pb-40 transform-gpu will-change-transform">
                                    {/* We pass the EDITED form data to the preview, so user sees changes instantly */}
                                    <PropertyPreview formData={{ ...fd, title, description }} onEdit={noop} onConfirm={noop} mode={recruitment.type as any} />
                                </div>
                            </div>
                        ) : (
                            /* Full Data List View */
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto relative custom-scrollbar animate-in fade-in duration-500 p-4 sm:p-12">
                                <div className="sticky top-0 z-[100] w-full mb-8 flex items-center justify-between">
                                    <button
                                        onClick={() => setViewMode('marketing')}
                                        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-lg active:scale-90 group"
                                        title="Volver"
                                    >
                                        <span className="material-symbols-outlined text-lg sm:text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                    </button>
                                    <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xs sm:text-sm text-blue-500">list_alt</span>
                                        <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest">Datos Enlistados</span>
                                    </div>
                                </div>

                                <div className="max-w-4xl mx-auto space-y-12 pb-20">
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Expediente Completo del Registro</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Todas las respuestas proporcionadas por el cliente</p>
                                        </div>

                                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                                            {Object.entries(fd).filter(([key, value]) =>
                                                value !== null &&
                                                value !== undefined &&
                                                value !== '' &&
                                                !Array.isArray(value) &&
                                                typeof value !== 'object' &&
                                                !key.includes('url') &&
                                                !key.includes('signature')
                                            ).map(([key, value]) => (
                                                <div key={key} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{translateKey(key)}</span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 sm:p-4 border-t border-white/10 bg-white dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleDownloadImages}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Descargar Fotos
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                            {recruitment.status === 'pending' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); onStatusChange('rejected', 'Documentación incompleta'); }}
                                        className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all text-xs uppercase tracking-widest"
                                    >
                                        Rechazar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); onStatusChange('changes_requested', '', 'Favor de subir foto de INE legible'); }}
                                        className="px-6 py-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white font-bold transition-all text-xs uppercase tracking-widest"
                                    >
                                        Solicitar Cambios
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); onStatusChange('approved'); }}
                                        disabled={!recruitment.is_signed}
                                        title={!recruitment.is_signed ? 'El propietario aún no ha firmado la solicitud' : ''}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${recruitment.is_signed
                                            ? 'bg-blue-600 text-white hover:shadow-lg'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{recruitment.is_signed ? 'check_circle' : 'lock'}</span>
                                        {recruitment.is_signed ? 'Aprobar Solicitud' : 'Falta Firma'}
                                    </button>
                                </>
                            )}

                            {recruitment.status === 'approved' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                                    <div className="flex-1 text-center sm:text-left">
                                        <p className="text-[10px] font-black uppercase text-blue-500 animate-pulse">✓ Solicitud Aprobada</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Sube la propiedad a Tokko y vincúlala aquí</p>
                                    </div>
                                    <button
                                        onClick={() => setShowLinkingPanel(true)}
                                        className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Vincular con Tokko
                                    </button>
                                </div>
                            )}

                            {recruitment.status === 'published' && (
                                <div className="px-6 py-3 bg-green-500/10 text-green-500 rounded-xl flex items-center gap-2 border border-green-500/20">
                                    <span className="material-symbols-outlined text-sm">verified</span>
                                    <span className="text-xs font-black uppercase tracking-widest">Publicado y Vinculado</span>
                                </div>
                            )}

                            {(recruitment.status === 'rejected' || recruitment.status === 'changes_requested') && (
                                <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 font-medium text-sm">
                                    Estado actual: <span className="font-bold uppercase">{recruitment.status}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linking Panel Overlay */}
                    {showLinkingPanel && (
                        <div className="absolute inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Vincular Propiedad</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selecciona la propiedad que subiste a Tokko</p>
                                    </div>
                                    <button onClick={() => setShowLinkingPanel(false)} className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <div className="p-8 flex-1 overflow-hidden flex flex-col gap-6">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar por título o referencia de Tokko..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 pl-12 rounded-2xl border border-white/5 font-bold text-sm outline-none focus:border-primary transition-all"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                        {availableProperties.length > 0 ? (
                                            availableProperties.map((prop) => (
                                                <button
                                                    key={prop.id}
                                                    onClick={() => handleLinkProperty(prop.id)}
                                                    disabled={isLinking}
                                                    className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                                >
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                                        <img src={prop.main_image} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-900 dark:text-white uppercase truncate text-sm">{prop.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">REF: {prop.ref}</span>
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{prop.address}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                        <span className="material-symbols-outlined">link</span>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-20 opacity-50">
                                                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                                                <p className="text-xs font-bold uppercase">No se encontraron propiedades sin dueño</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isLinking && (
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[310]">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Vinculando Propietario...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default RecruitmentDetailsModal;
