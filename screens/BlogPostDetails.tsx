
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BlogPost, BlogBlock } from '../types';
import { supabase } from '../services/supabaseClient';

const BlogPostDetails: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .eq('status', 'published')
                .single();

            if (data) setPost(data);
            setLoading(false);
        };
        fetchPost();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-10 font-poppins">
                <span className="material-symbols-outlined text-8xl text-slate-100 mb-8">error</span>
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Post no encontrado</h1>
                <button onClick={() => navigate('/blog')} className="text-primary font-black uppercase tracking-widest text-[10px]">Volver al blog</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#020617] font-poppins pb-40">
            {/* Premium Header Section */}
            <div className="max-w-7xl mx-auto px-5 sm:px-10 pt-6 md:pt-24 pb-10 sm:pb-16">
                <div className="flex flex-col lg:flex-row gap-12 sm:gap-16 lg:items-center">
                    {/* Left Side: Metadata and Title */}
                    <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                        <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Home</button>
                            <span>|</span>
                            <button onClick={() => navigate('/blog')} className="hover:text-primary transition-colors">Insights</button>
                            <span>|</span>
                            <span className="text-primary">{post.category || 'Noticia'}</span>
                        </nav>

                        <h1 className="text-2xl sm:text-4xl md:text-6xl xl:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-slate-900 dark:text-white">
                            {post.title}
                        </h1>

                        <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                            {post.excerpt}
                        </p>

                        <div className="pt-6 flex flex-col sm:flex-row sm:items-center gap-6 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escrito por</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Redacción Magno</p>
                                </div>
                            </div>
                            <div className="hidden sm:block w-px h-8 bg-slate-100 dark:bg-white/5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publicado</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(post.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-700 delay-200">
                        <div className="relative aspect-[16/10] rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden shadow-3xl border border-slate-100 dark:border-white/5">
                            <img src={post.main_image} className="w-full h-full object-cover" alt={post.title} />
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[2.5rem] sm:rounded-[4rem]" />
                        </div>
                    </div>
                </div>
            </div>

            <hr className="max-w-7xl mx-auto border-slate-100 dark:border-white/5 lg:my-8" />

            {/* Content Blocks */}
            <div className="max-w-4xl mx-auto px-5 sm:px-10 mt-10 sm:mt-20 space-y-8 sm:space-y-16">
                {post.content.map((block: BlogBlock) => (
                    <div key={block.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {renderBlock(block)}
                    </div>
                ))}
            </div>
        </div>
    );

    function renderBlock(block: BlogBlock) {
        switch (block.type) {
            case 'h1':
                return <h2 className="text-2xl sm:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{block.content}</h2>;
            case 'h2':
                return <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{block.content}</h3>;
            case 'h3':
                return <h4 className="text-lg sm:text-xl font-black uppercase tracking-widest text-primary leading-tight">{block.content}</h4>;
            case 'text':
                return <p className="text-base sm:text-xl leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{block.content}</p>;
            case 'image':
                return (
                    <div className="space-y-4">
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5">
                            <img src={block.content.url} className="w-full object-cover" alt={block.content.caption || ''} />
                        </div>
                        {block.content.caption && (
                            <p className="text-sm text-slate-400 text-center font-medium italic">{block.content.caption}</p>
                        )}
                    </div>
                );
            case 'video':
                return (
                    <div className="rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 bg-black aspect-video">
                        <video src={block.content.url} controls className="w-full h-full" />
                    </div>
                );
            case 'youtube':
                const getYoutubeId = (url: string) => {
                    if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
                    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
                    return null;
                };
                const ytId = getYoutubeId(block.content.url);
                return ytId ? (
                    <div className="rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 aspect-video bg-black">
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            className="w-full h-full"
                            allowFullScreen
                        />
                    </div>
                ) : null;
            case 'list':
                return (
                    <ul className={`space-y-4 ${block.content.type === 'number' ? 'list-decimal ml-6' : 'list-none'}`}>
                        {block.content.items.map((item: string, i: number) => (
                            <li key={i} className="flex gap-4 text-base sm:text-xl text-slate-600 dark:text-slate-400">
                                {block.content.type === 'bullet' && <span className="text-primary font-black">•</span>}
                                <span className={block.content.type === 'number' ? 'font-bold text-primary mr-2' : ''}>
                                    {block.content.type === 'number' ? `${i + 1}.` : ''}
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                );
            case 'table':
                return (
                    <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
                        <table className="w-full text-left">
                            <tbody>
                                {block.content.rows.map((row: string[], ri: number) => (
                                    <tr key={ri} className="border-b border-slate-50 dark:border-white/5 last:border-none">
                                        {row.map((cell: string, ci: number) => (
                                            <td key={ci} className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'blog_ref':
                return (
                    <div
                        onClick={() => navigate(`/blog`)}
                        className="bg-slate-50 dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all cursor-pointer group flex items-center gap-6 sm:gap-10"
                    >
                        <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-xl shrink-0 aspect-square">
                            <img
                                src={post.main_image}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-50"
                                alt=""
                            />
                        </div>
                        <div>
                            <span className="text-primary text-[10px] font-black uppercase tracking-[.3em] mb-4 inline-block">Post Relacionado</span>
                            <h4 className="text-3xl font-black uppercase tracking-tighter group-hover:text-primary transition-colors">
                                Explorar más en Insights
                            </h4>
                        </div>
                    </div>
                );
            case 'external_link':
                return (
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all cursor-pointer group flex items-center gap-6 sm:gap-10 hover:-translate-y-2"
                    >
                        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-xl shrink-0">
                            <span className="material-symbols-outlined text-4xl">open_in_new</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[.3em] mb-3 inline-block">Visitar Sitio Web</span>
                            <h4 className="text-3xl font-black uppercase tracking-tighter group-hover:text-primary transition-colors mb-2 truncate">
                                {block.content.title}
                            </h4>
                            {block.content.description && (
                                <p className="text-lg text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight font-medium">{block.content.description}</p>
                            )}
                        </div>
                    </a>
                );
            default:
                return null;
        }
    }
};

export default BlogPostDetails;
