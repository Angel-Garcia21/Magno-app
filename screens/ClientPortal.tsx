
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Property, User } from '../types';
import { useToast } from '../context/ToastContext';
import ClientSidebar from '../components/ClientSidebar';
import PropertySubmission from './PropertySubmission';

import PropertySubmissionSale from './PropertySubmissionSale';
import { pdf } from '@react-pdf/renderer';
import PropertyPreview from '../components/PropertyPreview';
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import { saveAs } from 'file-saver';
import SignatureModal from '../components/SignatureModal';
import { SignedDocument } from '../types';

const ClientPortal: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const [activeView, setActiveView] = useState('properties');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userProperties, setUserProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    // State for toggling between "List" and "Add New"
    const [activeSubmissions, setActiveSubmissions] = useState<any[]>([]);
    const [faqType, setFaqType] = useState<'rent' | 'sale' | null>(null); // For FAQs section
    const [notifications, setNotifications] = useState<any[]>([]);
    const [inquiries, setInquiries] = useState<any[]>([]);

    // Signature State
    const [signatureModalOpen, setSignatureModalOpen] = useState(false);
    const [signingDocType, setSigningDocType] = useState<'recruitment' | 'keys' | 'contract' | null>(null);
    const [signingProperty, setSigningProperty] = useState<Property | null>(null);
    const [signedDocs, setSignedDocs] = useState<SignedDocument[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Preview Modal State
    const [showDocPreview, setShowDocPreview] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [showPropPreview, setShowPropPreview] = useState(false);
    const [previewPropData, setPreviewPropData] = useState<any>(null);

    useEffect(() => {
        if (location.state && (location.state as any).openForm) {
            navigate((location.state as any).openForm === 'sale' ? '/vender' : '/rentar');
        }
    }, [location, navigate]);

    useEffect(() => {
        if (!user) {
            // Guest user - show empty state
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                // 1. Fetch Properties
                const { data: propData, error: propError } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('owner_id', user.id);

                if (propError) throw propError;

                let userProps: Property[] = [];
                if (propData) {
                    userProps = propData.map((p: any) => ({
                        ...p,
                        mainImage: p.main_image,
                        ownerId: p.owner_id,
                        specs: p.specs || {},
                        images: p.images || [],
                        features: p.features || [],
                        services: p.services || [],
                        amenities: p.amenities || [],
                        spaces: p.spaces || [],
                        additionals: p.additionals || [],
                        status_reason: p.status_reason
                    }));
                }

                // 2. Fetch Active Submissions & Merge with Properties
                const { data: subData } = await supabase
                    .from('property_submissions')
                    .select('*')
                    .eq('owner_id', user.id)
                    .in('status', ['draft', 'changes_requested', 'pending']);

                if (subData) {
                    setActiveSubmissions(subData);

                    const mappedSubs = subData.map((s: any) => {
                        const fd = JSON.parse(JSON.stringify(s.form_data || {})); // Ensure clean object
                        return {
                            id: s.id,
                            title: fd.title || fd.titulo || `${s.type === 'sale' ? 'Venta' : 'Renta'} en revisión`,
                            address: fd.address || fd.direccion || 'Dirección en proceso',
                            mainImage: fd.main_image_url || fd.foto_principal || fd.main_image || null,
                            status: s.status === 'pending' ? 'En Revisión' : (s.status === 'changes_requested' ? 'Requerido' : 'Borrador'),
                            type: s.type,
                            ownerId: s.owner_id,
                            is_submission: true,
                            submission_id: s.id,
                            ref: fd.ref || 'PROV-' + s.id.substring(0, 6).toUpperCase(),
                            specs: {
                                beds: fd.rooms || fd.recamaras || 0,
                                baths: fd.bathrooms || fd.banos || 0,
                                parking: fd.parking_spots || fd.estacionamientos || 0,
                                area: fd.construction_area || fd.m2_construccion || 0,
                                sqft: fd.construction_area || fd.m2_construccion || 0
                            },
                            keys_provided: fd.keys_provided,
                            unsigned_recruitment_url: fd.unsigned_recruitment_url,
                            unsigned_keys_url: fd.unsigned_keys_url,
                            main_image_url: fd.main_image_url || fd.foto_principal || fd.main_image
                        };
                    });

                    setUserProperties([...userProps, ...mappedSubs]);
                } else {
                    setUserProperties(userProps);
                }

                // 3. Fetch Notifications
                try {
                    const { data: notifData } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });
                    if (notifData) setNotifications(notifData);
                } catch (e) {
                    console.warn('Notifications not available');
                }

                // 4. Fetch Inquiries
                if (userProps.length > 0) {
                    const { data: inqData } = await supabase
                        .from('rental_applications')
                        .select('*, properties(*)');
                    if (inqData) setInquiries(inqData);
                }

                // 5. Fetch Signed Docs
                const { data: signedData } = await supabase
                    .from('signed_documents')
                    .select('*')
                    .eq('user_id', user.id);
                if (signedData) setSignedDocs(signedData);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, navigate]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleSignClick = async (prop: Property, docType: 'recruitment' | 'keys' | 'contract') => {
        setSigningProperty(prop);
        setSigningDocType(docType);
        setIsGeneratingPdf(true); // Reuse loading state while generating preview

        try {
            // Generate a temporary PDF blob for preview (no signature yet)
            let pdfBlob = null;
            const docData = {
                ...prop,
                ...(prop.specs || {}),
                ownerName: user?.name,
                // Ensure array fields default to empty arrays to avoid PDF crash
                mobiliario: (prop as any).mobiliario || [],
                features: (prop as any).features || [],
                rooms: (prop as any).rooms || prop.specs?.beds,
                bathrooms: (prop as any).bathrooms || prop.specs?.baths,
                parking_spots: (prop as any).parking_spots || prop.specs?.parking,
                maintenance_fee: (prop as any).maintenance_fee,
            };

            if (docType === 'recruitment') {
                pdfBlob = await pdf(<RecruitmentPDF data={docData} mode={prop.type as any} />).toBlob();
            } else if (docType === 'keys') {
                pdfBlob = await pdf(<KeyReceiptPDF data={docData} />).toBlob();
            }

            if (pdfBlob) {
                const url = URL.createObjectURL(pdfBlob);
                setPreviewPdfUrl(url);
                setShowDocPreview(true);
            }
        } catch (error) {
            console.error("Preview Generation Error:", error);
            toastError?.('Error al cargar la vista previa del documento');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleProceedToSign = () => {
        setShowDocPreview(false);
        // Revoke URL to free memory if needed, but keeping it for a sec is fine.
        // URL.revokeObjectURL(previewPdfUrl); 
        setSignatureModalOpen(true);
    };

    const handleSaveSignature = async (signatureDataUrl: string) => {
        if (!signingProperty || !signingDocType || !user) return;
        setIsGeneratingPdf(true);
        setSignatureModalOpen(false);

        try {
            // 1. Upload Signature Image
            const sigBlob = await (await fetch(signatureDataUrl)).blob();
            const sigPath = `${user.id}/${signingProperty.id}/signatures/${signingDocType}_${Date.now()}.png`;
            const { error: sigErr } = await supabase.storage
                .from('documents')
                .upload(sigPath, sigBlob);

            if (sigErr) throw sigErr;

            const { data: { publicUrl: signatureUrl } } = supabase.storage.from('documents').getPublicUrl(sigPath);

            // 2. Fetch complete property data from property_submissions to get all form_data fields
            const { data: submissionData } = await supabase
                .from('property_submissions')
                .select('form_data, type')
                .eq('owner_id', user.id)
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const fd = submissionData?.form_data || {};

            // 3. Generate PDF with Signature - Complete data object
            const docData = {
                ...signingProperty,
                ...(signingProperty.specs || {}),
                ...fd, // Include all form_data fields
                ownerName: user.name,
                contact_email: user.email,
                email: user.email,
                phone: fd.phone || (signingProperty as any).phone,
                signatureUrl: signatureDataUrl, // Use direct base64 for immediate PDF generation
                // Property details from form_data
                property_condition: fd.property_condition || fd.estado_inmueble,
                age_status: fd.age_status,
                age_years: fd.age_years,
                mobiliario: fd.mobiliario || [],
                maintenance_fee: fd.maintenance_fee || (signingProperty as any).maintenance_fee,
                // Additional fields
                rooms: fd.rooms || (signingProperty as any).rooms || signingProperty.specs?.beds,
                bathrooms: fd.bathrooms || (signingProperty as any).bathrooms || signingProperty.specs?.baths,
                half_bathrooms: fd.half_bathrooms,
                parking_spots: fd.parking_spots || (signingProperty as any).parking_spots || signingProperty.specs?.parking,
                construction_area: fd.construction_area,
                land_area: fd.land_area,
                levels: fd.levels,
                features: fd.features || (signingProperty as any).features || [],
                included_services: fd.included_services || [],
                keys_provided: fd.keys_provided || (signingProperty as any).keys_provided,
                ref: signingProperty.ref,
                folio: signingProperty.ref
            };

            let pdfBlob = null;
            if (signingDocType === 'recruitment') {
                pdfBlob = await pdf(<RecruitmentPDF data={docData} mode={signingProperty.type as any} />).toBlob();
            } else if (signingDocType === 'keys') {
                pdfBlob = await pdf(<KeyReceiptPDF data={docData} />).toBlob();
            }

            if (!pdfBlob) throw new Error('Error al generar el PDF firmado');

            // 4. Upload Signed PDF
            const pdfPath = `${user.id}/${signingProperty.id}/${signingDocType}_signed_${Date.now()}.pdf`;
            const { error: pdfErr } = await supabase.storage
                .from('documents')
                .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });

            if (pdfErr) throw pdfErr;

            const { data: { publicUrl: pdfUrl } } = supabase.storage.from('documents').getPublicUrl(pdfPath);

            // 5. Check if there's an existing PENDING document to UPDATE
            const { data: existingDoc } = await supabase
                .from('signed_documents')
                .select('id')
                .eq('property_id', signingProperty.id)
                .eq('document_type', signingDocType)
                .eq('status', 'pending')
                .single();

            let resultDoc;
            if (existingDoc) {
                // UPDATE existing document
                const { data: updatedDoc, error: updateErr } = await supabase
                    .from('signed_documents')
                    .update({
                        status: 'signed',
                        signature_url: signatureUrl,
                        pdf_url: pdfUrl,
                        signed_at: new Date().toISOString()
                    })
                    .eq('id', existingDoc.id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;
                resultDoc = updatedDoc;
                console.log("Updated existing document:", resultDoc);
            } else {
                // INSERT new document (fallback if no pending doc exists)
                const { data: newDoc, error: dbErr } = await supabase
                    .from('signed_documents')
                    .insert({
                        property_id: signingProperty.id,
                        user_id: user.id,
                        document_type: signingDocType,
                        status: 'signed',
                        signature_url: signatureUrl,
                        pdf_url: pdfUrl,
                        signed_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (dbErr) throw dbErr;
                resultDoc = newDoc;
                console.log("Inserted new document:", resultDoc);
            }

            // 6. Update Local State
            if (existingDoc) {
                // Update existing doc in state
                setSignedDocs(prev => prev.map(d => d.id === existingDoc.id ? resultDoc : d));
            } else {
                // Add new doc to state
                setSignedDocs(prev => [...prev, resultDoc]);
            }

            toastSuccess('Documento firmado y guardado correctamente');

        } catch (error: any) {
            console.error("Signing Error:", error);
            toastError(`Error al firmar: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsGeneratingPdf(false);
            setSigningProperty(null);
            setSigningDocType(null);
        }
    };


    if (location.state && (location.state as any).openSelection) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="max-w-4xl w-full">
                    <button onClick={() => navigate('/client-portal')} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span className="text-xs font-black uppercase tracking-widest">Volver</span>
                    </button>

                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">Elige tu Camino</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">¿Qué deseas hacer con tu propiedad?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => navigate('/vender')}
                            className="group relative bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all hover:shadow-2xl hover:scale-[1.02] text-left"
                        >
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-[2rem] flex items-center justify-center text-green-500 mb-8 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-5xl">monetization_on</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Quiero Vender</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Maximiza tu retorno con nuestra estrategia de venta premium.</p>
                        </button>

                        <button
                            onClick={() => navigate('/rentar')}
                            className="group relative bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-200 dark:border-white/5 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:scale-[1.02] text-left"
                        >
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-500 mb-8 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-5xl">key</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Quiero Rentar</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Genera ingresos pasivos constantes con inquilinos verificados.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-display">
            <ClientSidebar
                activeView={activeView}
                onViewChange={setActiveView}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                hasProperties={userProperties.length > 0 || activeSubmissions.length > 0}
                isAuthenticated={!!user}
            />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 p-4 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full lg:hidden transition-colors">
                        <span className="material-symbols-outlined dark:text-white">menu</span>
                    </button>
                    <span className="font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white">Panel Magno</span>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveView('notifications')}
                            className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors group"
                        >
                            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 group-hover:text-primary">notifications</span>
                            {notifications.some(n => !n.is_read) && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></span>
                            )}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
                    {/* Desktop Notification Bell */}
                    <div className="absolute top-6 right-8 hidden lg:flex items-center gap-4 z-20">
                        <button
                            onClick={() => setActiveView('notifications')}
                            className="group relative p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl hover:shadow-primary/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">notifications</span>
                            {notifications.some(n => !n.is_read) && (
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                            )}
                        </button>
                    </div>

                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                            {user ? `Hola, ${user.name?.split(' ')[0] || 'Socio'}` : 'Bienvenido a Magno'}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            Gestiona tu patrimonio con inteligencia
                        </p>
                    </div>

                    {/* Active Submissions Banner */}
                    {activeSubmissions.length > 0 && (
                        <div className="mb-10 space-y-4">
                            {activeSubmissions.map(sub => (
                                <div key={sub.id} className={`p-6 rounded-[2.5rem] border-2 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${sub.status === 'changes_requested' ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/20' : sub.status === 'pending' && !sub.is_signed ? 'bg-rose-500/10 border-rose-500 shadow-xl shadow-rose-500/10' : sub.status === 'pending' ? 'bg-blue-500/5 border-blue-500/30' : 'bg-primary/5 border-primary/20 shadow-lg'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${sub.status === 'changes_requested' ? 'bg-amber-500 text-white' : sub.status === 'pending' && !sub.is_signed ? 'bg-rose-600 text-white animate-pulse' : sub.status === 'pending' ? 'bg-blue-500 text-white' : 'bg-primary text-white'}`}>
                                            <span className="material-symbols-rounded text-3xl">
                                                {sub.status === 'changes_requested' ? 'emergency_home' : sub.status === 'pending' && !sub.is_signed ? 'ink_pen' : sub.status === 'pending' ? 'timer' : 'edit_note'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                {sub.status === 'changes_requested' ? '¡Se requiere tu atención!' : sub.status === 'pending' && !sub.is_signed ? '¡Falta tu Firma!' : sub.status === 'pending' ? 'En Revisión (Firmado)' : 'Continúa tu registro'}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                {sub.status === 'changes_requested'
                                                    ? 'Un asesor ha solicitado cambios en tu propiedad.'
                                                    : sub.status === 'pending' && !sub.is_signed
                                                        ? 'Debes firmar la documentación para que podamos publicar tu propiedad.'
                                                        : sub.status === 'pending'
                                                            ? 'Tu propiedad está siendo validada por nuestro equipo.'
                                                            : `Tienes un borrador pendiente para ${sub.type === 'sale' ? 'venta' : 'renta'}.`}
                                            </p>
                                        </div>
                                    </div>
                                    {sub.status !== 'pending' || (sub.status === 'pending' && !sub.is_signed) ? (
                                        <button
                                            onClick={() => navigate(sub.type === 'sale' ? '/vender' : '/rentar')}
                                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sub.status === 'changes_requested' ? 'bg-amber-500 text-white hover:scale-105 active:scale-95' : sub.status === 'pending' && !sub.is_signed ? 'bg-rose-600 text-white hover:shadow-glow' : 'bg-primary text-white hover:shadow-glow'}`}
                                        >
                                            {sub.status === 'changes_requested' ? 'Ver Comentarios' : sub.status === 'pending' && !sub.is_signed ? 'Firmar Ahora' : 'Continuar Proceso'}
                                        </button>
                                    ) : (
                                        <div className="px-6 py-3 bg-blue-500/10 text-blue-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                            En proceso de alta
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIEWS */}
                    {activeView === 'properties' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {loading ? (
                                <div className="text-center py-20 text-slate-400">Cargando portafolio...</div>
                            ) : userProperties.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Property Card */}
                                    {userProperties.map(prop => (
                                        <div key={prop.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border border-slate-200 dark:border-white/5 shadow-xl group hover:border-primary/30 transition-all">
                                            <div className="h-48 rounded-[2rem] bg-slate-100 overflow-hidden mb-4 relative">
                                                <img src={prop.mainImage || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute top-3 right-3 flex gap-2">
                                                    {(prop as any).is_submission && (
                                                        <div className="bg-primary/90 backdrop-blur px-3 py-1 rounded-full animate-pulse shadow-lg">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white">En Revisión</span>
                                                        </div>
                                                    )}
                                                    <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-slate-100">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">{prop.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-2 pb-2">
                                                <h3 className="font-extrabold text-lg uppercase tracking-tight text-slate-900 dark:text-white truncate">{prop.title}</h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mb-4">{prop.address}</p>
                                                <button
                                                    onClick={() => {
                                                        if ((prop as any).is_submission) {
                                                            const fullSub = activeSubmissions.find(s => s.id === prop.id);
                                                            if (fullSub) {
                                                                setPreviewPropData(fullSub);
                                                                setShowPropPreview(true);
                                                            }
                                                        } else {
                                                            navigate(`/property/${prop.id}`);
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-colors"
                                                >
                                                    {(prop as any).is_submission ? 'Ver Borrador' : 'Ver Detalles'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Card */}
                                    <button onClick={() => navigate('/client-portal', { state: { openSelection: true } })} className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-8 gap-4 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group min-h-[300px]">
                                        <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">add_business</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Agregar Propiedad</span>
                                    </button>
                                </div>
                            ) : (
                                /* EMPTY STATE FOR NEW CLIENTS */
                                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 sm:p-16 border border-slate-200 dark:border-white/5 text-center shadow-2xl max-w-3xl mx-auto">
                                    <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto mb-8 shadow-glow">
                                        <span className="material-symbols-outlined text-5xl font-black">domain_add</span>
                                    </div>
                                    <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                                        Comienza tu Legado
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-12 max-w-lg mx-auto">
                                        Aún no tienes propiedades registradas. Selecciona una opción para comenzar a monetizar tu inmueble con Magno.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                                        <button
                                            onClick={() => navigate('/vender')}
                                            className="group relative bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-transparent hover:border-primary/30 transition-all hover:shadow-xl"
                                        >
                                            <span className="material-symbols-outlined text-4xl mb-4 text-green-500">monetization_on</span>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">Quiero Vender</h3>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Maximiza tu retorno</p>
                                        </button>

                                        <button
                                            onClick={() => navigate('/rentar')}
                                            className="group relative bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-transparent hover:border-blue-500/30 transition-all hover:shadow-xl"
                                        >
                                            <span className="material-symbols-outlined text-4xl mb-4 text-blue-500">key</span>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">Quiero Rentar</h3>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Ingresos pasivos</p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'notifications' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95">
                            {notifications.length > 0 ? (
                                <div className="space-y-4">
                                    {notifications.map((notif: any) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                if (notif.type === 'inquiry') setActiveView('tenants');
                                            }}
                                            className={`bg-white dark:bg-slate-900 rounded-[2rem] p-6 border ${notif.is_read ? 'border-slate-100 dark:border-white/5 opacity-70' : 'border-primary/20 shadow-lg shadow-primary/5 cursor-pointer hover:scale-[1.02]'} transition-all`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'alert' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                                    <span className="material-symbols-outlined">{notif.type === 'payment' ? 'payments' : notif.type === 'alert' ? 'warning' : 'notifications'}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{notif.title}</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{notif.message}</p>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                        {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-3xl text-slate-400">notifications_off</span>
                                    </div>
                                    <h3 className="font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Sin Novedades</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-md">
                                        {userProperties.length > 0
                                            ? 'Te avisaremos cuando haya actualizaciones sobre tus propiedades.'
                                            : 'Todavía no tienes ninguna propiedad publicada. Comienza a rentar o a vender tu casa hoy.'}
                                    </p>
                                    {userProperties.length === 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                                            <button onClick={() => navigate('/vender')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Vender
                                            </button>
                                            <button onClick={() => navigate('/rentar')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Rentar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'profile' && (
                        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-white/5 animate-in slide-in-from-bottom-6">
                            <div className="text-center mb-8">
                                <div className="w-24 h-24 bg-primary text-white rounded-full mx-auto flex items-center justify-center text-3xl font-black mb-4 shadow-glow">
                                    {user?.name?.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{user?.name}</h2>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{user?.role === 'owner' ? 'Propietario / Inversionista' : 'Usuario Magno'}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{user?.email}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Miembro Desde</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Propiedades Publicadas</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{userProperties.length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'tenants' && (
                        <div className="max-w-4xl mx-auto animate-in fade-in">
                            {inquiries.length > 0 ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Interesados en tus Propiedades</h2>
                                    <div className="grid grid-cols-1 gap-6">
                                        {inquiries.map((inq: any) => (
                                            <div key={inq.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8" />

                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-[1.5rem] flex items-center justify-center text-blue-500 shadow-inner">
                                                                <span className="material-symbols-outlined text-3xl">how_to_reg</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                                                    ¡Posible Inquilino!
                                                                </h3>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                                    Para: <span className="text-primary">{inq.properties?.title || 'Tu Propiedad'}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-950 text-white px-6 py-3 rounded-2xl text-center shadow-lg">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Cita Programada</p>
                                                            <p className="font-bold text-sm">
                                                                {inq.appointment_date
                                                                    ? new Date(inq.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
                                                                    : 'Pendiente de agendar'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 mb-8 border border-slate-100 dark:border-white/5 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-400">person</span>
                                                            <p className="font-bold text-slate-700 dark:text-slate-300">
                                                                Interesado: <span className="uppercase">{inq.full_name}</span>
                                                            </p>
                                                        </div>
                                                        {/* Financial Checks */}
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Relación Ingreso/Renta</p>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Cumple 3 a 1</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Buró de Crédito</p>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Historial Limpio</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="w-1 bg-primary rounded-full" />
                                                        <p className="text-xs text-slate-500 leading-relaxed italic">
                                                            "Nosotros nos encargaremos de mostrar la propiedad al inquilino. Verificaremos que toda su información y perfil sean correctos para asegurar que sea un buen inquilino y evitar problemas futuros. Te mantendremos informado del resultado."
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in max-w-2xl mx-auto">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-3xl text-slate-400">group</span>
                                    </div>
                                    <h3 className="font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">
                                        {userProperties.length > 0 ? 'Aún no hay inquilinos ni compradores' : 'Comienza tu viaje'}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-md">
                                        {userProperties.some(p => !(p as any).is_submission)
                                            ? 'Tu propiedad ya está publicada. Te avisaremos aquí en cuanto alguien muestre interés.'
                                            : 'Tu propiedad está siendo validada. Podrás ver candidatos en cuanto sea publicada oficialmente.'}
                                    </p>

                                    {userProperties.length === 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                                            <button onClick={() => navigate('/vender')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Vender
                                            </button>
                                            <button onClick={() => navigate('/rentar')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Rentar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'investigations' && (
                        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[3rem] p-8 sm:p-12 border border-slate-200 dark:border-white/5 animate-in fade-in">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-3xl text-blue-500">policy</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">Investigaciones de Inquilinos</h3>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto">
                                    Aquí podrás consultar las investigaciones realizadas a tus inquilinos, donde validamos su perfil, solvencia y antecedentes para asegurarnos de que sea una persona confiable y que cuidará tu propiedad.
                                </p>
                            </div>

                            {userProperties.length === 0 && (
                                <div className="text-center pt-6 border-t border-slate-100 dark:border-white/5">
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-6">Aún no has publicado ninguna propiedad</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                                        <button onClick={() => navigate('/vender')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                            Quiero Vender
                                        </button>
                                        <button onClick={() => navigate('/rentar')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                            Quiero Rentar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'documents' && (
                        <div className="max-w-5xl mx-auto animate-in fade-in">
                            <div className="mb-10">
                                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Mi Repositorio</h2>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Consulta y descarga la documentación oficial de tus inmuebles</p>
                            </div>

                            {(() => {
                                const allItems = [
                                    ...userProperties.map(p => ({ ...p, source: 'property' }))
                                ];

                                const getSignedDoc = (prop: any, type: string) => {
                                    // 1. Try to find in official signedDocs table
                                    const official = signedDocs.find(d => d.property_id === prop.id && d.document_type === type && d.status === 'signed');
                                    if (official) return official;

                                    // 2. Fallback for submissions: check the property object itself (mapped from form_data)
                                    if (prop.is_submission) {
                                        if (type === 'recruitment' && prop.unsigned_recruitment_url) {
                                            return { pdf_url: prop.unsigned_recruitment_url, status: 'signed' };
                                        }
                                        if (type === 'keys' && prop.unsigned_keys_url) {
                                            return { pdf_url: prop.unsigned_keys_url, status: 'signed' };
                                        }
                                    }
                                    return null;
                                };

                                return allItems.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {allItems.map((prop: any) => {
                                            const recruitmentDoc = getSignedDoc(prop, 'recruitment');
                                            const keysDoc = getSignedDoc(prop, 'keys');
                                            const contractsDoc = getSignedDoc(prop, 'contract');

                                            return (
                                                <div key={prop.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl group hover:border-primary/20 transition-all flex flex-col gap-8 relative overflow-hidden">
                                                    {/* Header: Prop Info */}
                                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] overflow-hidden shrink-0 border-2 border-slate-200 dark:border-white/10">
                                                            <img src={prop.mainImage || 'https://via.placeholder.com/300'} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white mb-1">{prop.title}</h3>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prop.ref || 'SIN FOLIO'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Documents List */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {/* 1. Recruitment Sheet (Always) */}
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-between h-40">
                                                            <div className="flex justify-between items-start">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${recruitmentDoc ? 'bg-green-500/10 text-green-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                                    <span className="material-symbols-outlined">description</span>
                                                                </div>
                                                                {recruitmentDoc && <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">Hoja de Reclutamiento</p>
                                                                {recruitmentDoc ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (recruitmentDoc.pdf_url) {
                                                                                window.open(recruitmentDoc.pdf_url, '_blank', 'noreferrer');
                                                                            } else {
                                                                                toastError?.('Documento no disponible aún.');
                                                                            }
                                                                        }}
                                                                        className="text-[9px] font-bold text-green-500 hover:underline uppercase tracking-wider flex items-center gap-1"
                                                                    >
                                                                        Descargar PDF <span className="material-symbols-outlined text-[10px]">download</span>
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => handleSignClick(prop, 'recruitment')} className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1">
                                                                        Firmar Ahora <span className="material-symbols-outlined text-[10px]">ink_pen</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 2. Key Receipt (Conditional) */}
                                                        {(prop.keys_provided || prop.keysProvided) && (
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-between h-40">
                                                                <div className="flex justify-between items-start">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${keysDoc ? 'bg-green-500/10 text-green-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                                        <span className="material-symbols-outlined">key</span>
                                                                    </div>
                                                                    {keysDoc && <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">Responsiva de Llaves</p>
                                                                    {keysDoc ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (keysDoc.pdf_url) {
                                                                                    window.open(keysDoc.pdf_url, '_blank', 'noreferrer');
                                                                                } else {
                                                                                    toastError?.('Documento no disponible aún.');
                                                                                }
                                                                            }}
                                                                            className="text-[9px] font-bold text-green-500 hover:underline uppercase tracking-wider flex items-center gap-1"
                                                                        >
                                                                            Descargar PDF <span className="material-symbols-outlined text-[10px]">download</span>
                                                                        </button>
                                                                    ) : (
                                                                        <button onClick={() => handleSignClick(prop, 'keys')} className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1">
                                                                            Firmar Ahora <span className="material-symbols-outlined text-[10px]">ink_pen</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 3. Contract (Sale Only) */}
                                                        {prop.type === 'sale' && (
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-between h-40 opacity-50 cursor-not-allowed items-start relative">
                                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Próximamente</span>
                                                                </div>
                                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-xl">
                                                                    <span className="material-symbols-outlined">gavel</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">Contrato de Prestación</p>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pendiente de habilitar</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No hay documentos disponibles</div>
                                );
                            })()}

                        </div>
                    )}

                    {activeView === 'faqs' && (
                        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                            {!faqType ? (
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-8">Preguntas Frecuentes</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button onClick={() => setFaqType('rent')} className="group bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-[2.5rem] p-8 border-2 border-blue-200 dark:border-blue-800/30 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-2xl text-left">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">key</span>
                                                </div>
                                                <h3 className="text-xl font-black uppercase tracking-tight text-blue-900 dark:text-blue-300">Todo sobre Rentar</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">Todo lo que tienes que saber sobre rentar tu casa con Magno.</p>
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
                                                Ver más<span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                            </div>
                                        </button>
                                        <button onClick={() => setFaqType('sale')} className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-[2.5rem] p-8 border-2 border-green-200 dark:border-green-800/30 hover:border-green-400 dark:hover:border-green-600 transition-all hover:shadow-2xl text-left">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">monetization_on</span>
                                                </div>
                                                <h3 className="text-xl font-black uppercase tracking-tight text-green-900 dark:text-green-300">Todo sobre Vender</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">Todo lo que tienes que saber sobre vender tu casa con Magno.</p>
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-xs uppercase tracking-widest">
                                                Ver más<span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{faqType === 'rent' ? 'Rentar con Magno' : 'Vender con Magno'}</h2>
                                        <button onClick={() => setFaqType(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-black uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-sm">arrow_back</span>Volver
                                        </button>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-primary text-xl">help</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">¿Qué datos necesito para crear una propiedad?</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Al crear una propiedad, te pedimos algunos datos básicos como:</p>
                                                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span><span>Tus datos personales (nombre, email, teléfono, domicilio)</span></li>
                                                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span><span>Los datos de la propiedad (dirección, tipo, características, precio)</span></li>
                                                    <li className="flex items-start gap-2"><span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">info</span><span><strong>INE y Predial</strong> (opcionales, pero nos ayudan a agilizar el proceso)</span></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-blue-500 text-xl">schedule</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">¿Cuánto tiempo tarda la aprobación?</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Al llenar todos tus datos y publicar tu propiedad, <strong className="text-primary">en unos minutos te la aprobaremos</strong> o te solicitaremos cambios si hace falta algún detalle. Recibirás una notificación en tu panel.</p>
                                            </div>
                                        </div>
                                    </div>
                                    {faqType === 'rent' && (
                                        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-blue-900/10 rounded-[2.5rem] p-6 sm:p-8 border-2 border-purple-200 dark:border-purple-800/30 shadow-xl">
                                            <div className="flex items-start gap-4 mb-6">
                                                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">workspace_premium</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-purple-900 dark:text-purple-300 mb-2">Beneficios de rentar tu casa con Magno</h3>
                                                    <p className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-widest">Todo lo que hacemos por ti</p>
                                                </div>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">search</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Búsqueda y filtrado</strong> de inquilinos confiables</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">verified_user</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Revisión de documentos,</strong> capacidad de pago y validación de historial</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">description</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Elaboración del contrato</strong> de arrendamiento</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">handshake</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Acompañamiento</strong> en la entrega del inmueble</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">campaign</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Difusión profesional</strong> en plataformas inmobiliarias</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-purple-100 dark:border-purple-700/20">
                                                    <div className="flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">schedule</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Ahorro de tiempo</strong> y cero complicaciones para ti</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {faqType === 'rent' ? (
                                        <>
                                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-[2.5rem] p-6 sm:p-8 border-2 border-blue-200 dark:border-blue-800/30 shadow-xl">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">payments</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-blue-900 dark:text-blue-300 mb-4">¿Cuánto cobran?</h3>
                                                        <div className="bg-white/60 dark:bg-slate-900/40 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/30">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Renta</span>
                                                                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">1 Mes</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Equivalente a <strong>un mes de renta</strong>. <strong className="text-blue-600 dark:text-blue-400">Tú te llevas los 11 meses de renta y el mes de depósito.</strong> Nosotros nada más nos llevamos el primer mes de renta.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-lg">
                                                <div className="flex items-start gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-xl">verified</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Nuestras Garantías</h3>
                                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Tu tranquilidad es nuestra prioridad</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="border-l-4 border-primary pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Garantía de selección del inquilino</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Evaluamos cuidadosamente a cada prospecto mediante documentos oficiales, validación de ingresos, referencias y revisión de historial.</p>
                                                    </div>
                                                    <div className="border-l-4 border-primary pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Contratos claros y protegidos</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Utilizamos un contrato profesional de arrendamiento que protege tus derechos como propietario y establece obligaciones claras para ambas partes.</p>
                                                    </div>
                                                    <div className="border-l-4 border-primary pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Acompañamiento de inicio a fin</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Te acompañamos durante todo el proceso: desde la publicación, visitas, análisis de candidatos, firma de contrato y entrega del inmueble.</p>
                                                    </div>
                                                    <div className="border-l-4 border-primary pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Transparencia total</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Recibes copia de toda la documentación relevante, así como seguimiento del proceso para que estés seguro de cada paso que se da.</p>
                                                    </div>
                                                    <div className="border-l-4 border-primary pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Atención personalizada</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Siempre tendrás un asesor disponible para resolver dudas y mantenerte informado.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 rounded-[2.5rem] p-6 sm:p-8 border-2 border-green-200 dark:border-green-800/30 shadow-xl">
                                                <div className="flex items-start gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">workspace_premium</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-green-900 dark:text-green-300 mb-2">Beneficios de vender tu casa con Magno</h3>
                                                        <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-widest">Todo lo que hacemos por ti</p>
                                                    </div>
                                                </div>
                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">analytics</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Análisis de mercado</strong> y definición del precio óptimo de venta</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">campaign</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Difusión profesional</strong> en plataformas inmobiliarias y redes estratégicas</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">person_search</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Filtrado y validación</strong> de compradores potenciales</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">gavel</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Revisión de documentación</strong> legal del inmueble</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">handshake</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Acompañamiento</strong> en promesa, contrato y escrituración</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">savings</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><strong>Negociación profesional</strong> para obtener las mejores condiciones</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-green-100 dark:border-green-700/20 sm:col-span-2">
                                                        <div className="flex items-start gap-3 justify-center">
                                                            <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">sentiment_satisfied</span>
                                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed text-center"><strong>Ahorro de tiempo, respaldo legal</strong> y cero estrés durante todo el proceso</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-[2.5rem] p-6 sm:p-8 border-2 border-green-200 dark:border-green-800/30 shadow-xl">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">payments</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-green-900 dark:text-green-300 mb-4">¿Cuánto cobran?</h3>
                                                        <div className="bg-white/60 dark:bg-slate-900/40 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/30">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Venta</span>
                                                                <span className="text-3xl font-black text-green-600 dark:text-green-400">5%</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Nuestro porcentaje por venta es del <strong className="text-green-600 dark:text-green-400">5% sobre el precio total de venta</strong> de tu propiedad. Este porcentaje cubre todo el proceso de comercialización, marketing profesional, verificación de compradores y acompañamiento legal hasta el cierre de la venta.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-lg">
                                                <div className="flex items-start gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-xl">verified</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Nuestras Garantías</h3>
                                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Tu tranquilidad es nuestra prioridad</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="border-l-4 border-green-500 pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Garantía de selección del comprador</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Evaluamos cuidadosamente a cada prospecto mediante documentos oficiales, validación de ingresos, referencias y revisión de historial.</p>
                                                    </div>
                                                    <div className="border-l-4 border-green-500 pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Contratos claros y protegidos</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Utilizamos un contrato profesional de venta que protege tus derechos como propietario y establece obligaciones claras para ambas partes.</p>
                                                    </div>
                                                    <div className="border-l-4 border-green-500 pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Acompañamiento de inicio a fin</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Te acompañamos durante todo el proceso: desde la publicación, visitas, análisis de candidatos, firma de contrato y entrega del inmueble.</p>
                                                    </div>
                                                    <div className="border-l-4 border-green-500 pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Transparencia total</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Recibes copia de toda la documentación relevante, así como seguimiento del proceso para que estés seguro de cada paso que se da.</p>
                                                    </div>
                                                    <div className="border-l-4 border-green-500 pl-4 py-2">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Atención personalizada</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Siempre tendrás un asesor disponible para resolver dudas y mantenerte informado.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'notifications' && (
                        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                            <div className="mb-10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Notificaciones</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Mantente al tanto de tus inmuebles</p>
                                </div>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (!user) return;
                                            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
                                            if (!error) setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                                    >
                                        Marcar todas como leídas
                                    </button>
                                )}
                            </div>

                            {notifications.length > 0 ? (
                                <div className="space-y-4">
                                    {notifications.map((notif: any) => (
                                        <div
                                            key={notif.id}
                                            className={`p-6 rounded-[2rem] border transition-all flex items-start gap-4 ${notif.is_read
                                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 opacity-80'
                                                : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-primary text-white'}`}>
                                                <span className="material-symbols-outlined text-2xl">
                                                    {notif.type === 'system' ? 'smart_toy' : notif.type === 'payment' ? 'payments' : 'info'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <h4 className={`text-sm font-black uppercase tracking-tight ${notif.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                        {new Date(notif.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 border-2 border-dashed border-slate-200 dark:border-white/10 text-center">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 text-slate-300">
                                        <span className="material-symbols-outlined text-5xl">notifications_off</span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Notificaciones</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                                        Te avisaremos por aquí cuando haya noticias sobre tus propiedades.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </main>

                {/* PREVIEW MODAL */}
                {showDocPreview && previewPdfUrl && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden shadow-[0_30px_70px_-12px_rgba(0,0,0,0.8)] border border-slate-200 dark:border-white/5 relative">
                            {/* Header - Slimmer */}
                            <div className="py-4 px-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-0.5">
                                        {signingDocType === 'recruitment' ? 'Hoja de Reclutamiento' : signingDocType === 'keys' ? 'Responsiva de Llaves' : 'Contrato'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Documento Oficial para Firma</p>
                                </div>
                                <button onClick={() => setShowDocPreview(false)} className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:rotate-90">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-50 dark:bg-slate-950/30 p-2 md:p-4 overflow-hidden relative">
                                <iframe
                                    src={previewPdfUrl}
                                    className="w-full h-full rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner bg-white"
                                    title="Document Preview"
                                    style={{ height: '100%' }}
                                />
                            </div>

                            {/* Footer Actions - Slimmer */}
                            <div className="py-4 px-8 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex justify-between items-center gap-4">
                                <button
                                    onClick={() => setShowDocPreview(false)}
                                    className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleProceedToSign}
                                    className="px-10 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg">ink_pen</span>
                                    Proceder a Firmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signature Modal */}
                <SignatureModal
                    isOpen={signatureModalOpen}
                    onClose={() => setSignatureModalOpen(false)}
                    onSave={handleSaveSignature}
                    title={signingDocType === 'recruitment' ? 'Hoja de Reclutamiento' : signingDocType === 'keys' ? 'Responsiva de Llaves' : 'Firmar Documento'}
                    description="Por favor firma para aceptar los términos y generar el documento oficial."
                />

                {/* Loading Overlay */}
                {isGeneratingPdf && (
                    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
                        <span className="loader mb-8"></span>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Generando Documento...</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Firmando y guardando legalmente</p>
                    </div>
                )}
            </div>
            {/* Property Draft Preview Modal */}
            {showPropPreview && previewPropData && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[95vh] relative">
                        <button
                            onClick={() => setShowPropPreview(false)}
                            className="absolute top-8 right-8 z-[210] w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all font-bold"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="flex-1 overflow-y-auto p-8 sm:p-12 no-scrollbar">
                            <div className="mb-10 text-center">
                                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 mb-4 inline-block">
                                    Vista Previa del Borrador
                                </span>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Detalles de tu Solicitud</h2>
                            </div>

                            <PropertyPreview
                                formData={previewPropData.form_data || {}}
                                mode={previewPropData.type || 'rent'}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientPortal;
