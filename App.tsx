
import React, { useState, useEffect } from 'react';
import ScrollToTop from './components/ScrollToTop';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Property, TimelineEvent, User } from './types';
import { ALL_PROPERTIES, INITIAL_TIMELINE } from './constants';
import Navigation from './components/Navigation';
import PublicHome from './screens/PublicHome';
import PublicListings from './screens/PublicListings';
import BlogPage from './screens/BlogPage';
import LoginPage from './screens/LoginPage';
import Dashboard from './screens/Dashboard';
import Timeline from './screens/Timeline';
import ChatAdvisor from './screens/ChatAdvisor';
import AppraisalForm from './screens/AppraisalForm';
import BlogPostDetails from './screens/BlogPostDetails';
import PropertyRegister from './screens/PropertyRegister';
import PropertyDetails from './screens/PropertyDetails';
import AdminDashboard from './screens/AdminDashboard';
import PropertySubmission from './screens/PropertySubmission';
import PropertySubmissionSale from './screens/PropertySubmissionSale';
import GeneralApplication from './screens/GeneralApplication';
import ClientPortal from './screens/ClientPortal';
import RentPropertyLanding from './screens/RentPropertyLanding';
import AdvisorFicha from './screens/AdvisorFicha';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { supabase } from './services/supabaseClient';
import { captureReferral, captureLeadId } from './utils/referralTracking';

