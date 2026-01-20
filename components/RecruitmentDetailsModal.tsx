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

            <div className="relative bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-7xl max-h-[95vh] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-white/10">
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-white dark:bg-slate-950">
                    <h2 className="text-base sm:text-xl font-bold dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-lg sm:text-2xl">visibility</span>
                        Vista Previa ({isRent ? 'Renta' : 'Venta'})
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <span className="material-symbols-outlined dark:text-white">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Panel: Files & Data Summary */}
                    <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 overflow-y-auto border-r border-white/5">
                        <div className="space-y-6">
                            {/* Signature Status Banner */}
                            {!recruitment.is_signed && recruitment.status === 'pending' && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                                        <span className="material-symbols-outlined">ink_pen</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">Propiedad Congelada</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">El propietario no ha firmado la solicitud obligatoria</p>
                                    </div>
                                </div>
                            )}

                            {/* Marketing Data Edit Section */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs sm:text-sm">edit_note</span>
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
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2">
                                    <div>
                                        <p className="font-bold dark:text-white leading-tight">{recruitment.profiles?.full_name || 'Usuario desconocido'}</p>
                                        <p className="text-sm dark:text-slate-400">{recruitment.profiles?.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                        <span className="material-symbols-outlined text-sm text-primary">call</span>
                                        <p className="text-sm font-bold dark:text-white">{fd.contact_phone || 'No proporcionado'}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">ID: {recruitment.owner_id}</p>
                                </div>
                            </div>

                            {/* Generated Documents (Auto-generated recruitment/keys) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">description</span>
                                    Documentación Generada
                                </h3>
                                {(recruitment.form_data.unsigned_recruitment_url || recruitment.form_data.unsigned_keys_url) ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {recruitment.form_data.unsigned_recruitment_url && (
                                            <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/20 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${recruitment.is_signed ? 'bg-green-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                                                        <span className="material-symbols-outlined">{recruitment.is_signed ? 'verified_user' : 'ink_pen'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black dark:text-white uppercase">Hoja de Reclutamiento</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{recruitment.is_signed ? 'Propiedad Firmada' : 'Falta Firma Owner'}</p>
                                                    </div>
                                                </div>
                                                <a href={recruitment.form_data.unsigned_recruitment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    PDF
                                                </a>
                                            </div>
                                        )}
                                        {recruitment.form_data.unsigned_keys_url && (
                                            <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/20 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${recruitment.is_signed ? 'bg-green-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                                                        <span className="material-symbols-outlined">{recruitment.is_signed ? 'key' : 'key'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black dark:text-white uppercase">Recibo de Llaves</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{recruitment.is_signed ? 'Propiedad Firmada' : 'Falta Firma Owner'}</p>
                                                    </div>
                                                </div>
                                                <a href={recruitment.form_data.unsigned_keys_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aún no se ha generado documentación</p>
                                    </div>
                                )}
                            </div>

                            {/* Documents Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    Documentación <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300">{fd.id_url || fd.predial_url ? 'Presente' : 'Pendiente'}</span>
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* INE / Identificación(es) */}
                                    {fd.id_urls && fd.id_urls.length > 0 ? (
                                        fd.id_urls.map((url: string, idx: number) => (
                                            <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-500">
                                                        <span className="material-symbols-outlined">badge</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold dark:text-white">INE / ID {fd.id_urls.length > 1 ? `#${idx + 1}` : ''}</p>
                                                        <p className="text-[10px] text-slate-400">Archivo cargado</p>
                                                    </div>
                                                </div>
                                                <a href={url} target="_blank" rel="noreferrer" className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                                    <span className="material-symbols-outlined text-sm">download</span>
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
                                                    <span className="material-symbols-outlined">priority_high</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold dark:text-white">INE / Identificación</p>
                                                    <p className="text-[10px] text-slate-400">No adjuntado</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                                    {fd.request_professional_photos && (
                                        <div className="flex justify-between items-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-indigo-500 text-lg">add_a_photo</span>
                                                <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Fotos Pro</span>
                                            </div>
                                            <span className="px-2 py-1 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">Solicitado</span>
                                        </div>
                                    )}
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
                        <div className="scale-[0.5] sm:scale-[0.70] origin-top mx-auto p-4">
                            {/* We pass the EDITED form data to the preview, so user sees changes instantly */}
                            <PropertyPreview formData={{ ...fd, title, description }} onEdit={noop} onConfirm={noop} mode={recruitment.type} />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 sm:p-4 border-t border-white/10 bg-white dark:bg-slate-950 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                    {recruitment.status === 'pending' && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); onStatusChange('rejected', 'Documentación incompleta'); }}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all text-xs uppercase tracking-widest"
                            >
                                Rechazar
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); onStatusChange('changes_requested', '', 'Favor de subir foto de INE legible'); }}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white font-bold transition-all text-xs uppercase tracking-widest"
                            >
                                Solicitar Cambios
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); onStatusChange('approved'); }}
                                disabled={!recruitment.is_signed}
                                title={!recruitment.is_signed ? 'El propietario aún no ha firmado la solicitud' : ''}
                                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${recruitment.is_signed
                                    ? 'bg-green-500 text-white hover:shadow-lg hover:shadow-green-500/30'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">{recruitment.is_signed ? 'check_circle' : 'lock'}</span>
                                {recruitment.is_signed ? 'Aprobar y Publicar' : 'Congelada'}
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
