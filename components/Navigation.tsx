
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavigationProps {
  user: User | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
    setShowLogoutConfirm(false);
    navigate('/');
  };

  // Theme Toggle Button (visible for all users)
  const ThemeToggleButton = () => (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-[100] w-12 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl hover:shadow-primary/20 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6">
        {theme === 'light' ? (
          <span className="material-symbols-outlined text-amber-500 absolute inset-0 animate-in zoom-in spin-in-90 duration-500">light_mode</span>
        ) : (
          <span className="material-symbols-outlined text-blue-400 absolute inset-0 animate-in zoom-in spin-in-90 duration-500">dark_mode</span>
        )}
      </div>
    </button>
  );

  // 2. Rutas que no deben mostrar navegación inferior
  const hideNavPaths = ['/register-property', '/login', '/appraise'];
  if (hideNavPaths.includes(location.pathname)) return <ThemeToggleButton />;

  // Render a single nav item for consistency
  const NavItem = ({ to, icon, label, active }: { to: string, icon: string, label: string, active: boolean }) => (
    <Link
      to={to}
      className={`relative flex flex-col items-center gap-1 group py-2 px-4 transition-all duration-500 ${active ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
    >
      <span className={`material-symbols-outlined text-2xl transition-all duration-500 ${active ? 'fill-1' : 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
        {label}
      </span>
      {active && (
        <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
      )}
    </Link>
  );

  return (
    <>
      <ThemeToggleButton />
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 pb-2 pt-2 px-4 z-[90] rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-center justify-around">
          {!user ? (
            ['/client-portal'].includes(location.pathname) ? (
              <>
                <NavItem to="/" icon="home" label="Inicio" active={isActive('/')} />
                <NavItem to="/listings" icon="apartment" label="Propiedades" active={isActive('/listings')} />
                <NavItem to="/blog" icon="auto_stories" label="Blog" active={isActive('/blog')} />
              </>
            ) : ['/vender', '/rentar', '/vender/', '/rentar/'].includes(location.pathname) ? (
              <>
                <NavItem to="/" icon="home" label="Inicio" active={isActive('/')} />
                <NavItem to="/blog" icon="auto_stories" label="Blog" active={isActive('/blog')} />
                <NavItem to="/listings" icon="search" label="Buscar" active={isActive('/listings')} />
              </>
            ) : (
              <>
                <NavItem to="/" icon="home" label="Inicio" active={isActive('/')} />
                <NavItem to="/listings" icon="apartment" label="Propiedades" active={isActive('/listings')} />
                <NavItem to="/blog" icon="auto_stories" label="Blog" active={isActive('/blog')} />
                <NavItem to="/login" icon="person" label="Entrar" active={isActive('/login')} />
              </>
            )
          ) : (
            <>
              <NavItem to="/" icon="home" label="Inicio" active={isActive('/')} />
              <NavItem
                to={user.role === 'admin' ? '/admin' : (user.role === 'owner' ? '/client-portal' : '/dashboard')}
                icon="grid_view"
                label="Panel"
                active={isActive('/admin') || isActive('/dashboard') || isActive('/client-portal')}
              />
              <NavItem to="/blog" icon="auto_stories" label="Blog" active={isActive('/blog')} />
              <NavItem to="/listings" icon="search" label="Buscar" active={isActive('/listings')} />
              <button
                onClick={handleLogoutClick}
                className="flex flex-col items-center gap-1 group py-2 px-4 text-slate-400 hover:text-red-500 transition-all duration-500"
              >
                <span className="material-symbols-outlined text-2xl group-hover:scale-110">logout</span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Salir</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-3xl border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
              <span className="material-symbols-outlined text-4xl">logout</span>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white text-center mb-4 leading-tight">
              ¿Cerrar Sesión?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-bold uppercase tracking-widest mb-10 leading-relaxed">
              Estás a punto de salir de tu cuenta. ¿Estás seguro de que quieres continuar?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLogout}
                className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                Sí, Cerrar Sesión
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
              >
                Cancelar y Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
