import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
    title?: string;
    description?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave, title, description }) => {
    const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
    const [typedName, setTypedName] = useState('');
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [penColor, setPenColor] = useState('black');

    if (!isOpen) return null;

    const clear = () => {
        if (activeTab === 'draw') {
            sigCanvas.current?.clear();
        } else {
            setTypedName('');
        }
    };

    const handleSave = () => {
        console.log("Attempting to save signature...", { activeTab });
        try {
            if (activeTab === 'draw') {
                if (!sigCanvas.current) {
                    console.error("Signature Canvas ref is null");
                    alert("Error interno: No se pudo acceder al área de firma. Por favor recarga la página.");
                    return;
                }

                if (sigCanvas.current.isEmpty()) {
                    console.warn("Signature canvas is empty");
                    alert('Por favor dibuja tu firma primero');
                    return;
                }

                // Get the canvas directly - removing TRIM to prevent errors
                const canvas = sigCanvas.current.getCanvas();
                const dataUrl = canvas.toDataURL('image/png');

                console.log("Drawn signature captured:", {
                    length: dataUrl?.length,
                    prefix: dataUrl?.substring(0, 30)
                });

                if (dataUrl && dataUrl.length > 64) {
                    onSave(dataUrl);
                } else {
                    console.error("Generated DataURL is too short or invalid");
                    alert("Error al generar la imagen de la firma. Por favor intenta dibujar de nuevo.");
                }
            } else {
                if (!typedName.trim()) {
                    alert('Por favor escribe tu nombre primero');
                    return;
                }

                console.log("Generating typed signature for:", typedName);

                // Convert typed text to image representation
                const canvas = document.createElement('canvas');
                canvas.width = 600;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Use white background instead of transparent to avoid some PDF rendering issues
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.font = 'italic 70px "Dancing Script", cursive, sans-serif';
                    ctx.fillStyle = 'black';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

                    const dataUrl = canvas.toDataURL('image/png');
                    console.log("Typed signature captured:", { length: dataUrl.length });
                    onSave(dataUrl);
                }
            }
        } catch (err: any) {
            console.error("Critical error saving signature:", err);
            alert("Ocurrió un error al procesar la firma: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                            {title || 'Firma de Documento'}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                            {description || 'Por favor firma para continuar'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-105 transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">

                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('draw')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === 'draw'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">draw</span>
                            Dibujar
                        </button>
                        <button
                            onClick={() => setActiveTab('type')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === 'type'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">keyboard</span>
                            Escribir
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div className="relative group">
                        <div className={`h-64 w-full rounded-[2rem] border-2 border-dashed ${activeTab === 'draw' ? 'border-primary/30 bg-white' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center'} overflow-hidden`}>

                            {activeTab === 'draw' ? (
                                <>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        penColor={penColor}
                                        canvasProps={{
                                            className: 'w-full h-full cursor-crosshair',
                                            style: { width: '100%', height: '100%' }
                                        }}
                                        backgroundColor="white"
                                    />
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setPenColor('black')}
                                            className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === 'black' ? 'border-primary' : 'border-white'} shadow-sm`}
                                        />
                                        <button
                                            onClick={() => setPenColor('#1d4ed8')}
                                            className={`w-6 h-6 rounded-full bg-blue-700 border-2 ${penColor === '#1d4ed8' ? 'border-primary' : 'border-white'} shadow-sm`}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        placeholder="Escribe tu nombre completo"
                                        className="w-full text-center text-4xl bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary outline-none py-4 font-['Dancing_Script'] dark:text-white placeholder:font-sans placeholder:text-lg placeholder:text-slate-300"
                                        style={{ fontFamily: '"Dancing Script", cursive' }}
                                    />
                                    <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Se generará una firma digital basada en tu nombre
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Legal Notice */}
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-amber-500 text-xl">gavel</span>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Validez Legal</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Al firmar este documento, aceptas que esta firma electrónica es legalmente vinculante y tiene la misma validez que una firma manuscrita, conforme a las leyes aplicables.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={clear}
                            className="px-8 py-4 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Borrar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-4 rounded-[1.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-outlined text-lg">ink_pen</span>
                            Firmar Documento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