// Wrapper component to handle dynamic property lookup
const PropertyDetailsWrapper: React.FC<{ properties: Property[] }> = ({ properties }) => {
  const { id } = useParams<{ id: string }>();
  const property = properties.find(p => p.id === id);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Propiedad no encontrada</h1>
        <p className="text-slate-500 mb-8">La propiedad que buscas no existe o ha sido retirada.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">Volver al Inicio</button>
      </div>
    );
  }

  return <PropertyDetails property={property} />;
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
};

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(INITIAL_TIMELINE);
  const [loadingData, setLoadingData] = useState(true);

  // Capture referral from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const leadId = params.get('leadId');

    if (ref) {
      captureReferral(ref);
    }
    if (leadId) {
      captureLeadId(leadId);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // Guard for missing supabase
      if (!supabase) {
        setLoadingData(false);
        return;
      }

      // 1. Fetch Properties
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('*');

      if (propsError) console.error('Error fetching properties:', propsError);

      let publicProps: Property[] = [];
      if (propsData && propsData.length > 0) {
        publicProps = propsData.map((p: any) => ({
          ...p,
          ownerId: p.owner_id,
          tenantId: p.tenant_id,
          mainImage: p.main_image,
          images: p.images || [],
          isFeatured: p.is_featured || (p.specs && p.specs.isFeatured) || false,
          specs: {
            beds: 0, baths: 0, area: 0, landArea: 0, levels: 1, age: 0,
            ...(p.specs || {})
          },
          features: p.features || [],
          services: p.services || [],
          amenities: p.amenities || [],
          spaces: p.spaces || [],
          additionals: p.additionals || [],
          documents: [],
          status: p.status || 'available',
          type: p.type || 'sale',
          maintenanceFee: p.maintenance_fee || 0,
          accessCode: p.ref || '0000',
          status_reason: p.status_reason
        }));
      } else {
        publicProps = ALL_PROPERTIES;
      }

      // 2. Fetch All Profiles (for Admin/Staff)
      if (user?.role === 'admin' || user?.role === 'asesor' || user?.role === 'marketing') {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) console.error('Error fetching profiles:', profilesError);

        if (profilesData) {
          const mappedUsers: User[] = profilesData.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.full_name,
            role: u.role,
            propertyCode: u.property_code,
            depositDay: u.deposit_day,
            monthlyAmount: u.monthly_amount,
            contractEndDate: u.contract_end_date,
            contractStartDate: u.contract_start_date,
            propertyTitle: u.property_title,
            propertyAddress: u.property_address,
            linkedName: u.linked_name,
            phoneContact: u.phone_contact,
            password: u.password,
            vouchers: u.vouchers || [],
            sold_count: u.sold_count || 0,
            rented_count: u.rented_count || 0
          }));
          setUsers(mappedUsers);
        }
      }

      // 3. Fetch Internal Properties
      const { data: internalData, error: internalError } = await supabase
        .from('internal_properties')
        .select('*');

      if (internalError) console.error('Error fetching internal properties:', internalError);

      // 4. Fetch Property Submissions (Rental/Complex Flows)
      const { data: submissionData, error: subError } = await supabase
        .from('property_submissions')
        .select('*')
        .in('status', ['pending', 'approved']);

      if (subError) console.error('Error fetching submissions:', subError);

      const mappedSubmissions: Property[] = (submissionData || []).map((s: any) => {
        const fd = s.form_data || {};
        return {
          id: s.id,
          tokkoId: undefined,
          ref: fd.ref || `SUB-${s.id.substring(0, 6).toUpperCase()}`,
          title: fd.title || fd.titulo || `${s.type === 'sale' ? 'Venta' : 'Renta'} en Revisión`,
          address: fd.address || fd.direccion || 'Dirección pendiente',
          status: 'pending',
          price: fd.price || fd.precio || 0,
          type: s.type || 'rent',
          maintenanceFee: fd.maintenance_fee || 0,
          specs: {
            beds: fd.rooms || fd.recamaras || 0,
            baths: fd.bathrooms || 0,
            area: fd.construction_area || 0,
            landArea: fd.land_area || 0,
            levels: fd.levels || 1,
            age: 0
          },
          description: fd.description || '',
          images: [],
          mainImage: fd.main_image_url || fd.foto_principal,
          ownerId: s.owner_id,
          referred_by: s.referred_by,
          is_submission: true, // Flag for admin actions
          created_at: s.created_at
        };
      });

      const mappedInternal: Property[] = (internalData || []).map((p: any) => ({
        ...p,
        ownerId: p.owner_id,
        tenantId: p.tenant_id,
        mainImage: p.main_image || p.main_image_url || p.mainImage,
        images: p.images || [],
        specs: { beds: 0, baths: 0, area: 0, landArea: 0, levels: 1, age: 0 },
        features: [],
        services: [],
        amenities: [],
        documents: [],
        status: p.status || 'rented',
        type: 'rent',
        maintenanceFee: 0,
        accessCode: p.ref || '0000',
        isInternal: true
      }));

      setProperties([...publicProps, ...mappedInternal, ...mappedSubmissions]);
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  const handlePropertyUpdate = (updatedProp: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
  };

  const handleAddProperty = (newProp: Property) => {
    setProperties(prev => [newProp, ...prev]);
  };

  const handlePropertyDelete = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const handleUsersUpdate = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
  };

  const userProperty = properties.find(p => {
    // Priority 1: Direct property_id link (Public only)
    if (user?.propertyId && p.id === user.propertyId) {
      return true;
    }
    // Priority 2: Match property_code with property ref (Works for both)
    if (user?.propertyCode && p.ref === user.propertyCode) {
      return true;
    }
    // Priority 3: Check ownership/tenancy (Works for both)
    return p.ownerId === user?.id || p.tenantId === user?.id;
  }) || null; // Removed fallback to properties[0] to avoid showing incorrect properties to new users

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mb-8 border border-red-500/50">
          <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Configuración Pendiente</h1>
        <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
          No se detectaron las variables de entorno de Supabase. Esto sucede usualmente cuando el proyecto se publica en Vercel pero no se han configurado los secretos.
        </p>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 text-left w-full max-w-md mb-8">
          <p className="text-[10px] font-black uppercase text-primary mb-2">Pasos para corregir:</p>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
            <li>Ve a tu proyecto en el dashboard de <span className="font-bold text-white">Vercel</span>.</li>
            <li>Entra en <span className="font-bold text-white">Settings</span> &gt; <span className="font-bold text-white">Environment Variables</span>.</li>
            <li>Agrega <code className="bg-slate-700 px-1 rounded text-primary">VITE_SUPABASE_URL</code></li>
            <li>Agrega <code className="bg-slate-700 px-1 rounded text-primary">VITE_SUPABASE_ANON_KEY</code></li>
            <li>Haz un nuevo <span className="font-bold text-white">Redeploy</span>.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando...</p>
      </div>
    );
  }

  const location = useLocation();
  const isLandingPage = location.pathname.includes('/landing/');
  const isSubmission = location.pathname.startsWith('/vender') || location.pathname.startsWith('/rentar');
  const isAdvisorProfile = location.pathname.startsWith('/asesor/');

  return (
    <div className={`min-h-screen bg-background-light dark:bg-background-dark ${(isLandingPage || isSubmission || isAdvisorProfile) ? '' : 'pb-32 md:pb-0'}`}>
      <Routes>
        <Route path="/" element={<PublicHome properties={properties} />} />
        <Route path="/listings" element={<PublicListings properties={properties} />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostDetails />} />
        <Route path="/appraise" element={<AppraisalForm />} />
        <Route path="/register-property" element={<PropertyRegister onComplete={handleAddProperty} />} />

        {/* New Flow: Direct Access for Guests */}
        <Route path="/vender" element={<PropertySubmission mode="sale" />} />
        <Route path="/rentar" element={<PropertySubmission mode="rent" />} />

        {/* New General Visit Request Route */}
        <Route path="/agenda-abierta" element={<GeneralApplication />} />

        {/* Landing Pages */}
        <Route path="/landing/renta-tu-propiedad" element={<RentPropertyLanding />} />

        {/* Public Advisor Profile */}
        <Route path="/asesor/:id" element={<AdvisorFicha />} />

        <Route path="/client-portal" element={<ClientPortal />} />

        <Route path="/propiedad/:id" element={<PropertyDetailsWrapper properties={properties} />} />

        <Route path="/login" element={
          user ? (
            (user.role === 'admin' || user.role === 'marketing' || user.role === 'asesor') ? <Navigate to="/admin" /> :
              <Navigate to="/client-portal" />
          ) : <LoginPage />
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            {(user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'asesor') ? (
              <Navigate to="/admin" />
            ) : userProperty ? (
              <Dashboard user={user!} property={userProperty!} />
            ) : (
              <Navigate to="/client-portal" />
            )}
          </ProtectedRoute>
        } />

        <Route path="/timeline" element={
          <ProtectedRoute>
            <Timeline property={userProperty} timeline={timeline} setTimeline={setTimeline} canEdit={user?.role === 'admin'} />
          </ProtectedRoute>
        } />


        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'marketing', 'asesor']}>
            <AdminDashboard
              properties={properties}
              onPropertyUpdate={handlePropertyUpdate}
              onAddProperty={handleAddProperty}
              onDeleteProperty={handlePropertyDelete}
              users={users}
              onUsersUpdate={handleUsersUpdate}
              currentUser={user}
            />
          </ProtectedRoute>
        } />
      </Routes>
      {(!isLandingPage && !isSubmission && !isAdvisorProfile) && <Navigation user={user} onLogout={signOut} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <ScrollToTop />
            <AppContent />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
