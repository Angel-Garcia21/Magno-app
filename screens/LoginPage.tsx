
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { mode?: string, intent?: string };
  const { signIn, signUp } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('owner');
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0); // 0: Auth, 1: Personal Info, 2: Intent
  const [intent, setIntent] = useState<'sale' | 'rent' | null>(null);

  // Ref to prevent multiple Google One Tap initializations
  const googleInitialized = useRef(false);

  // Handle redirection state
  useEffect(() => {
    if (state?.mode === 'register') {
      setIsLogin(false);
      // If we are in register mode (e.g. from Vender/Rentar), we flow through the wizard
      if (state.intent) setIntent(state.intent as 'sale' | 'rent');
    }
  }, [state]);

  // Google One Tap Integration
  useEffect(() => {
    // Prevent multiple initializations
    if (googleInitialized.current) {
      return;
    }

    const handleGoogleResponse = async (response: any) => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });

        if (error) throw error;

        // Check Role and Navigate
        if (data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          const role = profile?.role;

          if (role === 'admin') {
            navigate('/admin');
          } else if (role === 'owner') {
            navigate('/client-portal');
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/client-portal');
        }

      } catch (error: any) {
        console.error("Google Login Error:", error);
        setError(error.message || 'Error iniciando sesión con Google');
      } finally {
        setLoading(false);
      }
    };

    if ((window as any).google && !googleInitialized.current) {
      googleInitialized.current = true;

      (window as any).google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '165560193010-h8nq36dcvagelie8jda1fcq1kf05kb6b.apps.googleusercontent.com',
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: true, // Opt-in to FedCM per Google warnings
      });
      console.log("[Magno Auth] Initializing Google One Tap with Origin:", window.location.origin);
      console.log("[Magno Auth] If you see a 403 error, verify this origin is authorized in Google Cloud Console:");
      console.log("[Magno Auth] https://console.cloud.google.com/apis/credentials");

      // Display One Tap
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("One Tap skipped/not displayed", notification);
        }
      });

      // Render Google Button as well
      const buttonDiv = document.getElementById('google-btn-container');
      if (buttonDiv) {
        (window as any).google.accounts.id.renderButton(
          buttonDiv,
          { theme: "outline", size: "large" }
        );
      }
    }

    // Cleanup on unmount
    return () => {
      if ((window as any).google?.accounts?.id?.cancel) {
        (window as any).google.accounts.id.cancel();
      }
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const targetEmail = email.toLowerCase().trim();

    // Step 0: Authentication (Login or Initial Register)
    if (wizardStep === 0) {
      setLoading(true);
      try {
        if (isLogin) {
          const { error: signInError } = await signIn(targetEmail, password);
          if (signInError) throw signInError;

          // Login Success -> Check Role and Navigate
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            // Fetch profile to get role
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

            const role = profile?.role;

            if (role === 'admin') {
              navigate('/admin');
            } else if (role === 'owner') {
              // If explicitly passing intent for existing user
              if (intent) {
                navigate('/client-portal', { state: { openForm: intent } });
              } else {
                navigate('/client-portal');
              }
            } else {
              // Default fallback for other roles (e.g. tenant)
              navigate('/dashboard');
            }
          } else {
            // Fallback if no user found (unlikely after success)
            navigate('/client-portal');
          }

        } else {
          // Register Step
          if (!name.trim()) {
            setError('Por favor ingresa tu nombre completo.');
            setLoading(false);
            return;
          }
          // User asked to create account with name, email and password.
          const { error: signUpError } = await signUp(targetEmail, password, name.trim(), loginRole);
          if (signUpError) throw signUpError;

          // Auth Success -> Move to Wizard
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({ password }).eq('id', user.id);
          }
          setWizardStep(1);
        }
      } catch (err: any) {
        setError(err.message || 'Error de autenticación');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 1: Personal Info (Name, Age)
    if (wizardStep === 1) {
      if (!name || !age) {
        setError('Por favor completa todos los campos.');
        return;
      }
      // Update Profile
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase.from('profiles').update({
            full_name: name,
            // age: parseInt(age) // TODO: Ensure age column exists in Supabase. Plan said we'd add it.
          }).eq('id', user.id);
          if (updateError) throw updateError;
        }

        setWizardStep(2);
      } catch (err: any) {
        setError('Error al guardar datos: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 2: Intent
    if (wizardStep === 2) {
      if (intent) {
        navigate('/client-portal', { state: { openForm: intent } });
      } else {
        // If they somehow got here without clicking a button (enter key?), default?
        // The buttons in render handle the navigation. This is fallback.
        setError('Por favor selecciona una opción');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-display">
      <header className="sticky top-0 z-50 w-full px-8 py-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 backdrop-blur-2xl">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-slate-400 hover:text-primary transition-all group"
        >
          <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white dark:bg-primary/20 rounded-xl flex items-center justify-center border-2 border-primary/30 shadow-glow overflow-hidden">
            <img
              src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png"
              alt="Magno Logo"
              className="w-full h-full object-contain p-1.5 drop-shadow-xl"
            />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">Magno Identity</span>
        </div>

        <div className="w-20" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-32">
        <div className="w-full max-w-lg">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">
                {wizardStep === 0 ? 'Acceso de Clientes' : `Paso ${wizardStep} de 2`}
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none mb-4">
              {wizardStep === 0 ? (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta') :
                wizardStep === 1 ? 'Tu Perfil' : '¿Qué deseas hacer?'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
              {wizardStep === 0 ? 'Accede a tu panel de propiedades' :
                wizardStep === 1 ? 'Cuéntanos un poco sobre ti' : 'Selecciona tu objetivo principal'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-3xl border border-slate-100 dark:border-white/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

            {/* WIZARD STEP 0: LOGIN / REGISTER */}
            {wizardStep === 0 && (
              <>
                <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl mb-12">
                  <button onClick={() => setIsLogin(true)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white dark:bg-slate-700 text-primary shadow-xl' : 'text-slate-400'}`}>Iniciar Sesión</button>
                  <button onClick={() => setIsLogin(false)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white dark:bg-slate-700 text-primary shadow-xl' : 'text-slate-400'}`}>Registrarse</button>
                </div>

                <div id="google-btn-container" className="mb-8 w-full"></div>

                <div className="relative mb-8 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                  </div>
                  <div className="relative inline-flex bg-white dark:bg-slate-900 px-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">O usando correo</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in">
                  {!isLogin && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                      <label htmlFor="name-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-6 block">Nombre Completo</label>
                      <input id="name-input" name="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border-none text-base focus:ring-2 focus:ring-primary/20 transition-all font-bold" placeholder="Tu Nombre Completo" required={!isLogin} autoComplete="name" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <label htmlFor="email-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-6 block">Correo Electrónico</label>
                    <input id="email-input" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border-none text-base focus:ring-2 focus:ring-primary/20 transition-all font-bold" placeholder="tu@email.com" required autoComplete="email" />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="password-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-6 block">Contraseña</label>
                    <div className="relative">
                      <input id="password-input" name="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border-none text-base focus:ring-2 focus:ring-primary/20 transition-all font-bold pr-16" placeholder="••••••••" required autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Requisitos de Seguridad</p>
                      <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide ${password.length >= 8 ? 'text-green-500' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-xs">{password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                        Mínimo 8 caracteres
                      </div>
                      <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-xs">{/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        Una mayúscula
                      </div>
                      <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide ${/[0-9]/.test(password) ? 'text-green-500' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-xs">{/[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        Un número
                      </div>
                    </div>
                  )}

                  <button disabled={loading} className="w-full bg-slate-900 text-white font-black py-7 rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all mt-6 text-[11px] uppercase tracking-[0.4em] disabled:opacity-50">
                    {loading ? 'Procesando...' : (isLogin ? 'Entrar al Panel' : 'Continuar Registro')}
                  </button>
                </form>
              </>
            )}

            {/* WIZARD STEP 1: ADDITIONAL INFO */}
            {wizardStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                <div className="space-y-3">
                  <label htmlFor="age-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-6 block">Edad</label>
                  <input id="age-input" name="age" type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border-none text-base focus:ring-2 focus:ring-primary/20 transition-all font-bold" placeholder="Ej. 35" min="18" required />
                </div>
                <button onClick={handleSubmit} disabled={loading} className="w-full bg-slate-900 text-white font-black py-7 rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all mt-6 text-[11px] uppercase tracking-[0.4em]">
                  {loading ? 'Guardando...' : 'Siguiente Paso'}
                </button>
              </div>
            )}

            {/* WIZARD STEP 2: INTENT */}
            {wizardStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                <button
                  onClick={() => { setIntent('sale'); navigate('/client-portal', { state: { openForm: 'sale' } }); }}
                  className={`w-full p-6 text-left border-2 rounded-[2.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-6 ${intent === 'sale' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5 hover:border-primary/50'}`}
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-3xl">monetization_on</span>
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white text-lg">Quiero Vender</h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tengo una propiedad</p>
                  </div>
                </button>

                <button
                  onClick={() => { setIntent('rent'); navigate('/client-portal', { state: { openForm: 'rent' } }); }}
                  className={`w-full p-6 text-left border-2 rounded-[2.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-6 ${intent === 'rent' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5 hover:border-primary/50'}`}
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-3xl">key</span>
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white text-lg">Quiero Rentar</h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Busco inquilinos</p>
                  </div>
                </button>
              </div>
            )}

            {error && (
              <div className="mt-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-3xl animate-in shake">
                <p className="text-[9px] text-red-600 dark:text-red-400 font-black text-center uppercase tracking-widest leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
