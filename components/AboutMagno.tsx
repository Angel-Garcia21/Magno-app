import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AboutMagno: React.FC = () => {
    const navigate = useNavigate();
    const sectionRef = useRef<HTMLDivElement>(null);
    const scrollTextRef = useRef<HTMLHeadingElement>(null);
    const [tooltipOpen, setTooltipOpen] = useState<string | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollTextRef.current) return;

            const rect = scrollTextRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate progress: 0 when element enters viewport, 1 when it's centered
            const start = viewportHeight * 0.9;
            const end = viewportHeight * 0.4;

            let progress = (start - rect.top) / (start - end);
            progress = Math.max(0, Math.min(1, progress));

            // Apply gradient or color directly
            // Using a clip-path for a more "filling" effect or just color interpolation
            // Simple color interpolation for now: White/Black to Gold
            // Gold color: #FFD700 (255, 215, 0)
            // Slate-900: #0f172a (15, 23, 42)
            // White: #ffffff (255, 255, 255)

            // We'll use CSS variables to control the fill state
            scrollTextRef.current.style.setProperty('--scroll-progress', `${progress * 100}%`);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTooltip = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTooltipOpen(tooltipOpen === id ? null : id);
    };

    // Close tooltip on global click
    useEffect(() => {
        const closeTooltip = () => setTooltipOpen(null);
        window.addEventListener('click', closeTooltip);
        return () => window.removeEventListener('click', closeTooltip);
    }, []);

    return (
        <section id="somos-magno" ref={sectionRef} className="py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-white dark:bg-[#0B1120] overflow-hidden relative">
            {/* Background embellishments */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-24 relative z-10">

                {/* Header: Quién es Magno */}
                <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <h2 className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-primary">Quién es Magno</h2>
                    <p className="text-lg md:text-3xl font-medium text-slate-600 dark:text-slate-300 leading-relaxed font-display px-2">
                        Magno nace con un objetivo claro: <span className="text-slate-900 dark:text-white font-bold">ser el estándar en seguridad para tu inmueble.</span> Buscamos brindarte la mayor transparencia y que tengas el control de tu inmueble para que sepas cómo se gestiona, qué pasos vamos dando y cómo estamos realizando los procesos.
                    </p>
                    <p className="text-base md:text-lg text-slate-500 leading-relaxed px-4">
                        Magno es un equipo obsesionado con proteger tu patrimonio y acelerar decisiones con orden, datos y ejecución.
                        <br />
                        <span className="block mt-4 text-slate-800 dark:text-slate-200 font-bold">Nacimos para quitarte el caos, recupera el control y Magnifícate.</span>
                    </p>
                </div>

                {/* Qué Somos */}
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className="relative aspect-square max-w-[500px] mx-auto w-full group">
                        {/* Interactive abstract elements instead of a static image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-[4rem] animate-pulse" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                            {/* Glassmorphism Cards */}
                            <div className="absolute top-[10%] left-[10%] w-[60%] h-[60%] bg-white/10 dark:bg-slate-800/20 backdrop-blur-xl border border-white/20 rounded-[3rem] shadow-2xl transition-all duration-500 group-hover:-translate-y-4 group-hover:-translate-x-4 group-hover:rotate-2 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-primary/80">insights</span>
                            </div>
                            <div className="absolute bottom-[10%] right-[10%] w-[60%] h-[60%] bg-slate-900/40 dark:bg-slate-700/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl transition-all duration-500 delay-75 group-hover:translate-y-4 group-hover:translate-x-4 group-hover:-rotate-2 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-white/80">hub</span>
                            </div>
                            {/* Floating decorative nodes */}
                            <div className="absolute top-4 right-1/4 w-12 h-12 bg-primary rounded-2xl animate-bounce shadow-glow flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-xl">bolt</span>
                            </div>
                            <div className="absolute bottom-1/4 left-4 w-16 h-16 bg-amber-500 rounded-full animate-pulse border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-2xl">verified</span>
                            </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-4 text-center">
                            <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white group-hover:scale-110 transition-transform">Qué Somos</h3>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {[
                            {
                                title: "Tecnología + Proceso",
                                desc: "Somos una plataforma inmobiliaria con operación real: combinamos lo mejor de la tecnología con asesoría profesional humana.",
                                icon: "settings_suggest"
                            },
                            {
                                title: "Trazabilidad Total",
                                desc: "Un sistema que te permite vender, rentar y administrar con estructura: desde el primer contacto hasta la firma y la administración.",
                                icon: "account_tree"
                            },
                            {
                                title: "Activos, no problemas",
                                desc: "Convertimos tu propiedad en un activo bien gestionado, no en un problema que te roba tiempo.",
                                icon: "verified_user"
                            }
                        ].map((item, i) => (
                            <div key={i} className="group p-6 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                    </div>
                                    <h4 className="text-xl font-black uppercase text-slate-900 dark:text-white">
                                        {item.title}
                                    </h4>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed pl-14">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Qué Hacemos */}
                <div className="space-y-16">
                    <div className="text-center">
                        <h2 className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-primary mb-4">Qué Hacemos</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Soluciones Integrales</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1: Renta y Admin */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-xl border border-slate-100 dark:border-white/5 group">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">vpn_key</span>
                            </div>
                            <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-6">1. Renta y Administración</h4>
                            <ul className="space-y-3">
                                {['Promoción estratégica', 'Filtros reales para tu inmueble', 'Investigación completa de inquilino', 'Proceso de firma con orden'].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <span className="material-symbols-outlined text-[16px] text-green-500 shrink-0">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                                {['Seguimiento trimestral', 'Reportes adicionales', 'Administración'].map((item, i) => (
                                    <li key={i + 10} className="relative flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">star</span>
                                        <span className="flex items-center gap-1 cursor-help relative group/tooltip" onClick={(e) => toggleTooltip(item, e)}>
                                            {item}*
                                            {/* Tooltip Logic */}
                                            {tooltipOpen === item && (
                                                <>
                                                    {/* Mobile Backdrop */}
                                                    <div className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setTooltipOpen(null); }} />

                                                    {/* Tooltip Content */}
                                                    <div className="fixed md:absolute left-0 right-0 bottom-0 md:bottom-full md:left-0 md:right-auto md:mb-2 w-full md:w-64 p-8 pb-32 md:p-4 bg-slate-900 text-white text-[10px] leading-relaxed rounded-t-[2rem] md:rounded-xl shadow-2xl z-[70] animate-in slide-in-from-bottom-full md:zoom-in-95 md:origin-bottom-left flex flex-col gap-2">
                                                        <div className="md:hidden w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />
                                                        <p className="font-medium text-center md:text-left text-xs md:text-[10px]">
                                                            {item === 'Seguimiento trimestral' && 'Trimestral si no se contrata Administración. Si se contrata, el seguimiento es mensual.'}
                                                            {item === 'Reportes adicionales' && 'Se generan a solicitud (o se incluyen sin costo extra dentro del servicio de Administración).'}
                                                            {item === 'Administración' && 'Servicio adicional (10% mensual): Control de pagos, recibos, reportes, recordatorios y seguimiento de morosidad.'}
                                                        </p>
                                                        <button className="md:hidden mt-4 bg-white/10 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] w-full" onClick={(e) => { e.stopPropagation(); setTooltipOpen(null); }}>Entendido</button>
                                                        <div className="hidden md:block absolute bottom-[-6px] left-4 w-3 h-3 bg-slate-900 rotate-45 transform"></div>
                                                    </div>
                                                </>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Card 2: Venta */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-xl border border-slate-100 dark:border-white/5 group">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">sell</span>
                            </div>
                            <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-6">2. Venta con Estrategia</h4>
                            <ul className="space-y-3">
                                {['Opinión de valor sustentada', 'Análisis legal y fiscal', 'Promoción estratégica', 'Presentación y negociación clara', 'Acompañamiento hasta el cierre'].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Card 3: Operación Digital */}
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-white/10 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">smart_toy</span>
                            </div>
                            <h4 className="text-lg font-black uppercase text-white mb-6">3. Operación Digital</h4>
                            <p className="text-xs text-slate-300 leading-relaxed mb-6">
                                Somos pioneros en la automatización y uso de IA para el manejo seguro de tu inmueble. Herramientas a la vanguardia para que tu proceso sea seguro y sin fricción.
                            </p>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">IA + Automatización</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated Scroll Text */}
                <div className="py-12 md:py-24 flex justify-center sticky-text-container">
                    <h2
                        ref={scrollTextRef}
                        className="text-3xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-center leading-[0.9] transition-colors duration-0"
                        style={{
                            backgroundImage: 'linear-gradient(to bottom, #d97706 var(--scroll-progress, 0%), #ffffff var(--scroll-progress, 0%))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            color: 'transparent', // Fallback
                            backgroundClip: 'text',
                            // Alternative simple color approach if gradient clipping is buggy on hydration:
                            // We can toggle a class or simpler variable
                            // Let's use a simpler variable approach for robustness if needed, but gradient fill is the gold standard for "filling up"
                            // Actually, user said "Pase de blanco a dorado", implying a fade. 
                            // Let's try direct color transition via variable interpolation for safer rendering
                        }}
                    >
                        <span className="block text-slate-200 dark:text-slate-800"
                            style={{
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(to top, #fbbf24 0%, #d97706 100%)', // Gold gradient
                                WebkitBackgroundClip: 'text',
                                opacity: 'var(--scroll-progress, 0)'
                            }}
                        >Tu propiedad<br />es mi prioridad</span>
                        {/* Overlay for the base color */}
                        <span className="block absolute inset-0 text-slate-300 dark:text-slate-700 pointer-events-none" style={{ opacity: 'calc(1 - var(--scroll-progress, 0))' }}>
                            Tu propiedad<br />es mi prioridad
                        </span>
                    </h2>
                </div>

                {/* A Dónde Vamos & Valores */}
                <div className="grid md:grid-cols-2 gap-16">
                    <div className="space-y-6 md:space-y-8">
                        <h2 className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-primary">A Dónde Vamos</h2>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-slate-900 dark:text-white leading-tight">Estándar de servicio: Rápido, Claro y Estructurado</h3>
                        <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                            Magnificamos una plataforma donde propietarios y clientes puedan ver, decidir y firmar con orden; y donde cada propiedad se opere como debe: con procesos, evidencia y resultados.
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem]">
                        <h2 className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-primary mb-8">Nuestros Valores</h2>
                        <div className="space-y-6">
                            {[
                                { t: 'Magnificar', d: 'Brindar la mayor cantidad de valor posible.' },
                                { t: 'Seguridad', d: 'Procesos que protegen tu patrimonio.' },
                                { t: 'Claridad', d: 'Información directa, sin letras chiquitas.' },
                                { t: 'Responsabilidad', d: 'Seguimiento real y cumplimiento.' },
                                { t: 'Integridad', d: 'Lo que se promete, se sostiene.' },
                                { t: 'Rapidez', d: 'Ejecución con método, no con prisa.' }
                            ].map((v, i) => (
                                <div key={i} className="flex gap-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                                    <div>
                                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">{v.t}</h4>
                                        <p className="text-xs text-slate-500">{v.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Final */}
                <div className="text-center space-y-8 py-12">
                    <p className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white">Si quieres vender, rentar o administrar con un equipo que sí opera,<br className="hidden md:block" /> estás en el lugar correcto.</p>
                    <button
                        onClick={() => navigate('/client-portal')}
                        className="px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-[0.2em] rounded-full shadow-lg hover:shadow-amber-500/25 hover:scale-105 transition-all text-sm"
                    >
                        Magnifícate
                    </button>
                </div>

            </div>
        </section>
    );
};

export default AboutMagno;
