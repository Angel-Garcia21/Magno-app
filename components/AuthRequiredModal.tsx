
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    intent?: 'sale' | 'rent';
}

const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
    isOpen,
    onClose,
    title = "¡Hazlo posible con Magno!",
    description = "Para comenzar a vender o rentar tu propiedad con nosotros, primero es necesario crear una cuenta. ¡Es rápido y totalmente gratis!",
    intent = 'sale'
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-xs rounded-[1.75rem] overflow-hidden shadow-2xl border border-white/20 dark:border-white/5 animate-in zoom-in-95 fade-in duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>

                {/* Illustration Area */}
                <div className="relative h-44 bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-800/50 flex items-center justify-center overflow-hidden">
                    <img
                        src="/assets/auth-welcome.png"
                        alt="Welcome to Magno"
                        className="w-full h-full object-cover scale-110"
                    />
                    {/* Subtle Glow Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent opacity-60" />
                </div>

                {/* Content Area */}
                <div className="p-6 sm:p-8 text-center">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter mb-3 leading-tight">
                        {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                        {description}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/login', { state: { mode: 'register', intent } })}
                            className="w-full py-3.5 bg-primary text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] rounded-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all mb-1"
                        >
                            Crear Cuenta
                        </button>
                        <button
                            onClick={() => navigate('/login', { state: { intent } })}
                            className="w-full py-3.5 bg-transparent text-slate-500 dark:text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.12em] rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                        >
                            Ya tengo cuenta, Iniciar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthRequiredModal;
