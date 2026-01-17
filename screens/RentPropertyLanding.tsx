import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RentPropertyLanding: React.FC = () => {
    const navigate = useNavigate();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [scrollProgress, setScrollProgress] = useState(0);

    // Mouse tracking for dynamic background
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Scroll tracking
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(scrolled / maxScroll);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Prevent Back Navigation (Trap)
    useEffect(() => {
        // Push state initially
        window.history.pushState(null, '', window.location.pathname);

        const handlePopState = () => {
            // Push state again if they try to go back
            window.history.pushState(null, '', window.location.pathname);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // LOGO HEADER (No Exit - Scroll to Top)
    const LogoHeader = () => (
        <div className="fixed top-0 left-0 z-50 p-6 animate-in fade-in slide-in-from-top-4 duration-1000">
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:scale-105 transition-transform drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
            >
                <img
                    src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png"
                    alt="Magno Logo"
                    className="w-16 h-16 object-contain"
                />
            </button>
        </div>
    );

    const benefits = [
        { icon: 'search', title: 'Búsqueda y filtrado', desc: 'de inquilinos confiables' },
        { icon: 'verified_user', title: 'Revisión de documentos', desc: 'capacidad de pago y validación de historial' },
        { icon: 'gavel', title: 'Convenio de Justicia', desc: 'Contrato que blinda y protege tu propiedad al 100%' },
        { icon: 'handshake', title: 'Acompañamiento', desc: 'y seguimiento en la entrega del inmueble' },
        { icon: 'campaign', title: 'Difusión profesional', desc: 'en más de 8 plataformas inmobiliarias' },
        { icon: 'schedule', title: 'Ahorro de tiempo', desc: 'y cero complicaciones para ti' }
    ];

    const guarantees = [
        { title: 'Garantía de selección del inquilino', desc: 'Evaluamos cuidadosamente a cada prospecto mediante documentos oficiales, validación de ingresos, referencias y revisión de historial.' },
        { title: 'Contratos claros y protegidos', desc: 'Utilizamos un contrato profesional de arrendamiento que protege tus derechos como propietario y establece obligaciones claras para ambas partes.' },
        { title: 'Acompañamiento de inicio a fin', desc: 'Te acompañamos durante todo el proceso: desde la publicación, visitas, análisis de candidatos, firma de contrato y entrega del inmueble.' },
        { title: 'Transparencia total', desc: 'Recibes copia de toda la documentación relevante, así como seguimiento del proceso para que estés seguro de cada paso que se da.' },
        { title: 'Atención personalizada', desc: 'Siempre tendrás un asesor disponible para resolver dudas y mantenerte informado.' }
    ];

    const faqs = [
        {
            q: '¿Qué datos necesito para crear una propiedad?',
            a: 'Al crear una propiedad, te pedimos algunos datos básicos como: tus datos personales (nombre, email, teléfono, domicilio), los datos de la propiedad (dirección, tipo, características, precio), y opcionalmente INE y Predial (nos ayudan a agilizar el proceso).'
        },
        {
            q: '¿Cuánto tiempo tarda la aprobación?',
            a: 'Al llenar todos tus datos y publicar tu propiedad, en unos minutos te la aprobaremos o te solicitaremos cambios si hace falta algún detalle. Recibirás una notificación en tu panel.'
        }
    ];

    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Scroll Reveal Hook
    const useScrollReveal = () => {
        useEffect(() => {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('reveal-active');
                            observer.unobserve(entry.target); // Trigger only once
                        }
                    });
                },
                { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
            );

            document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));

            return () => observer.disconnect();
        }, []);
    };

    useScrollReveal();

    return (
        <div className="min-h-screen bg-[#0B1120] text-white overflow-hidden relative">
            <LogoHeader />
            {/* Ultra-Dynamic Mouse-Following Background with Enhanced Neon */}
            {/* Interactive Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Base Subtle Grid */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />

                {/* Highlighted Gold Grid (Revealed by Mouse) */}
                <div
                    className="absolute inset-0 opacity-20 transition-opacity duration-300"
                    style={{
                        backgroundImage: `linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)`,
                        backgroundSize: '50px 50px',
                        maskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
                        WebkitMaskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
                    }}
                />

                {/* Ambient Glow Spot (Subtler than before) */}
                <div
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{
                        background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(251, 191, 36, 0.15), transparent 70%)`
                    }}
                />
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <h1 className="relative text-[clamp(3rem,12vw,10rem)] font-black uppercase tracking-tighter leading-[0.9] mb-8 select-none reveal-on-scroll">
                        {/* Base Text Layer (Static) */}
                        <div
                            className="relative z-10"
                            style={{
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d4af37 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0 0 40px rgba(251, 191, 36, 0.4))'
                            }}
                        >
                            RENTA TU<br />PROPIEDAD<br />CON MAGNO
                        </div>

                        {/* Glow Layer (Animated using Opacity for Performance) */}
                        <div
                            className="absolute inset-0 z-0 blur-2xl"
                            style={{
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d4af37 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'glowOpacity 3s ease-in-out infinite',
                                willChange: 'opacity'
                            }}
                        >
                            RENTA TU<br />PROPIEDAD<br />CON MAGNO
                        </div>
                    </h1>
                    <p className="text-xl md:text-3xl text-slate-300 font-medium max-w-3xl mx-auto mb-12 leading-relaxed reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
                        Protege tu patrimonio con un equipo que <span className="text-amber-400 font-black" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>sí opera</span>.
                        Proceso claro, inquilinos verificados, y cero complicaciones.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center reveal-on-scroll" style={{ transitionDelay: '400ms' }}>
                        <a
                            href="#beneficios"
                            className="px-12 py-5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full font-black uppercase tracking-widest text-base hover:scale-110 hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] transition-all duration-300 border-2 border-amber-400/50"
                        >
                            Descubre los Beneficios
                        </a>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="material-symbols-outlined text-4xl text-amber-400" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.8)' }}>expand_more</span>
                </div>
            </section >

            {/* Benefits Section */}
            < section id="beneficios" className="py-32 px-6 relative" >
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 reveal-on-scroll">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6" style={{ textShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
                            <span className="text-amber-400" style={{ textShadow: '0 0 40px rgba(251, 191, 36, 0.4)' }}>Beneficios</span> de Rentar con Magno
                        </h2>
                        <p className="text-xl text-slate-400 uppercase tracking-widest font-black">Todo lo que hacemos por ti</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {benefits.map((benefit, idx) => (
                            <div
                                key={idx}
                                className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-xl rounded-[3rem] p-8 border border-amber-500/30 hover:border-amber-500/80 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(251,191,36,0.15)] reveal-on-scroll"
                                style={{
                                    transitionDelay: `${idx * 100}ms`
                                }}
                            >
                                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">{benefit.icon}</span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-white mb-2 group-hover:text-amber-400 transition-colors">{benefit.title}</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Pricing Section */}
            <section className="py-32 px-6 relative reveal-on-scroll">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/40 rounded-[5rem] p-12 md:p-20 border-2 border-blue-500/40 backdrop-blur-xl shadow-[0_0_60px_rgba(59,130,246,0.2)]">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-white" style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>¿Cuánto Cobramos?</h2>
                        </div>
                        <div className="bg-white/5 rounded-[4rem] p-12 border border-blue-400/30 hover:bg-white/10 transition-colors duration-500">
                            <div className="text-center mb-8">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-400 block mb-4">Renta</span>
                                <div
                                    className="text-[8rem] font-black"
                                    style={{
                                        background: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.4))'
                                    }}
                                >
                                    1 MES
                                </div>
                            </div>
                            <p className="text-lg text-slate-300 leading-relaxed text-center max-w-2xl mx-auto">
                                Equivalente a <strong>un mes de renta</strong>. <strong className="text-blue-400" style={{ textShadow: '0 0 15px rgba(96,165,250,0.5)' }}>Tú te llevas los 11 meses de renta y el mes de depósito.</strong> Nosotros nada más nos llevamos el primer mes de renta.
                            </p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Guarantees Section */}
            <section className="py-32 px-6 relative">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-20 reveal-on-scroll">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-white">
                            Nuestras <span className="text-amber-400" style={{ textShadow: '0 0 40px rgba(251, 191, 36, 0.4)' }}>Garantías</span>
                        </h2>
                        <p className="text-xl text-slate-400 uppercase tracking-widest font-black">Tu tranquilidad es nuestra prioridad</p>
                    </div>

                    <div className="space-y-6">
                        {guarantees.map((guarantee, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 border-l-4 border-amber-500 hover:bg-slate-900 transition-all duration-300 hover:translate-x-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)] group reveal-on-scroll"
                                style={{ transitionDelay: `${idx * 150}ms` }}
                            >
                                <h3 className="text-xl font-black uppercase text-white mb-3 group-hover:text-amber-400 transition-colors">{guarantee.title}</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">{guarantee.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* FAQ Section - Redesigned as Static Blocks */}
            <section className="py-32 px-6 relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 reveal-on-scroll">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-white">
                            Preguntas <span className="text-amber-400" style={{ textShadow: '0 0 40px rgba(251, 191, 36, 0.4)' }}>Frecuentes</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-900/60 backdrop-blur-xl rounded-[3rem] p-10 border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.1)] group h-full flex flex-col reveal-on-scroll"
                                style={{ transitionDelay: `${idx * 100}ms` }}
                            >
                                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">help_center</span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-white mb-6 leading-tight group-hover:text-amber-400 transition-colors">{faq.q}</h3>
                                <div className="h-1 w-20 bg-amber-500/30 rounded-full mb-6 group-hover:w-full transition-all duration-700" />
                                <p className="text-slate-300 leading-relaxed text-lg flex-1">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Final CTA */}
            <section className="py-40 px-6 relative reveal-on-scroll">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-8 leading-tight">
                        <span className="text-white">¿Listo para </span>
                        <span className="text-amber-400">Rentar con Magno</span>
                        <span className="text-white">?</span>
                    </h2>
                    <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
                        Comienza ahora y protege tu patrimonio con el mejor equipo inmobiliario.
                    </p>
                    <button
                        onClick={() => navigate('/rentar')}
                        className="px-20 py-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full font-black uppercase tracking-[0.3em] text-xl hover:scale-110 hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 border-2 border-amber-400/30 animate-pulse"
                    >
                        Rentar Mi Propiedad
                    </button>
                </div>
            </section >

            {/* CSS Animations */}
            < style > {`
                .reveal-on-scroll {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .reveal-on-scroll.reveal-active {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes glowPulse {
                    0%, 100% {
                        text-shadow: 0 0 80px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.4);
                        filter: brightness(1);
                    }
                    50% {
                        text-shadow: 0 0 100px rgba(251, 191, 36, 0.8), 0 0 50px rgba(251, 191, 36, 0.6);
                        filter: brightness(1.2);
                    }
                }
                @keyframes glowOpacity {
                    0%, 100% {
                        opacity: 0.5;
                        filter: brightness(1);
                    }
                    50% {
                        opacity: 1;
                        filter: brightness(1.3);
                    }
                }
            `}</style >
        </div >
    );
};

export default RentPropertyLanding;
