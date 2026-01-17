import React, { useState } from 'react';

const LeadsCRM: React.FC = () => {
    const tokkoLeadsUrl = 'https://www.tokkobroker.com/leads/?only_with_perm=false';

    return (
        <div className="animate-in fade-in duration-700">
            {/* Header */}
            <div className="mb-12">
                <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                    Oportunidades CRM
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Gestiona tus oportunidades de Tokko Broker directamente desde aquí
                </p>
            </div>

            {/* Action Cards */}
            <div className="flex justify-center mb-8">
                {/* Open in New Tab */}
                <a
                    href={tokkoLeadsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative p-10 rounded-[3rem] bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-primary/50 w-full max-w-2xl text-center"
                >
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="material-symbols-outlined text-7xl mb-6 block">open_in_new</span>
                        <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Abrir Tokko Oportunidades</h3>
                        <p className="text-white/80 text-lg font-medium max-w-md mx-auto">
                            Gestiona tus oportunidades directamente en la plataforma segura de Tokko Broker
                        </p>
                        <div className="mt-8 px-8 py-3 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 text-white font-bold uppercase tracking-widest text-sm group-hover:bg-white group-hover:text-primary transition-all">
                            Acceder Ahora
                        </div>
                    </div>
                </a>
            </div>

            {/* Iframe Container Removed due to security policies */}

            {/* Quick Stats */}

            {/* Quick Stats (Optional - using available API data) */}
            <div className="mt-12">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">
                    Acceso Rápido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <a
                        href="https://www.tokkobroker.com/contacts/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:shadow-xl transition-all group"
                    >
                        <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors mb-4 block">
                            contacts
                        </span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                            Contactos
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                            Ver todos tus contactos en Tokko
                        </p>
                    </a>

                    <a
                        href="https://www.tokkobroker.com/properties/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:shadow-xl transition-all group"
                    >
                        <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors mb-4 block">
                            home
                        </span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                            Propiedades
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                            Gestiona tu inventario de propiedades
                        </p>
                    </a>

                    <a
                        href="https://www.tokkobroker.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:shadow-xl transition-all group"
                    >
                        <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors mb-4 block">
                            dashboard
                        </span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                            Dashboard
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                            Ir al panel principal de Tokko
                        </p>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LeadsCRM;
