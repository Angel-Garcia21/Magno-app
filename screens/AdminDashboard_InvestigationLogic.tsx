const renderInvestigationReview = () => {
    // Combine Leads and Rental Applications that are in 'investigating' status
    const investigatingLeads = leads.filter(l => l.status === 'investigating' || l.investigation_status === 'review');
    const investigatingApps = rentalApps.filter(a => a.status === 'reviewed' && a.payment_status === 'approved' && (!a.investigation_status || a.investigation_status === 'pending' || a.investigation_status === 'review'));

    // Archived/Rejected Potentials
    const archivedLeads = leads.filter(l => l.status === 'closed_lost' && l.investigation_status === 'rejected');
    const archivedApps = rentalApps.filter(a => a.status === 'rejected' && a.investigation_status === 'rejected');

    return (
        <div className="space-y-12">
            {/* Pending Reviews Section */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">rate_review</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Pendientes de Revisión</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...investigatingLeads, ...investigatingApps].map((item: any) => {
                        const notifType = item.application_type ? 'Solicitud' : 'Lead';
                        return (
                            <div key={`${notifType}-${item.id}`} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-10 -mt-10" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                                            {notifType}
                                        </span>
                                        {item.investigation_link && (
                                            <a
                                                href={item.investigation_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                title="Ver Link de Investigación"
                                            >
                                                <span className="material-symbols-outlined text-slate-500 text-lg">link</span>
                                            </a>
                                        )}
                                    </div>

                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2 leading-none">
                                        {item.full_name}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-bold mb-6 truncate">{item.email}</p>

                                    <div className="flex items-center gap-2 mb-6 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl">
                                        <span className="material-symbols-outlined text-slate-400">home</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                                                {notifType === 'Solicitud' ? (item.property_snapshot?.title || item.property_ref) : (item.property_snapshot?.title || 'Propiedad Interés')}
                                            </p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Inmueble</p>
                                        </div>
                                    </div>

                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Acciones</p>
                                    <button
                                        onClick={() => {
                                            setSelectedInvestigation({ ...item, type: notifType });
                                            setShowInvestigationModal(true);
                                            setReviewScore('');
                                            setReviewNotes('');
                                        }}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-base">gavel</span>
                                        Dictaminar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {[...investigatingLeads, ...investigatingApps].length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">check_circle</span>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No hay investigaciones pendientes</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Archived/Rejected Potential Section */}
            <div>
                <div className="flex items-center gap-4 mb-6 pt-8 border-t border-slate-100 dark:border-white/5">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">archive</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Archivo de Rechazados (Potenciales)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...archivedLeads, ...archivedApps].map((item: any) => (
                        <div key={`arch-${item.id}`} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 opacity-75 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between mb-4">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    {new Date(item.archived_at || item.updated_at).toLocaleDateString()}
                                </span>
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-500 text-[8px] font-black uppercase rounded-full">Rechazado</span>
                            </div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">{item.full_name}</h4>
                            <p className="text-[10px] text-slate-400 mb-4">{item.email}</p>

                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl mb-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Motivo / Notas</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">"{item.investigation_notes || item.feedback?.notes || 'Sin notas'}"</p>
                            </div>
                        </div>
                    ))}
                    {[...archivedLeads, ...archivedApps].length === 0 && (
                        <div className="col-span-full py-10 text-center">
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No hay registros archivados</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const handleReviewInvestigation = async (verdict: 'approved' | 'rejected') => {
    if (!selectedInvestigation) return;
    setIsProcessingApproval(true);

    try {
        const isLead = selectedInvestigation.type === 'Lead';
        const table = isLead ? 'leads_prospectos' : 'rental_applications';

        const updates: any = {
            investigation_status: verdict,
            investigation_score: reviewScore,
            // investigation_notes: reviewNotes // Using standardized field if available, or piggybacking
        };

        if (isLead) {
            updates.investigation_notes = reviewNotes;
            if (verdict === 'approved') {
                updates.status = 'ready_to_close'; // Or documents_pending if flow detailed
            } else {
                updates.status = 'closed_lost';
                updates.archived_at = new Date().toISOString();
            }
        } else {
            // Rental Application
            // Map feedback or structure
            updates.feedback = { ...selectedInvestigation.feedback, investigation_notes: reviewNotes };

            if (verdict === 'approved') {
                updates.status = 'ready_to_close';
            } else {
                updates.status = 'rejected';
                updates.archived_at = new Date().toISOString();
            }
        }

        const { error: updateErr } = await supabase.from(table).update(updates).eq('id', selectedInvestigation.id);

        if (updateErr) throw updateErr;

        // Notification logic could go here
        const userId = selectedInvestigation.assigned_to || selectedInvestigation.referred_by;
        if (userId) {
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'info',
                title: `Investigación ${verdict === 'approved' ? 'Aprobada' : 'Rechazada'}`,
                message: `El candidato ${selectedInvestigation.full_name} ha sido ${verdict === 'approved' ? 'aprobado' : 'rechazado'} con un score de ${reviewScore}.`,
                is_read: false
            });
        }

        success(`Candidato ${verdict === 'approved' ? 'aprobado' : 'rechazado'} correctamente`);
        setShowInvestigationModal(false);

        // Refresh Lists
        if (isLead) fetchLeads();
        else fetchRentalApps();

    } catch (err: any) {
        console.error(err);
        error('Error al guardar dictamen');
    } finally {
        setIsProcessingApproval(false);
    }
};
