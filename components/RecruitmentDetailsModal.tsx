import React from 'react';
import PropertyPreview from './PropertyPreview';

interface RecruitmentDetailsModalProps {
    recruitment: any;
    onClose: () => void;
    onStatusChange: (status: string, reason?: string, feedback?: string) => void;
    onUpdateData?: (updates: any) => void;
}

const RecruitmentDetailsModal: React.FC<RecruitmentDetailsModalProps> = ({ recruitment, onClose, onStatusChange, onUpdateData }) => {
    if (!recruitment || !recruitment.form_data) return null;

    const fd = recruitment.form_data;
    const isRent = recruitment.type === 'rent';
    const [title, setTitle] = React.useState(fd.title || '');
    const [description, setDescription] = React.useState(fd.description || '');
    const [folio, setFolio] = React.useState(fd.ref || fd.folio || '');
    const [hasChanges, setHasChanges] = React.useState(false);

    // Sync state if prop changes
    React.useEffect(() => {
        setTitle(fd.title || '');
        setDescription(fd.description || '');
        setFolio(fd.ref || fd.folio || '');
        setHasChanges(false);
    }, [recruitment]);

    const handleSaveData = () => {
        if (onUpdateData) {
            onUpdateData({ ...fd, title, description, ref: folio, folio });
            setHasChanges(false);
        }
    };

    // Mock functionality for Preview component buttons since it's just a preview
    const noop = () => { };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-7xl max-h-[95vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-white/10">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white dark:bg-slate-950">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">visibility</span>
                        Vista Previa de Solicitud ({isRent ? 'Renta' : 'Venta'})
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <span className="material-symbols-outlined dark:text-white">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Panel: Files & Data Summary */}
                    <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900/50 p-6 overflow-y-auto border-r border-white/5">
                        <div className="space-y-6">

                            {/* Marketing Data Edit Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                    Datos de Marketing
                                </h3>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-primary">Folio Magno</label>
                                        <input
                                            type="text"
                                            value={folio}
                                            onChange={(e) => { setFolio(e.target.value.toUpperCase()); setHasChanges(true); }}
                                            placeholder="Ej: MAG-REC-001"
                                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-primary/20 text-sm font-black text-primary focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Título de la Publicación</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                                            placeholder="Ej: Casa en Renta en Juriquilla..."
                                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Descripción Detallada</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                                            rows={6}
                                            placeholder="Escribe la descripción vendedora aquí..."
                                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium leading-relaxed resize-none focus:border-primary outline-none"
                                        />
                                    </div>
                                    {hasChanges && (
                                        <button
                                            onClick={handleSaveData}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all animate-in zoom-in"
                                        >
                                            Guardar Cambios
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Propietario</h3>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5">
                                    <p className="font-bold dark:text-white">{recruitment.profiles?.full_name || 'Usuario desconocido'}</p>
                                    <p className="text-sm dark:text-slate-400">{recruitment.profiles?.email}</p>
                                    <p className="text-xs text-slate-400 mt-2">ID: {recruitment.owner_id}</p>
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Documentación <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300">{fd.id_url || fd.predial_url ? 'Presente' : 'Pendiente'}</span>
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* INE */}
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fd.id_url ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <span className="material-symbols-outlined">{fd.id_url ? 'badge' : 'priority_high'}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold dark:text-white">INE / Identificación</p>
                                                <p className="text-[10px] text-slate-400">{fd.id_url ? 'Archivo cargado' : 'No adjuntado'}</p>
                                            </div>
                                        </div>
                                        {fd.id_url && (
                                            <a href={fd.id_url} target="_blank" rel="noreferrer" className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                                <span className="material-symbols-outlined text-sm">download</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* Predial */}
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fd.predial_url ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                <span className="material-symbols-outlined">{fd.predial_url ? 'description' : 'warning'}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold dark:text-white">Predial</p>
                                                <p className="text-[10px] text-slate-400">{fd.predial_url ? 'Archivo cargado' : 'Opcional - No adjuntado'}</p>
                                            </div>
                                        </div>
                                        {fd.predial_url && (
                                            <a href={fd.predial_url} target="_blank" rel="noreferrer" className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                                <span className="material-symbols-outlined text-sm">download</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Detalles Adicionales</h3>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Llaves Proporcionadas:</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${fd.keys_provided ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {fd.keys_provided ? 'SÍ (Entregar Copia)' : 'NO (Asiste Propietario)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Servicio Admin:</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${fd.admin_service_interest ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                            {fd.admin_service_interest ? 'Interesado (Premium)' : 'Estándar'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Mantenimiento:</span>
                                        <span className="font-bold dark:text-white">
                                            {fd.maintenance_fee ? `$${fd.maintenance_fee}` : 'No especificado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Panel: Live Preview */}
                    <div className="w-full md:w-2/3 bg-slate-950 overflow-y-auto relative custom-scrollbar">
                        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md p-2 m-4 rounded-xl border border-white/10 inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Vista Cliente (En tiempo real)</span>
                        </div>
                        <div className="scale-[0.70] origin-top mx-auto">
                            {/* We pass the EDITED form data to the preview, so user sees changes instantly */}
                            <PropertyPreview formData={{ ...fd, title, description }} onEdit={noop} onConfirm={noop} mode={recruitment.type} />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 bg-white dark:bg-slate-950 flex justify-end gap-3">
                    {recruitment.status === 'pending' && (
                        <>
                            <button onClick={() => onStatusChange('rejected', 'Documentación incompleta')} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all">
                                Rechazar
                            </button>
                            <button onClick={() => onStatusChange('changes_requested', '', 'Favor de subir foto de INE legible')} className="px-6 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white font-bold transition-all">
                                Solicitar Cambios
                            </button>
                            <button onClick={() => onStatusChange('approved')} className="px-6 py-2 rounded-xl bg-green-500 text-white font-bold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Aprobar y Publicar
                            </button>
                        </>
                    )}
                    {recruitment.status !== 'pending' && (
                        <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 font-medium text-sm">
                            Estado actual: <span className="font-bold uppercase">{recruitment.status}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecruitmentDetailsModal;
