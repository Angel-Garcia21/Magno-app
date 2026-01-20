
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost } from '../types';
import { supabase } from '../services/supabaseClient';

const BlogPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (data) setPosts(data);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-slate-50 dark:bg-[#020617] font-poppins">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md px-6 sm:px-10 pt-8 sm:pt-16 pb-6 sm:pb-10 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Magno <span className="text-primary">Blog</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Noticias y tendencias del sector inmobiliario</p>
        </div>
        <button onClick={() => navigate('/')} className="transition-transform hover:scale-110 active:scale-95 shrink-0">
          <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno Logo" className="w-10 h-10 sm:w-16 sm:h-16 object-contain brightness-75 dark:brightness-100" />
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-10 py-10 sm:py-16">
        {posts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 md:gap-12 lg:gap-16">
            {posts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className={`group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 delay-${Math.min(index * 100, 500)} bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-white/5 flex flex-col`}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={post.main_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={post.title} />
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 flex flex-wrap gap-1 sm:gap-2">
                    <span className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md text-primary text-[6px] sm:text-[8px] font-black uppercase tracking-widest px-2 sm:px-4 py-1 sm:py-1.5 rounded-full border border-primary/10 shadow-sm">
                      {post.category || 'Noticias'}
                    </span>
                    {index === 0 && (
                      <span className="bg-primary text-white text-[6px] sm:text-[8px] font-black uppercase tracking-widest px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-glow animate-pulse">Destacado</span>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-8 md:p-10 flex flex-col flex-1">
                  <h4 className="font-black text-xs sm:text-2xl uppercase tracking-tighter leading-tight mb-2 sm:mb-4 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h4>
                  <div className="mt-auto flex items-center justify-between pt-3 sm:pt-6 border-t border-slate-50 dark:border-white/5">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <p className="text-[7px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</p>
                      <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-l border-slate-100 dark:border-white/10 pl-4">
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                        5 MIN
                      </span>
                      <div className="hidden sm:flex items-center gap-0.5 ml-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className="material-symbols-outlined text-xs text-amber-500 fill-1">star</span>
                        ))}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary text-sm sm:text-base group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-40 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-6">article</span>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Próximamente más noticias</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
