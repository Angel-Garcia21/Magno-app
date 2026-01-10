
import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, BlogBlock, BlogBlockType } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface BlogEditorProps {
    post: BlogPost | null;
    onClose: () => void;
    onSave: (post: Partial<BlogPost>) => void;
    existingPosts: BlogPost[];
}

const TOOLS = [
    { type: 'h1', icon: 'format_h1', label: 'Título 1' },
    { type: 'h2', icon: 'format_h2', label: 'Título 2' },
    { type: 'h3', icon: 'format_h3', label: 'Título 3' },
    { type: 'text', icon: 'notes', label: 'Párrafo' },
    { type: 'image', icon: 'image', label: 'Imagen' },
    { type: 'video', icon: 'videocam', label: 'Video' },
    { type: 'youtube', icon: 'smart_display', label: 'YouTube' },
    { type: 'list', icon: 'format_list_bulleted', label: 'Lista' },
    { type: 'table', icon: 'table_chart', label: 'Tabla' },
    { type: 'blog_ref', icon: 'auto_stories', label: 'Ligado (Blog)' },
    { type: 'external_link', icon: 'link', label: 'Enlace Ext.' },
];

const BlogEditor: React.FC<BlogEditorProps> = ({ post, onClose, onSave, existingPosts }) => {
    const { success, error } = useToast();
    const [title, setTitle] = useState(post?.title || '');
    const [excerpt, setExcerpt] = useState(post?.excerpt || '');
    const [category, setCategory] = useState(post?.category || 'General');
    const [mainImage, setMainImage] = useState(post?.main_image || '');
    const [blocks, setBlocks] = useState<BlogBlock[]>(post?.content || []);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');

    const mainImageRef = useRef<HTMLInputElement>(null);

    const addBlock = (type: BlogBlockType) => {
        let content: any = '';
        if (type === 'list') content = { items: [''], type: 'bullet' };
        if (type === 'table') content = { rows: [['', ''], ['', '']] };
        if (type === 'blog_ref') content = { postId: '' };
        if (type === 'external_link') content = { url: '', title: '', description: '' };
        if (type === 'image' || type === 'video') content = { url: '' };

        const newId = Math.random().toString(36).substr(2, 9);
        const newBlock: BlogBlock = {
            id: newId,
            type,
            content
        };
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newId);
    };

    const updateBlock = (id: string, newContent: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (id: string, direction: 'up' | 'down') => {
        const index = blocks.findIndex(b => b.id === id);
        if (index === -1) return;
        const newBlocks = [...blocks];
        if (direction === 'up' && index > 0) {
            [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
        } else if (direction === 'down' && index < blocks.length - 1) {
            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        }
        setBlocks(newBlocks);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `blog/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('media')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type // Preserve quality
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

            if (blockId) {
                updateBlock(blockId, { url: publicUrl });
            } else {
                setMainImage(publicUrl);
            }
            success('Archivo subido correctamente');
        } catch (err: any) {
            error('Error al subir archivo: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = (isPublished: boolean) => {
        if (!title) return error('El título es obligatorio');
        if (!mainImage) return error('La imagen principal es obligatoria');

        onSave({
            id: post?.id,
            title,
            excerpt,
            category,
            main_image: mainImage,
            content: blocks,
            status: isPublished ? 'published' : 'draft',
            slug: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        });
    };

    const handleExit = () => {
        if (window.confirm('¿Estás seguro de que quieres salir sin guardar?')) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-white dark:bg-slate-950 flex overflow-hidden font-poppins">
            {/* Sidebar Tools */}
            <aside className="w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-black uppercase tracking-tighter">Editor Magno</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Arrastra o pulsa para añadir</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {TOOLS.map((tool) => (
                            <button
                                key={tool.type}
                                onClick={() => addBlock(tool.type as BlogBlockType)}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary hover:shadow-xl transition-all group"
                            >
                                <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary mb-2">{tool.icon}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <button
                        onClick={() => handleSave(false)}
                        className="w-full py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar Proceso
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm text-white">publish</span>
                        Publicar Blog
                    </button>
                    <button
                        onClick={handleExit}
                        className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Salir sin Guardar
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                onClick={() => setSelectedBlockId(null)}
                className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-12 md:p-24 selection:bg-primary/20"
            >
                <div className="max-w-4xl mx-auto space-y-12 pb-40">
                    {/* Header Editor */}
                    <div className="space-y-8">
                        <div className="flex flex-col gap-4">
                            <input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="CATEGORÍA (Ej: Consejos)"
                                className="w-full bg-transparent border-none text-[10px] font-black uppercase tracking-[0.4em] text-primary placeholder:text-slate-200 focus:ring-0 p-0"
                            />
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="TÍTULO DEL ARTÍCULO"
                                rows={2}
                                className="w-full bg-transparent border-none text-5xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white placeholder:text-slate-100 focus:ring-0 p-0 overflow-hidden resize-none leading-[0.9]"
                            />
                        </div>

                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="Introduce un resumen o descripción corta del artículo para el encabezado..."
                            rows={3}
                            className="w-full bg-transparent border-none text-xl md:text-2xl font-medium text-slate-400 placeholder:text-slate-200 focus:ring-0 p-0 leading-relaxed max-w-2xl"
                        />

                        <div
                            onClick={() => mainImageRef.current?.click()}
                            className="relative aspect-[16/10] rounded-[3rem] bg-slate-50 dark:bg-slate-900 overflow-hidden cursor-pointer group border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center max-w-2xl mx-auto"
                        >
                            {mainImage ? (
                                <>
                                    <img src={mainImage} className="w-full h-full object-cover" alt="Main" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined">edit</span> Cambiar Imagen
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-6xl text-slate-300">image</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Subir Imagen Principal</p>
                                    <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] mt-2 italic">Recomendado: 1920x1080px (o similar horizontal)</p>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <input type="file" hidden ref={mainImageRef} accept="image/*" onChange={(e) => handleFileUpload(e)} />
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    {/* Dynamic Blocks Area */}
                    <div className="space-y-12">
                        {blocks.map((block, index) => (
                            <div
                                key={block.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                                className={`relative group/block animate-in fade-in slide-in-from-bottom-4 p-6 -m-6 rounded-[2rem] transition-all ${selectedBlockId === block.id ? 'bg-slate-50/50 dark:bg-white/[0.02] ring-1 ring-slate-100 dark:ring-white/5' : ''}`}
                            >
                                <div className={`absolute -left-16 top-0 w-16 h-full flex flex-col gap-2 items-center z-10 pt-6 ${selectedBlockId === block.id ? 'flex' : 'hidden group-hover/block:flex'}`}>
                                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-primary transition-all shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined">expand_less</span>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-primary transition-all shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl border border-slate-100 dark:border-white/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>

                                {renderBlockEditor(block)}
                            </div>
                        ))}

                        {blocks.length === 0 && (
                            <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-[3rem]">
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Comienza a añadir contenido desde la barra lateral</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );

    function renderBlockEditor(block: BlogBlock) {
        switch (block.type) {
            case 'text':
                return (
                    <textarea
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Comienza a escribir..."
                        rows={3}
                        className="w-full bg-transparent border-none text-xl leading-relaxed text-slate-600 dark:text-slate-300 placeholder:text-slate-200 focus:ring-0 p-0"
                    />
                );
            case 'h1':
                return (
                    <input
                        type="text"
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Título 1"
                        className="w-full text-4xl font-black uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0"
                    />
                );
            case 'h2':
                return (
                    <input
                        type="text"
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Título 2"
                        className="w-full text-2xl font-black uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0"
                    />
                );
            case 'h3':
                return (
                    <input
                        type="text"
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Título 3"
                        className="w-full text-lg font-black uppercase tracking-wider bg-transparent border-none focus:ring-0 p-0"
                    />
                );
            case 'image':
                return (
                    <div className="space-y-4">
                        <div
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => handleFileUpload(e as any, block.id);
                                input.click();
                            }}
                            className="relative aspect-video rounded-[2rem] bg-slate-50 dark:bg-slate-900 overflow-hidden cursor-pointer group border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center"
                        >
                            {block.content.url ? (
                                <img src={block.content.url} className="w-full h-full object-cover" alt="Block Content" />
                            ) : (
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-200">add_photo_alternate</span>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-2">Añadir Imagen</p>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Pie de foto (opcional)..."
                            value={block.content.caption || ''}
                            onChange={(e) => updateBlock(block.id, { ...block.content, caption: e.target.value })}
                            className="w-full bg-transparent border-none text-[10px] font-bold text-center text-slate-400 focus:ring-0 italic"
                        />
                    </div>
                );
            case 'video':
                return (
                    <div
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'video/*';
                            input.onchange = (e) => handleFileUpload(e as any, block.id);
                            input.click();
                        }}
                        className="relative aspect-video rounded-[2rem] bg-slate-50 dark:bg-slate-900 overflow-hidden cursor-pointer group border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center"
                    >
                        {block.content.url ? (
                            <video src={block.content.url} className="w-full h-full object-cover" controls onClick={(e) => e.stopPropagation()} />
                        ) : (
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-200">videocam</span>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-2">Subir Video</p>
                            </div>
                        )}
                    </div>
                );
            case 'youtube':
                return (
                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="flex gap-4 mb-4">
                            <span className="material-symbols-outlined text-red-600">smart_display</span>
                            <input
                                type="text"
                                placeholder="Inserta el link de YouTube aquí..."
                                value={block.content.url || ''}
                                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                className="flex-1 bg-transparent border-none font-bold text-sm focus:ring-0 p-0"
                            />
                        </div>
                        {block.content.url && block.content.url.includes('v=') && (
                            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
                                <iframe
                                    src={`https://www.youtube.com/embed/${block.content.url.split('v=')[1].split('&')[0]}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>
                        )}
                        {block.content.url && block.content.url.includes('youtu.be/') && (
                            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
                                <iframe
                                    src={`https://www.youtube.com/embed/${block.content.url.split('youtu.be/')[1].split('?')[0]}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>
                );
            case 'list':
                return (
                    <div className="space-y-3">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => updateBlock(block.id, { ...block.content, type: 'bullet' })}
                                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${block.content.type === 'bullet' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                Viñeteas
                            </button>
                            <button
                                onClick={() => updateBlock(block.id, { ...block.content, type: 'number' })}
                                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${block.content.type === 'number' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                Números
                            </button>
                        </div>
                        {block.content.items.map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-4 group/item">
                                <span className="text-primary font-black">{block.content.type === 'bullet' ? '•' : `${i + 1}.`}</span>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => {
                                        const newItems = [...block.content.items];
                                        newItems[i] = e.target.value;
                                        updateBlock(block.id, { ...block.content, items: newItems });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const newItems = [...block.content.items];
                                            newItems.splice(i + 1, 0, '');
                                            updateBlock(block.id, { ...block.content, items: newItems });
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-lg"
                                    placeholder="Elemento de lista..."
                                />
                                <button
                                    onClick={() => {
                                        const newItems = block.content.items.filter((_: any, idx: number) => idx !== i);
                                        updateBlock(block.id, { ...block.content, items: newItems.length > 0 ? newItems : [''] });
                                    }}
                                    className="opacity-0 group-hover/item:opacity-100 text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                                </button>
                            </div>
                        ))}
                    </div>
                );
            case 'table':
                return (
                    <div className="overflow-x-auto bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800">
                        <table className="w-full border-collapse">
                            <tbody>
                                {block.content.rows.map((row: string[], ri: number) => (
                                    <tr key={ri}>
                                        {row.map((cell: string, ci: number) => (
                                            <td key={ci} className="border border-slate-200 dark:border-slate-700 p-3">
                                                <input
                                                    type="text"
                                                    value={cell}
                                                    onChange={(e) => {
                                                        const newRows = [...block.content.rows];
                                                        newRows[ri][ci] = e.target.value;
                                                        updateBlock(block.id, { rows: newRows });
                                                    }}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold"
                                                    placeholder="..."
                                                />
                                            </td>
                                        ))}
                                        <td className="w-10 text-center">
                                            <button onClick={() => {
                                                const newRows = block.content.rows.filter((_: any, rIdx: number) => rIdx !== ri);
                                                updateBlock(block.id, { rows: newRows });
                                            }} className="text-red-500 opacity-20 hover:opacity-100">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => {
                                    const newRows = [...block.content.rows, new Array(block.content.rows[0].length).fill('')];
                                    updateBlock(block.id, { rows: newRows });
                                }}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span> Añadir Fila
                            </button>
                            <button
                                onClick={() => {
                                    const newRows = block.content.rows.map((r: string[]) => [...r, '']);
                                    updateBlock(block.id, { rows: newRows });
                                }}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span> Añadir Columna
                            </button>
                        </div>
                    </div>
                );
            case 'blog_ref':
                return (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-6 group">
                        <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary overflow-hidden">
                            {block.content.postId ? (
                                <img src={existingPosts.find(p => p.id === block.content.postId)?.main_image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className="material-symbols-outlined text-2xl">auto_stories</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">Relacionar con Blog</p>
                            <select
                                value={block.content.postId}
                                onChange={(e) => updateBlock(block.id, { postId: e.target.value })}
                                className="w-full bg-transparent border-none focus:ring-0 font-black text-xs uppercase tracking-tight p-0"
                            >
                                <option value="">Seleccionar Post...</option>
                                {existingPosts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                );
            case 'external_link':
                return (
                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-inner space-y-8">
                        {/* URL Header */}
                        <div className="flex items-center gap-4 text-primary">
                            <span className="material-symbols-outlined">link</span>
                            <input
                                type="text"
                                placeholder="https://ejemplo.com"
                                value={block.content.url || ''}
                                onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                                className="flex-1 bg-transparent border-none font-bold text-sm focus:ring-0 p-0"
                            />
                        </div>

                        {/* Visual Card Editor */}
                        <div className="bg-white dark:bg-slate-950 p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl flex items-center gap-10 group/preview transition-all">
                            <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                                <span className="material-symbols-outlined text-4xl">open_in_new</span>
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                                <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Enlace Externo</span>
                                <input
                                    type="text"
                                    placeholder="Título del Enlace..."
                                    value={block.content.title || ''}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, title: e.target.value })}
                                    className="w-full bg-transparent border-none text-3xl font-black uppercase tracking-tighter focus:ring-0 p-0 placeholder:text-slate-100"
                                />
                                <textarea
                                    placeholder="Descripción corta para el enlace..."
                                    value={block.content.description || ''}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, description: e.target.value })}
                                    rows={2}
                                    className="w-full bg-transparent border-none text-lg text-slate-500 font-medium focus:ring-0 p-0 resize-none leading-tight placeholder:text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Así es como tus lectores verán el enlace</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }
};

export default BlogEditor;
