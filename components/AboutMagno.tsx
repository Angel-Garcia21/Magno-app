import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AboutMagno: React.FC = () => {
    const navigate = useNavigate();
    const sectionRef = useRef<HTMLDivElement>(null);
    const [tooltipOpen, setTooltipOpen] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;
            const rect = sectionRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate progress: 0 when top is at bottom of viewport, 1 when bottom is at top
            const start = rect.top;
            const height = rect.height;
            let progress = -start / (height - viewportHeight);
            progress = Math.max(0, Math.min(1, progress));
            setScrollProgress(progress);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!sectionRef.current) return;
            const rect = sectionRef.current.getBoundingClientRect();
            setMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('mousemove', handleMouseMove);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const toggleTooltip = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTooltipOpen(tooltipOpen === id ? null : id);
    };

    useEffect(() => {
        const closeTooltip = () => setTooltipOpen(null);
        window.addEventListener('click', closeTooltip);
        return () => window.removeEventListener('click', closeTooltip);
    }, []);

    return (
        <section
            id="somos-magno"
            ref={sectionRef}
            className="py-24 md:py-40 px-4 sm:px-6 md:px-12 transition-colors duration-1000 overflow-hidden relative bg-white dark:bg-[#0B1120]"
            style={{
                // Subtle gold-infused background shift
                backgroundColor: scrollProgress > 0 ? undefined : undefined,
                backgroundImage: `radial-gradient(circle at center, rgba(251, 191, 36, ${0.02 + scrollProgress * 0.08}), transparent)`
            }}
        >
            {/* Mouse Flow Glow - Pure Gold Luxury */}
            <div
                className="absolute pointer-events-none w-[800px] h-[800px] rounded-full blur-[120px] opacity-10 dark:opacity-20 transition-opacity duration-1000"
                style={{
                    left: mousePos.x - 400,
                    top: mousePos.y - 400,
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 100%)'
                }}
            />

            <div className="max-w-7xl mx-auto space-y-40 relative z-10">

                {/* Hero: MAGNIFÍCATE (Luxury Optimization) */}
                <div className="relative min-h-[60vh] flex flex-col items-center justify-center text-center">
                    <h2 className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-primary mb-12 animate-in fade-in duration-1000">Quién es Magno</h2>

                    <h1 className="text-[clamp(3rem,14vw,14rem)] font-black uppercase tracking-[-0.05em] leading-[0.8] relative mb-12 select-none">
                        {/* Permanent Gold Title */}
                        <span
                            className="block"
                            style={{
                                background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            MAGNIFÍCATE
                        </span>
                    </h1>

                    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        <p className="text-lg md:text-3xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed font-display px-2">
                            Magno nace con un objetivo claro: <span className="text-slate-900 dark:text-white font-bold underline decoration-primary/30 underline-offset-8">ser el estándar en seguridad para tu inmueble.</span> Buscamos brindarte la mayor transparencia y que tengas el control de tu inmueble para que sepas cómo se gestiona y qué pasos vamos dando.
                        </p>
                        <div className="w-24 h-1 bg-gradient-to-r from-primary to-amber-500 mx-auto rounded-full" />
                        <p className="text-base md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                            Magno es un equipo obsesionado con proteger tu patrimonio y acelerar decisiones con orden, datos y ejecución. <span className="text-primary font-black">Nacimos para quitarte el caos, recupera el control y Magnifícate.</span>
                        </p>
                    </div>
                </div>

                {/* Qué Somos: Logo-Centric 3D Stack */}
                <div className="grid lg:grid-cols-2 gap-24 items-center">
                    <div className="relative h-[450px] md:h-[600px] group flex items-center justify-center">
                        <div className="relative w-full max-w-[400px] aspect-square">
                            {/* Background Ambient Layer */}
                            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/10 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-[4rem] rotate-12 translate-y-16 transition-all duration-1000 group-hover:rotate-0 group-hover:translate-y-0" />

                            {/* Interactive Foundation Layer - Gold Themed */}
                            <div className="absolute inset-0 bg-white/60 dark:bg-gradient-to-br dark:from-amber-600/10 dark:to-amber-500/10 backdrop-blur-2xl border border-amber-200 dark:border-amber-500/20 rounded-[4rem] -rotate-6 translate-y-8 group-hover:rotate-0 group-hover:translate-y-0 transition-all duration-1000 flex flex-col items-center justify-center p-12 text-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-amber-600">shield</span>
                                </div>
                                <h4 className="text-xl font-bold uppercase text-slate-900 dark:text-white tracking-[0.2em]">Magno Security</h4>
                            </div>

                            {/* Top Executive Layer: Logo Focus */}
                            <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-amber-500/40 rounded-[4rem] shadow-2xl dark:shadow-glow flex flex-col items-center justify-center p-12 -translate-x-6 -translate-y-6 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-1000 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
                                <div className="relative z-10 flex flex-col items-center gap-6">
                                    {/* Magno Lion Logo */}
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                                        <img
                                            src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png"
                                            alt="Magno Logo"
                                            className="w-full h-full object-contain brightness-0 dark:brightness-100 group-hover:scale-110 transition-transform duration-700"
                                        />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-3xl font-black uppercase tracking-widest text-slate-900 dark:text-white">MAGNO</h3>
                                        <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 dark:text-amber-500">Estándar de Lujo</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                title: "Tecnología + Proceso",
                                desc: "Somos una plataforma inmobiliaria con operación real: combinamos lo mejor de la tecnología con asesoría profesional humana.",
                                icon: "settings_suggest",
                                color: "text-blue-500"
                            },
                            {
                                title: "Trazabilidad Total",
                                desc: "Un sistema que te permite vender, rentar y administrar con estructura: desde el primer contacto hasta la firma y la administración.",
                                icon: "account_tree",
                                color: "text-amber-500"
                            },
                            {
                                title: "Activos, no problemas",
                                desc: "Convertimos tu propiedad en un activo bien gestionado, no en un problema que te roba tiempo.",
                                icon: "verified_user",
                                color: "text-red-500"
                            }
                        ].map((item, i) => (
                            <div key={i} className="group p-8 rounded-[3rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-primary/20 transition-all duration-500">
                                <div className="flex items-center gap-8">
                                    <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center ${item.color} group-hover:scale-110 shadow-sm dark:shadow-none transition-transform duration-500`}>
                                        <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight mb-1">
                                            {item.title}
                                        </h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Qué Hacemos: Soluciones (Original Texts) */}
                <div className="space-y-24">
                    <div className="text-center space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-[0.6em] text-primary">Nuestras Soluciones</h2>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">QUÉ HACEMOS</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Renta y Admin */}
                        <div className="group relative bg-slate-50 dark:bg-[#0d1525] p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 hover:bg-white dark:hover:bg-amber-900/10 transition-all duration-700 flex flex-col min-h-[480px]">
                            <div className="space-y-8 relative z-10 flex-1">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">vpn_key</span>
                                </div>
                                <h4 className="text-2xl font-black uppercase text-slate-900 dark:text-white">1. Renta y Administración</h4>
                                <ul className="space-y-4">
                                    {['Promoción estratégica', 'Filtros reales para tu inmueble', 'Investigación completa de inquilino', 'Proceso de firma con orden'].map((li, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 font-bold">
                                            <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0">check_circle</span>
                                            {li}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/5">
                                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest text-center">Seguridad Patrimonial</p>
                            </div>
                        </div>

                        {/* Venta con Estrategia */}
                        <div className="group relative bg-slate-50 dark:bg-[#0d1525] p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 hover:bg-white dark:hover:bg-amber-900/10 transition-all duration-700 flex flex-col min-h-[480px]">
                            <div className="space-y-8 relative z-10 flex-1">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center group-hover:-rotate-12 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">sell</span>
                                </div>
                                <h4 className="text-2xl font-black uppercase text-slate-900 dark:text-white">2. Venta con Estrategia</h4>
                                <ul className="space-y-4">
                                    {['Opinión de valor sustentada', 'Análisis legal y fiscal', 'Promoción estratégica', 'Presentación y negociación clara', 'Acompañamiento hasta el cierre'].map((li, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0">check_circle</span>
                                            {li}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Operación Digital - Gold Accent */}
                        <div className="group relative bg-[#0B1120] p-10 rounded-[3.5rem] border-2 border-amber-500/30 shadow-xl overflow-hidden flex flex-col min-h-[480px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
                            <div className="relative z-10 space-y-8 flex-1">
                                <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">smart_toy</span>
                                </div>
                                <h4 className="text-2xl font-black uppercase text-white">3. Operación Digital</h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-bold">
                                    Somos pioneros en la automatización y uso de IA para el manejo seguro de tu inmueble. Herramientas a la vanguardia para que tu proceso sea seguro y sin fricción.
                                </p>
                                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 text-center">IA + Automatización</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated Scroll Text: SANDY GOLD HIGHLIGHT */}
                <div className="py-20 flex justify-center">
                    <h2
                        className="text-[clamp(2.5rem,10vw,8rem)] font-black uppercase tracking-tighter text-center leading-[0.85] transition-all duration-700"
                        style={{
                            opacity: scrollProgress > 0.4 ? 1 : 0.2,
                            transform: `scale(${0.95 + scrollProgress * 0.05})`,
                        }}
                    >
                        <span className="block text-slate-400 dark:text-slate-500 transition-colors duration-500">Tu propiedad</span>
                        <span
                            className="block transition-all duration-700"
                            style={{
                                color: scrollProgress > 0.4 ? '#d4af37' : 'inherit',
                                textShadow: scrollProgress > 0.4 ? '0 0 30px rgba(212, 175, 55, 0.5)' : 'none'
                            }}
                        >
                            es mi prioridad
                        </span>
                    </h2>
                </div>

                {/* Vision & Values: GOLD HIGHLIGHTS (Anti-Italic) */}
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-sm font-black uppercase tracking-[0.5em] text-primary">A Dónde Vamos</h2>
                            <h3 className="text-4xl md:text-5xl font-black uppercase text-slate-900 dark:text-white leading-[0.9] tracking-tighter">
                                Estándar de servicio:<br />
                                <span className="text-amber-500">Rápido, Claro y Estructurado</span>
                            </h3>
                        </div>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-display">
                            Magnificamos una plataforma donde propietarios y clientes puedan ver, decidir y firmar con orden; y donde cada propiedad se opere como debe: con procesos, evidencia y resultados.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-3xl p-12 rounded-[4rem] border border-slate-200 dark:border-white/10 space-y-10">
                        <h2 className="text-sm font-black uppercase tracking-[0.5em] text-primary mb-8">Nuestros Valores</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {[
                                { t: 'Magnificar', d: 'Brindar la mayor cantidad de valor posible.' },
                                { t: 'Seguridad', d: 'Procesos que protegen tu patrimonio.' },
                                { t: 'Claridad', d: 'Información directa, sin letras chiquitas.' },
                                { t: 'Responsabilidad', d: 'Seguimiento real y cumplimiento.' },
                                { t: 'Integridad', d: 'Lo que se promete, se sostiene.' },
                                { t: 'Rapidez', d: 'Ejecución con método, no con prisa.' }
                            ].map((v, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-150 transition-transform"></span>
                                    <div>
                                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest">{v.t}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">{v.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Final - Enhanced Presence */}
                <div className="relative text-center space-y-16 py-40 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30 rounded-[5rem] border border-slate-100 dark:border-amber-500/10 transition-colors duration-500 overflow-hidden">
                    {/* Subtle decorative accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

                    <div className="relative z-10 max-w-4xl mx-auto px-6">
                        <p className="text-3xl md:text-5xl font-black leading-[1.3] tracking-tight">
                            <span className="text-slate-900 dark:text-white">Si quieres <span style={{ color: '#fbbf24' }}>vender</span>, <span style={{ color: '#fbbf24' }}>rentar</span> o <span style={{ color: '#fbbf24' }}>administrar</span> con un equipo que sí opera,</span>{' '}
                            <span
                                className="text-4xl md:text-6xl"
                                style={{
                                    background: 'linear-gradient(90deg, #fbbf24 0%, #d4af37 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                estás en el lugar correcto.
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/client-portal')}
                        className="px-20 py-7 text-white font-black uppercase tracking-[0.3em] rounded-full shadow-2xl hover:shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all text-base border-2 border-amber-400/30"
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #d4af37 100%)'
                        }}
                    >
                        Magnifícate
                    </button>

                    <div className="pt-8 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em]">Magno Inmobiliaria © 2024</span>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default AboutMagno;
