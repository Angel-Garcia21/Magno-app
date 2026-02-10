import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import AddTeamMemberModal from './AddTeamMemberModal';

interface TeamManagementProps {
    currentUser: User;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser }) => {
    const { success, error: toastError } = useToast();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            // Fetch only admin, marketing, and asesor staff (exclude owners, tenants, guests)
            // Fetch profiles joined with asesor_profiles for advisor types
            const { data, error } = await supabase
                .from('profiles')
                .select('*, asesor_profiles(advisor_type)')
                .in('role', ['admin', 'marketing', 'asesor'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to User type
            const users: User[] = (data || []).map(profile => ({
                id: profile.id,
                email: profile.email || '',
                name: profile.full_name || profile.name || 'Sin Nombre',
                role: profile.role as UserRole,
                advisor_type: (profile as any).asesor_profiles?.advisor_type
            }));

            setTeamMembers(users);
        } catch (err) {
            console.error('Error fetching team members:', err);
            toastError('Error al cargar el equipo');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAdded = () => {
        fetchTeamMembers();
        setShowAddModal(false);
        success('Miembro del equipo agregado correctamente');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                        Gestión de Equipo
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                        Administra los accesos y roles de tu personal administrativo
                    </p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="group relative px-8 py-4 bg-primary text-white rounded-[2rem] overflow-hidden hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-primary/30"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative flex items-center gap-3 font-bold uppercase tracking-widest text-sm">
                        <span className="material-symbols-outlined">person_add</span>
                        <span>Agregar Miembro</span>
                    </div>
                </button>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member) => (
                    <div
                        key={member.id}
                        className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500 relative overflow-hidden"
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-500
                            ${member.role === 'admin' ? 'bg-purple-500' :
                                member.role === 'marketing' ? 'bg-pink-500' :
                                    member.role === 'asesor' ? 'bg-blue-500' : 'bg-slate-500'}`}
                        />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black uppercase shadow-lg
                                    ${member.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300' :
                                        member.role === 'marketing' ? 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300' :
                                            member.role === 'asesor' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300'}`}
                                >
                                    {member.name.charAt(0)}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                                    ${member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20' :
                                        member.role === 'marketing' ? 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-500/10 dark:border-pink-500/20' :
                                            member.role === 'asesor' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/10 dark:border-slate-500/20'}`}
                                >
                                    {member.role === 'marketing' ? 'Redes Sociales' :
                                        member.role === 'admin' ? 'Administrador' :
                                            member.role === 'asesor' ? (
                                                <span className="flex items-center gap-1">
                                                    Asesor
                                                    {member.advisor_type && (
                                                        <span className="opacity-50 text-[8px]">
                                                            ({member.advisor_type})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : member.role}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 truncate">
                                {member.name}
                            </h3>
                            <p className="text-slate-400 text-sm font-medium mb-6 truncate">
                                {member.email}
                            </p>

                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-medium text-slate-400">
                                <span>ID: ...{member.id.slice(-6)}</span>
                                {member.id === currentUser.id && (
                                    <span className="text-primary font-bold">Tú</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <AddTeamMemberModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleMemberAdded}
                />
            )}
        </div>
    );
};

export default TeamManagement;
