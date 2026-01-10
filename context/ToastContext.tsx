import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now().toString() + Math.random().toString();
        const newToast = { id, message, type };

        setToasts((prev) => [...prev, newToast]);

        // Auto dismiss after 10 seconds
        setTimeout(() => {
            removeToast(id);
        }, 10000);
    }, [removeToast]);

    const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
    const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);
    const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto
              flex items-center gap-3 p-4 
              rounded-[2rem] shadow-2xl backdrop-blur-xl border
              animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : ''}
              ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : ''}
            `}
                    >
                        <div className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${toast.type === 'success' ? 'bg-green-500 text-white shadow-glow shadow-green-500/30' : ''}
              ${toast.type === 'error' ? 'bg-red-500 text-white shadow-glow shadow-red-500/30' : ''}
              ${toast.type === 'info' ? 'bg-blue-500 text-white shadow-glow shadow-blue-500/30' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500 text-white shadow-glow shadow-amber-500/30' : ''}
            `}>
                            <span className="material-symbols-outlined text-xl font-black">
                                {toast.type === 'success' && 'check'}
                                {toast.type === 'error' && 'error'}
                                {toast.type === 'info' && 'info'}
                                {toast.type === 'warning' && 'warning'}
                            </span>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest flex-1">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm opacity-50">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
