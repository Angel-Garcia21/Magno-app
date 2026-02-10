import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface AdvisorCounterControlsProps {
    advisorId: string;
    advisorName: string;
    currentSoldCount: number;
    currentRentedCount: number;
    onUpdate: () => void;
}

const AdvisorCounterControls: React.FC<AdvisorCounterControlsProps> = ({
    advisorId,
    advisorName,
    currentSoldCount,
    currentRentedCount,
    onUpdate
}) => {
    const [soldInput, setSoldInput] = useState(currentSoldCount.toString());
    const [rentedInput, setRentedInput] = useState(currentRentedCount.toString());
    const { success, error } = useToast();

    const handleIncrement = async (type: 'sold' | 'rented') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            if (type === 'sold') {
                await supabase.rpc('increment_sold_count', { advisor_id: advisorId });
            } else {
                await supabase.rpc('increment_rented_count', { advisor_id: advisorId });
            }

            // Log the manual adjustment
            await supabase.from('advisor_transactions').insert({
                advisor_id: advisorId,
                transaction_type: 'manual_adjustment',
                adjustment_amount: 1,
                confirmed_by: user.id,
                notes: `Manual increment of ${type} count`
            });

            success(`✅ Contador de ${type === 'sold' ? 'ventas' : 'rentas'} incrementado`);
            onUpdate();
        } catch (err: any) {
            console.error('Error incrementing:', err);
            error('Error al incrementar contador');
        }
    };

    const handleDecrement = async (type: 'sold' | 'rented') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            if (type === 'sold') {
                await supabase.rpc('decrement_sold_count', { advisor_id: advisorId });
            } else {
                await supabase.rpc('decrement_rented_count', { advisor_id: advisorId });
            }

            // Log the manual adjustment
            await supabase.from('advisor_transactions').insert({
                advisor_id: advisorId,
                transaction_type: 'manual_adjustment',
                adjustment_amount: -1,
                confirmed_by: user.id,
                notes: `Manual decrement of ${type} count`
            });

            success(`✅ Contador de ${type === 'sold' ? 'ventas' : 'rentas'} decrementado`);
            onUpdate();
        } catch (err: any) {
            console.error('Error decrementing:', err);
            error('Error al decrementar contador');
        }
    };

    const handleSetValue = async (type: 'sold' | 'rented') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const newValue = parseInt(type === 'sold' ? soldInput : rentedInput);
            if (isNaN(newValue) || newValue < 0) {
                error('Valor inválido');
                return;
            }

            const currentValue = type === 'sold' ? currentSoldCount : currentRentedCount;
            const difference = newValue - currentValue;

            if (type === 'sold') {
                await supabase.rpc('set_sold_count', { advisor_id: advisorId, new_count: newValue });
            } else {
                await supabase.rpc('set_rented_count', { advisor_id: advisorId, new_count: newValue });
            }

            // Log the manual adjustment
            await supabase.from('advisor_transactions').insert({
                advisor_id: advisorId,
                transaction_type: 'manual_adjustment',
                adjustment_amount: difference,
                confirmed_by: user.id,
                notes: `Manual set ${type} count to ${newValue} (was ${currentValue})`
            });

            success(`✅ Contador establecido a ${newValue}`);
            onUpdate();
        } catch (err: any) {
            console.error('Error setting value:', err);
            error('Error al establecer valor');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6">
                Control Manual - {advisorName}
            </h3>

            <div className="space-y-6">
                {/* Sold Count Controls */}
                <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Ventas Cerradas
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleDecrement('sold')}
                            className="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">remove</span>
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                            <input
                                type="number"
                                value={soldInput}
                                onChange={(e) => setSoldInput(e.target.value)}
                                className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 font-bold text-center outline-none"
                                min="0"
                            />
                            <button
                                onClick={() => handleSetValue('sold')}
                                className="px-4 h-12 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Aplicar
                            </button>
                        </div>

                        <button
                            onClick={() => handleIncrement('sold')}
                            className="w-12 h-12 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">
                        Actual: {currentSoldCount} ventas
                    </p>
                </div>

                {/* Rented Count Controls */}
                <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Rentas Cerradas
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleDecrement('rented')}
                            className="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">remove</span>
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                            <input
                                type="number"
                                value={rentedInput}
                                onChange={(e) => setRentedInput(e.target.value)}
                                className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 font-bold text-center outline-none"
                                min="0"
                            />
                            <button
                                onClick={() => handleSetValue('rented')}
                                className="px-4 h-12 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Aplicar
                            </button>
                        </div>

                        <button
                            onClick={() => handleIncrement('rented')}
                            className="w-12 h-12 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">
                        Actual: {currentRentedCount} rentas
                    </p>
                </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                    Todos los cambios manuales se registran en el historial de transacciones.
                </p>
            </div>
        </div>
    );
};

export default AdvisorCounterControls;
