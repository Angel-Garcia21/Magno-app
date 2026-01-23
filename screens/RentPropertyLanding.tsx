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
        <div className="absolute top-0 left-0 w-full z-50 p-6 animate-in fade-in slide-in-from-top-4 duration-1000">
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

    const [activeBenefit, setActiveBenefit] = useState<any | null>(null);

    const benefits = [
        {
            icon: 'search',
            title: 'Búsqueda y filtrado',
            desc: 'de inquilinos confiables',
            detailedDescription: 'Cada persona interesada en tu propiedad pasa por un proceso de evaluación antes de ser considerada como candidata. \n\nAnalizamos a los prospectos que llegan a través de los distintos canales y realizamos una investigación que incluye revisión de antecedentes legales, buró de crédito, historial y referencias.\n\nNuestro objetivo es asegurarnos de que el inquilino sea una persona responsable, confiable y que cuidará tu propiedad como corresponde. De esta forma, reducimos riesgos y te damos mayor tranquilidad al momento de rentar.'
        },
        {
            icon: 'verified_user',
            title: 'Revisión de documentos',
            desc: 'capacidad de pago y validación de historial',
            detailedDescription: 'Nos encargamos de validar que toda la documentación del inquilino sea correcta y comprobable.\n\nRevisamos identificación oficial, comprobantes de ingresos, capacidad de pago y el origen de los mismos, ya sea por nómina, actividad independiente o ingresos en efectivo.\n\nEste proceso nos permite confirmar que el inquilino cuenta con la solvencia necesaria para cumplir con la renta y que toda la información presentada sea real, evitando problemas futuros para ti como propietario.'
        },
        {
            icon: 'gavel',
            title: 'Convenio de Justicia',
            desc: 'Contrato que blinda y protege tu propiedad al 100%',
            detailedDescription: 'El convenio de justicia es un documento legal que protege tanto al propietario como al inquilino.\n\nEstablece reglas claras para ambas partes, asegurando que el inquilino se comprometa a cuidar la propiedad y cumplir con sus obligaciones, y que el arrendador mantenga las condiciones pactadas sin cambios arbitrarios.\n\nEste convenio brinda respaldo legal, genera confianza entre ambas partes y ayuda a prevenir conflictos durante la vigencia del arrendamiento.'
        },
        {
            icon: 'handshake',
            title: 'Acompañamiento',
            desc: 'y seguimiento en la entrega del inmueble',
            detailedDescription: 'Te acompañamos durante todo el proceso, desde las visitas con los prospectos hasta la entrega formal del inmueble.\n\nAsistimos a las citas, resolvemos dudas, damos seguimiento a los interesados y nos aseguramos de que cada paso se realice de forma ordenada y transparente.\n\nNuestro objetivo es que no tengas que preocuparte por la logística ni por la gestión del proceso, mientras nosotros nos encargamos de llevarlo hasta concretar la renta.'
        },
        {
            icon: 'campaign',
            title: 'Difusión profesional',
            desc: 'en más de 8 plataformas inmobiliarias',
            detailedDescription: 'Tu propiedad se publica de forma profesional en las plataformas inmobiliarias más vistas de México, tanto para renta como para venta.\n\nOptimizamos la información, imágenes y presentación del inmueble para aumentar su visibilidad y atraer a prospectos realmente interesados.\n\nEsto nos permite acelerar el proceso y llegar a un mayor número de personas calificadas, sin que tú tengas que encargarte de la publicación.',
            logos: [
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519998/6_kasaob.png', // Inmuebles24
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519978/1_qn2civ.png', // Viva Anuncios
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520006/8_wjmrel.png', // Propiedades.com
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519993/4_rm4aiw.png', // Lamudi
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519989/3_zzb5ho.png', // Portal Terreno (Casas y Terrenos)
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520002/7_hucqn1.png', // Inmoxperts (Trovit/Others)
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519985/2_hurtsn.png', // Tu Portal Online
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520009/9_oeokit.png', // Properstar
                'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519496/fb_logo_sin_fondo_lf3vjn.png' // Facebook Marketplace
            ]
        },
        {
            icon: 'schedule',
            title: 'Ahorro de tiempo',
            desc: 'y cero complicaciones para ti',
            detailedDescription: 'Nosotros nos encargamos de todo el proceso para que tú no tengas que involucrarte en trámites tediosos, gestiones legales o seguimientos constantes.\n\nDesde la búsqueda del inquilino, la validación, los documentos legales y la entrega del inmueble, todo es gestionado por nuestro equipo.\n\nAdemás, te mantenemos informado en cada etapa: cuando hay nuevos prospectos, avances en la investigación o decisiones importantes, para que siempre tengas control sin complicaciones.'
        }
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
            a: 'Al crear una propiedad, te pedimos algunos datos básicos como: tus datos personales (nombre, email, teléfono, domicilio), los datos de la propiedad (dirección, tipo, características, precio), tu INE de manera obligatoria y, opcionalmente, el Predial (nos ayuda a agilizar el proceso).'
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
            <section className="relative min-h-[80vh] md:min-h-screen flex items-center justify-center px-6 py-12 md:py-20">
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
            <section id="beneficios" className="pt-8 pb-16 md:py-32 px-6 relative">
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
                                onClick={() => setActiveBenefit(benefit)}
                                className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-amber-500/30 hover:border-amber-500/80 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(251,191,36,0.15)] reveal-on-scroll cursor-pointer"
                                style={{
                                    transitionDelay: `${idx * 100}ms`
                                }}
                            >
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">{benefit.icon}</span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-white mb-2 group-hover:text-amber-400 transition-colors">{benefit.title}</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">{benefit.desc}</p>
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-4 group-hover:translate-x-0">
                                    <span className="material-symbols-outlined text-amber-400">arrow_forward</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Benefit Detail Overlay */}
            {activeBenefit && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => setActiveBenefit(null)}
                >
                    <div
                        className="bg-slate-900 border border-amber-500/30 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 relative shadow-[0_0_100px_rgba(251,191,36,0.15)] animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setActiveBenefit(null)}
                            className="absolute top-6 right-6 w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(251,191,36,0.2)]">
                                <span className="material-symbols-outlined text-amber-400 text-5xl md:text-6xl">{activeBenefit.icon}</span>
                            </div>

                            <h3 className="text-3xl md:text-5xl font-black uppercase text-white mb-8 leading-tight">
                                {activeBenefit.title}
                            </h3>

                            <div className="prose prose-lg prose-invert text-slate-300 leading-relaxed">
                                {activeBenefit.detailedDescription.split('\n\n').map((paragraph, i) => (
                                    <p key={i} className="mb-6 last:mb-0">{paragraph}</p>
                                ))}
                            </div>

                            {activeBenefit.logos && (
                                <div className="mt-12 w-full">
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 border-b border-slate-800 pb-4">
                                        Publicamos en
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 md:gap-6 w-full">
                                        {activeBenefit.logos.map((logo, i) => (
                                            <div key={i} className="h-32 w-full flex items-center justify-center bg-white rounded-3xl p-4 md:p-6 shadow-lg hover:scale-[1.02] transition-transform duration-300">
                                                <img src={logo} alt="Portal Inmobiliario" className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Section */}
            <section className="py-16 md:py-32 px-6 relative reveal-on-scroll">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/40 rounded-[2.5rem] md:rounded-[5rem] p-8 md:p-20 border-2 border-blue-500/40 backdrop-blur-xl shadow-[0_0_60px_rgba(59,130,246,0.2)]">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-white" style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>¿Cuánto Cobramos?</h2>
                        </div>
                        <div className="bg-white/5 rounded-[2rem] md:rounded-[4rem] p-6 md:p-12 border border-blue-400/30 hover:bg-white/10 transition-colors duration-500">
                            <div className="text-center mb-8">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-400 block mb-4">Renta</span>
                                <div
                                    className="text-7xl md:text-[8rem] font-black leading-none py-4"
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
                            <p className="text-base md:text-lg text-slate-300 leading-relaxed text-center max-w-2xl mx-auto">
                                Equivalente a <strong>un mes de renta</strong>. <strong className="text-blue-400" style={{ textShadow: '0 0 15px rgba(96,165,250,0.5)' }}>Tú te llevas los 11 meses de renta y el mes de depósito.</strong> Nosotros nada más nos llevamos el primer mes de renta.
                            </p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Guarantees Section */}
            <section className="py-16 md:py-32 px-6 relative">
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
                                className="bg-slate-900/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 border-l-4 border-amber-500 hover:bg-slate-900 transition-all duration-300 hover:translate-x-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)] group reveal-on-scroll"
                                style={{ transitionDelay: `${idx * 150}ms` }}
                            >
                                <h3 className="text-lg md:text-xl font-black uppercase text-white mb-2 md:mb-3 group-hover:text-amber-400 transition-colors tracking-tight">{guarantee.title}</h3>
                                <p className="text-sm md:text-base text-slate-400 leading-relaxed group-hover:text-slate-300">{guarantee.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* FAQ Section - Redesigned as Static Blocks */}
            <section className="py-16 md:py-32 px-6 relative">
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
                                className="bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.1)] group h-full flex flex-col reveal-on-scroll"
                                style={{ transitionDelay: `${idx * 100}ms` }}
                            >
                                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">help_center</span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-white mb-6 leading-tight group-hover:text-amber-400 transition-colors">{faq.q}</h3>
                                <div className="h-1 w-20 bg-amber-500/30 rounded-full mb-6 group-hover:w-full transition-all duration-700" />
                                <p className="text-slate-300 leading-relaxed text-base md:text-lg flex-1">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Final CTA */}
            <section className="py-20 md:py-40 px-6 relative reveal-on-scroll">
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
