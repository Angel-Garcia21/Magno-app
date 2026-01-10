
import React from 'react';
import { useLocation } from 'react-router-dom';

interface ClientSidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    hasProperties: boolean;
    isAuthenticated: boolean;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({ activeView, onViewChange, onLogout, isOpen, setIsOpen, hasProperties, isAuthenticated }) => {
    const menuItems = [
        ...(hasProperties ? [{ id: 'profile', label: 'Mi Cuenta', icon: 'account_circle' }] : []),
        { id: 'properties', label: 'Mis Propiedades', icon: 'real_estate_agent' },
        { id: 'notifications', label: 'Notificaciones', icon: 'notifications' },
        { id: 'tenants', label: 'Inquilinos / Compradores', icon: 'group' },
        { id: 'documents', label: 'Documentos', icon: 'description' },
        { id: 'investigations', label: 'Investigaciones', icon: 'policy' },
        { id: 'faqs', label: 'Dudas', icon: 'help_outline' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">

                    <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-white/5">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        >
                            <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno" className="w-10 h-10 object-contain" />
                        </button>
                        <span className="font-extrabold text-lg tracking-tight uppercase text-slate-900 dark:text-white">Panel Magno</span>
                    </div>

                    {/* Menu */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onViewChange(item.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${activeView === item.id
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <span className={`material-symbols-outlined transition-colors ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wide leading-none whitespace-nowrap">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>

                    {/* Footer / Logout */}
                    {isAuthenticated && (
                        <div className="p-4 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                                    Cerrar Sesión
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default ClientSidebar;
