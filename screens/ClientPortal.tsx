
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
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import { saveAs } from 'file-saver';

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
    const [showPropertyForm, setShowPropertyForm] = useState<'sale' | 'rent' | 'selection' | null>(null);
    const [activeSubmissions, setActiveSubmissions] = useState<any[]>([]);
    const [faqType, setFaqType] = useState<'rent' | 'sale' | null>(null); // For FAQs section
    const [notifications, setNotifications] = useState<any[]>([]);
    const [inquiries, setInquiries] = useState<any[]>([]);

    useEffect(() => {
        if (location.state && (location.state as any).openForm) {
            setShowPropertyForm((location.state as any).openForm);
        }
    }, [location]);

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
                        services: p.services || [],
                        amenities: p.amenities || [],
                        spaces: p.spaces || [],
                    }));
                    setUserProperties(userProps);
                }

                // 2. Fetch Active Submissions
                const { data: subData } = await supabase
                    .from('property_submissions')
                    .select('*')
                    .eq('owner_id', user.id)
                    .in('status', ['draft', 'changes_requested', 'pending']);

                if (subData) setActiveSubmissions(subData);

                // 3. Fetch Notifications (New Feature)
                try {
                    const { data: notifData } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (notifData) setNotifications(notifData);
                } catch (notifErr) {
                    console.warn('Notifications feature not fully available:', notifErr);
                }

                // 4. Fetch Inquiries (New Feature) - ONLY if properties exist
                if (userProps.length > 0) {
                    const propertyIds = userProps.map(p => p.id);
                    // Fetch for both Rent and Sale applications if they share the table or separate
                    // Assuming rental_applications handles both with 'application_type' column as per migration
                    const { data: inqData } = await supabase
                        .from('rental_applications')
                        .select(`
                            *,
                            properties (title, ref)
                        `)
                        .in('property_id', propertyIds)
                        .order('created_at', { ascending: false });

                    if (inqData) setInquiries(inqData);
                }

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

    if (showPropertyForm === 'sale') {
        return <PropertySubmission mode="sale" onCancel={() => setShowPropertyForm(null)} />;
    }

    if (showPropertyForm === 'rent') {
        return <PropertySubmission mode="rent" onCancel={() => setShowPropertyForm(null)} />; // Keeping mode prop just in case, but component is hardcoded now
    }

    if (showPropertyForm === 'selection') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="max-w-4xl w-full">
                    <button onClick={() => setShowPropertyForm(null)} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span className="text-xs font-black uppercase tracking-widest">Volver</span>
                    </button>

                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">Elige tu Camino</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">¿Qué deseas hacer con tu propiedad?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => setShowPropertyForm('sale')}
                            className="group relative bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all hover:shadow-2xl hover:scale-[1.02] text-left"
                        >
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-[2rem] flex items-center justify-center text-green-500 mb-8 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-5xl">monetization_on</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Quiero Vender</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Maximiza tu retorno con nuestra estrategia de venta premium.</p>
                        </button>

                        <button
                            onClick={() => setShowPropertyForm('rent')}
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
                                <div key={sub.id} className={`p-6 rounded-[2.5rem] border-2 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${sub.status === 'changes_requested' ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/20' : sub.status === 'pending' ? 'bg-blue-500/5 border-blue-500/30' : 'bg-primary/5 border-primary/20 shadow-lg'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${sub.status === 'changes_requested' ? 'bg-amber-500 text-white' : sub.status === 'pending' ? 'bg-blue-500 text-white' : 'bg-primary text-white'}`}>
                                            <span className="material-symbols-rounded text-3xl">
                                                {sub.status === 'changes_requested' ? 'emergency_home' : sub.status === 'pending' ? 'timer' : 'edit_note'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                {sub.status === 'changes_requested' ? '¡Se requiere tu atención!' : sub.status === 'pending' ? 'En Revisión' : 'Continúa tu registro'}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                {sub.status === 'changes_requested'
                                                    ? 'Un asesor ha solicitado cambios en tu propiedad.'
                                                    : sub.status === 'pending'
                                                        ? 'Tu propiedad está siendo validada por nuestro equipo.'
                                                        : `Tienes un borrador pendiente para ${sub.type === 'sale' ? 'venta' : 'renta'}.`}
                                            </p>
                                        </div>
                                    </div>
                                    {sub.status !== 'pending' ? (
                                        <button
                                            onClick={() => setShowPropertyForm(sub.type)}
                                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sub.status === 'changes_requested' ? 'bg-amber-500 text-white hover:scale-105 active:scale-95' : 'bg-primary text-white hover:shadow-glow'}`}
                                        >
                                            {sub.status === 'changes_requested' ? 'Ver Comentarios' : 'Continuar Proceso'}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {/* Property Card */}
                                    {userProperties.map(prop => (
                                        <div key={prop.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border border-slate-200 dark:border-white/5 shadow-xl group hover:border-primary/30 transition-all">
                                            <div className="h-48 rounded-[2rem] bg-slate-100 overflow-hidden mb-4 relative">
                                                <img src={prop.mainImage || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">{prop.status}</span>
                                                </div>
                                            </div>
                                            <div className="px-2 pb-2">
                                                <h3 className="font-extrabold text-lg uppercase tracking-tight text-slate-900 dark:text-white truncate">{prop.title}</h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mb-4">{prop.address}</p>
                                                <button onClick={() => navigate(`/property/${prop.id}`)} className="w-full py-3 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-colors">
                                                    Ver Detalles
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Card */}
                                    <button onClick={() => setShowPropertyForm('selection')} className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-8 gap-4 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group min-h-[300px]">
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
                                            onClick={() => setShowPropertyForm('sale')}
                                            className="group relative bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-transparent hover:border-primary/30 transition-all hover:shadow-xl"
                                        >
                                            <span className="material-symbols-outlined text-4xl mb-4 text-green-500">monetization_on</span>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">Quiero Vender</h3>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Maximiza tu retorno</p>
                                        </button>

                                        <button
                                            onClick={() => setShowPropertyForm('rent')}
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
                                            <button onClick={() => setShowPropertyForm('sale')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Vender
                                            </button>
                                            <button onClick={() => setShowPropertyForm('rent')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
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
                                        {userProperties.length > 0
                                            ? 'Tu propiedad ya está publicada. Te avisaremos aquí en cuanto alguien muestre interés.'
                                            : 'Aún no has publicado ninguna propiedad. Carga tu inmueble hoy mismo.'}
                                    </p>

                                    {userProperties.length === 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                                            <button onClick={() => setShowPropertyForm('sale')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                                Quiero Vender
                                            </button>
                                            <button onClick={() => setShowPropertyForm('rent')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
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
                                        <button onClick={() => setShowPropertyForm('sale')} className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
                                            Quiero Vender
                                        </button>
                                        <button onClick={() => setShowPropertyForm('rent')} className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:shadow-glow transition-all">
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

                                return allItems.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {allItems.map((prop: any) => (
                                            <div key={prop.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-xl group hover:border-primary/20 transition-all flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden">
                                                {/* Decorative Background Accent */}
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-800/20 -mr-32 -mt-32 rounded-full z-0 opacity-50" />

                                                {/* Property Info Thumbnail */}
                                                <div className="relative z-10 flex items-center gap-6 w-full lg:w-1/2">
                                                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] overflow-hidden shrink-0 border-4 border-white dark:border-slate-800 shadow-2xl group-hover:scale-105 transition-transform">
                                                        <img src={prop.mainImage || 'https://via.placeholder.com/300'} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${prop.type === 'rent' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                                                {prop.type === 'rent' ? 'Renta' : 'Venta'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {prop.ref || 'EN PROCESO'}</span>
                                                            {prop.source === 'submission' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[7px] font-black uppercase">Pendiente de Alta</span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-black text-xl uppercase tracking-tight text-slate-900 dark:text-white truncate pr-4">{prop.title || 'Propiedad sin título'}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{prop.address || 'Ubicación pendiente'}</p>
                                                    </div>
                                                </div>

                                                {/* Document Actions */}
                                                <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full lg:w-1/2">
                                                    {/* Recruitment PDF */}
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const docData = {
                                                                    ...prop,
                                                                    ...(prop.form_data || {}), // Spread form_data to get fields like property_type if stuck there
                                                                    ...(prop.specs || {}),
                                                                    ownerName: user?.name,
                                                                    mobiliario: prop.mobiliario || prop.form_data?.mobiliario || [],
                                                                    features: prop.features || prop.form_data?.features || prop.services || [],
                                                                    rooms: prop.specs?.beds || prop.rooms || prop.form_data?.rooms,
                                                                    bathrooms: prop.specs?.baths || prop.bathrooms || prop.form_data?.bathrooms,
                                                                    parking_spots: prop.specs?.parking || prop.parking_spots || prop.form_data?.parking_spots,
                                                                    maintenance_fee: prop.maintenance_fee || prop.form_data?.maintenance_fee
                                                                };
                                                                const blob = await pdf(<RecruitmentPDF data={docData} mode={prop.type as any} />).toBlob();
                                                                saveAs(blob, `Hoja_Reclutamiento_${(prop.title || 'Propiedad').replace(/\s+/g, '_')}.pdf`);
                                                                toastSuccess?.('Hoja de Reclutamiento generada con éxito');
                                                            } catch (err) {
                                                                console.error('PDF Gen Error:', err);
                                                                toastError?.('Error al generar el documento. Intenta de nuevo.');
                                                            }
                                                        }}
                                                        className="flex-1 group/btn p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 hover:border-red-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-3 text-center"
                                                    >
                                                        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 group-hover/btn:scale-110 transition-transform">
                                                            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">Hoja de Reclutamiento</span>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Generar PDF Oficial</p>
                                                    </button>

                                                    {/* Key Receipt PDF (Only for Rent) */}
                                                    {prop.type === 'rent' && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const docData = { ...prop, ...(prop.specs || {}), ownerName: user?.name };
                                                                    const blob = await pdf(<KeyReceiptPDF data={docData} />).toBlob();
                                                                    saveAs(blob, `Responsiva_Llaves_${(prop.title || 'Propiedad').replace(/\s+/g, '_')}.pdf`);
                                                                    toastSuccess?.('Responsiva de Llaves generada con éxito');
                                                                } catch (err) {
                                                                    console.error('PDF Gen Error:', err);
                                                                    toastError?.('Error al generar el documento.');
                                                                }
                                                            }}
                                                            className="flex-1 group/btn p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 hover:border-blue-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-3 text-center"
                                                        >
                                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover/btn:scale-110 transition-transform">
                                                                <span className="material-symbols-outlined text-2xl">vpn_key</span>
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">Responsiva de Llaves</span>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Documento de entrega</p>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 border-2 border-dashed border-slate-200 dark:border-white/10 text-center">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 text-slate-300">
                                            <span className="material-symbols-outlined text-5xl">folder_off</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Tu Carpeta está Vacía</h3>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                                            Aquí aparecerán los documentos oficiales de tus propiedades una vez que comiences el proceso de alta.
                                        </p>
                                    </div>
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
            </div>
        </div>
    );
};

export default ClientPortal;
