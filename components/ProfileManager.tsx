import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { AdvisorProfile, AdvisorType } from '../types';

interface ProfileManagerProps {
    userId: string;
    onClose: () => void;
    onUpdate: () => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ userId, onClose, onUpdate }) => {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<AdvisorProfile | null>(null);
    const [bio, setBio] = useState('');
    const [weeklyGoal, setWeeklyGoal] = useState('50000');
    const [advisorType, setAdvisorType] = useState<AdvisorType>('cerrador');

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('asesor_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setProfile(data);
                setBio(data.bio || '');
                setWeeklyGoal(data.weekly_goal?.toString() || '50000');
                setAdvisorType(data.advisor_type || 'cerrador');
            } else {
                // Initialize if no profile exists
                setBio('');
                setWeeklyGoal('50000');
                setAdvisorType('cerrador');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            toastError('Error al cargar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Upsert profile
            const { error } = await supabase
                .from('asesor_profiles')
                .upsert({
                    user_id: userId,
                    bio: bio,
                    weekly_goal: parseInt(weeklyGoal) || 50000,
                    advisor_type: advisorType,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            success('Perfil actualizado correctamente');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Error saving profile:', err);
            toastError('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">badge</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                                Landing Page
                            </h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Personalización del Asesor
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-8">
                    {/* Bio Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">format_quote</span>
                            <label className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                                Biografía / Sobre Mí
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            Esta descripción aparecerá en tu perfil público y landing page.
                        </p>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Escribe una breve biografía profesional..."
                            className="w-full h-40 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Meta Semanal */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            <label className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                                Cuota Semanal Meta ($)
                            </label>
                        </div>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={weeklyGoal}
                                onChange={(e) => setWeeklyGoal(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-5 pl-12 pr-6 text-slate-900 dark:text-white font-black text-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Advisor Type Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">badge</span>
                            <label className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                                Tipo de Asesor
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setAdvisorType('cerrador')}
                                className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${advisorType === 'cerrador'
                                    ? 'bg-primary/10 border-primary text-primary shadow-lg'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                                    }`}
                            >
                                <span className="block text-lg mb-1">🤝</span>
                                Cerrador
                            </button>
                            <button
                                onClick={() => setAdvisorType('opcionador')}
                                className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${advisorType === 'opcionador'
                                    ? 'bg-primary/10 border-primary text-primary shadow-lg'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                                    }`}
                            >
                                <span className="block text-lg mb-1">🏠</span>
                                Opcionador
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ProfileManager;
