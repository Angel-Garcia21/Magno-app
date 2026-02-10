import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface PendingConfirmation {
    id: string;
    type: 'rental' | 'sale';
    client_name: string;
    property_ref: string | null;
    advisor_id: string;
    advisor_name: string;
    created_at: string;
}

interface PendingConfirmationsProps {
    advisorId?: string | null;
}

const PendingConfirmations: React.FC<PendingConfirmationsProps> = ({ advisorId }) => {
    const [pending, setPending] = useState<PendingConfirmation[]>([]);
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();

    useEffect(() => {
        fetchPending();
    }, [advisorId]);

    const fetchPending = async () => {
        try {
            setLoading(true);

            // Fetch from rental_applications
            const { data: rentals, error: rentErr } = await supabase
                .from('rental_applications')
                .select('id, full_name, property_ref, assigned_to, created_at, property_snapshot, profiles:assigned_to(full_name)')
                .eq('status', 'ready_to_close');

            // Fetch from property_submissions
            const { data: sales, error: saleErr } = await supabase
                .from('property_submissions')
                .select('id, full_name, property_ref, assigned_advisor, created_at, property_snapshot, profiles:assigned_advisor(full_name)')
                .eq('status', 'ready_to_close');

            // Defensive check
            if (rentErr && rentErr.code !== 'PGRST204') console.warn('Note: rental_applications fetch failed:', rentErr.message);
            if (saleErr && saleErr.code !== 'PGRST204') console.warn('Note: property_submissions fetch failed:', saleErr.message);

            const mappedRentals: PendingConfirmation[] = (rentals || []).map((r: any) => ({
                id: r.id,
                type: 'rental',
                client_name: r.full_name,
                property_ref: r.property_ref,
                advisor_id: r.assigned_to,
                advisor_name: r.profiles?.full_name || 'Sin asignar',
                created_at: r.created_at,
                precaptured_snapshot: r.property_snapshot
            }));

            const mappedSales: PendingConfirmation[] = (sales || []).map((s: any) => ({
                id: s.id,
                type: 'sale',
                client_name: s.full_name,
                property_ref: s.property_ref,
                advisor_id: s.assigned_advisor,
                advisor_name: s.profiles?.full_name || 'Sin asignar',
                created_at: s.created_at,
                precaptured_snapshot: s.property_snapshot
            }));

            let allPending = [...mappedRentals, ...mappedSales];

            if (advisorId) {
                allPending = allPending.filter(item => item.advisor_id === advisorId);
            }

            setPending(allPending);
        } catch (err: any) {
            console.error('Quietly handled fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (confirmation: PendingConfirmation) => {
        const warningMessage = `⚠️ ATENCIÓN: Al confirmar esta transacción, estás aceptando formalmente que el asesor ${confirmation.advisor_name} se llevará la comisión correspondiente por la ${confirmation.type === 'rental' ? 'renta' : 'venta'} de esta propiedad.\n\n¿Deseas proceder con la confirmación final?`;

        if (!confirm(warningMessage)) return;

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Snapshot logic: Use precaptured if it exists, otherwise fetch now
            let snapshot = (confirmation as any).precaptured_snapshot;

            if (!snapshot && confirmation.property_ref) {
                // Fallback: Fetch current data if no precaptured snapshot exists
                const { data: propData } = await supabase.from('properties').select('*').eq('ref', confirmation.property_ref).maybeSingle();
                if (propData) {
                    snapshot = { ref: propData.ref, title: propData.title, address: propData.address, price: propData.price, type: 'tokko', tokko_id: propData.tokko_id };
                } else {
                    const { data: intPropData } = await supabase.from('internal_properties').select('*').eq('ref', confirmation.property_ref).maybeSingle();
                    if (intPropData) {
                        snapshot = { ref: intPropData.ref, title: intPropData.title || 'Propiedad Interna', address: intPropData.address, price: intPropData.price, type: 'internal' };
                    }
                }
            }

            // 2. Increment metrics
            if (confirmation.type === 'rental') {
                await supabase.rpc('increment_rented_count', { advisor_id: confirmation.advisor_id });
            } else {
                await supabase.rpc('increment_sold_count', { advisor_id: confirmation.advisor_id });
            }

            // 3. Update status
            if (confirmation.type === 'rental') {
                await supabase.from('rental_applications').update({ status: 'completed' }).eq('id', confirmation.id);
            } else {
                await supabase.from('property_submissions').update({ status: 'completed' }).eq('id', confirmation.id);
            }

            // 4. Log transaction with final snapshot
            await supabase.from('advisor_transactions').insert({
                advisor_id: confirmation.advisor_id,
                transaction_type: confirmation.type,
                application_id: confirmation.type === 'rental' ? confirmation.id : null,
                property_id: confirmation.type === 'sale' ? confirmation.id : null,
                confirmed_by: user.id,
                property_snapshot: snapshot,
                notes: `Confirmed ${confirmation.type} for ${confirmation.client_name}. Final snapshot archived.`
            });

            success(`✅ ${confirmation.type === 'rental' ? 'Renta' : 'Venta'} confirmada para ${confirmation.advisor_name}`);
            fetchPending();
        } catch (err: any) {
            console.error('Error confirming:', err);
            error('Error al confirmar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (confirmation: PendingConfirmation) => {
        try {
            // Just update status back to 'pending' or 'rejected'
            if (confirmation.type === 'rental') {
                await supabase
                    .from('rental_applications')
                    .update({ status: 'pending' })
                    .eq('id', confirmation.id);
            } else {
                await supabase
                    .from('property_submissions')
                    .update({ status: 'pending' })
                    .eq('id', confirmation.id);
            }

            success('❌ Confirmación rechazada');
            fetchPending();
        } catch (err: any) {
            console.error('Error rejecting:', err);
            error('Error al rechazar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (pending.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4">check_circle</span>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay confirmaciones pendientes</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Confirmaciones Pendientes</h2>
                <span className="px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-widest">
                    {pending.length} Pendiente{pending.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {pending.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 hover:shadow-xl transition-all"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.type === 'rental'
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        : 'bg-green-500/10 text-green-600 dark:text-green-400'
                                        }`}>
                                        {item.type === 'rental' ? 'Renta' : 'Venta'}
                                    </span>
                                    {item.property_ref && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            Ref: {item.property_ref}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                                    {item.client_name}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-base">person</span>
                                    <span className="font-bold">Asesor: {item.advisor_name || 'Sin asignar'}</span>
                                </div>

                                <p className="text-xs text-slate-400 mt-2">
                                    {new Date(item.created_at).toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleConfirm(item)}
                                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => handleReject(item)}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendingConfirmations;
