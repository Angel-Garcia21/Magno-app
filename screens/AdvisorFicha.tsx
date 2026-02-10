import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { asesorService } from '../services/asesorService';
import { AdvisorProfile, User, BlogPost } from '../types';
import type { Property } from '../types';
import { captureReferral } from '../utils/referralTracking';
import RentContentIntegrated from '../components/RentContentIntegrated';

const AdvisorFicha: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<AdvisorProfile | null>(null);
    const [advisorUser, setAdvisorUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [advisorPosts, setAdvisorPosts] = useState<BlogPost[]>([]);
    const [availableProperties, setAvailableProperties] = useState<Property[]>([]);


    const portalsLogos = [
        { name: 'Inmuebles24', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519998/6_kasaob.png' },
        { name: 'Viva Anuncios', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519978/1_qn2civ.png' },
        { name: 'Propiedades.com', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520006/8_wjmrel.png' },
        { name: 'Lamudi', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519993/4_rm4aiw.png' },
        { name: 'Casas y Terrenos', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519989/3_zzb5ho.png' },
        { name: 'Inmoxperts', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520002/7_hucqn1.png' },
        { name: 'Tu Portal Online', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519985/2_hurtsn.png' },
        { name: 'Properstar', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520009/9_oeokit.png' },
        { name: 'Facebook', url: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519496/fb_logo_sin_fondo_lf3vjn.png' }
    ];

    useEffect(() => {
        if (!id) return;
        captureReferral(id);

        const fetchData = async () => {
            try {
                const [profData, userData] = await Promise.all([
                    asesorService.getAdvisorProfile(id),
                    supabase.from('profiles').select('*').eq('id', id).single()
                ]);

                if (userData.error) throw userData.error;

                setProfile(profData);
                setAdvisorUser({
                    id: userData.data.id,
                    email: userData.data.email,
                    name: userData.data.full_name,
                    role: userData.data.role,
                    phone: userData.data.phone_contact,
                    // Ensure these are passed from the profiles fetch
                    sold_count: userData.data.sold_count || 0,
                    rented_count: userData.data.rented_count || 0
                });

                // Fetch posts by this author
                const { data: posts } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('author_id', id)
                    .eq('status', 'published')
                    .order('created_at', { ascending: false });

                setAdvisorPosts(posts || []);

                // Fetch available properties
                const { data: properties } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('status', 'available')
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (properties) {
                    const mappedProps: Property[] = properties.map((p: any) => ({
                        ...p,
                        ownerId: p.owner_id,
                        tenantId: p.tenant_id,
                        mainImage: p.main_image,
                        images: p.images || [],
                        isFeatured: p.is_featured || false,
                        specs: {
                            beds: 0, baths: 0, area: 0, landArea: 0, levels: 1, age: 0,
                            ...(p.specs || {})
                        },
                        features: p.features || [],
                        services: p.services || [],
                        amenities: p.amenities || [],
                        spaces: p.spaces || [],
                        additionals: p.additionals || [],
                        documents: [],
                        status: p.status || 'available',
                        type: p.type || 'sale',
                        maintenanceFee: p.maintenance_fee || 0,
                        accessCode: p.ref || '0000'
                    }));
                    setAvailableProperties(mappedProps);
                }

            } catch (err) {
                console.error("Error fetching advisor:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Robust Intersection Observer for Scroll Reveals
    useEffect(() => {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    // Stop observing once revealed to save resources
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Selection of elements to reveal
        // We do this inside a timeout to ensure everything is rendered
        const timer = setTimeout(() => {
            const elements = document.querySelectorAll('.reveal-on-scroll');
            elements.forEach(el => observer.observe(el));
        }, 500);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [profile, advisorUser]); // Re-run when profile changes




    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#b4975a]/20 border-t-[#b4975a] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!advisorUser) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-black text-white uppercase mb-4">Asesor no encontrado</h1>
                <button onClick={() => navigate('/')} className="text-[#b4975a] font-black uppercase tracking-widest hover:underline">Volver al inicio</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-[#b4975a] selection:text-white font-display">

            {/* Main Content Container with Overflow Handling */}
            <div className="relative w-full min-h-screen overflow-x-hidden pb-20 mx-0">

                {/* High-End Background Image - Cityscape Night */}
                <div className="fixed inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=2613&q=80"
                        alt="City Skyline Night"
                        className="w-full h-full object-cover opacity-30 scale-105 animate-pulse-slow"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/90 to-[#020617]" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center">


                    {/* Main Profile Card */}

                    <div className="w-full relative">
                        {/* Background Glows */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#b4975a]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />

                        <div className="flex flex-col items-center justify-center text-center space-y-8 md:space-y-12">

                            {/* Profile Photo with Neon Ring */}
                            <div className="relative group">
                                <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-[#b4975a] via-[#38bdf8] to-[#b4975a] animate-spin-slow blur-md opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-black bg-black shadow-2xl">
                                    {profile?.photo_url ? (
                                        <img src={profile.photo_url} alt={advisorUser.name} className="w-full h-full object-cover transition-all duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900">
                                            <span className="material-symbols-outlined text-8xl">person</span>
                                        </div>
                                    )}
                                </div>
                                {profile?.is_verified && (
                                    <div className="absolute bottom-2 right-2 bg-[#b4975a] text-black w-12 h-12 rounded-full flex items-center justify-center border-4 border-black shadow-[0_0_20px_rgba(180,151,90,0.6)] animate-bounce-slow">
                                        <span className="material-symbols-outlined font-black">verified</span>
                                    </div>
                                )}
                            </div>

                            {/* Name and Title */}
                            <div className="space-y-4 relative">
                                <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] animate-pulse-slow">
                                    {advisorUser.name}
                                </h1>
                                <div className="flex items-center justify-center gap-6">
                                    <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-[#b4975a]"></div>
                                    <span className="text-xs md:text-sm font-black uppercase tracking-[0.5em] text-[#b4975a] drop-shadow-[0_0_10px_rgba(180,151,90,0.5)]">
                                        Asesor Profesional Magno
                                    </span>
                                    <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-[#b4975a]"></div>
                                </div>

                                <div className="relative max-w-2xl mx-auto">
                                    <p className="text-sm md:text-lg text-slate-300 leading-relaxed font-light italic text-center">
                                        "{profile?.bio || 'Ayudo a mis clientes a potenciar sus ingresos con bienes raíces'}"
                                    </p>
                                </div>
                            </div>


                            {/* Opcionador Extra Sections (Map & Portals) */}
                            {profile?.advisor_type === 'opcionador' && (
                                <div className="w-full space-y-20 py-12">

                                    {/* Real Estate Portals Section */}
                                    <div className="text-center reveal-on-scroll">
                                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4 drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                                            Publicamos en los <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200 drop-shadow-[0_0_20px_rgba(180,151,90,0.6)]">Portales más Visitados</span>
                                        </h2>
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-16">Tu propiedad expuesta ante miles de prospectos cada día</p>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto px-4">
                                            {portalsLogos.map((portal, i) => (
                                                <div
                                                    key={i}
                                                    className="bg-gradient-to-br from-white/95 to-slate-50/95 rounded-2xl p-2 md:p-3 h-28 md:h-40 flex items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(180,151,90,0.3)] hover:scale-110 hover:from-white hover:to-white transition-all duration-500 reveal-on-scroll group"
                                                    style={{ transitionDelay: `${i * 50}ms` }}
                                                >
                                                    <img src={portal.url} alt={portal.name} className="w-full h-full object-contain p-2 transition-all scale-100 group-hover:scale-110" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PROPIEDADES DISPONIBLES SECTION - Hidden for Opcionadores */}
                        {profile?.advisor_type !== 'opcionador' && availableProperties.length > 0 && (
                            <div className="w-full max-w-6xl mx-auto py-12 relative">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4 drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                                        Propiedades <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200 drop-shadow-[0_0_20px_rgba(180,151,90,0.6)]">Disponibles</span>
                                    </h2>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Explora las mejores opciones del mercado</p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {availableProperties.map(property => (
                                        <div
                                            key={property.id}
                                            onClick={() => navigate(`/propiedad/${property.id}?ref=${id}`)}
                                            className="group relative bg-[#0a0a0a]/80 backdrop-blur-md rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 hover:border-[#b4975a]/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                                        >
                                            {/* Property Image */}
                                            <div className="aspect-[4/3] md:aspect-[4/3] overflow-hidden relative">
                                                <img
                                                    src={property.mainImage || property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'}
                                                    alt={property.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

                                                {/* Property Type Badge */}
                                                <div className="absolute top-4 left-4">
                                                    <span className="px-2 py-1 md:px-3 md:py-1 bg-[#b4975a] text-black text-[7px] md:text-[8px] font-black uppercase tracking-widest rounded-full">
                                                        {property.type === 'sale' ? 'Venta' : 'Renta'}
                                                    </span>
                                                </div>

                                                {/* Price */}
                                                <div className="absolute bottom-4 left-4">
                                                    <p className="text-lg md:text-2xl font-black text-white drop-shadow-lg">
                                                        ${property.price?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Property Details */}
                                            <div className="p-4 md:p-6">
                                                <h3 className="text-sm md:text-lg font-black uppercase leading-tight text-white mb-2 md:mb-3 group-hover:text-[#b4975a] transition-colors line-clamp-2">
                                                    {property.title}
                                                </h3>

                                                <p className="text-[10px] md:text-xs text-slate-400 mb-3 md:mb-4 line-clamp-1">
                                                    <span className="material-symbols-outlined text-xs md:text-sm align-middle mr-1">location_on</span>
                                                    {property.location}
                                                </p>

                                                {/* Specs */}
                                                <div className="flex items-center gap-3 md:gap-4 text-slate-400 text-[10px] md:text-xs font-bold">
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs md:text-sm">bed</span>
                                                        {property.specs?.beds || 0}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs md:text-sm">bathtub</span>
                                                        {property.specs?.baths || 0}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs md:text-sm">straighten</span>
                                                        {property.specs?.area || 0}m²
                                                    </div>
                                                </div>

                                                {/* CTA */}
                                                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ver Detalles</span>
                                                    <span className="material-symbols-outlined text-[#b4975a] group-hover:translate-x-2 transition-transform">arrow_forward</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* View All Button */}
                                <div className="text-center mt-12">
                                    <button
                                        onClick={() => navigate(`/listings?ref=${id}`)}
                                        className="group relative px-10 py-4 bg-transparent overflow-hidden rounded-full transform hover:scale-105 transition-all duration-300 border-2 border-[#b4975a]/30 hover:border-[#b4975a]"
                                    >
                                        <span className="relative z-10 font-black text-white text-sm uppercase tracking-widest flex items-center gap-3">
                                            Ver Todas las Propiedades
                                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* INTEGRATED RENT FLOW CONTENT - Direct for Opcionadores */}
                        {profile?.advisor_type === 'opcionador' && (
                            <div className="w-full py-20">
                                <RentContentIntegrated />
                            </div>
                        )}



                        {/* Contact Section */}
                        <div className="w-full max-w-md mx-auto">


                            {/* Contact Actions */}
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        const phone = advisorUser.phone?.replace(/\D/g, '');
                                        const message = encodeURIComponent("Hola, me interesa saber más sobre tus servicios inmobiliarios.");
                                        window.open(`https://wa.me/52${phone}?text=${message}`, '_blank');
                                    }}
                                    className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all hover:scale-[1.02] mb-4"
                                >
                                    <div className="text-left">
                                        <p className="text-green-400 font-black uppercase tracking-widest text-[9px] mb-0.5">WhatsApp</p>
                                        <p className="text-white font-bold text-sm">Contactar Directamente</p>
                                    </div>
                                    <span className="material-symbols-outlined text-2xl text-green-400 group-hover:rotate-12 transition-transform">chat</span>
                                </button>

                                <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-5 border border-white/5 flex items-center justify-center text-slate-500">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-center">Más opciones próximamente</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Blogs */}
                        {advisorPosts.length > 0 && (
                            <div className="w-full max-w-6xl mx-auto pt-20 border-t border-white/5 mt-20">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">Artículos Publicados</h2>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Contenido exclusivo creado por {advisorUser.name}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {advisorPosts.map(post => (
                                        <div
                                            key={post.id}
                                            onClick={() => navigate(`/blog/${post.slug}`)}
                                            className="group relative bg-[#0a0a0a] rounded-[2rem] overflow-hidden border border-white/10 hover:border-[#b4975a]/50 transition-all duration-500 hover:-translate-y-2"
                                        >
                                            <div className="aspect-[4/3] overflow-hidden relative">
                                                <img src={post.main_image} alt={post.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                                <div className="absolute bottom-4 left-4">
                                                    <span className="px-3 py-1 bg-[#b4975a] text-black text-[8px] font-black uppercase tracking-widest rounded-full">{post.category || 'Blog'}</span>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <h3 className="text-xl font-black uppercase leading-tight text-white mb-4 group-hover:text-[#b4975a] transition-colors line-clamp-2">
                                                    {post.title}
                                                </h3>
                                                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                                                    <span className="material-symbols-outlined text-[#b4975a] group-hover:translate-x-2 transition-transform">arrow_forward</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <footer className="relative z-10 text-center py-12 text-slate-600">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Powered by Grupo Magno Inmobiliario</p>
                </footer>
            </div>

            {/* Global Scroll Reveal Styles */}
            <style>{`
                .reveal-on-scroll {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                    will-change: opacity, transform;
                }
                .reveal-on-scroll.reveal-active {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
};

export default AdvisorFicha;
