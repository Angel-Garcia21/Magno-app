import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const RentContentIntegrated: React.FC = () => {
    const navigate = useNavigate();
    const [activeBenefit, setActiveBenefit] = useState<any | null>(null);
    const [activeStep, setActiveStep] = useState<any | null>(null);

    const benefits = [
        {
            icon: 'search',
            title: 'Búsqueda y filtrado',
            desc: 'de inquilinos confiables',
            detailedDescription: 'Cada persona interesada en tu propiedad pasa por un proceso de evaluación antes de ser considerada como candidata. \n\nAnalizamos a los prospectos que llegan a través de los distintos canales y realizamos una investigación que incluye revisión de antecedentes legales, buró de crédito, historial y referencias.\n\nNuestro objetivo es asegurarnos de que el inquilino sea una persona responsable, confiable y que cuidará tu propiedad como corresponde.'
        },
        {
            icon: 'verified_user',
            title: 'Revisión de documentos',
            desc: 'capacidad de pago y validación de historial',
            detailedDescription: 'Nos encargamos de validar que toda la documentación del inquilino sea correcta y comprobable.\n\nRevisamos identificación oficial, comprobantes de ingresos, capacidad de pago y el origen de los mismos.\n\nEste proceso nos permite confirmar que el inquilino cuenta con la solvencia necesaria para cumplir con la renta.'
        },
        {
            icon: 'gavel',
            title: 'Convenio de Justicia',
            desc: 'Contrato que blinda y protege tu propiedad al 100%',
            detailedDescription: 'El convenio de justicia es un documento legal que protege tanto al propietario como al inquilino.\n\nEstablece reglas claras para ambas partes, asegurando que el inquilino se comprometa a cuidar la propiedad y cumplir con sus obligaciones.\n\nEste convenio brinda respaldo legal y ayuda a prevenir conflictos durante la vigencia del arrendamiento.'
        },
        {
            icon: 'handshake',
            title: 'Acompañamiento',
            desc: 'y seguimiento en la entrega del inmueble',
            detailedDescription: 'Te acompañamos durante todo el proceso, desde las visitas con los prospectos hasta la entrega formal del inmueble.\n\nAsistimos a las citas, resolvemos dudas, damos seguimiento a los interesados y nos aseguramos de que cada paso se realice de forma ordenada y transparente.'
        },
        {
            icon: 'campaign',
            title: 'Difusión profesional',
            desc: 'en más de 8 plataformas inmobiliarias',
            detailedDescription: 'Tu propiedad se publica de forma profesional en las plataformas inmobiliarias más vistas de México.\n\nOptimizamos la información, imágenes y presentación del inmueble para aumentar su visibilidad y atraer a prospectos realmente interesados.'
        },
        {
            icon: 'schedule',
            title: 'Ahorro de tiempo',
            desc: 'y cero complicaciones para ti',
            detailedDescription: 'Nosotros nos encargamos de todo el proceso para que tú no tengas que involucrarte en trámites tediosos o gestiones legales.\n\nDesde la búsqueda del inquilino hasta la entrega del inmueble, todo es gestionado por nuestro equipo para que siempre tengas el control sin complicaciones.'
        }
    ];

    const guarantees = [
        { title: 'Garantía de selección del inquilino', desc: 'Evaluamos cuidadosamente a cada prospecto mediante documentos oficiales y validación de ingresos.' },
        { title: 'Contratos claros y protegidos', desc: 'Utilizamos un contrato profesional de arrendamiento que protege tus derechos como propietario.' },
        { title: 'Acompañamiento de inicio a fin', desc: 'Te acompañamos en la publicación, visitas, análisis, firma y entrega del inmueble.' },
        { title: 'Transparencia total', desc: 'Recibes copia de toda la documentación relevante para que estés seguro de cada paso.' }
    ];

    const steps = [
        {
            title: "Datos y Propiedad",
            desc: "Sube tus datos personales y los de tu propiedad de forma rápida y segura.",
            details: "Nuestra plataforma te permite cargar fotos, ubicación y características de tu inmueble en minutos. Todo protegido con los estándares de seguridad más altos para tu tranquilidad.",
            icon: "upload_file"
        },
        {
            title: "Firma Digital",
            desc: "Firma digitalmente los documentos necesarios desde la comodidad de tu casa.",
            details: "Olvídate del papeleo físico. Te enviaremos un contrato digital legal que puedes firmar desde tu celular o computadora con total validez jurídica en todo México.",
            icon: "draw"
        },
        {
            title: "Publicación Total",
            desc: "Revisamos todo y publicamos en los portales inmobiliarios más importantes del país.",
            details: "Tu propiedad aparecerá en: Inmuebles24, Lamudi, Vivanuncios, Propiedades.com, Wiggot, Easybroker, Casas y Terrenos, Inmoxperts, Tu Portal Online, Properstar y redes sociales con campañas pagadas por nosotros.",
            icon: "rocket_launch"
        },
        {
            title: "Control en tu App",
            desc: "Recibe notificaciones con datos de cada prospecto y fechas de visitas programadas.",
            details: "Tendrás control total desde tu celular. Un asesor Magno puede encargarse 100% de mostrar la propiedad por ti. Si prefieres no entregar llaves, coordinaremos contigo cada visita para que puedas abrir a los interesados. ¡Tú eliges tu nivel de comodidad!",
            icon: "notifications_active"
        },
        {
            title: "Firma y Cobro",
            desc: "Firma el convenio y recibe tu mes de depósito al instante.",
            details: "Una vez seleccionado el inquilino ideal, coordinamos la firma final. Recibes tu mes de depósito; el primer mes de renta lo retenemos nosotros como costo del servicio. Es lo único que cobramos.",
            icon: "handshake"
        }
    ];

    return (
        <div className="space-y-16">
            {/* Benefits Section */}
            <section className="reveal-on-scroll">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200 drop-shadow-[0_0_25px_rgba(180,151,90,0.8)]">Beneficios</span> de Rentar con Magno
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base uppercase tracking-[0.3em] font-black">Tu patrimonio en las mejores manos</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {benefits.map((benefit, idx) => (
                        <div
                            key={idx}
                            onClick={() => setActiveBenefit(benefit)}
                            className="group relative bg-gradient-to-br from-[#0a0a0a]/80 to-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border-2 border-white/5 hover:border-[#b4975a]/60 transition-all duration-500 hover:scale-105 cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:shadow-[0_0_60px_rgba(180,151,90,0.5)] overflow-hidden"
                        >
                            {/* Animated background glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#b4975a]/0 to-[#b4975a]/0 group-hover:from-[#b4975a]/10 group-hover:to-transparent transition-all duration-700"></div>

                            {/* Pulsating corner accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#b4975a]/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

                            <div className="relative z-10">
                                {/* Icon with neon glow */}
                                <div className="w-16 h-16 bg-gradient-to-br from-[#b4975a]/20 to-[#b4975a]/5 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(180,151,90,0.3)] group-hover:shadow-[0_0_40px_rgba(180,151,90,0.6)] transition-all duration-500 group-hover:scale-110 border border-[#b4975a]/20 group-hover:border-[#b4975a]/50">
                                    <span className="material-symbols-outlined text-[#b4975a] text-3xl drop-shadow-[0_0_10px_rgba(180,151,90,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(180,151,90,1)] transition-all">{benefit.icon}</span>
                                </div>

                                {/* Title with glow effect */}
                                <h3 className="text-xl font-black uppercase text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[#b4975a] transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(180,151,90,0.6)]">
                                    {benefit.title}
                                </h3>

                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                                    {benefit.desc}
                                </p>

                                {/* Animated CTA */}
                                <div className="mt-6 flex items-center text-[#b4975a] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <span className="drop-shadow-[0_0_10px_rgba(180,151,90,0.8)]">Ver Detalle</span>
                                    <span className="material-symbols-outlined text-sm ml-2 animate-bounce">arrow_forward</span>
                                </div>
                            </div>

                            {/* Animated border glow */}
                            <div className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-r from-transparent via-[#b4975a]/30 to-transparent animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section className="reveal-on-scroll">
                <div className="relative bg-gradient-to-br from-[#b4975a]/10 to-slate-900/50 rounded-[4rem] p-8 md:p-20 border-2 border-[#b4975a]/30 backdrop-blur-3xl shadow-[0_0_80px_rgba(180,151,90,0.4)] overflow-hidden group hover:shadow-[0_0_120px_rgba(180,151,90,0.6)] transition-all duration-700">
                    {/* Animated Glow Effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#b4975a]/20 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -ml-48 -mb-48 animate-pulse" style={{ animationDelay: '1s' }}></div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                            ¿Cuánto es nuestra <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200 drop-shadow-[0_0_25px_rgba(180,151,90,0.8)]">Comisión</span>?
                        </h2>

                        {/* Main Price Display with Neon */}
                        <div className="relative inline-block mb-12">
                            {/* Neon glow ring */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#b4975a] via-amber-300 to-[#b4975a] rounded-[3rem] blur-xl opacity-50 animate-pulse"></div>

                            {/* Price container */}
                            <div className="relative bg-black/60 backdrop-blur-xl rounded-[3rem] p-10 md:p-16 border-2 border-[#b4975a]/40 shadow-[0_0_60px_rgba(180,151,90,0.5)] group-hover:shadow-[0_0_100px_rgba(180,151,90,0.8)] transition-all duration-500">
                                <div className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-[#b4975a] tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-pulse-slow">
                                    1 MES
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                            Equivalente a <strong className="text-white">un mes de renta</strong>. Tú te llevas los 11 meses restantes y el depósito. Nosotros nos encargamos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200 font-black tracking-tight drop-shadow-[0_0_15px_rgba(180,151,90,0.8)]">TODO</span> el proceso legal y administrativo.
                        </p>
                    </div>
                </div>
            </section>

            {/* Guarantees Section - Highly Dynamic */}
            <section className="reveal-on-scroll">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-fade-in">
                        Nuestras Garantías
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {guarantees.map((g, idx) => (
                        <div
                            key={idx}
                            className="group relative bg-gradient-to-br from-slate-950/60 to-slate-900/40 p-10 rounded-[2.5rem] border-2 border-white/5 hover:border-[#b4975a]/40 flex gap-6 items-start transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer overflow-hidden"
                            style={{
                                animationDelay: `${idx * 150}ms`,
                                animation: 'slideInFromLeft 0.6s ease-out forwards'
                            }}
                        >
                            {/* Floating background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#b4975a]/0 to-[#b4975a]/0 group-hover:from-[#b4975a]/5 group-hover:to-transparent transition-all duration-700"></div>

                            {/* Animated floating orb */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#b4975a]/10 rounded-full blur-[50px] group-hover:scale-150 transition-transform duration-700"></div>

                            {/* Icon container with rotation animation */}
                            <div className="relative z-10 flex-shrink-0">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#b4975a]/20 to-[#b4975a]/5 rounded-2xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border border-[#b4975a]/20 group-hover:border-[#b4975a]/50 shadow-lg group-hover:shadow-[0_0_30px_rgba(180,151,90,0.4)]">
                                    <span className="material-symbols-outlined text-[#b4975a] text-3xl group-hover:rotate-[-12deg] transition-transform duration-500">verified</span>
                                </div>
                            </div>

                            {/* Content with slide animation */}
                            <div className="relative z-10 flex-1 group-hover:translate-x-1 transition-transform duration-300">
                                <h3 className="text-lg font-black uppercase text-white mb-3 tracking-tight group-hover:text-[#b4975a] transition-colors duration-300 leading-tight">
                                    {g.title}
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                                    {g.desc}
                                </p>
                            </div>

                            {/* Bottom accent line that expands */}
                            <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-[#b4975a] to-amber-300 group-hover:w-full transition-all duration-500"></div>

                            {/* Corner accent */}
                            <div className="absolute top-4 right-4 w-2 h-2 bg-[#b4975a] rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-300"></div>
                        </div>
                    ))}
                </div>
            </section>


            {/* Process Section - How it Works */}
            <section className="reveal-on-scroll py-32 px-4 relative z-50">
                <style>
                    {`
                        .reveal-on-scroll .step-item {
                            opacity: 0;
                            transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                        @media (min-width: 768px) {
                            .reveal-on-scroll .step-item {
                                transform: translateX(var(--deploy-x, 0)) translateY(20px) scale(0.8);
                            }
                        }
                        @media (max-width: 767px) {
                            .reveal-on-scroll .step-item {
                                transform: translateY(20px) scale(0.8);
                            }
                        }
                        .reveal-on-scroll.reveal-active .step-item {
                            opacity: 1;
                            transform: translateX(0) translateY(0) scale(1);
                        }
                        
                        /* Delay each step deployment slightly for a more organic feel */
                        .reveal-on-scroll.reveal-active .step-delay-0 { transition-delay: 50ms; }
                        .reveal-on-scroll.reveal-active .step-delay-1 { transition-delay: 150ms; }
                        .reveal-on-scroll.reveal-active .step-delay-2 { transition-delay: 250ms; }
                        .reveal-on-scroll.reveal-active .step-delay-3 { transition-delay: 150ms; }
                        .reveal-on-scroll.reveal-active .step-delay-4 { transition-delay: 50ms; }

                        .detail-cloud-enter {
                            animation: cloud-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                        @keyframes cloud-in {
                            0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
                            100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                        }

                        @keyframes float-premium {
                            0%, 100% { transform: translateY(0) rotate(0); }
                            33% { transform: translateY(-8px) rotate(1deg); }
                            66% { transform: translateY(-4px) rotate(-1deg); }
                        }
                        .animate-float-premium {
                            animation: float-premium 6s ease-in-out infinite;
                        }

                    `}
                </style>
                <div className="text-center mb-16 md:mb-24 reveal-on-scroll relative z-20">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        Proceso <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b4975a] to-amber-200">Sencillo</span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base uppercase tracking-[0.3em] font-black">Tu propiedad rentada en 5 simples pasos</p>
                </div>

                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-12 md:gap-0 relative">
                        {/* Connecting Line (Desktop/Mobile) */}
                        <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#b4975a]/30 to-transparent"></div>
                        <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-[#b4975a]/20 to-transparent z-0"></div>

                        {steps.map((step, idx) => {
                            // Symmetrical deployment from center (Step 3 at idx 2)
                            // We need to move each item from the center to its final spot.
                            // In flex-row, the "natural" position 0 is left. 
                            // Center is pos 2.
                            // To be at center, idx 0 moves +2 items. idx 4 moves -2 items.
                            const deployX = (2 - idx) * 100;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setActiveStep(activeStep?.title === step.title ? null : step)}
                                    className={`flex-1 relative z-10 flex flex-col items-center group cursor-pointer step-item step-delay-${idx}`}
                                    style={{ '--deploy-x': `${deployX}%` } as React.CSSProperties}
                                >
                                    {/* Apple-Style Floating Detail Cloud */}
                                    {activeStep?.title === step.title && (
                                        <div className="hidden md:block absolute bottom-[calc(100%+40px)] left-1/2 -translate-x-1/2 z-[100] w-96 detail-cloud-enter pointer-events-auto">
                                            <div className="bg-slate-900/98 backdrop-blur-3xl border border-[#b4975a]/40 rounded-[3rem] p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.95)] relative group/cloud animate-float-premium">
                                                {/* Sophisticated Glossy Texture */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 rounded-[3rem]"></div>

                                                <div className="relative z-10">
                                                    <div className="flex items-start justify-between mb-4 md:mb-6">
                                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#b4975a]/30 to-[#b4975a]/5 flex items-center justify-center border border-[#b4975a]/30 shadow-lg">
                                                            <span className="material-symbols-outlined text-[#b4975a] text-xl md:text-2xl">{step.icon}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveStep(null); }}
                                                            className="text-slate-500 hover:text-white transition-colors p-2 md:p-1 bg-white/5 rounded-full"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">close</span>
                                                        </button>
                                                    </div>
                                                    <h4 className="text-white font-black uppercase text-[10px] md:text-xs tracking-[0.2em] mb-4 md:mb-5 border-b border-white/5 pb-4 md:pb-5">
                                                        {step.title}
                                                    </h4>
                                                    <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                                        {step.details}
                                                    </p>
                                                </div>

                                                {/* Decorative Light Leak */}
                                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#b4975a]/15 rounded-full blur-[50px] pointer-events-none"></div>

                                                {/* Tooltip Arrow (Desktop only) */}
                                                <div className="hidden md:block absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-900 border-r border-b border-[#b4975a]/40 rotate-45"></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step Circle - Integrated Visuals - REDUCED SIZE ON MOBILE */}
                                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-slate-950 border border-[#b4975a]/20 flex items-center justify-center mb-6 md:mb-10 group-hover:border-[#b4975a] transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_100px_rgba(180,151,90,0.4)] relative transform group-hover:scale-110 active:scale-95">
                                        {/* Subtle Glow Ring */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#b4975a]/10 to-transparent rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Integrated Step Number Badge - Platinum Style */}
                                        <div className="absolute -top-1 -right-1 w-8 h-8 md:w-10 md:h-10 bg-slate-950 border border-[#b4975a]/40 rounded-full flex items-center justify-center text-[#b4975a] font-black text-[10px] md:text-xs z-20 shadow-2xl group-hover:bg-[#b4975a] group-hover:text-slate-950 transition-all duration-500">
                                            {idx + 1}
                                        </div>

                                        <span className="material-symbols-outlined text-4xl md:text-5xl text-[#b4975a] group-hover:scale-125 transition-transform duration-700 drop-shadow-[0_0_20px_rgba(180,151,90,0.5)]">{step.icon}</span>

                                        {/* Activity Indicator (under circle) */}
                                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#b4975a] rounded-full transition-all duration-500 ${activeStep?.title === step.title ? 'scale-150 opacity-100 shadow-[0_0_10px_#b4975a]' : 'scale-0 opacity-0'}`}></div>
                                    </div>

                                    <div className="text-center px-2">
                                        <h3 className="text-[11px] font-black uppercase text-slate-100 mb-2 leading-tight group-hover:text-[#b4975a] transition-colors tracking-tighter">
                                            {step.title}
                                        </h3>
                                        <div className="flex items-center justify-center gap-1 text-[8px] text-slate-500 font-black tracking-widest uppercase opacity-40 group-hover:opacity-100 group-hover:text-slate-300 transition-all">
                                            <span>Detalles</span>
                                            <span className="material-symbols-outlined text-[10px]">expand_less</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>



                    {/* Mobile Detail Modal (Global Position via Portal) */}
                    {activeStep && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md md:hidden animate-in fade-in duration-200" onClick={() => setActiveStep(null)}>
                            <div className="bg-slate-900/90 backdrop-blur-3xl border border-[#b4975a]/40 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setActiveStep(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b4975a]/20 to-[#b4975a]/5 flex items-center justify-center border border-[#b4975a]/30 shadow-lg mb-6">
                                        <span className="material-symbols-outlined text-[#b4975a] text-3xl">{activeStep.icon}</span>
                                    </div>
                                    <h3 className="text-white font-black uppercase text-lg tracking-widest mb-4">{activeStep.title}</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed font-medium">{activeStep.details}</p>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Zero Cost Banner - Masterpiece Redesign */}
                    <div className="mt-40 p-12 md:p-24 rounded-[5rem] bg-gradient-to-br from-blue-600/10 via-slate-900/40 to-black/40 border-2 border-blue-500/10 backdrop-blur-3xl relative overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_70%)]"></div>
                        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-16">
                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="w-28 h-28 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.2)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 border border-blue-500/20">
                                    <span className="material-symbols-outlined text-7xl text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.7)]">payments</span>
                                </div>
                                <div className="text-center md:text-left">
                                    <h4 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-6">
                                        Inversión <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]">Total $0</span>
                                    </h4>
                                    <p className="text-slate-400 text-lg md:text-2xl max-w-2xl leading-relaxed font-medium">
                                        Trámites, investigación y documentos <strong className="text-white">gratuitos</strong> para propietarios. Solo pagas comisión al rentar con éxito.
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <button className="px-12 py-8 bg-blue-500/10 border-2 border-blue-500/20 rounded-[3rem] text-blue-400 font-black uppercase tracking-[0.4em] text-sm text-center shadow-2xl hover:bg-blue-500 hover:text-white transition-all duration-500 hover:scale-105 active:scale-95">
                                    BENEFICIO EXCLUSIVO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="text-center py-20 reveal-on-scroll">
                <button
                    onClick={() => navigate('/rentar')}
                    className="px-20 py-8 bg-[#b4975a] hover:bg-amber-400 text-slate-950 rounded-full font-black uppercase tracking-widest text-xl transition-all hover:scale-105 shadow-[0_0_50px_rgba(180,151,90,0.4)]"
                >
                    Registrar Mi Propiedad Ahora
                </button>
            </section>

            {/* Active Step Modal (Removed in favor of Apple-style clouds) */}
            {activeBenefit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setActiveBenefit(null)}>
                    <div className="bg-slate-950 border border-[#b4975a]/30 rounded-[3rem] p-10 md:p-16 max-w-2xl w-full relative shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActiveBenefit(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-4xl">close</span>
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-[#b4975a]/10 rounded-3xl flex items-center justify-center mb-10">
                                <span className="material-symbols-outlined text-[#b4975a] text-6xl">{activeBenefit.icon}</span>
                            </div>
                            <h3 className="text-3xl md:text-5xl font-black uppercase text-white mb-8">{activeBenefit.title}</h3>
                            <div className="text-slate-300 text-lg md:text-xl leading-relaxed">
                                {activeBenefit.detailedDescription.split('\n\n').map((p: string, i: number) => <p key={i} className="mb-6">{p}</p>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentContentIntegrated;
