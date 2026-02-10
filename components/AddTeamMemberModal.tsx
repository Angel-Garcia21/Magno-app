import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { UserRole, AdvisorType } from '../types';

interface AddTeamMemberModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

// Create a separate Supabase client for admin operations that doesn't persist sessions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'marketing' as UserRole,
        advisorType: 'cerrador' as AdvisorType
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Create user in Supabase Auth using the admin client (no session persistence)
            const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: formData.role
                    }
                }
            });

            if (authError) throw authError;


            if (authData.user) {
                // Wait a moment for the automatic trigger to create the profile
                await new Promise(resolve => setTimeout(resolve, 500));

                // 2. Update the profile with our data (the trigger already created it)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.name,
                        role: formData.role
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                    // If update fails, try upsert as fallback
                    const { error: upsertError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: authData.user.id,
                            full_name: formData.name,
                            email: formData.email,
                            role: formData.role
                        });

                    if (upsertError) throw upsertError;
                }

                // 3. Create or update advisor profile if role is 'asesor'
                if (formData.role === 'asesor') {
                    const { error: advisorError } = await supabase
                        .from('asesor_profiles')
                        .upsert({
                            user_id: authData.user.id,
                            advisor_type: formData.advisorType,
                            updated_at: new Date().toISOString()
                        });

                    if (advisorError) {
                        console.error('Advisor profile creation error:', advisorError);
                        // Don't throw here to avoid failing user creation if only advisor profile fails
                        // The dashboard will handle missing profiles later
                    }
                }

                onSuccess();
            }
        } catch (err: any) {
            console.error('Error creating user:', err);
            console.error('Full error details:', JSON.stringify(err, null, 2));

            // Show specific error message based on what failed
            let errorMessage = 'Error al crear usuario';
            if (err.message) {
                errorMessage = err.message;
            }
            if (err.error_description) {
                errorMessage = err.error_description;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-2 border-white/20 overflow-hidden animate-in zoom-in-50 duration-300">
                <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                            Nuevo Miembro
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 focus:border-primary focus:outline-none transition-all font-medium"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 focus:border-primary focus:outline-none transition-all font-medium"
                                placeholder="juan@grupomagno.com"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">
                                Contraseña Temporal
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 focus:border-primary focus:outline-none transition-all font-medium"
                                placeholder="******"
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">
                                Rol de Acceso
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <label className={`cursor-pointer group relative p-4 rounded-[1.5rem] border-2 transition-all duration-300
                                    ${formData.role === 'marketing'
                                        ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-500 text-pink-600'
                                        : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value="marketing"
                                        checked={formData.role === 'marketing'}
                                        onChange={() => setFormData(prev => ({ ...prev, role: 'marketing' }))}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-2xl">campaign</span>
                                        <span className="font-black uppercase tracking-tight text-[10px]">Marketing</span>
                                    </div>
                                    {formData.role === 'marketing' && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                                    )}
                                </label>

                                <label className={`cursor-pointer group relative p-4 rounded-[1.5rem] border-2 transition-all duration-300
                                    ${formData.role === 'asesor'
                                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600'
                                        : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value="asesor"
                                        checked={formData.role === 'asesor'}
                                        onChange={() => setFormData(prev => ({ ...prev, role: 'asesor' }))}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-2xl">badge</span>
                                        <span className="font-black uppercase tracking-tight text-[10px]">Asesor</span>
                                    </div>
                                    {formData.role === 'asesor' && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    )}
                                </label>

                                <label className={`cursor-pointer group relative p-4 rounded-[1.5rem] border-2 transition-all duration-300
                                    ${formData.role === 'admin'
                                        ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-500 text-purple-600'
                                        : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value="admin"
                                        checked={formData.role === 'admin'}
                                        onChange={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                                        <span className="font-black uppercase tracking-tight text-[10px]">Admin</span>
                                    </div>
                                    {formData.role === 'admin' && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    )}
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-2 px-4">
                                {formData.role === 'marketing'
                                    ? 'Solo acceso a la sección de Blog.'
                                    : formData.role === 'asesor'
                                        ? 'Acceso a Citas y Valuaciones únicamente.'
                                        : 'Acceso TOTAL: usuarios, propiedades y configuración.'}
                            </p>
                        </div>

                        {/* Advisor Type Selection (Conditional) */}
                        {formData.role === 'asesor' && (
                            <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-500">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">
                                    Especialidad del Asesor
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, advisorType: 'cerrador' }))}
                                        className={`flex flex-col items-center gap-2 p-6 rounded-[2rem] border-2 transition-all duration-300
                                            ${formData.advisorType === 'cerrador'
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600'
                                                : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 dark:hover:border-white/10 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-3xl">handshake</span>
                                        <span className="font-black uppercase tracking-tight text-xs">Cerrador</span>
                                        <span className="text-[10px] opacity-70 font-medium lowercase">Ventas y Rentas</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, advisorType: 'opcionador' }))}
                                        className={`flex flex-col items-center gap-2 p-6 rounded-[2rem] border-2 transition-all duration-300
                                            ${formData.advisorType === 'opcionador'
                                                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600'
                                                : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 dark:hover:border-white/10 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-3xl">add_home</span>
                                        <span className="font-black uppercase tracking-tight text-xs">Opcionador</span>
                                        <span className="text-[10px] opacity-70 font-medium lowercase">Reclutador</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 mt-6 shadow-xl shadow-primary/20"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Creando...</span>
                                </div>
                            ) : (
                                'Crear Usuario'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddTeamMemberModal;
