import React, { useState, useEffect, useRef } from 'react';
import RecruitmentDetailsModal from '../components/RecruitmentDetailsModal';
import { useNavigate } from 'react-router-dom';
import { Property, PropertyStatus, User, UserRole, PaymentProof, TimelineEvent, Appraisal, Notification, RentalApplication, Appointment, BlogPost } from '../types';
import { supabase } from '../services/supabaseClient';
import { tokkoService } from '../services/tokkoService';
import { pdf } from '@react-pdf/renderer';
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import { useToast } from '../context/ToastContext';
import Timeline from './Timeline';
import CalendarView from '../components/CalendarView';
import BlogEditor from '../components/BlogEditor';

import TeamManagement from '../components/TeamManagement';

interface AdminDashboardProps {
  properties: Property[];
  onPropertyUpdate: (p: Property) => void;
  onAddProperty: (p: Property) => void;
  onDeleteProperty: (id: string) => void;
  users: User[];
  onUsersUpdate: (u: User[]) => void;
  currentUser?: User | null;
}

interface InternalProperty {
  id: string;
  ref: string;
  title: string;
  address: string;
  owner_id?: string;
  tenant_id?: string;
  status: string;
  created_at: string;
}

// Feature Lists Constants
const AVAILABLE_SERVICES = ['Agua', 'Luz', 'Gas', 'Drenaje', 'Internet', 'Teléfono', 'Cable', 'Cisterna', 'Calentador Solar', 'Vigilancia'];
const AVAILABLE_SPACES = ['Cocina Integral', 'Sala', 'Comedor', 'Antecomedor', 'Jardín', 'Patio', 'Terraza', 'Balcón', 'Estudio', 'Sala TV', 'Bodega', 'Cuarto Servicio', 'Vestidor'];
const AVAILABLE_AMENITIES = ['Alberca', 'Gimnasio', 'Salón de Fiestas', 'Area de Juegos', 'Asador', 'Cancha Tenis', 'Cancha Padel', 'Roof Garden', 'Elevador'];
const AVAILABLE_ADDITIONALS = ['Aire Acondicionado', 'Alarma', 'Portón Eléctrico', 'Seguridad 24h', 'Circuito Cerrado', 'Amueblado', 'Mascotas Permitidas'];

interface ConfirmAction {
  type: 'status' | 'delete' | 'edit' | 'delete_user' | 'delete_proof' | 'delete_report' | 'delete_appraisal' | 'delete_rental_app' | 'delete_blog_post';
  id: string;
  metadata?: any;
  newStatus?: PropertyStatus;
  title: string;
  message: string;
  selectedReason?: string;
  showReasons?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ properties, onPropertyUpdate, onAddProperty, onDeleteProperty, users, onUsersUpdate, currentUser: propCurrentUser }) => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = React.useState(false);
  const [rescheduleStep, setRescheduleStep] = React.useState(1); // 1: Warning, 2: DatePicker
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = React.useState<Appointment | null>(null);
  const [rescheduleCoordinationConfirmed, setRescheduleCoordinationConfirmed] = React.useState(false);
  const [newRescheduleDate, setNewRescheduleDate] = React.useState('');
  const [newRescheduleTime, setNewRescheduleTime] = React.useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'client-panels' | 'reports' | 'comprobantes' | 'appraisals' | 'rental-apps' | 'appointments' | 'users-list' | 'blog' | 'recruitments' | 'signed-docs' | 'leads-crm' | 'team' | 'landing-pages'>('inventory');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'property' | 'tenant' | 'owner'>('all');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loadingAppraisals, setLoadingAppraisals] = useState(false);
  const [rentalApps, setRentalApps] = useState<RentalApplication[]>([]);
  const [internalProperties, setInternalProperties] = useState<InternalProperty[]>([]);
  const [loadingRentalApps, setLoadingRentalApps] = useState(false);
  const [rentAppsFilter, setRentAppsFilter] = useState<'all' | 'rent' | 'sale'>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [blogFilter, setBlogFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [recruitments, setRecruitments] = useState<any[]>([]);
  const [loadingRecruitments, setLoadingRecruitments] = useState(false);
  const [selectedRecruitment, setSelectedRecruitment] = useState<any | null>(null);
  const [recruitmentFilter, setRecruitmentFilter] = useState<'all' | 'pending' | 'draft' | 'approved' | 'rejected' | 'changes_requested'>('all');

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedRentalApp, setSelectedRentalApp] = useState<RentalApplication | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    date: '',
    time: ''
  });
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [blogSearchTerm, setBlogSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(propCurrentUser || null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(propCurrentUser?.role || null);

  useEffect(() => {
    // Determine Role (either from prop or fetch)
    const determineUser = async () => {
      let role = propCurrentUser?.role;

      if (!propCurrentUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = users.find(u => u.id === user.id);
          if (profile) {
            setCurrentUser(profile);
            role = profile.role;
          }
        }
      }

      if (role) {
        setCurrentUserRole(role);
        // Enforce Role-Based Access Control
        if (role === 'marketing' && activeTab !== 'blog') {
          setActiveTab('blog');
        } else if (role === 'asesor' && !['appointments', 'appraisals'].includes(activeTab)) {
          setActiveTab('appointments');
        }
      }
    };

    determineUser();
  }, [users, activeTab, propCurrentUser]);

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Initial State for New Property
  const [formProperty, setFormProperty] = useState<Partial<Property>>({
    status: PropertyStatus.AVAILABLE,
    type: 'sale', // Default
    ref: '',
    title: '',
    price: 0,
    address: '',
    description: '',
    contractEndDate: '', // For rent
    specs: {
      beds: 0, baths: 0, halfBaths: 0, parking: 0,
      area: 0, landArea: 0, age: 0, levels: 1, condition: 'good'
    },
    mainImage: undefined,
    images: [],
    services: [],
    spaces: [],
    amenities: [],
    additionals: [],
    documents: []
  });

  // Signed Documents State
  const [signedDocs, setSignedDocs] = useState<any[]>([]);
  const [allSignedDocs, setAllSignedDocs] = useState<any[]>([]);
  const [loadingAllSignedDocs, setLoadingAllSignedDocs] = useState(false);
  const [selectedFolderPropertyId, setSelectedFolderPropertyId] = useState<string | null>(null);

  // State for Payment Proofs
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [proofsFilter, setProofsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [proofsSearch, setProofsSearch] = useState('');
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [leadsCount, setLeadsCount] = useState(0);

  // Approval Progress State
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [approvalStep, setApprovalStep] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'active' | 'reserved' | 'rented' | 'paused'>('all');
  const [inventorySearch, setInventorySearch] = useState('');


  // State for Timeline editing
  const [editingTimeline, setEditingTimeline] = useState<TimelineEvent[]>([]);

  // Fetch Logic for Proofs (called when tab changes)
  const fetchPaymentProofs = async () => {
    setLoadingProofs(true);
    try {
      // 1. Fetch Proofs
      const { data: proofsData, error: proofsError } = await supabase
        .from('payment_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      if (proofsError) throw proofsError;

      if (!proofsData || proofsData.length === 0) {
        setPaymentProofs([]);
        return;
      }

      // 2. Fetch Profiles for these proofs to avoid join errors
      const userIds = [...new Set(proofsData.map(p => p.user_id).filter(id => id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // 3. Fetch Properties for these proofs
      const propIds = [...new Set(proofsData.map(p => p.property_id).filter(id => id))];
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, ref')
        .in('id', propIds);

      // 3.5 Fetch Internal Properties
      const intPropIds = [...new Set(proofsData.map(p => p.internal_property_id).filter(id => id))];
      const { data: intPropsData } = await supabase
        .from('internal_properties')
        .select('id, ref')
        .in('id', intPropIds);

      const mapped: PaymentProof[] = proofsData.map((item: any) => {
        const profile = profilesData?.find(p => p.id === item.user_id);
        const property = propsData?.find(p => p.id === item.property_id);
        const internalProperty = intPropsData?.find(p => p.id === item.internal_property_id);

        return {
          id: item.id,
          userId: item.user_id,
          propertyId: item.property_id,
          monthYear: item.month_year,
          amount: item.amount,
          proofUrl: item.proof_url,
          status: item.status,
          createdAt: item.created_at,
          userName: profile?.full_name || 'Desconocido',
          propertyRef: property?.ref || internalProperty?.ref || 'N/A',
          paymentType: item.payment_type
        };
      });

      // 4. Sort: Primary by Property Code (MAG-XXX), Secondary by Date (Newest first)
      const sorted = mapped.sort((a, b) => {
        const refA = a.propertyRef || '';
        const refB = b.propertyRef || '';
        if (refA !== refB) return refA.localeCompare(refB);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // 5. Filter manual payments
      const filtered = sorted.filter(p => p.proofUrl !== 'manual_approval_by_admin');

      setPaymentProofs(filtered);

    } catch (err) {
      console.error('Fetch Proofs Error:', err);
      error('Error al cargar comprobantes');
    } finally {
      setLoadingProofs(false);
    }
  };

  const handleCalendarEventClick = (appt: Appointment) => {
    // Try to find a rental application linked to this appointment
    // Strategy: Match by email or matching date/time/propertyRef if stored
    const matchingApp = rentalApps.find(app =>
      (app.email === appt.client_email) &&
      app.appointment_date === new Date(appt.start_time).toISOString().split('T')[0]
    );

    if (matchingApp) {
      setSelectedRentalApp(matchingApp);
    } else {
      // If no rental app found, show generic info or the manual form pre-filled (read-only style)?
      // For now, let's just show a toast or open the manual form to edit.
      // The user requested "abra el modal de la solicitud". If none exists, maybe fallback to edit appointment.
      setAppointmentForm({
        title: appt.title,
        clientName: appt.client_name || '',
        clientPhone: appt.client_phone || '',
        clientEmail: appt.client_email || '',
        date: new Date(appt.start_time).toISOString().split('T')[0],
        time: new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      // We'd need to store the editing ID to update instead of create.
      // For simplicity in this iteration:
      setSelectedRentalApp(null); // Ensure closed
      // Just show success/info for now if not found, or maybe just console log.
      // User requirement: "que al presionarle ... abra el modal de la solicitud"
      if (!matchingApp) {
        error('No se encontró una solicitud vinculada a esta cita.');
      }
    }
  };

  // Logic to view Timeline
  const fetchTimeline = async (propId: string) => {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('property_id', propId)
      .order('date', { ascending: false });  // FIXED: Use 'date' column

    if (data) {
      setEditingTimeline(data.map(d => ({
        id: d.id,
        propertyId: d.property_id,
        title: d.title,
        description: d.description,
        date: d.date,  // FIXED: Use 'date' column
        status: d.status
      })));
    } else {
      setEditingTimeline([]);
    }
  };
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: Notification[] = (data || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        link: item.link,
        isRead: item.is_read,
        createdAt: item.created_at
      }));

      setNotifications(mapped);
    } catch (err: any) {
      console.error('Fetch Notifications Error:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleRescheduleClick = (appt: Appointment) => {
    setSelectedRescheduleAppt(appt);
    setRescheduleStep(1);
    setRescheduleCoordinationConfirmed(false);
    setNewRescheduleDate('');
    setNewRescheduleTime('');
    setShowRescheduleModal(true);
  };

  const submitReschedule = async () => {
    if (!selectedRescheduleAppt || !newRescheduleDate || !newRescheduleTime) return;

    try {
      const newStart = `${newRescheduleDate}T${newRescheduleTime}`;
      // Determine if it's a rental app or manual appointment based on ID format or check
      // Ideally we check if it exists in rental_applications table

      let error = null;

      // Attempt update on rental_applications first (assuming UUID is standard)
      const { error: rentalError, data: rentalData } = await supabase
        .from('rental_applications')
        .update({
          appointment_date: newRescheduleDate,
          appointment_time: newRescheduleTime,
          status: 'scheduled' // Reset to scheduled if confirmed? Or keep status? Let's assume re-scheduled is 'scheduled'
        })
        .eq('id', selectedRescheduleAppt.id)
        .select();

      // If no row updated, try manual appointments table
      if (!rentalData || rentalData.length === 0) {
        const { error: apptError } = await supabase
          .from('appointments')
          .update({ start_time: newStart }) // For manual appointments
          .eq('id', selectedRescheduleAppt.id);
        if (apptError) error = apptError;
      } else if (rentalError) {
        error = rentalError;
      }

      if (error) throw error;

      success('Cita reagendada correctamente');
      setShowRescheduleModal(false);
      // Refresh data
      fetchRentalApps();
      fetchAppointments();

    } catch (err: any) {
      error('Error al reagendar: ' + err.message);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (err) throw err;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err: any) {
      console.error('Mark Read Error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error: err } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (err) throw err;
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('Mark All Read Error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload: any) => {
        const newItem: Notification = {
          id: payload.new.id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          link: payload.new.link,
          isRead: payload.new.is_read,
          createdAt: payload.new.created_at
        };
        setNotifications(prev => [newItem, ...prev]);
        success(newItem.title);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'property_submissions'
      }, (payload: any) => {
        console.log('New recruitment received:', payload);
        success('¡Nueva solicitud de reclutamiento recibida!');
        fetchRecruitments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch initial leads count
  useEffect(() => {
    const getInitialLeads = async () => {
      try {
        const leads = await tokkoService.fetchLeads(100);
        setLeadsCount(leads.length);
      } catch (err) {
        console.error('Error fetching initial leads for badge:', err);
      }
    };
    getInitialLeads();
  }, []);

  const fetchAppraisals = async () => {
    setLoadingAppraisals(true);
    try {
      const { data, error: err } = await supabase
        .from('appraisals')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: Appraisal[] = (data || []).map((item: any) => ({
        id: item.id,
        firstName: item.first_name,
        lastName1: item.last_name_1,
        lastName2: item.last_name_2,
        propertyType: item.property_type,
        location: item.location,
        constArea: item.const_area,
        landArea: item.land_area,
        beds: item.beds,
        baths: item.baths,
        age: item.age,
        furnishing: item.furnishing,
        amenities: item.amenities || [],
        services: item.services || [],
        status: item.status,
        createdAt: item.created_at
      }));

      setAppraisals(mapped);
    } catch (err: any) {
      console.error('Fetch Appraisals Error:', err);
      error('Error al cargar avalúos');
    } finally {
      setLoadingAppraisals(false);
    }
  };

  const fetchRentalApps = async () => {
    setLoadingRentalApps(true);
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentalApps(data || []);
    } catch (err: any) {
      console.error('Error fetching rental apps:', err);
      error(`Error: ${err.message}`);
    } finally {
      setLoadingRentalApps(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      error(`Error: ${err.message}`);
    } finally {
      setLoadingAppointments(true); // Should be false, fixing below
      setLoadingAppointments(false);
    }
  };

  const fetchAllSignedDocuments = async () => {
    setLoadingAllSignedDocs(true);
    try {
      console.log("Starting fetchAllSignedDocuments...");

      // Debug: Check current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current User for Signed Docs Fetch:", user?.id);

      const { data, error: err } = await supabase
        .from('signed_documents')
        .select(`
        *,
        properties (
          id,
          ref,
          title
        )
      `)
        .order('created_at', { ascending: false });

      if (err) {
        console.error("Supabase Error fetching signed_documents:", err);
        throw err;
      }

      console.log("Fetched Signed Documents:", data);
      console.log("Count:", data?.length);

      setAllSignedDocs(data || []);
    } catch (err: any) {
      console.error('Error fetching signed docs EXCEPTION:', err);
      // Not using error() here to avoid spamming if called on background, 
      // but based on context it's okay.
    } finally {
      setLoadingAllSignedDocs(false);
    }
  };

  const fetchRecruitments = async () => {
    setLoadingRecruitments(true);
    try {
      const { data, error: err } = await supabase
        .from('property_submissions')
        .select(`
          *,
          profiles:owner_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setRecruitments(data || []);
    } catch (err: any) {
      console.error('Error fetching recruitments:', err);
      error(`Error: ${err.message}`);
    } finally {
      setLoadingRecruitments(false);
    }
  };

  const updateRecruitmentStatus = async (id: string, newStatus: string, reason: string = '', feedback: string = '') => {
    try {
      if (newStatus === 'approved') {
        setIsProcessingApproval(true);
        setApprovalStep('Iniciando proceso de aprobación...');
      }

      const payload: any = { status: newStatus };
      if (newStatus === 'rejected') payload.rejection_reason = reason;
      if (newStatus === 'changes_requested') payload.feedback = feedback;

      // 1. Update the submission status
      if (newStatus === 'approved') setApprovalStep('Actualizando estado de solicitud...');
      const { error: err } = await supabase
        .from('property_submissions')
        .update(payload)
        .eq('id', id);

      if (err) throw err;

      // 2. If approved, update notification and document linking
      if (newStatus === 'approved') {
        const sub = recruitments.find(r => r.id === id);
        if (sub) {
          const fd = sub.form_data;

          setApprovalStep('Enviando notificación al propietario...');
          const { error: notifError } = await supabase.from('notifications').insert([{
            user_id: sub.owner_id,
            title: '¡Propiedad Aprobada!',
            message: `Tu propiedad "${fd.title || 'Propiedad'}" ha sido aprobada. La estamos subiendo a los portales globales (Tokko, Inmuebles24, etc.). Te avisaremos en cuanto esté pública.`,
            type: 'success'
          }]);

          if (notifError) console.error("Notification Error:", notifError);

          // 3. REGISTER DOCUMENTS LINKED TO SUBMISSION (Since no Property exists yet)
          try {
            setApprovalStep('Vinculando documentos legales...');

            // === DOCUMENT 1: RECRUITMENT SHEET ===
            await supabase.from('signed_documents').insert([{
              submission_id: id, // Link to submission instead of property
              user_id: sub.owner_id,
              document_type: 'recruitment',
              pdf_url: fd.unsigned_recruitment_url || null,
              status: sub.is_signed ? 'signed' : 'pending',
              signed_at: sub.is_signed ? (fd.is_signed_at || new Date().toISOString()) : null
            }]);

            // === DOCUMENT 2: KEYS RECEIPT ===
            if (fd.keys_provided) {
              await supabase.from('signed_documents').insert([{
                submission_id: id,
                user_id: sub.owner_id,
                document_type: 'keys',
                pdf_url: fd.unsigned_keys_url || null,
                status: sub.is_signed ? 'signed' : 'pending',
                signed_at: sub.is_signed ? (fd.is_signed_at || new Date().toISOString()) : null
              }]);
            }

            setApprovalStep('Finalizando...');
            fetchAllSignedDocuments();
            success('Solicitud aprobada correctamente. Ahora puedes subirla a Tokko y vincularla.');
          } catch (docGenError: any) {
            console.error("Error linking documents:", docGenError);
            error(`Error al vincular documentos: ${docGenError.message}`);
          }
        }
      }
      else if (newStatus !== 'approved') {
        success('Estado de reclutamiento actualizado');
      }

      setRecruitments(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r));
      setSelectedRecruitment(null);
    } catch (err: any) {
      error('Error al actualizar reclutamiento: ' + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const updateRecruitmentData = async (id: string, updates: any) => {
    try {
      const { error: err } = await supabase
        .from('property_submissions')
        .update({
          form_data: updates
        })
        .eq('id', id);

      if (err) throw err;

      setRecruitments(prev => prev.map(r => r.id === id ? { ...r, form_data: updates } : r));
      success('Datos de la solicitud actualizados correctamente');

      // Update the selected recruitment object as well to reflect changes immediately in the modal
      if (selectedRecruitment && selectedRecruitment.id === id) {
        setSelectedRecruitment(prev => ({ ...prev, form_data: updates }));
      }

    } catch (err: any) {
      error('Error al actualizar datos: ' + err.message);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(`${appointmentForm.date}T${appointmentForm.time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const { error: submitErr } = await supabase
        .from('appointments')
        .insert([{
          title: appointmentForm.title,
          client_name: appointmentForm.clientName,
          client_phone: appointmentForm.clientPhone,
          client_email: appointmentForm.clientEmail,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'scheduled'
        }]);

      if (submitErr) throw submitErr;

      success('Cita agendada correctamente');
      setShowAppointmentForm(false);
      fetchAppointments();
      setAppointmentForm({ title: '', clientName: '', clientPhone: '', clientEmail: '', date: '', time: '' });
    } catch (err: any) {
      error(`Error: ${err.message}`);
    }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    try {
      const { error: err } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (err) throw err;

      setAppointments(prev => prev.map(appt => appt.id === id ? { ...appt, status: newStatus } : appt));
      success(newStatus === 'confirmed' ? 'Cita confirmada' : 'Cita cancelada');
    } catch (err: any) {
      error('Error al actualizar cita: ' + err.message);
    }
  };

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'owner' as UserRole,
    propertyId: '',
    propertyCode: '',
    depositDay: '',
    monthlyAmount: 0,
    contractEndDate: '',
    contractStartDate: '',
    linkedName: '',
    phoneContact: '',
    propertyTitle: '',
    propertyAddress: '',
    manualPayments: [] as string[] // Array of 'YYYY-MM' strings
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // State for editing
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const openEditModal = (property: Property) => {
    setEditingPropertyId(property.id);
    setFormProperty({
      ...property,
      status: property.status,
      type: property.type,
      ref: property.ref || '',
      title: property.title,
      price: property.price,
      address: property.address,
      description: property.description,
      // Ensure specs are fully populated
      specs: {
        beds: 0, baths: 0, halfBaths: 0, parking: 0,
        area: 0, landArea: 0, age: 0, levels: 1, condition: 'good',
        ...property.specs
      },
      mainImage: property.mainImage,
      images: property.images || [],
      // Ensure arrays are populated
      services: property.services || [],
      spaces: property.spaces || [],
      amenities: property.amenities || [],
      additionals: property.additionals || []
    });
    fetchTimeline(property.id);

    // Fetch Signed Documents
    supabase.from('signed_documents')
      .select('*')
      .eq('property_id', property.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSignedDocs(data);
      });

    setShowPropertyForm(true);
  };

  const openCreateModal = () => {
    setEditingPropertyId(null);
    setFormProperty({
      status: PropertyStatus.AVAILABLE,
      type: 'sale',
      ref: '',
      title: '',
      price: 0,
      address: '',
      description: '',
      contractEndDate: '',
      specs: {
        beds: 0, baths: 0, halfBaths: 0, parking: 0,
        area: 0, landArea: 0, age: 0, levels: 1, condition: 'good'
      },
      images: [],
      services: [],
      spaces: [],
      amenities: [],
      additionals: [],
      documents: []
    });
    setShowPropertyForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isMain) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormProperty(prev => ({ ...prev, mainImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormProperty(prev => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const toggleFeature = (category: 'services' | 'spaces' | 'amenities' | 'additionals', feature: string) => {
    setFormProperty(prev => {
      const list = prev[category] || [];
      if (list.includes(feature)) {
        return { ...prev, [category]: list.filter(f => f !== feature) };
      } else {
        return { ...prev, [category]: [...list, feature] };
      }
    });
  };


  const logTimelineEvent = async (propId: string, title: string, description: string = '', status: 'completed' | 'pending' | 'in-progress' = 'completed') => {
    try {
      const { error: err } = await supabase
        .from('timeline_events')
        .insert({
          property_id: propId,
          title,
          description,
          date: new Date().toISOString(),  // FIXED: Use 'date' column
          status
        });

      if (err) throw err;
    } catch (e) {
      console.error('Error logging timeline event:', e);
    }
  };

  const handleProofStatus = async (proofId: string, newStatus: 'approved' | 'rejected') => {
    try {
      if (newStatus === 'rejected') {
        const proof = paymentProofs.find(p => p.id === proofId);
        if (!proof) return;

        // 1. Insert into rejected_payments
        const { error: insertError } = await supabase
          .from('rejected_payments')
          .insert({
            user_id: proof.userId,
            property_id: proof.propertyId,
            month_year: proof.monthYear,
            amount: proof.amount,
            proof_url: proof.proofUrl,
            rejection_reason: 'Rechazado por administrador',
            original_payment_proof_id: proof.id
          });

        if (insertError) throw insertError;

        // 2. Delete from payment_proofs
        const { error: deleteError } = await supabase
          .from('payment_proofs')
          .delete()
          .eq('id', proofId);

        if (deleteError) throw deleteError;

        // 3. Update local state - Remove it (so it shows as unpaid in dashboard)
        setPaymentProofs(prev => prev.filter(p => p.id !== proofId));
        success('Comprobante rechazado y archivado correctamente');

      } else {
        // APPROVE LOGIC
        const { error: err } = await supabase
          .from('payment_proofs')
          .update({ status: newStatus })
          .eq('id', proofId);

        if (err) throw err;

        setPaymentProofs(prev => prev.map(p =>
          p.id === proofId ? { ...p, status: newStatus } : p
        ));

        // Automatic Timeline Log for Payment Approval
        if (newStatus === 'approved') {
          const proof = paymentProofs.find(p => p.id === proofId);
          if (proof) {
            await logTimelineEvent(
              proof.propertyId,
              `Pago Aprobado: ${proof.monthYear}`,
              `Monto: $${proof.amount?.toLocaleString()}. Usuario: ${proof.userName}`
            );
          }
        }
        success('Comprobante aprobado correctamente');
      }

      setSelectedProof(null); // Close modal
    } catch (e: any) {
      error('Error al actualizar: ' + e.message);
    }
  };

  const handleAddTimelineEvent = async (event: Omit<TimelineEvent, 'id' | 'status'>) => {
    if (!editingPropertyId) return;

    const { data, error: err } = await supabase
      .from('timeline_events')
      .insert({
        property_id: editingPropertyId,
        title: event.title,
        description: event.description,
        date: event.date,  // FIXED: Use 'date' column
        status: 'completed'
      })
      .select()
      .single();

    if (err) throw err;

    const newEv: TimelineEvent = {
      id: data.id,
      propertyId: data.property_id,
      title: data.title,
      description: data.description,
      date: data.date,  // FIXED: Use 'date' column
      status: data.status
    };

    setEditingTimeline(prev => [newEv, ...prev]);
  };


  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado.");

      const payload = {
        ref: formProperty.ref,
        title: formProperty.title,
        address: formProperty.address,
        price: formProperty.price,
        type: formProperty.type,
        maintenance_fee: 0,
        specs: formProperty.specs,
        description: formProperty.description,
        main_image: formProperty.mainImage,
        images: formProperty.images,
        features: formProperty.features,
        services: formProperty.services,
        amenities: formProperty.amenities,
        spaces: formProperty.spaces,
        additionals: formProperty.additionals,
        owner_id: user.id
      };

      let resultProp: Property;

      if (editingPropertyId) {
        // UPDATE EXISTING PROPERTY
        const { data, error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editingPropertyId)
          .select().single();

        if (error) throw error;

        // Map result
        resultProp = {
          ...data,
          id: data.id,
          mainImage: data.main_image,
          ownerId: data.owner_id,
          tenantId: data.tenant_id,
          maintenanceFee: data.maintenance_fee || 0,
          specs: data.specs || {},
          images: data.images || [],
          services: data.services || [],
          amenities: data.amenities || [],
          spaces: data.spaces || [],
          additionals: data.additionals || [],
          documents: []
        };


        onPropertyUpdate(resultProp);

        // Automatic Timeline Log for Status Change
        if (formProperty.status !== resultProp.status) {
          await logTimelineEvent(resultProp.id, `Estado Actualizado: ${resultProp.status === 'available' ? 'Disponible' : resultProp.status === 'rented' ? 'Rentada' : 'Vendida'}`, `El estado de la propiedad cambió manualmente a ${resultProp.status}.`);
        } else {
          // General update log (optional, maybe too noisy? Let's keep it for significant edits only or just rely on status)
          // await logTimelineEvent(resultProp.id, 'Propiedad Actualizada', 'Se modificaron detalles de la ficha técnica.');
        }

        success('Propiedad actualizada correctamente.');

      } else {
        // CREATE NEW PROPERTY
        const { data, error } = await supabase
          .from('properties')
          .insert({
            status: PropertyStatus.AVAILABLE,
            ...payload
          })
          .select().single();

        if (error) throw error;

        // Map result
        resultProp = {
          ...data,
          id: data.id,
          mainImage: data.main_image,
          ownerId: data.owner_id,
          tenantId: data.tenant_id,
          maintenanceFee: data.maintenance_fee || 0,
          specs: data.specs || {},
          images: data.images || [],
          services: data.services || [],
          amenities: data.amenities || [],
          spaces: data.spaces || [],
          additionals: data.additionals || [],
          documents: []
        };

        // Automatic Timeline Log for Creation
        await logTimelineEvent(resultProp.id, 'Propiedad Registrada', 'Alta inicial de la unidad en el sistema Magno.');

        onAddProperty(resultProp);
        success('Propiedad registrada exitosamente.');
      }

      setShowPropertyForm(false);
    } catch (err: any) {
      console.error("Save Error:", err);
      error(`Error al guardar: ${err.message || 'Error desconocido'}`);
    }
  };

  const updatePropertyStatus = async (id: string, newStatus: PropertyStatus) => {
    const updated = properties.find(p => p.id === id);
    if (!updated) return;

    let statusLabel = '';
    let showReasons = false;
    switch (newStatus) {
      case PropertyStatus.PAUSED:
        statusLabel = 'PAUSAR';
        showReasons = true;
        break;
      case PropertyStatus.AVAILABLE:
        statusLabel = (updated.status === 'paused' && updated.status_reason === 'Inquilino en investigación') ? 'DESAPARTAR' : (updated.status === PropertyStatus.RESERVED ? 'DESAPARTAR' : 'ACTIVAR');
        break;
      case PropertyStatus.RESERVED: statusLabel = 'APARTAR'; break;
      case PropertyStatus.RENTED: statusLabel = 'RENTAR'; break;
    }

    let confirmMsg = `¿Estás seguro de que deseas ${statusLabel} la propiedad "${updated.title}"?`;
    if (newStatus === PropertyStatus.AVAILABLE && (updated.status === PropertyStatus.RESERVED || updated.status_reason === 'Inquilino en investigación')) {
      confirmMsg = `¿Deseas DESAPARTAR esta propiedad y volverla a poner como ACTIVA?`;
    }

    setConfirmAction({
      type: 'status',
      id,
      newStatus,
      title: `${statusLabel} PROPIEDAD`,
      message: confirmMsg,
      showReasons: showReasons,
      selectedReason: showReasons ? 'Inquilino en investigación' : undefined
    });
  };

  const executePropertyStatusUpdate = async (id: string, newStatus: PropertyStatus, reason?: string) => {
    try {
      const { error: err } = await supabase
        .from('properties')
        .update({
          status: newStatus,
          status_reason: reason || (newStatus === PropertyStatus.AVAILABLE ? null : undefined)
        })
        .eq('id', id);

      if (err) throw err;

      const updated = properties.find(p => p.id === id);
      if (updated) {
        onPropertyUpdate({ ...updated, status: newStatus, status_reason: reason || (newStatus === PropertyStatus.AVAILABLE ? undefined : updated.status_reason) });
        success(`Estado de "${updated.title}" actualizado a ${newStatus}`);

        // Special interaction: If RENTED or RESERVED, trigger tenant creation flow
        if (newStatus === PropertyStatus.RENTED || newStatus === PropertyStatus.RESERVED) {
          setShowClientForm(true);
          setEditingUserId(null);
          setClientForm({
            name: '', email: '', password: '', role: 'tenant',
            propertyId: id,
            propertyCode: updated.ref,
            depositDay: '', monthlyAmount: updated.price || 0,
            contractEndDate: '', linkedName: updated.ownerName || '', phoneContact: '',
            propertyTitle: updated.title,
            propertyAddress: updated.address,
            manualPayments: []
          });
        }
      }
    } catch (err: any) {
      console.error("Status Update Error:", err);
      error(`Error al actualizar estado: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const updated = properties.find(p => p.id === id);
    setConfirmAction({
      type: 'delete',
      id,
      title: 'ELIMINAR PROPIEDAD',
      message: `¿Estás seguro de que deseas eliminar la propiedad "${updated?.title || ''}"? Esta acción eliminará permanentemente todos los registros asociados.`
    });
  };

  const executeDeleteProperty = async (id: string) => {
    try {
      // Use RPC for safe, recursive delete
      const { error } = await supabase.rpc('delete_property_by_admin', {
        target_property_id: id
      });

      if (error) throw error;

      onDeleteProperty(id);
      success('Propiedad y datos asociados eliminados correctamente.');
    } catch (err: any) {
      console.error("Delete Error:", err);
      // Detailed error for common FK issues if RPC fails or isn't installed
      const msg = err.message || 'Error desconocido';
      if (msg.includes('function delete_property_by_admin(uuid) does not exist')) {
        error('Error: La función de eliminación no ha sido instalada en Supabase. Por favor, corre el script fix_property_deletion.sql en el SQL Editor.');
      } else {
        error(`Error al eliminar: ${msg}`);
      }
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, id, newStatus, metadata } = confirmAction;
    setConfirmAction(null); // Close modal first for responsiveness

    if (type === 'status' && newStatus) {
      await executePropertyStatusUpdate(id, newStatus, confirmAction.selectedReason);
    } else if (type === 'delete') {
      const isProperty = properties.some(p => p.id === id);
      if (isProperty) await executeDeleteProperty(id);
      else await executeDeleteRecruitment(id);
    } else if (type === 'edit') {
      const prop = properties.find(p => p.id === id);
      if (prop) openEditModal(prop);
    } else if (type === 'delete_user') {
      await executeDeleteUser(id, metadata?.name || 'Usuario', confirmAction.selectedOption === 'purge');
    } else if (type === 'delete_proof') {
      await executeDeleteProof(id);
    } else if (type === 'delete_report') {
      await executeDeleteReport(id);
    } else if (type === 'delete_appraisal') {
      await executeDeleteAppraisal(id);
    } else if (type === 'delete_rental_app') {
      await executeDeleteRentalApp(id);
    } else if (type === 'delete_blog_post') {
      await executeDeleteBlogPost(id);
    }
  };

  const handleDeleteRecruitment = (id: string) => {
    setConfirmAction({
      type: 'delete',
      id,
      title: 'ELIMINAR SOLICITUD',
      message: '¿Estás seguro de que deseas eliminar esta solicitud de reclutamiento?'
    });
  };

  const executeDeleteRecruitment = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('property_submissions')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setRecruitments(prev => prev.filter(r => r.id !== id));
      success('Solicitud eliminada correctamente.');
    } catch (err: any) {
      console.error("Delete Recruitment Error:", err);
      error(`Error al eliminar: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setConfirmAction({
      type: 'delete_user',
      id,
      metadata: { name },
      title: 'ELIMINAR USUARIO',
      message: `¿Cómo deseas proceder con la eliminación de "${name}"?`,
      showUserOptions: true,
      selectedOption: 'unlink'
    });
  };

  const executeDeleteUser = async (id: string, name: string, purgeAssets: boolean) => {
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_by_admin_v2', {
        target_user_id: id,
        purge_assets: purgeAssets
      });

      if (rpcError) {
        console.warn("RPC v2 failed, attempting v1 fallback:", rpcError);
        const { error: fallbackError } = await supabase.rpc('delete_user_by_admin', { target_user_id: id });
        if (fallbackError) throw fallbackError;
      }

      onUsersUpdate(users.filter(u => u.id !== id));
      success(`Usuario "${name}" eliminado correctamente (${purgeAssets ? 'Limpieza total' : 'Desvinculado'}).`);
    } catch (err: any) {
      error(`Error al eliminar usuario: ${err.message}`);
    }
  };

  const handleDeleteBlogPost = (id: string) => {
    setConfirmAction({
      type: 'delete_blog_post',
      id,
      title: 'ELIMINAR NOTICIA',
      message: '¿Estás seguro de que deseas eliminar permanentemente esta noticia o nota del blog?'
    });
  };

  const executeDeleteBlogPost = async (id: string) => {
    try {
      const { error: err } = await supabase.from('blog_posts').delete().eq('id', id);
      if (err) throw err;
      setBlogPosts(prev => prev.filter(p => p.id !== id));
      success('Nota eliminada');
    } catch (err: any) {
      error('Error al eliminar: ' + err.message);
    }
  };

  const fetchBlogPosts = async () => {
    setLoadingBlog(true);
    try {
      const { data, error: err } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setBlogPosts(data || []);
    } catch (err: any) {
      console.error('Fetch Blog Error:', err);
    } finally {
      setLoadingBlog(false);
    }
  };

  const onSaveBlog = async (postData: Partial<BlogPost>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalPost = {
        ...postData,
        author_id: user?.id,
        updated_at: new Date().toISOString()
      };

      const { data, error: err } = await supabase
        .from('blog_posts')
        .upsert(finalPost)
        .select()
        .single();

      if (err) throw err;

      success(postData.id ? 'Blog actualizado' : 'Blog publicado');
      fetchBlogPosts();
      setShowBlogEditor(false);
      setEditingBlogPost(null);
    } catch (err: any) {
      error('Error al guardar blog: ' + err.message);
    }
  };

  // Effect to fetch data when activeTab changes (handles redirects and clicks)
  useEffect(() => {
    if (activeTab === 'blog') fetchBlogPosts();
    if (activeTab === 'comprobantes') fetchPaymentProofs();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'internal-props') fetchInternalProperties();
    if (activeTab === 'appraisals') fetchAppraisals();
    if (activeTab === 'recruitments') fetchRecruitments();
    if (activeTab === 'rental-apps') fetchRentalApps();
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'signed-docs') {
      fetchAllSignedDocuments();
      setSelectedFolderPropertyId(null);
    }
  }, [activeTab]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let resolvedPropertyId = null;
      let resolvedPropertyData = null;
      let isInternal = false;

      if (clientForm.propertyCode) {
        // A. Try Internal Properties First (Preferred for Clients)
        const { data: internalProp } = await supabase
          .from('internal_properties')
          .select('*')
          .eq('ref', clientForm.propertyCode)
          .single();

        if (internalProp) {
          resolvedPropertyId = internalProp.id;
          resolvedPropertyData = internalProp;
          isInternal = true;
        } else {
          // B. If not found in Internal, try Public Properties
          const { data: publicProp } = await supabase
            .from('properties')
            .select('*')
            .eq('ref', clientForm.propertyCode)
            .single();

          if (publicProp) {
            resolvedPropertyId = publicProp.id;
            resolvedPropertyData = publicProp;
          } else {
            // C. NOT FOUND -> Auto-create in INTERNAL PROPERTIES
            if (!clientForm.propertyTitle || !clientForm.propertyAddress) {
              error(`La propiedad con folio "${clientForm.propertyCode}" no existe. Para crearla automáticamente, debes llenar el Título y la Dirección.`);
              return; // HALT
            }

            // Create new INTERNAL property
            const { data: newProp, error: createError } = await supabase
              .from('internal_properties')
              .insert({
                ref: clientForm.propertyCode,
                title: clientForm.propertyTitle,
                address: clientForm.propertyAddress,
                status: 'rented',
              })
              .select()
              .single();

            if (createError) throw createError;

            resolvedPropertyId = newProp.id;
            resolvedPropertyData = newProp;
            isInternal = true;

            // Update Local State for Internal Properties
            setInternalProperties(prev => [newProp, ...prev]);
            success(`Propiedad Interna "${clientForm.propertyCode}" creada automáticamente.`);
          }
        }
      }

      let targetUserId = editingUserId;

      if (editingUserId) {
        // UPDATE Existing Client Profile
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: clientForm.name,
            role: clientForm.role,
            property_code: clientForm.propertyCode,
            property_id: isInternal ? null : resolvedPropertyId, // Link public ID ONLY if public to avoid FK errors
            deposit_day: clientForm.depositDay,
            monthly_amount: clientForm.monthlyAmount,
            contract_end_date: clientForm.contractEndDate,
            contract_start_date: clientForm.contractStartDate,
            property_title: clientForm.propertyTitle,
            property_address: clientForm.propertyAddress
          })
          .eq('id', editingUserId);

        if (profileUpdateError) throw profileUpdateError;

        // Update Local State for User
        const updatedUserProp: User = {
          ...users.find(u => u.id === editingUserId)!,
          name: clientForm.name,
          email: clientForm.email,
          role: clientForm.role,
          propertyCode: clientForm.propertyCode,
          propertyId: isInternal ? undefined : (resolvedPropertyId || undefined),
          depositDay: clientForm.depositDay,
          monthlyAmount: clientForm.monthlyAmount,
          contractEndDate: clientForm.contractEndDate,
          contractStartDate: clientForm.contractStartDate,
          propertyTitle: clientForm.propertyTitle,
          propertyAddress: clientForm.propertyAddress
        };

        onUsersUpdate(users.map(u => u.id === editingUserId ? updatedUserProp : u));

      } else {
        // CREATE NEW Auth User & Profile
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: clientForm.email,
          password: clientForm.password,
          options: {
            data: {
              full_name: clientForm.name,
              role: clientForm.role
            }
          }
        });

        if (authError) throw authError;

        targetUserId = authData.user?.id;
        if (!targetUserId) throw new Error("Error al crear usuario de autenticación.");

        // EXPLICIT UPDATE: Ensure all profile fields are saved
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: clientForm.name,
            role: clientForm.role,
            property_code: clientForm.propertyCode,
            property_id: isInternal ? null : resolvedPropertyId, // Use resolved ID
            deposit_day: clientForm.depositDay,
            monthly_amount: clientForm.monthlyAmount,
            contract_end_date: clientForm.contractEndDate,
            contract_start_date: clientForm.contractStartDate,
            property_title: clientForm.propertyTitle,
            property_address: clientForm.propertyAddress
          })
          .eq('id', targetUserId);

        if (updateError) {
          console.error("Error updating profile details:", updateError);
          error(`Usuario creado pero hubo un error guardando detalles: ${updateError.message}`);
        }

        // Insert into legacy/local state
        const newUser: User = {
          id: targetUserId,
          email: clientForm.email,
          name: clientForm.name,
          role: clientForm.role,
          propertyCode: clientForm.propertyCode,
          propertyId: isInternal ? undefined : (resolvedPropertyId || undefined),
          depositDay: clientForm.depositDay,
          monthlyAmount: clientForm.monthlyAmount,
          contractEndDate: clientForm.contractEndDate,
          contractStartDate: clientForm.contractStartDate,
          propertyTitle: clientForm.propertyTitle,
          propertyAddress: clientForm.propertyAddress
        };

        onUsersUpdate([...users, newUser]);
      }

      // SHARED: Update Property Details if provided
      if (resolvedPropertyData && resolvedPropertyId) {
        if (clientForm.propertyTitle || clientForm.propertyAddress) {
          const updates = {
            ...(clientForm.propertyTitle && { title: clientForm.propertyTitle }),
            ...(clientForm.propertyAddress && { address: clientForm.propertyAddress })
          };

          await supabase
            .from(isInternal ? 'internal_properties' : 'properties')
            .update({
              ...updates,
              ...(isInternal && {
                [clientForm.role === 'owner' ? 'owner_id' : 'tenant_id']: targetUserId
              })
            })
            .eq('id', resolvedPropertyId);

          if (isInternal) {
            setInternalProperties(prev => prev.map(p => p.id === resolvedPropertyId ? {
              ...p,
              ...updates,
              ...(clientForm.role === 'owner' ? { owner_id: targetUserId } : { tenant_id: targetUserId })
            } : p));
          } else {
            // Update Local Property (Public)
            const updatedPropState = {
              ...resolvedPropertyData,
              ...updates,
              mainImage: resolvedPropertyData.main_image,
              ownerId: resolvedPropertyData.owner_id,
              tenantId: resolvedPropertyData.tenant_id,
              maintenanceFee: (resolvedPropertyData as any).maintenance_fee || 0,
              specs: (resolvedPropertyData as any).specs || {},
              images: (resolvedPropertyData as any).images || [],
              services: (resolvedPropertyData as any).services || [],
              amenities: (resolvedPropertyData as any).amenities || [],
              spaces: (resolvedPropertyData as any).spaces || [],
              additionals: (resolvedPropertyData as any).additionals || [],
              documents: []
            };
            onPropertyUpdate(updatedPropState as Property);
          }
        }
      }

      // SHARED: Save Manual Payments
      if (targetUserId && clientForm.manualPayments && clientForm.manualPayments.length > 0) {
        // Link to Public Property ONLY if public to avoid FK errors in payment_proofs
        const finalPropertyId = isInternal ? null : (resolvedPropertyId || (editingUserId ? users.find(u => u.id === editingUserId)?.propertyId : null));

        if (targetUserId) {
          const { data: existingDbPayments } = await supabase
            .from('payment_proofs')
            .select('month_year')
            .eq('user_id', targetUserId)
            .eq('status', 'approved');

          const existingMonths = existingDbPayments?.map(p => p.month_year) || [];
          const desiredMonths = clientForm.manualPayments;

          const monthsToAdd = desiredMonths.filter(m => !existingMonths.includes(m));
          const monthsToRemove = existingMonths.filter(m => !desiredMonths.includes(m));

          if (monthsToAdd.length > 0) {
            const toInsert = monthsToAdd.map(month => ({
              user_id: targetUserId,
              property_id: isInternal ? null : (finalPropertyId || null),
              internal_property_id: isInternal ? resolvedPropertyId : null,
              month_year: month,
              amount: clientForm.monthlyAmount,
              status: 'approved',
              proof_url: 'manual_approval_by_admin'
            }));
            const { error: insertError } = await supabase.from('payment_proofs').insert(toInsert);
            if (insertError) throw insertError;
          }

          if (monthsToRemove.length > 0) {
            await supabase
              .from('payment_proofs')
              .delete()
              .eq('user_id', targetUserId)
              .in('month_year', monthsToRemove)
              .eq('status', 'approved');
          }
        }
      }

      success(editingUserId ? 'Perfil actualizado correctamente.' : 'Usuario creado correctamente.');
      setShowClientForm(false);

    } catch (err: any) {
      console.error("HandleCreateClient Error:", err);
      error(`Error: ${err.message}`);
    }
  };

  const openClientEdit = async (user: User) => {
    // Initial State Set
    setClientForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      propertyId: user.propertyId || '',
      propertyCode: user.propertyCode || '',
      depositDay: user.depositDay || '',
      monthlyAmount: user.monthlyAmount || 0,
      contractEndDate: user.contractEndDate || '',
      contractStartDate: user.contractStartDate || '',
      linkedName: user.linkedName || '',
      phoneContact: user.phoneContact || '',
      propertyTitle: user.propertyTitle || '',
      propertyAddress: user.propertyAddress || '',
      manualPayments: [] // Initialize empty first
    });
    setEditingUserId(user.id);
    setShowClientForm(true);

    // Fetch existing approved payments to populate the grid
    try {
      const { data: payments } = await supabase
        .from('payment_proofs')
        .select('month_year')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (payments) {
        setClientForm(prev => ({
          ...prev,
          manualPayments: payments.map(p => p.month_year)
        }));
      }
    } catch (err) {
      console.error("Error fetching patient payments:", err);
    }
  };

  // Helper component for toggle grid
  const ToggleGrid = ({ title, items, selected, category }: { title: string, items: string[], selected: string[], category: any }) => (
    <div className="mb-8">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">{title}</label>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => toggleFeature(category, item)}
            className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${selected.includes(item)
              ? 'bg-primary text-white border-primary shadow-glow'
              : 'bg-white dark:bg-slate-800 text-slate-500 border-gray-100 dark:border-gray-700 hover:border-primary/50'
              }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    // Force clear local storage and redirect (even if signOut failed)
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const handleTokkoSync = async () => {
    setIsSyncing(true);
    try {
      const results = await tokkoService.syncWithSupabase();
      if (results.errors > 0) {
        error(`Sincronización con ${results.errors} errores. Último: ${results.lastError}`);
      } else {
        success(`Sincronización completada: ${results.updated} propiedades actualizadas.`);
      }
      // Give the user time to see the toast before reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      error(`Error en sincronización: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchInternalProperties = async () => {
    try {
      const { data, error: err } = await supabase
        .from('internal_properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setInternalProperties(data || []);
    } catch (err: any) {
      console.error('Error fetching internal properties:', err);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const { data: reportsData, error: reportsErr } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Fetch Profiles
      const userIds = [...new Set(reportsData.map(r => r.user_id).filter(id => id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', userIds);

      // Fetch Properties
      const propIds = [...new Set(reportsData.map(r => r.property_id).filter(id => id))];
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, title, address, ref')
        .in('id', propIds);

      // Fetch Internal Properties
      const intPropIds = [...new Set(reportsData.map(r => r.internal_property_id).filter(id => id))];
      const { data: intPropsData } = await supabase
        .from('internal_properties')
        .select('id, title, address, ref')
        .in('id', intPropIds);

      const mapped = reportsData.map((r: any) => {
        const profile = profilesData?.find(p => p.id === r.user_id);
        const prop = propsData?.find(p => p.id === r.property_id);
        const intProp = intPropsData?.find(p => p.id === r.internal_property_id);

        return {
          ...r,
          profiles: profile || null,
          properties: prop || intProp || null
        };
      });

      setReports(mapped);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      error(`Error al cargar reportes: ${err.message}`);
    } finally {
      setLoadingReports(false);
    }
  };


  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));

      // Automatic Timeline Event for Report
      const changedReport = reports.find(r => r.id === reportId);
      if (changedReport && changedReport.property_id) {
        let title = 'Reporte Actualizado';
        if (newStatus === 'pending') title = 'Reporte Pendiente';
        if (newStatus === 'in_progress') title = 'Reporte En Progreso';
        if (newStatus === 'resolved') title = 'Reporte Resuelto';

        await logTimelineEvent(
          changedReport.property_id,
          title,
          `Incidencia: "${changedReport.title}". Estado cambiado a ${newStatus}.`
        );
      }

      success('Estado actualizado correctamente');
    } catch (err: any) {
      console.error('Error updating report:', err);
      error(`Error al actualizar: ${err.message}`);
    }
  };

  // DELETE HANDLERS
  const handleDeleteProof = (id: string) => {
    setConfirmAction({
      type: 'delete_proof',
      id,
      title: 'ELIMINAR COMPROBANTE',
      message: '¿Estás seguro de que deseas eliminar este comprobante de pago?'
    });
  };

  const executeDeleteProof = async (id: string) => {
    try {
      const { error: err } = await supabase.from('payment_proofs').delete().eq('id', id);
      if (err) throw err;
      setPaymentProofs(prev => prev.filter(p => p.id !== id));
      setSelectedProof(null);
      success('Comprobante eliminado correctamente');
    } catch (err: any) {
      error('Error al eliminar: ' + err.message);
    }
  };

  const handleDeleteReport = (id: string) => {
    setConfirmAction({
      type: 'delete_report',
      id,
      title: 'ELIMINAR REPORTE',
      message: '¿Estás seguro de que deseas eliminar este reporte de mantenimiento?'
    });
  };

  const executeDeleteReport = async (id: string) => {
    try {
      const { error: err } = await supabase.from('reports').delete().eq('id', id);
      if (err) throw err;
      setReports(prev => prev.filter(r => r.id !== id));
      setSelectedReport(null);
      success('Reporte eliminado correctamente');
    } catch (err: any) {
      error('Error al eliminar: ' + err.message);
    }
  };

  const handleDeleteAppraisal = (id: string) => {
    setConfirmAction({
      type: 'delete_appraisal',
      id,
      title: 'ELIMINAR AVALÚO',
      message: '¿Estás seguro de que deseas eliminar este registro de avalúo?'
    });
  };

  const executeDeleteAppraisal = async (id: string) => {
    try {
      const { error: err } = await supabase.from('appraisals').delete().eq('id', id);
      if (err) throw err;
      setAppraisals(prev => prev.filter(a => a.id !== id));
      setSelectedAppraisal(null);
      success('Avalúo eliminado correctamente');
    } catch (err: any) {
      error('Error al eliminar: ' + err.message);
    }
  };

  const handleDeleteRentalApp = (id: string) => {
    setConfirmAction({
      type: 'delete_rental_app',
      id,
      title: 'ELIMINAR SOLICITUD',
      message: '¿Estás seguro de que deseas eliminar esta solicitud de arrendamiento?'
    });
  };

  const executeDeleteRentalApp = async (id: string) => {
    try {
      const { error: err } = await supabase.from('rental_applications').delete().eq('id', id);
      if (err) throw err;
      setRentalApps(prev => prev.filter(r => r.id !== id));
      setSelectedRentalApp(null);
      success('Solicitud eliminada correctamente');
    } catch (err: any) {
      error('Error al eliminar: ' + err.message);
    }
  };

  // Merge rentalApps appointments into main appointments list for Display
  const allAppointments = React.useMemo(() => {
    const rentalAppAppointments = rentalApps
      .filter(app => app.appointment_date && app.appointment_time)
      .map(app => {
        const start = `${app.appointment_date}T${app.appointment_time}`;
        // Approx end time
        return {
          id: app.id,
          title: `${(app.application_type || 'rent') === 'sale' ? 'Venta' : 'Renta'} - ${app.property_ref}`,
          client_name: app.full_name,
          client_email: app.email,
          client_phone: app.phone,
          start_time: start,
          end_time: start,
          status: app.status === 'approved' ? 'confirmed' : 'scheduled',
          created_at: app.created_at || new Date().toISOString()
        } as any as Appointment;
      });
    return [...appointments, ...rentalAppAppointments];
  }, [appointments, rentalApps]);

  return (
    <div id="ROOT_FIX">
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col md:flex-row">
        {/* Mobile Burger Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="md:hidden fixed top-6 left-6 z-[100] w-12 h-12 bg-[#020617] border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined text-xl">{isSidebarCollapsed ? 'menu' : 'close'}</span>
        </button>

        <aside className={`bg-[#020617] text-white p-4 fixed inset-y-0 left-0 md:sticky md:top-0 md:h-screen flex flex-col z-[95] transition-all duration-300 ease-in-out shadow-2xl ${!isSidebarCollapsed
          ? 'translate-x-0 w-24 md:w-80'
          : '-translate-x-full md:translate-x-0 md:w-24'
          }`}>


          <div className={`flex items-center gap-4 mb-16 ${!isSidebarCollapsed ? 'md:px-4 justify-center md:justify-start px-0' : 'justify-center px-0'}`}>
            <button
              onClick={() => navigate('/')}
              className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-primary/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 p-2 shrink-0 hover:scale-110 active:scale-95 transition-all"
            >
              <img src="https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png" alt="Magno Logo" className="h-12 w-auto object-contain" />
            </button>
            {!isSidebarCollapsed && (
              <div className="hidden md:block animate-in fade-in slide-in-from-left-4 duration-500">
                <h1 className="font-black text-xl uppercase tracking-[-0.05em] leading-tight">Magno <span className="text-primary">Admin</span></h1>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Control Center</p>
              </div>
            )}
          </div>

          <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'inventory', icon: 'real_estate_agent', label: 'Patrimonio', roles: ['admin'] },
              { id: 'internal-props', icon: 'domain', label: 'Propiedades', roles: ['admin'] },
              { id: 'client-panels', icon: 'badge', label: 'Identidades', roles: ['admin'] },
              { id: 'comprobantes', icon: 'receipt_long', label: 'Comprobantes', count: paymentProofs.filter(p => p.status === 'pending').length, color: 'bg-red-500', roles: ['admin'] },
              { id: 'reports', icon: 'report_problem', label: 'Reportes', roles: ['admin'] },
              { id: 'appraisals', icon: 'analytics', label: 'Valuaciones', count: appraisals.filter(a => a.status === 'pending').length, color: 'bg-primary', roles: ['admin', 'asesor'] },
              { id: 'recruitments', icon: 'campaign', label: 'Reclutamiento', count: recruitments.filter(r => r.status === 'pending').length, color: 'bg-amber-500 shadow-glow shadow-amber-500/50', roles: ['admin'] },
              { id: 'rental-apps', icon: 'home_work', label: 'Solicitudes', count: rentalApps.filter(ra => ra.status === 'pending').length, color: 'bg-primary', roles: ['admin'] },
              { id: 'signed-docs', icon: 'folder_open', label: 'Documentos', roles: ['admin'] },
              { id: 'appointments', icon: 'calendar_month', label: 'Citas', roles: ['admin', 'asesor'] },
              { id: 'users-list', icon: 'group', label: 'Usuarios', roles: ['admin'] },
              { id: 'team', icon: 'diversity_3', label: 'Equipo', roles: ['admin'] },
              { id: 'blog', icon: 'article', label: 'Blog & Noticias', roles: ['admin', 'marketing'] },
              { id: 'landing-pages', icon: 'rocket_launch', label: 'Landing Pages', roles: ['admin', 'marketing'] }
            ].filter(item => currentUser?.role && item.roles.includes(currentUser.role)).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (window.innerWidth < 768) setIsSidebarCollapsed(true); // Always keep slim/closed on mobile after click
                }}
                className={`w-full flex items-center justify-center px-0 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative group ${activeTab === item.id
                  ? 'bg-white text-slate-950 shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-105'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>

                {item.count && item.count > 0 && (
                  <span className={`absolute top-2 right-2 ${item.color} w-3 h-3 rounded-full border-2 border-[#020617]`}></span>
                )}

                {/* Premium Floating Tooltip */}
                <div className="absolute left-[calc(100%+15px)] px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 shadow-2xl z-[100] whitespace-nowrap pointer-events-none translate-x-[-10px] group-hover:translate-x-0 border border-white/10">
                  {item.label}
                  {item.count && item.count > 0 && <span className="ml-2 text-primary">({item.count})</span>}
                  {/* Tooltip Arrow */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45"></div>
                </div>
              </button>
            ))}
          </nav>

        </aside>

        <main className="flex-1 p-4 md:p-12 lg:p-20 overflow-x-hidden pt-28 md:pt-12 lg:pt-20">
          {/* Header Action Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 md:mb-20">
            <div>
              <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-slate-900 dark:text-white mb-4 font-display">
                {activeTab === 'inventory' ? 'Inventario' :
                  activeTab === 'internal-props' ? 'Propiedades' :
                    activeTab === 'reports' ? 'Reportes' :
                      activeTab === 'comprobantes' ? 'Pagos' :
                        activeTab === 'appraisals' ? 'Valuaciones' :
                          activeTab === 'rental-apps' ? 'Solicitudes' :
                            activeTab === 'appointments' ? 'Citas' :
                              activeTab === 'users-list' ? 'Lista de Usuarios' :
                                activeTab === 'team' ? 'Equipo' :
                                  activeTab === 'blog' ? 'Blog & Noticias' :
                                    activeTab === 'signed-docs' ? 'Documentos' :
                                      activeTab === 'landing-pages' ? 'Landing Pages' :
                                        'Accesos'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  {activeTab === 'users-list' ? 'Gestión total de cuentas registradas' :
                    activeTab === 'blog' ? 'Editor de contenidos y novedades de Magno' :
                      activeTab === 'team' ? 'Gestión de colaboradores y permisos' :
                        activeTab === 'signed-docs' ? 'Archivo digital de contratos y firmas' :
                          activeTab === 'landing-pages' ? 'Gestión de páginas de captura y marketing' :
                            'Magno Global Management System'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto shrink-0 justify-start sm:justify-end">
              {/* Notification Bell */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowNotificationPanel(true); }}
                className="relative w-12 h-12 bg-white dark:bg-slate-900 rounded-[1.4rem] shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-95 group"
              >
                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">notifications</span>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-4 border-slate-50 dark:border-slate-950 animate-bounce">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Search Bar - Tab Dependent */}
              {(activeTab === 'users-list' || activeTab === 'blog') && (
                <div className="relative group w-full lg:w-48 order-last lg:order-none">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">search</span>
                  <input
                    type="text"
                    placeholder={activeTab === 'users-list' ? "Buscar..." : "Noticias..."}
                    value={activeTab === 'users-list' ? userSearchTerm : blogSearchTerm}
                    onChange={(e) => activeTab === 'users-list' ? setUserSearchTerm(e.target.value) : setBlogSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-8 py-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleTokkoSync(); }}
                disabled={isSyncing}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-100 shadow-xl'
                  }`}
              >
                <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>refresh</span>
                {isSyncing ? 'Sincronizando' : 'Actualizar'}
              </button>

              {activeTab === 'inventory' ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); openCreateModal(); }}
                  className="bg-slate-950 text-white px-6 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-[0_20px_40_px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-105 transition-all"
                >
                  + Alta de Propiedad
                </button>
              ) : activeTab === 'client-panels' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowClientForm(true);
                      setEditingUserId(null);
                      setClientForm({
                        name: '', email: '', password: '', role: 'tenant',
                        propertyId: '', propertyCode: '', depositDay: '', monthlyAmount: 0,
                        contractEndDate: '', linkedName: '', phoneContact: ''
                      });
                    }}
                    className="bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-5 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Inquilino
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowClientForm(true);
                      setEditingUserId(null);
                      setClientForm({
                        name: '', email: '', password: '', role: 'owner',
                        propertyId: '', propertyCode: '', depositDay: '', monthlyAmount: 0,
                        contractEndDate: '', linkedName: '', phoneContact: ''
                      });
                    }}
                    className="bg-amber-500 text-white px-4 sm:px-6 py-3 sm:py-5 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-amber-600 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">real_estate_agent</span>
                    Propietario
                  </button>
                </div>
              ) : activeTab === 'appointments' ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowAppointmentForm(true); }}
                  className="bg-primary text-white px-6 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  Nueva Cita
                </button>
              ) : null}
            </div>
          </div>

          {activeTab === 'inventory' && currentUser?.role === 'admin' && (
            <div className="flex flex-col gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                  {['active', 'reserved', 'paused', 'rented', 'all'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={(e) => { e.preventDefault(); setInventoryStatusFilter(st as any); }}
                      className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${inventoryStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                      {st === 'active' ? 'Activas' : st === 'reserved' ? 'Apartadas' : st === 'paused' ? 'Pausadas' : st === 'rented' ? 'Rentadas' : 'Todas'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-w-[300px] bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center px-6 py-4 border border-slate-100 dark:border-slate-800 shadow-sm group focus-within:border-primary/50 transition-all">
                  <span className="material-symbols-outlined text-slate-300 mr-4 group-focus-within:text-primary transition-colors">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por título, dirección o folio..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && currentUser?.role === 'admin' && (
            <div className="grid grid-cols-1 gap-8">
              {properties.filter(p => {
                const matchesStatus = inventoryStatusFilter === 'all' ||
                  (inventoryStatusFilter === 'active' && p.status === PropertyStatus.AVAILABLE) ||
                  (inventoryStatusFilter === 'reserved' && (p.status === PropertyStatus.RESERVED || (p.status === PropertyStatus.PAUSED && p.status_reason === 'Inquilino en investigación'))) ||
                  (inventoryStatusFilter === 'rented' && p.status === PropertyStatus.RENTED) ||
                  (inventoryStatusFilter === 'paused' && p.status === PropertyStatus.PAUSED && p.status_reason !== 'Inquilino en investigación');

                const matchesSearch = inventorySearch === '' ||
                  p.title.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                  p.address.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                  p.ref.toLowerCase().includes(inventorySearch.toLowerCase());

                return matchesStatus && matchesSearch;
              }).map(p => (
                <div key={p.id} className="relative bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_15px_45px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 group hover:shadow-[0_25px_60px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden">
                  <div className="relative w-full md:w-40 aspect-video md:aspect-square rounded-[1.8rem] md:rounded-[2.2rem] overflow-hidden flex-shrink-0">
                    <img src={p.mainImage || (p.images && p.images[0]) || 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768068105/logo_magno_jn5kql.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full">
                      <p className="text-[8px] font-black text-slate-900 uppercase tracking-widest">{p.ref}</p>
                    </div>

                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20">
                      <p className={`text-[7px] font-black uppercase tracking-widest ${p.status === PropertyStatus.AVAILABLE ? 'text-green-600' :
                        p.status === PropertyStatus.PAUSED ? (p.status_reason === 'Inquilino en investigación' ? 'text-blue-600' : 'text-amber-600') :
                          p.status === PropertyStatus.RESERVED ? 'text-blue-600' :
                            p.status === PropertyStatus.RENTED ? 'text-indigo-600' : 'text-slate-500'
                        }`}>
                        {p.status === PropertyStatus.AVAILABLE ? 'Activa' :
                          p.status === PropertyStatus.PAUSED ? (p.status_reason || 'Pausada') :
                            p.status === PropertyStatus.RESERVED ? 'Apartada' :
                              p.status === PropertyStatus.RENTED ? 'Rentada' : p.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 w-full flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 md:truncate">{p.title}</h3>
                      <div className="flex items-center gap-2 text-slate-400 mb-4 md:mb-6">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest line-clamp-1">{p.address}</p>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <p className="text-xl md:text-2xl font-black text-primary tracking-tighter">${p.price?.toLocaleString()}</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Valor Mercado</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="hidden md:block w-px h-20 bg-slate-100 dark:bg-slate-800" />

                      <div className="flex flex-wrap md:grid md:grid-cols-2 gap-3 min-w-0 md:min-w-[120px]">
                        {/* Status buttons removed as they are now managed from Tokko */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmAction({
                              type: 'edit',
                              id: p.id,
                              title: 'EDITAR PROPIEDAD',
                              message: `¿Deseas abrir el editor para la propiedad "${p.title}"?`
                            });
                          }}
                          className="w-11 h-11 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProperty(p.id);
                          }}
                          className="w-11 h-11 bg-red-50 dark:bg-red-900/10 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'internal-props' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl group-hover:bg-primary/50 transition-all duration-700"></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 relative z-10">Nueva Unidad</h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-8 max-w-xs relative z-10">
                  Registra una nueva unidad interna para gestión administrativa.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('client-panels');
                    setShowClientForm(true);
                    setEditingUserId(null);
                    setClientForm({
                      name: '', email: '', password: '', role: 'tenant',
                      propertyId: '', propertyCode: '', depositDay: '', monthlyAmount: 0,
                      contractEndDate: '', contractStartDate: '', linkedName: '', phoneContact: '',
                      propertyTitle: '', propertyAddress: '', manualPayments: []
                    });
                  }}
                  className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform shadow-lg relative z-10"
                >
                  + Registrar en Identidades
                </button>
              </div>

              {internalProperties.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-4xl">domain</span>
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                      {p.ref}
                    </span>
                    <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20">
                      Interna
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                    {p.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mb-8 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {p.address}
                  </p>
                  <div className="flex items-center gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${p.tenant_id ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <span className="material-symbols-outlined text-lg">{p.tenant_id ? 'person' : 'person_off'}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Estado de Ocupación</p>
                      <p className="text-[10px] font-bold text-slate-900 dark:text-white">
                        {p.tenant_id ? 'Vinculada a Usuario' : 'Sin Usuario Activo'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {internalProperties.length === 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 text-center">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-slate-300">domain</span>
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay propiedades internas registradas</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'client-panels' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {users.length > 0 ? users.map(u => (
                <div key={u.id} className="relative bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] transition-all duration-500 text-center flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl ${u.role === 'owner' ? 'bg-amber-500 shadow-amber-200' : 'bg-green-600 shadow-green-200'}`}>
                    <span className="material-symbols-outlined text-3xl font-light">{u.role === 'owner' ? 'castle' : 'person'}</span>
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-1">{u.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-8">{u.email}</p>

                  <div className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-10 ${u.role === 'owner' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                    {u.role === 'owner' ? 'Propietario' : 'Inquilino'}
                  </div>

                  <div className="w-full pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-center gap-4">
                    <button
                      onClick={() => openClientEdit(u)}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-slate-950 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      Gestionar
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="w-14 h-14 bg-red-50 dark:bg-red-900/10 text-red-400 rounded-[1.5rem] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                      title="Eliminar Acceso"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                    <span className="material-symbols-outlined text-5xl text-slate-300">identity_platform</span>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Conexiones Activas</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">Comienza por integrar un nuevo perfil de inquilino o propietario</p>
                </div>
              )}
            </div>
          )}

          {/* Reports Section */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Report Filters */}
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setReportFilter('all')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${reportFilter === 'all'
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
                    }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setReportFilter('property')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${reportFilter === 'property'
                    ? 'bg-blue-500 text-white border-blue-500 shadow-glow'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
                    }`}
                >
                  Inmueble
                </button>
                <button
                  onClick={() => setReportFilter('tenant')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${reportFilter === 'tenant'
                    ? 'bg-green-600 text-white border-green-600 shadow-glow'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
                    }`}
                >
                  Del Inquilino
                </button>
                <button
                  onClick={() => setReportFilter('owner')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${reportFilter === 'owner'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-glow'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
                    }`}
                >
                  Del Propietario
                </button>
              </div>
              {loadingReports ? (
                <div className="flex items-center justify-center py-40">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando reportes...</p>
                  </div>
                </div>
              ) : reports.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {reports
                    .filter(r => {
                      if (reportFilter === 'all') return true;
                      if (reportFilter === 'property') return r.report_type === 'property';
                      if (reportFilter === 'tenant') return r.report_type === 'person' && r.profiles?.role === 'tenant';
                      if (reportFilter === 'owner') return r.report_type === 'person' && r.profiles?.role === 'owner';
                      return true;
                    })
                    .map(report => {

                      const statusColors = {
                        pending: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
                        in_progress: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
                        resolved: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      };

                      const statusLabels = {
                        pending: 'Pendiente',
                        in_progress: 'En Progreso',
                        resolved: 'Resuelto'
                      };

                      return (
                        <div key={report.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative group" onClick={() => setSelectedReport(report)}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                            className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"
                            title="Eliminar reporte"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                          <div className="flex flex-col lg:flex-row gap-8">
                            {/* Report Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[report.status as keyof typeof statusColors]}`}>
                                      {statusLabels[report.status as keyof typeof statusLabels]}
                                    </span>
                                    <span className="px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {report.report_type === 'property' ? '🏠 Inmueble' : '👤 Persona'}
                                    </span>
                                  </div>
                                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                                    {report.title}
                                  </h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                                    {report.description}
                                  </p>

                                  {/* User & Property Info */}
                                  <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-sm">person</span>
                                      {report.profiles?.full_name || 'Usuario'}
                                    </div>
                                    {report.properties && (
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">home</span>
                                        {report.properties.title}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-sm">schedule</span>
                                      {new Date(report.created_at).toLocaleDateString('es-MX')}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Images */}
                              {report.image_urls && report.image_urls.length > 0 && (
                                <div className="mb-6">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Evidencia Fotográfica</p>
                                  <div className="grid grid-cols-3 gap-3">
                                    {report.image_urls.map((url: string, idx: number) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
                                      >
                                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Status Actions */}
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => updateReportStatus(report.id, 'pending')}
                                  disabled={report.status === 'pending'}
                                  className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${report.status === 'pending'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                    }`}
                                >
                                  Marcar Pendiente
                                </button>
                                <button
                                  onClick={() => updateReportStatus(report.id, 'in_progress')}
                                  disabled={report.status === 'in_progress'}
                                  className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${report.status === 'in_progress'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                    }`}
                                >
                                  En Progreso
                                </button>
                                <button
                                  onClick={() => updateReportStatus(report.id, 'resolved')}
                                  disabled={report.status === 'resolved'}
                                  className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${report.status === 'resolved'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                    }`}
                                >
                                  Resolver
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                    <span className="material-symbols-outlined text-5xl text-slate-300">report_off</span>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Reportes</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">No hay reportes registrados en el sistema</p>
                </div>
              )}
            </div>
          )}

          {/* Team Management View */}
          {activeTab === 'team' && currentUser && (
            <TeamManagement currentUser={currentUser} />
          )}

          {/* Payment Proofs (Comprobantes) View */}
          {activeTab === 'comprobantes' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner overflow-x-auto">
                  {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setProofsFilter(status as any)}
                      className={`px-6 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${proofsFilter === status
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                      {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Aprobados' : 'Rechazados'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 max-w-md bg-white dark:bg-slate-900 rounded-[2rem] flex items-center px-6 py-3.5 border border-slate-100 dark:border-slate-800 shadow-sm group focus-within:border-primary/50 transition-all">
                  <span className="material-symbols-outlined text-slate-300 mr-4 group-focus-within:text-primary transition-colors">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por propiedad o inquilino..."
                    value={proofsSearch}
                    onChange={(e) => setProofsSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                  />
                </div>
              </div>

              {loadingProofs ? (
                <div className="flex justify-center p-20"><span className="loader"></span></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paymentProofs.filter(p => {
                    const matchesStatus = proofsFilter === 'all' || p.status === proofsFilter;
                    const matchesSearch = proofsSearch === '' ||
                      (p.userName || '').toLowerCase().includes(proofsSearch.toLowerCase()) ||
                      (p.propertyRef || '').toLowerCase().includes(proofsSearch.toLowerCase());
                    return matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-5xl text-slate-300 mb-6">receipt_long</span>
                      <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Comprobantes</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                        {proofsSearch ? 'No se encontraron resultados para tu búsqueda' : 'No hay comprobantes registrados en esta categoría'}
                      </p>
                    </div>
                  ) : (
                    paymentProofs.filter(p => {
                      const matchesStatus = proofsFilter === 'all' || p.status === proofsFilter;
                      const matchesSearch = proofsSearch === '' ||
                        (p.userName || '').toLowerCase().includes(proofsSearch.toLowerCase()) ||
                        (p.propertyRef || '').toLowerCase().includes(proofsSearch.toLowerCase());
                      return matchesStatus && matchesSearch;
                    }).map(proof => (
                      <div key={proof.id} className="relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
                        {/* Payment Type Badge */}
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-6xl">payments</span>
                        </div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="w-16 h-16 rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner">
                            <span className="material-symbols-outlined text-3xl">attach_money</span>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${proof.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                            proof.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {proof.status === 'pending' ? 'Pendiente' : proof.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                        </div>

                        <div className="space-y-4 mb-8 relative z-10">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                              ${proof.amount?.toLocaleString('es-MX')}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monto del Pago</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white truncate">
                                {proof.userName}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Usuario</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                {proof.propertyRef}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Propiedad</p>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mes/Año</p>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{proof.monthYear}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fecha de Subida</p>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{new Date(proof.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 relative z-10">
                          {proof.proofUrl && proof.proofUrl !== 'manual_approval_by_admin' && (
                            <button
                              onClick={() => setSelectedProof(proof)}
                              className="flex-1 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              Ver
                            </button>
                          )}

                          {proof.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleProofStatus(proof.id, 'approved')}
                                className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-green-500/30"
                                title="Aprobar Pago"
                              >
                                <span className="material-symbols-outlined">check</span>
                              </button>
                              <button
                                onClick={() => handleProofStatus(proof.id, 'rejected')}
                                className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-red-500/30"
                                title="Rechazar Pago"
                              >
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteProof(proof.id)}
                            className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Eliminar Registro"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {/* Appraisals View */}
          {activeTab === 'appraisals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loadingAppraisals ? (
                <div className="flex justify-center p-20"><span className="loader"></span></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {appraisals.map((appraisal) => (
                    <div key={appraisal.id} className="relative bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAppraisal(appraisal.id); }}
                        className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-20"
                        title="Eliminar avalúo"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg ${appraisal.propertyType === 'casa' ? 'bg-blue-500 shadow-blue-200' : 'bg-purple-500 shadow-purple-200'}`}>
                          <span className="material-symbols-outlined text-2xl">{appraisal.propertyType === 'casa' ? 'home' : 'apartment'}</span>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${appraisal.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                          appraisal.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {appraisal.status === 'pending' ? 'Pendiente' : appraisal.status === 'reviewed' ? 'Revisado' : 'Finalizado'}
                        </span>
                      </div>

                      <div className="text-left mb-8 px-2">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight mb-2">
                          {appraisal.firstName}<br />{appraisal.lastName1} {appraisal.lastName2}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">place</span>
                          {appraisal.location.slice(0, 30)}...
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Const.</p>
                          <p className="text-xs font-black">{appraisal.constArea}m²</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Camas</p>
                          <p className="text-xs font-black">{appraisal.beds}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Baños</p>
                          <p className="text-xs font-black">{appraisal.baths}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedAppraisal(appraisal)}
                        className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                      >
                        Ver Expediente Técnico
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  ))}
                  {appraisals.length === 0 && (
                    <div className="col-span-full py-40 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                      No hay solicitudes de avalúo registradas
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reclutamiento View */}
          {activeTab === 'recruitments' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Reclutamiento</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Gestión de captación de propiedades</p>
                </div>
                <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-1.5 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-x-auto no-scrollbar">
                  {['all', 'pending', 'changes_requested', 'approved', 'rejected', 'draft'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setRecruitmentFilter(f as any)}
                      className={`px-6 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${recruitmentFilter === f ? 'bg-primary text-white shadow-glow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'changes_requested' ? 'Feedback' : f === 'approved' ? 'Aprobados' : f === 'rejected' ? 'Rechazados' : 'Borradores'}
                    </button>
                  ))}
                </div>
              </div>

              {loadingRecruitments ? (
                <div className="py-32 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Consultando base de datos...</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recruitments
                    .filter(r => recruitmentFilter === 'all' || r.status === recruitmentFilter)
                    .map((sub: any) => (
                      <div key={sub.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 hover:border-primary/30 transition-all hover:shadow-2xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 ${sub.type === 'sale' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              <span className="material-symbols-outlined text-3xl">{sub.type === 'sale' ? 'monetization_on' : 'key'}</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1 truncate">
                                {sub.profiles?.full_name || 'Sin Nombre'}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {sub.type === 'sale' ? 'Venta' : 'Renta'}
                                </span>
                                {sub.status === 'pending' && !sub.is_signed ? (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-600 text-white animate-pulse shadow-glow shadow-rose-600/30">
                                    CONGELADA - FALTA FIRMA
                                  </span>
                                ) : (
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sub.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                    sub.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                      sub.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                        sub.status === 'changes_requested' ? 'bg-indigo-500/10 text-indigo-500' :
                                          'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                    {sub.status === 'pending' ? 'Listo (Firmado)' :
                                      sub.status === 'approved' ? 'Aprobado' :
                                        sub.status === 'rejected' ? 'Rechazado' :
                                          sub.status === 'changes_requested' ? 'Feedback Enviado' : 'Borrador'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 md:border-l border-slate-100 dark:border-white/5 md:pl-10">
                            <div className="hidden sm:block mr-auto">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Fecha</p>
                              <p className="text-[10px] font-black text-slate-900 dark:text-white">{new Date(sub.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="hidden sm:block mr-6">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Inmueble</p>
                              <p className="text-[10px] font-black text-slate-900 dark:text-white truncate max-w-[150px]">{sub.form_data?.address || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-auto md:ml-0">
                              <button
                                onClick={() => setSelectedRecruitment(sub)}
                                className="w-12 h-12 rounded-full border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-all hover:scale-110"
                                title="Ver Detalles"
                              >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRecruitment(sub.id)}
                                className="w-12 h-12 rounded-full border border-red-100 dark:border-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 shadow-sm"
                                title="Eliminar Solicitud"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {recruitments.filter(r => recruitmentFilter === 'all' || r.status === recruitmentFilter).length === 0 && (
                    <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">No hay solicitudes en esta categoría</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rental Applications View */}
          {activeTab === 'rental-apps' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loadingRentalApps ? (
                <div className="flex justify-center p-20"><span className="loader"></span></div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/agenda-abierta`;
                        navigator.clipboard.writeText(url);
                        success('Link copiado al portapapeles');
                      }}
                      className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                    >
                      <span className="material-symbols-outlined text-lg">link</span>
                      Copiar Link General
                    </button>

                    {/* Filters */}
                    <div className="flex gap-2">
                      <button onClick={() => setRentAppsFilter('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rentAppsFilter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>Todas</button>
                      <button onClick={() => setRentAppsFilter('rent')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rentAppsFilter === 'rent' ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>Renta</button>
                      <button onClick={() => setRentAppsFilter('sale')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rentAppsFilter === 'sale' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>Venta</button>
                    </div>
                  </div>

                  {rentalApps.filter(app => rentAppsFilter === 'all' || (app.application_type || 'rent') === rentAppsFilter).map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedRentalApp(app)}
                      className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col md:flex-row items-center gap-8 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRentalApp(app.id); }}
                        className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-20"
                        title="Eliminar solicitud"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                      <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                        <span className="material-symbols-outlined text-4xl">home_work</span>
                      </div>
                      <div className="flex-1 text-center md:text-left z-10">
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                          <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${app.status === 'pending'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-700'
                            : app.status === 'rejected'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700'
                              : 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700'
                            }`}>
                            {app.status === 'pending' ? 'Pendiente' : app.status === 'rejected' ? 'Rechazada' : 'Aprobada'}
                          </span>
                          <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 border-2 border-slate-200 dark:border-slate-700">
                            {(app.application_type || 'rent') === 'sale' ? 'VENTA' : 'RENTA'} • {app.property_ref}
                          </span>
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2 leading-none">{app.full_name}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">mail</span> {app.email}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">call</span> {app.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-center md:text-right bg-slate-50 dark:bg-slate-800 px-8 py-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-2">Visita Programada</p>
                        <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">{app.appointment_date}</p>
                        <p className="text-[10px] font-bold text-slate-400">{app.appointment_time} hrs</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-2 transition-all text-3xl">chevron_right</span>
                    </div>
                  ))}
                  {rentalApps.length === 0 && (
                    <div className="py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-5xl text-slate-300 mb-6">home_work</span>
                      <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Solicitudes</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">No hay solicitudes registradas actualmente</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Blog Management View */}
          {activeTab === 'blog' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl">
                  {['all', 'draft', 'published'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setBlogFilter(f as any)}
                      className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${blogFilter === f ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {f === 'all' ? 'Todos' : f === 'draft' ? 'Borradores' : 'Publicados'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditingBlogPost(null);
                    setShowBlogEditor(true);
                  }}
                  className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group shrink-0"
                  title="Crear nueva noticia"
                >
                  <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {blogPosts
                  .filter(post => (blogFilter === 'all' || post.status === blogFilter) &&
                    (post.title.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
                      post.excerpt?.toLowerCase().includes(blogSearchTerm.toLowerCase())))
                  .map((post) => (
                    <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-3xl transition-all group flex flex-col h-full">
                      <div className="relative h-48 overflow-hidden">
                        <img src={post.main_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={post.title} />
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border ${post.status === 'published' ? 'bg-green-500/80 text-white border-green-400' : 'bg-amber-500/80 text-white border-amber-400'
                            }`}>
                            {post.status === 'published' ? 'Publicado' : 'Borrador'}
                          </span>
                        </div>
                      </div>
                      <div className="p-8 flex flex-col flex-1">
                        <div className="flex-1 mb-8 text-left">
                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2" title={post.title}>{post.title}</h3>
                          <div className="flex items-center gap-3 mb-4">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {new Date(post.created_at).toLocaleDateString()}
                            </p>
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-l border-slate-100 dark:border-white/10 pl-3">
                              <span className="material-symbols-outlined text-[14px]">menu_book</span>
                              5 MIN
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className="material-symbols-outlined text-[10px] text-amber-500 fill-1">star</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                            {post.excerpt || 'Sin descripción disponible'}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-6 border-t border-slate-50 dark:border-white/5">
                          <button
                            onClick={() => {
                              setEditingBlogPost(post);
                              setShowBlogEditor(true);
                            }}
                            className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                            Editar Nota
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleDeleteBlogPost(post.id); }}
                            className="w-14 h-14 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group/del"
                          >
                            <span className="material-symbols-outlined text-xl group-hover/del:scale-110 transition-transform">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {blogPosts.length === 0 && !loadingBlog && (
                <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner text-slate-300">
                    <span className="material-symbols-outlined text-5xl">article</span>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Comienza el Blog</h4>
                </div>
              )}
            </div>
          )}

          {/* Landing Pages View */}
          {activeTab === 'landing-pages' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Landing Page Card 1: Renta tu Propiedad */}
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-3xl transition-all group relative">
                  <div className="relative h-48 bg-[#0B1120] flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
                    {/* Animated Glow Background used in actual landing */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-50" />

                    {/* Grid Effect Miniature */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)`,
                        backgroundSize: '24px 24px',
                        maskImage: 'radial-gradient(circle 120px at center, black, transparent)',
                        WebkitMaskImage: 'radial-gradient(circle 120px at center, black, transparent)',
                      }}
                    />

                    {/* Mini Title Preview */}
                    <div className="relative z-10 text-center scale-90">
                      <h4
                        className="text-2xl font-black uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 mb-2"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.4))' }}
                      >
                        RENTA TU<br />PROPIEDAD
                      </h4>
                      <div className="w-8 h-1 bg-amber-500 mx-auto rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse" />
                    </div>

                    <div className="absolute top-4 right-4 z-20">
                      <span className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-green-500/90 text-white backdrop-blur-md shadow-lg shadow-green-500/20 border border-white/20">
                        Activa
                      </span>
                    </div>
                  </div>

                  <div className="p-8">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Renta tu Propiedad</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-2">
                      Landing page optimizada para captación de propietarios interesados en rentar con Magno.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 border border-slate-100 dark:border-white/5">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Visitas</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">24</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 border border-slate-100 dark:border-white/5">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Conv.</p>
                        <p className="text-lg font-black text-green-500">3</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => window.open('/landing/renta-tu-propiedad', '_blank')}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Ver
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/landing/renta-tu-propiedad`);
                          alert('Link copiado al portapapeles');
                        }}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">link</span>
                        Copiar Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* Placeholder for Next Landing Page */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 border-dashed flex flex-col items-center justify-center p-12 text-center group opacity-50 hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-slate-400">add_circle</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-2">Próximamente</h3>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    Vende tu Propiedad con Magno
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 border-dashed flex flex-col items-center justify-center p-12 text-center group opacity-50 hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-slate-400">add_circle</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-2">Próximamente</h3>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    Encuentra tu Propiedad
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Users List Tab Content */}
          {activeTab === 'users-list' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-8">
                  {users
                    .filter(u =>
                      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      u.role.toLowerCase().includes(userSearchTerm.toLowerCase())
                    )
                    .map((user) => (
                      <div key={user.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 group hover:border-primary/30 transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-[1rem] bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-lg font-black text-primary border border-slate-50 dark:border-slate-700 uppercase">
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black uppercase tracking-tighter leading-tight mb-1 truncate" title={user.name}>{user.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-red-500 text-white' :
                                user.role === 'owner' ? 'bg-blue-500 text-white' :
                                  'bg-green-500 text-white'
                                }`}>
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        {user.password && (
                          <div className="mb-4 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-between group/pwd">
                            <div className="flex flex-col items-start translate-x-2">
                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Contraseña Acceso</span>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono tracking-wider">
                                {user.password}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.password || '');
                                success('Contraseña copiada');
                              }}
                              className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-primary transition-colors opacity-0 group-hover/pwd:opacity-100 shadow-sm"
                              title="Copiar Contraseña"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                          </div>
                        )}

                        <div className="space-y-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-base">mail</span>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate" title={user.email}>{user.email}</p>
                          </div>
                          {user.phoneContact && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{user.phoneContact}</p>
                            </div>
                          )}
                          {user.propertyCode && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-400 text-base">apartment</span>
                              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Folio: <span className="text-primary">{user.propertyCode}</span></p>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={() => openClientEdit(user)}
                            className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2 group/btn"
                          >
                            <span className="material-symbols-outlined text-[14px] group-hover/btn:rotate-12 transition-transform">edit</span>
                            Gestionar
                          </button>
                          <button
                            onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                            className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group/del"
                            title="Eliminar Usuario"
                          >
                            <span className="material-symbols-outlined text-lg group-hover/del:scale-110 transition-transform">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {
                  users.length === 0 && (
                    <div className="text-center py-40">
                      <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-6">group_off</span>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">No se encontraron usuarios registrados</p>
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* Signed Documents View */}
          {activeTab === 'signed-docs' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loadingAllSignedDocs ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando archivo digital...</p>
                </div>
              ) : selectedFolderPropertyId ? (
                /* Folder Contents View */
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="flex items-center gap-6 mb-12">
                    <button
                      onClick={() => setSelectedFolderPropertyId(null)}
                      className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 transition-all shadow-xl"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-1">
                        {allSignedDocs.find(d => d.property_id === selectedFolderPropertyId)?.properties?.title || 'Expediente de Documentos'}
                      </h3>
                      <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">
                        Folio: {allSignedDocs.find(d => d.property_id === selectedFolderPropertyId)?.properties?.ref || '---'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allSignedDocs
                      .filter(doc => selectedFolderPropertyId === 'unlinked' ? !doc.property_id : doc.property_id === selectedFolderPropertyId)
                      .map(doc => (
                        <div key={doc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
                          <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner">
                              <span className="material-symbols-outlined text-3xl">description</span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tipo de Doc.</p>
                              <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[120px]">
                                {doc.document_type || 'Contrato'}
                              </p>
                            </div>
                          </div>
                          <div className="mb-8">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2 truncate">
                              {doc.email || 'Documento Firmado'}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {new Date(doc.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                          >
                            Abrir Expediente
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* Root View: Property Folders */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {Array.from(new Set(allSignedDocs.map(d => d.property_id))).map(propId => {
                    const propDocs = allSignedDocs.filter(d => d.property_id === propId);

                    // Group documents with no property_id as "Pendientes de Alta"
                    if (!propId) {
                      return (
                        <div
                          key="unlinked"
                          onClick={() => setSelectedFolderPropertyId('unlinked')}
                          className="group relative bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col items-center text-center"
                        >
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
                          <div className="relative mb-6">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-110 transition-transform duration-500">
                              <span className="material-symbols-outlined text-5xl">folder_zip</span>
                            </div>
                            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-950">
                              {propDocs.length}
                            </span>
                          </div>
                          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2 leading-tight">
                            Pendientes de Alta
                          </h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-8">
                            DOCS SIN PROPIEDAD VINCULADA
                          </p>
                          <div className="mt-auto w-full pt-6 border-t border-slate-50 dark:border-white/5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 animate-pulse">Revisar Expedientes</p>
                          </div>
                        </div>
                      );
                    }

                    const propInfo = propDocs[0]?.properties;

                    if (!propInfo) return null;

                    return (
                      <div
                        key={propId}
                        onClick={() => setSelectedFolderPropertyId(propId)}
                        className="group relative bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col items-center text-center"
                      >
                        {/* Animated Background Polish */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />

                        {/* Folder Icon with Badge */}
                        <div className="relative mb-6">
                          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <span className="material-symbols-outlined text-5xl">folder</span>
                          </div>
                          <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-950">
                            {propDocs.length}
                          </span>
                        </div>

                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2 leading-tight">
                          {propInfo.title}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-8">
                          FOLIO: {propInfo.ref}
                        </p>

                        <div className="mt-auto w-full pt-6 border-t border-slate-50 dark:border-white/5">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">Ver Documentación</p>
                        </div>
                      </div>
                    );
                  })}

                  {allSignedDocs.length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                        <span className="material-symbols-outlined text-5xl text-slate-300">folder_off</span>
                      </div>
                      <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Archivo Vacío</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">No hay contratos o documentos firmados digitalmente aún</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Appointments View */}
          {
            activeTab === 'appointments' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loadingAppointments ? (
                  <div className="flex justify-center p-20"><span className="loader"></span></div>
                ) : (
                  <div className="flex flex-col gap-8">
                    <CalendarView appointments={allAppointments} onEventClick={handleCalendarEventClick} />

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                      {allAppointments.map((appt) => (
                        <div
                          key={appt.id}
                          className="bg-white dark:bg-slate-900 p-10 rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group"
                        >
                          <div className="flex justify-between items-start mb-10">
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                              <span className="material-symbols-outlined text-4xl">calendar_today</span>
                            </div>
                            <span className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${appt.status === 'scheduled' ? 'border-primary/30 text-primary bg-primary/5' : 'border-slate-200 text-slate-400'}`}>
                              {appt.status}
                            </span>
                          </div>
                          <div className="mb-10">
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3 leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={appt.title}>
                              {appt.title}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{new Date(appt.start_time).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <div className="space-y-6 mb-12 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
                              <span className="material-symbols-outlined text-xl text-primary">schedule</span>
                              <p className="text-xs font-black uppercase tracking-widest">{new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
                              <span className="material-symbols-outlined text-xl text-primary">person</span>
                              <p className="text-xs font-black uppercase tracking-widest">{appt.client_name}</p>
                            </div>
                            <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
                              <span className="material-symbols-outlined text-xl text-primary">call</span>
                              <p className="text-xs font-black uppercase tracking-widest">{appt.client_phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleRescheduleClick(appt)}
                              className="flex-1 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
                            >
                              <span className="material-symbols-outlined text-lg">edit_calendar</span>
                              <span>Reagendar</span>
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                              className="w-20 h-auto bg-red-50 dark:bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group/cancel"
                            >
                              <span className="material-symbols-outlined text-3xl group-hover/cancel:rotate-90 transition-transform">close</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {allAppointments.length === 0 && (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-white/5 rounded-[5rem] border border-dashed border-slate-200 dark:border-slate-800">
                          <span className="material-symbols-outlined text-5xl text-slate-300 mb-6">calendar_month</span>
                          <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Sin Citas</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">No hay citas programadas para hoy</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {/* Appraisal Detail Modal */}
          {
            selectedAppraisal && (
              <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[4rem] flex flex-col overflow-hidden shadow-3xl max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Expediente de Avalúo</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registrado el {new Date(selectedAppraisal.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setSelectedAppraisal(null)} className="w-16 h-16 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section className="space-y-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Información del Solicitante</h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] space-y-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nombre</p>
                            <p className="text-xl font-black">{selectedAppraisal.firstName} {selectedAppraisal.lastName1} {selectedAppraisal.lastName2}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ubicación</p>
                            <p className="font-bold text-sm">{selectedAppraisal.location}</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Especificaciones del Inmueble</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                            <p className="font-black uppercase text-sm">{selectedAppraisal.propertyType === 'casa' ? 'Casa' : 'Inmueble / Depa'}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Amueblado</p>
                            <p className="font-black uppercase text-sm">{selectedAppraisal.furnishing === 'none' ? 'No' : selectedAppraisal.furnishing === 'semi' ? 'Semi' : 'Sí'}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Construcción</p>
                            <p className="font-black text-lg">{selectedAppraisal.constArea} m²</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Terreno</p>
                            <p className="font-black text-lg">{selectedAppraisal.landArea} m²</p>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Amenidades</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedAppraisal.amenities.map(a => (
                            <span key={a} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500">{a}</span>
                          ))}
                          {selectedAppraisal.amenities.length === 0 && <p className="text-xs text-slate-400 italic">Ninguna seleccionada</p>}
                        </div>
                      </section>
                      <section className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Servicios</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedAppraisal.services.map(s => (
                            <span key={s} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500">{s}</span>
                          ))}
                          {selectedAppraisal.services.length === 0 && <p className="text-xs text-slate-400 italic">Ninguna seleccionada</p>}
                        </div>
                      </section>
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase.from('appraisals').update({ status: 'reviewed' }).eq('id', selectedAppraisal.id);
                          if (!err) {
                            setAppraisals(prev => prev.map(a => a.id === selectedAppraisal.id ? { ...a, status: 'reviewed' } : a));
                            setSelectedAppraisal(null);
                            success('Marcado como revisado');
                          }
                        }}
                        className="flex-1 py-5 bg-blue-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        Marcar como Revisado
                      </button>
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase.from('appraisals').update({ status: 'completed' }).eq('id', selectedAppraisal.id);
                          if (!err) {
                            setAppraisals(prev => prev.map(a => a.id === selectedAppraisal.id ? { ...a, status: 'completed' } : a));
                            setSelectedAppraisal(null);
                            success('Marcado como finalizado');
                          }
                        }}
                        className="flex-1 py-5 bg-green-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        Finalizar Gestión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Recruitment Detail Modal */}
          {
            selectedRecruitment && (
              <RecruitmentDetailsModal
                recruitment={selectedRecruitment}
                onClose={() => setSelectedRecruitment(null)}
                onStatusChange={(status, reason, feedback) => updateRecruitmentStatus(selectedRecruitment.id, status, reason, feedback)}
                onUpdateData={(updates) => updateRecruitmentData(selectedRecruitment.id, updates)}
              />
            )
          }

          {/* Rental Application Detail Modal */}
          {
            selectedRentalApp && (
              <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[4rem] flex flex-col overflow-hidden shadow-3xl max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Detalle de Solicitud</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Folio de Propiedad: {selectedRentalApp.property_ref}</p>
                    </div>
                    <button onClick={() => setSelectedRentalApp(null)} className="w-16 h-16 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Información Personal</h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] space-y-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</p>
                            <p className="text-xl font-black">{selectedRentalApp.full_name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Teléfono</p>
                              <p className="font-bold">{selectedRentalApp.phone}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Email</p>
                              <p className="font-bold text-xs truncate">{selectedRentalApp.email}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Detalles de la Visita</h3>
                        <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] space-y-4 shadow-xl">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Fecha Programada</p>
                            <p className="text-2xl font-black">{selectedRentalApp.appointment_date}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Horario</p>
                            <p className="text-xl font-bold">{selectedRentalApp.appointment_time} hrs</p>
                          </div>

                          {/* Google Calendar Sync Indicator */}
                          <div className="pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="#4285F4" />
                              </svg>
                              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Sincronizado con Google Calendar</p>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    <section className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Situación Financiera</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Fuente de Ingresos</p>
                          <p className="font-black uppercase">
                            {selectedRentalApp.income_source === 'payroll' ? 'Nómina' :
                              selectedRentalApp.income_source === 'bank_statements' ? 'Estados de Cuenta' :
                                selectedRentalApp.income_source === 'cash' ? 'Efectivo' : 'Otro'}
                          </p>
                        </div>
                        {/* RENT SPECIFIC */}
                        {(selectedRentalApp.application_type || 'rent') === 'rent' && (
                          <>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Relación Ingreso/Renta</p>
                              <p className="font-black uppercase">{selectedRentalApp.meets_ratio ? '✅ Cumple 3:1' : '❌ No Cumple'}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Buró de Crédito</p>
                              <p className="font-black uppercase">{selectedRentalApp.bureau_status === 'clean' ? 'Limpio' : 'Con Detalles'}</p>
                            </div>
                          </>
                        )}
                        {/* SALE SPECIFIC */}
                        {(selectedRentalApp.application_type === 'sale') && (
                          <>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Estatus Hipotecario</p>
                              <p className="font-black uppercase text-sm">
                                {selectedRentalApp.mortgage_status === 'approved' ? 'Aprobado' :
                                  selectedRentalApp.mortgage_status === 'prequalified' ? 'Pre-calificado' :
                                    selectedRentalApp.mortgage_status === 'process' ? 'En Proceso' : 'No Iniciado'}
                              </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Forma de Pago</p>
                              <p className="font-black uppercase text-sm">{selectedRentalApp.payment_method || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Buró de Crédito</p>
                              <div className="flex flex-col">
                                <p className="font-black uppercase">{selectedRentalApp.bureau_status === 'clean' ? 'Limpio' : 'Con Detalles'}</p>
                                {selectedRentalApp.bureau_status !== 'clean' && (
                                  <span className={`text-[9px] font-bold uppercase ${selectedRentalApp.is_bureau_severe ? 'text-red-500' : 'text-amber-500'}`}>
                                    {selectedRentalApp.is_bureau_severe ? 'PROBLEMA GRAVE' : 'Detalles Menores'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </section>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase.from('rental_applications').update({ status: 'approved' }).eq('id', selectedRentalApp.id);

                          if (!err) {
                            // Find property owner to notify
                            const { data: propData } = await supabase
                              .from('properties')
                              .select('owner_id, title')
                              .eq('ref', selectedRentalApp.property_ref)
                              .single();

                            if (propData && propData.owner_id) {
                              const { error: notifError } = await supabase
                                .from('notifications')
                                .insert([{
                                  type: 'inquiry',
                                  title: '¡Nuevo Inquilino Potencial!',
                                  message: `Tenemos un interesado (${selectedRentalApp.full_name}) para tu propiedad. Hemos programado una cita para el ${selectedRentalApp.appointment_date}. Revisa los detalles en la sección de Inquilinos.`,
                                  user_id: propData.owner_id,
                                  link: '/client-portal',
                                  is_read: false
                                }]);
                              if (notifError) console.error("Notif Error", notifError);
                            }

                            setRentalApps(prev => prev.map(a => a.id === selectedRentalApp.id ? { ...a, status: 'approved' } : a));
                            setSelectedRentalApp(null);
                            success('Solicitud aprobada y propietario notificado');
                          }
                        }}
                        className="flex-1 py-5 bg-green-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        Aprobar Solicitud
                      </button>
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase.from('rental_applications').update({ status: 'rejected' }).eq('id', selectedRentalApp.id);
                          if (!err) {
                            setRentalApps(prev => prev.map(a => a.id === selectedRentalApp.id ? { ...a, status: 'rejected' } : a));
                            setSelectedRentalApp(null);
                            success('Solicitud rechazada');
                          }
                        }}
                        className="flex-1 py-5 bg-red-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Manual Appointment Form Modal */}
          {
            showAppointmentForm && (
              <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] flex flex-col overflow-hidden shadow-3xl max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Nueva Cita Manual</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registro de visita presencial</p>
                    </div>
                    <button onClick={() => setShowAppointmentForm(false)} className="w-16 h-16 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-12 space-y-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Título / Propiedad</label>
                        <input required placeholder="Ej: Visita - MAG-1234" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={appointmentForm.title} onChange={e => setAppointmentForm({ ...appointmentForm, title: e.target.value })} />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre del Cliente</label>
                        <input required placeholder="Nombre completo" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={appointmentForm.clientName} onChange={e => setAppointmentForm({ ...appointmentForm, clientName: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Teléfono</label>
                          <input required placeholder="33 0000 0000" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={appointmentForm.clientPhone} onChange={e => setAppointmentForm({ ...appointmentForm, clientPhone: e.target.value })} />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Fecha</label>
                          <input required type="date" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={appointmentForm.date} onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })} />
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Hora de Inicio (1hr slot)</label>
                        <select required className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0 appearance-none" value={appointmentForm.time} onChange={e => setAppointmentForm({ ...appointmentForm, time: e.target.value })}>
                          <option value="">Seleccionar hora</option>
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                            <option key={t} value={t} className="text-black">{t} hrs</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Registrar Cita en Agenda
                    </button>
                  </form>
                </div>
              </div>
            )
          }

          {/* Modal Property Create */}
          {
            showPropertyForm && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[4rem] flex flex-col overflow-hidden shadow-3xl h-full max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  {/* Modal Header */}
                  <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Technical Specification</p>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        {editingPropertyId ? 'Mantenimiento de Ficha' : 'Nueva Unidad Magno'}
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowPropertyForm(false)}
                      className="w-16 h-16 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateProperty} className="flex-1 overflow-y-auto p-12 no-scrollbar px-6 md:px-20">
                    <div className="max-w-4xl mx-auto space-y-20">
                      {/* Phase 1: Identity */}
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                          <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">01</span>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Identidad del Inmueble</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <button type="button" onClick={() => setFormProperty({ ...formProperty, type: 'sale' })} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formProperty.type === 'sale' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}>Operación Venta</button>
                              <button type="button" onClick={() => setFormProperty({ ...formProperty, type: 'rent' })} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formProperty.type === 'rent' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}>Renta Mensual</button>
                            </div>
                            <div className="group">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-4">Nombre Comercial</label>
                              <input required placeholder="Ej: Penthouse Platinum Puerta de Hierro" className="w-full bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border-none font-bold text-xl placeholder:opacity-30 focus:ring-2 focus:ring-primary/20 transition-all" value={formProperty.title} onChange={e => setFormProperty({ ...formProperty, title: e.target.value })} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 rounded-[2rem] p-6 flex flex-col justify-center border border-white/5 shadow-2xl">
                              <label className="text-[8px] font-black uppercase tracking-widest text-primary/60 mb-1">Valuación</label>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-white">$</span>
                                <input type="number" placeholder="0.00" className="bg-transparent border-none p-0 font-black text-2xl text-white focus:ring-0 w-full" value={formProperty.price || ''} onChange={e => setFormProperty({ ...formProperty, price: Number(e.target.value) })} />
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 flex flex-col justify-center border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Referencia ID</label>
                              <input placeholder="MAG-XXXX" className="bg-transparent border-none p-0 font-black text-lg text-slate-900 dark:text-white focus:ring-0 w-full uppercase" value={formProperty.ref || ''} onChange={e => setFormProperty({ ...formProperty, ref: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Phase 2: Location */}
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                          <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">02</span>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Emplazamiento</h3>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-8xl">map</span>
                          </div>
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Dirección Geográfica Exhaustiva</label>
                          <input required placeholder="Av. Universidad #1234, Zapopan, Jalisco..." className="w-full bg-white dark:bg-slate-900 p-6 rounded-2xl border-none font-medium text-base shadow-sm focus:ring-2 focus:ring-primary/20" value={formProperty.address} onChange={e => setFormProperty({ ...formProperty, address: e.target.value })} />
                        </div>
                      </section>

                      {/* Phase 3: Technical Specs */}
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                          <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">03</span>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Ficha Técnica</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Recámaras', key: 'beds', icon: 'bed' },
                            { label: 'Baños', key: 'baths', icon: 'bathtub' },
                            { label: 'Cocheras', key: 'parking', icon: 'directions_car' },
                            { label: 'Construcción', key: 'area', icon: 'architecture' },
                            { label: 'Terreno', key: 'landArea', icon: 'straighten' },
                            { label: 'Niveles', key: 'levels', icon: 'layers' },
                            { label: 'Antigüedad', key: 'age', icon: 'history' },
                          ].map(field => (
                            <div key={field.key} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all shadow-sm flex items-center gap-4">
                              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-xl">{field.icon}</span>
                              <div>
                                <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 block mb-1">{field.label}</label>
                                <input type="number" className="bg-transparent border-none p-0 font-black text-lg focus:ring-0 w-full" placeholder="0" value={(formProperty.specs as any)[field.key] || ''} onChange={e => setFormProperty({ ...formProperty, specs: { ...formProperty.specs, [field.key]: Number(e.target.value) } as any })} />
                              </div>
                            </div>
                          ))}
                          <div className="bg-slate-950 text-white p-6 rounded-[2rem] shadow-xl flex flex-col justify-center">
                            <label className="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-2">Estado Activo</label>
                            <select className="bg-transparent border-none p-0 font-black text-sm focus:ring-0 w-full uppercase tracking-tighter cursor-pointer" value={formProperty.specs?.condition} onChange={e => setFormProperty({ ...formProperty, specs: { ...formProperty.specs, condition: e.target.value } as any })}>
                              <option className="text-black" value="new">Nuevo / Estrenar</option>
                              <option className="text-black" value="excellent">Excelente</option>
                              <option className="text-black" value="good">Habitable</option>
                              <option className="text-black" value="needs_work">Para Remodelar</option>
                            </select>
                          </div>
                        </div>
                      </section>

                      {/* Phase 4: Multimedia */}
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                          <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">04</span>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Multimedia Premium</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="relative h-64 bg-slate-100 dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center group overflow-hidden">
                            {formProperty.mainImage ? (
                              <>
                                <img src={formProperty.mainImage} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt="" />
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6">
                                  <span className="material-symbols-outlined text-4xl mb-4">photo_camera</span>
                                  <p className="font-black uppercase tracking-widest text-[10px]">Actualizar Portada</p>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-8">
                                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-glow">
                                  <span className="material-symbols-outlined text-3xl">star</span>
                                </div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-slate-900 dark:text-white">Imagen Destacada</p>
                              </div>
                            )}
                            <input type="file" ref={mainImageInputRef} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileUpload(e, true)} />
                          </div>

                          <div className="relative h-64 bg-slate-50 dark:bg-slate-800/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-8 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">add_photo_alternate</span>
                            <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Añadir a la Galería</p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2">{formProperty.images?.length || 0} Archivos en Cola</p>
                            <input type="file" ref={galleryInputRef} className="absolute inset-0 opacity-0 cursor-pointer" multiple onChange={e => handleFileUpload(e, false)} />
                          </div>
                        </div>
                      </section>

                      {/* Phase 5: Legal Documentation */}
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                          <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">05</span>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Documentación Legal</h3>
                        </div>

                        {signedDocs.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {signedDocs.map((doc: any) => (
                              <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group hover:shadow-lg transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">description</span>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-0.5">
                                      Contrato Firmado
                                    </h4>
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <span className="material-symbols-outlined text-[10px]">history_edu</span>
                                      <p className="text-[10px] uppercase tracking-widest font-bold">
                                        Firmado: {new Date(doc.signed_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={doc.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all"
                                  title="Ver Documento"
                                >
                                  <span className="material-symbols-outlined text-lg">arrow_outward</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">folder_off</span>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin documentos legales registrados</p>
                          </div>
                        )}
                      </section>
                    </div>
                  </form>
                </div>
              </div>
            )
          }




          {/* Selected Proof Modal */}
          {
            selectedProof && (
              <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setSelectedProof(null)}>
                <div className="max-w-4xl w-full max-h-[90vh] bg-transparent flex flex-col items-center">
                  <img src={selectedProof.proofUrl} className="max-w-full max-h-[70vh] rounded-3xl shadow-2xl mb-8 object-contain bg-black" onClick={e => e.stopPropagation()} />

                  <div className="flex gap-4" onClick={e => e.stopPropagation()}>
                    <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-full flex items-center gap-6">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monto Reportado</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">${selectedProof.amount?.toLocaleString()}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha Carga</p>
                        <p className="text-md font-bold text-slate-900 dark:text-white">{new Date(selectedProof.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {selectedProof.status === 'pending' && (
                      <>
                        <button onClick={() => handleProofStatus(selectedProof.id, 'approved')} className="bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-glow">
                          <span className="material-symbols-outlined">check</span>
                        </button>
                        <button onClick={() => handleProofStatus(selectedProof.id, 'rejected')} className="bg-red-500 text-white w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-glow">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          {
            showClientForm && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[4rem] flex flex-col overflow-hidden shadow-3xl max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  {/* Modal Header */}
                  <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                        {editingUserId ? 'Expediente Digital' : 'Alta de Identidad'}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuración de credenciales y datos de enlace</p>
                    </div>
                    <button onClick={() => setShowClientForm(false)} className="w-16 h-16 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto p-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Basic Info */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Credenciales de Acceso</h3>
                        </div>

                        <div className="px-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between border border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Perfil</span>
                          <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${clientForm.role === 'owner'
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                            : 'bg-green-600 text-white shadow-lg shadow-green-200'
                            }`}>
                            {clientForm.role === 'owner' ? 'Dueño' : 'Inquilino'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre Completo</label>
                            <input required className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} />
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Correo Electrónico</label>
                            <input required disabled={!!editingUserId} type="email" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0 disabled:opacity-50" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                          </div>
                          {!editingUserId && (
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Definir Contraseña</label>
                              <input required type="password" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Role Specific Data */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Datos del Contrato</h3>
                        </div>

                        <div className="space-y-4">
                          {/* NEW: Property Title and Address Editor */}
                          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                            <label className="text-[8px] font-black uppercase tracking-widest text-primary mb-2 block">Título de Propiedad (Dashboard)</label>
                            <input
                              placeholder="Ej: CASA EN VENTA EN ALTA CALIFORNIA"
                              className="w-full bg-transparent border-none p-0 font-bold text-sm focus:ring-0"
                              value={clientForm.propertyTitle || ''}
                              onChange={e => setClientForm({ ...clientForm, propertyTitle: e.target.value })}
                            />
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                            <label className="text-[8px] font-black uppercase tracking-widest text-primary mb-2 block">Dirección de Propiedad</label>
                            <input
                              placeholder="Ej: Boulevard Imperial 200, Tlajomulco"
                              className="w-full bg-transparent border-none p-0 font-bold text-sm focus:ring-0"
                              value={clientForm.propertyAddress || ''}
                              onChange={e => setClientForm({ ...clientForm, propertyAddress: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 col-span-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Folio Magno (Propiedad)</label>
                              <input placeholder="Ej: MAG-1234" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0 uppercase" value={clientForm.propertyCode} onChange={e => setClientForm({ ...clientForm, propertyCode: e.target.value })} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Día Pago</label>
                              <input placeholder="Ej: 05" className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0" value={clientForm.depositDay} onChange={e => setClientForm({ ...clientForm, depositDay: e.target.value })} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Monto Mensual</label>
                              <div className="flex items-center gap-1">
                                <span className="text-lg font-black text-slate-400 group-focus-within:text-primary transition-colors">$</span>
                                <input type="number" className="w-full bg-transparent border-none p-0 font-black text-lg focus:ring-0" value={clientForm.monthlyAmount} onChange={e => setClientForm({ ...clientForm, monthlyAmount: Number(e.target.value) })} />
                              </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Inicio de Contrato</label>
                              <input type="date" className="w-full bg-transparent border-none p-0 font-bold text-sm focus:ring-0 cursor-pointer" value={clientForm.contractStartDate} onChange={e => setClientForm({ ...clientForm, contractStartDate: e.target.value })} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Término de Contrato</label>
                              <input type="date" className="w-full bg-transparent border-none p-0 font-bold text-sm focus:ring-0 cursor-pointer" value={clientForm.contractEndDate} onChange={e => setClientForm({ ...clientForm, contractEndDate: e.target.value })} />
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* MANUAL PAYMENTS SECTION (Always Visible) */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-10 mt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pagos Manuales (Historial)</h3>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-medium mb-6">
                          Marca los meses que ya han sido pagados anteriormente.
                        </p>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {(() => {
                            const start = clientForm.contractStartDate ? new Date(clientForm.contractStartDate) : new Date();
                            const end = clientForm.contractEndDate ? new Date(clientForm.contractEndDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

                            const months = [];
                            const current = new Date(start);
                            current.setDate(1);

                            let iterations = 0;
                            while (current <= end && iterations < 24) {
                              const monthStr = current.toISOString().slice(0, 7);
                              months.push(monthStr);
                              current.setMonth(current.getMonth() + 1);
                              iterations++;
                            }

                            return months.map(monthStr => {
                              const date = new Date(monthStr + '-02');
                              const monthName = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
                              const year = date.getFullYear().toString().slice(2);
                              const isPaid = clientForm.manualPayments?.includes(monthStr);

                              return (
                                <button
                                  key={monthStr}
                                  type="button"
                                  onClick={() => {
                                    const currentPayments = clientForm.manualPayments || [];
                                    const newPayments = isPaid
                                      ? currentPayments.filter(m => m !== monthStr)
                                      : [...currentPayments, monthStr];

                                    setClientForm({ ...clientForm, manualPayments: newPayments });
                                  }}
                                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${isPaid
                                    ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-yellow-400/50'
                                    }`}
                                >
                                  <span className="text-sm font-black tracking-tighter">{monthName}</span>
                                  <span className="text-[8px] font-bold opacity-60">'{year}</span>
                                  {isPaid && <span className="material-symbols-outlined text-[10px] mt-1">check_circle</span>}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                  </form>

                  {/* Modal Footer */}
                  <div className="px-12 py-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex gap-4">
                    <button type="button" onClick={() => setShowClientForm(false)} className="px-12 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 transition-all">Cancelar</button>
                    <button type="submit" onClick={handleCreateClient} className="flex-1 py-5 bg-slate-950 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                      {editingUserId ? 'ACTUALIZAR EXPEDIENTE' : 'CONFIRMAR Y ENTREGAR ACCESO'}
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {/* Report Detail Modal */}
          {
            selectedReport && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] flex flex-col overflow-hidden shadow-3xl max-h-[92vh] border border-slate-100 dark:border-slate-800">
                  {/* Modal Header */}
                  <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${selectedReport.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          selectedReport.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-green-50 text-green-600 border-green-100'
                          }`}>
                          {selectedReport.status === 'pending' ? 'Pendiente' : selectedReport.status === 'in_progress' ? 'En Progreso' : 'Resuelto'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {new Date(selectedReport.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        {selectedReport.title}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedReport(null)} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 space-y-8">
                    {/* Context Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Reportado Por</p>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${selectedReport.profiles?.role === 'owner' ? 'bg-amber-500 shadow-amber-200' : 'bg-green-600 shadow-green-200'}`}>
                            <span className="material-symbols-outlined text-sm">{selectedReport.profiles?.role === 'owner' ? 'castle' : 'person'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{selectedReport.profiles?.full_name || 'Usuario'}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{selectedReport.profiles?.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Propiedad Afectada</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-sm">home</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{selectedReport.properties?.ref || 'N/A'}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[150px]">{selectedReport.properties?.title || 'Sin Asignar'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-4">Descripción del Reporte</p>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                        {selectedReport.description}
                      </div>
                    </div>

                    {/* Evidence Images */}
                    {selectedReport.image_urls && selectedReport.image_urls.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-4">Evidencia Fotográfica</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {selectedReport.image_urls.map((url: string, idx: number) => (
                            <div key={idx} className="relative aspect-square rounded-[1.5rem] overflow-hidden group shadow-lg">
                              <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Evidence ${idx}`} />
                              <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-3xl">zoom_in</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-4">Actualizar Estado</p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => updateReportStatus(selectedReport.id, 'pending')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedReport.status === 'pending' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-2 ring-offset-2 ring-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-amber-100 hover:text-amber-500'}`}
                        >
                          Pendiente
                        </button>
                        <button
                          onClick={() => updateReportStatus(selectedReport.id, 'in_progress')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedReport.status === 'in_progress' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 ring-2 ring-offset-2 ring-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-blue-100 hover:text-blue-500'}`}
                        >
                          En Progreso
                        </button>
                        <button
                          onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedReport.status === 'resolved' ? 'bg-green-600 text-white shadow-lg shadow-green-200 ring-2 ring-offset-2 ring-green-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-green-100 hover:text-green-600'}`}
                        >
                          Resuelto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }


          {/* Notifications Side Panel */}
          <div>
            {
              showNotificationPanel && (
                <div className="fixed inset-0 z-[150] flex justify-end">
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowNotificationPanel(false)} />

                  <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-3xl animate-in slide-in-from-right duration-500 border-l border-slate-100 dark:border-slate-800 flex flex-col">
                    {/* Panel Header */}
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Notificaciones</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Centro de Actividad</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={markAllAsRead}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Marcar todas como leídas"
                        >
                          <span className="material-symbols-outlined text-lg">done_all</span>
                        </button>
                        <button
                          onClick={() => setShowNotificationPanel(false)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {loadingNotifications ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-20 px-10">
                          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <span className="material-symbols-outlined text-4xl">notifications_off</span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Sin notificaciones</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">Todo está al día por aquí. Te avisaremos cuando ocurra algo nuevo.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`relative p-6 rounded-[2rem] border transition-all hover:scale-[1.02] ${notif.isRead
                              ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-primary/20 shadow-lg shadow-primary/5 ring-1 ring-primary/5'
                              }`}
                          >
                            {!notif.isRead && (
                              <div className="absolute top-6 right-6 w-2 h-2 bg-primary rounded-full shadow-glow" />
                            )}

                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.type === 'appraisal' ? 'bg-amber-100 text-amber-600' :
                                notif.type === 'payment' ? 'bg-green-100 text-green-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                <span className="material-symbols-outlined text-xl">
                                  {notif.type === 'appraisal' ? 'analytics' :
                                    notif.type === 'payment' ? 'receipt_long' :
                                      'report_problem'}
                                </span>
                              </div>

                              <div className="flex-1">
                                <h5 className="font-black text-[11px] uppercase tracking-tight text-slate-900 dark:text-white leading-tight mb-1">
                                  {notif.title}
                                </h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                                  {notif.message}
                                </p>

                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>

                                  <div className="flex gap-2">
                                    {!notif.isRead && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); markNotificationAsRead(notif.id); }}
                                        className="px-4 py-2 bg-white dark:bg-slate-900 text-[8px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 rounded-xl hover:border-primary hover:text-primary transition-all"
                                      >
                                        Marcar leído
                                      </button>
                                    )}
                                    {notif.link && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (notif.link?.includes('tab=')) {
                                            const tab = notif.link.split('tab=')[1] as any;
                                            setActiveTab(tab);
                                            if (tab === 'comprobantes') fetchPaymentProofs();
                                            if (tab === 'reports') fetchReports();
                                            if (tab === 'appraisals') fetchAppraisals();
                                          }
                                          setShowNotificationPanel(false);
                                          markNotificationAsRead(notif.id);
                                        }}
                                        className="px-4 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all"
                                      >
                                        Ver Detalle
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>




                </div>
              )
            }
          </div>
          {/* Custom Confirmation Portal */}
          {
            confirmAction && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
                      <span className="material-symbols-outlined text-4xl text-primary">
                        {confirmAction.type === 'delete' ? 'delete_forever' : confirmAction.type === 'edit' ? 'edit_note' : 'task_alt'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                      {confirmAction.title}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                      {confirmAction.message}
                    </p>

                    {confirmAction.showUserOptions && (
                      <div className="mb-8 space-y-3 text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Opciones de Eliminación</p>
                        {[
                          { id: 'unlink', label: 'Solo eliminar usuario', desc: 'Mantiene las propiedades pero desvincula a la persona.' },
                          { id: 'purge', label: 'Eliminar usuario y propiedades', desc: 'Borra al usuario y todas sus propiedades/documentos.' }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setConfirmAction({ ...confirmAction, selectedOption: opt.id })}
                            className={`w-full p-5 rounded-[2rem] text-left transition-all border-2 ${confirmAction.selectedOption === opt.id
                              ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-white/5 hover:border-slate-200'
                              }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${confirmAction.selectedOption === opt.id ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                                {confirmAction.selectedOption === opt.id && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-300" />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-[11px] font-black uppercase tracking-tight ${confirmAction.selectedOption === opt.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {opt.label}
                                </p>
                                <p className="text-[9px] font-medium text-slate-400 leading-tight mt-1 lowercase first-letter:uppercase">
                                  {opt.desc}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setConfirmAction(null); }}
                        className="flex-1 px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleConfirmAction(); }}
                        className={`flex-1 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${confirmAction.type === 'delete' || confirmAction.type.toString().startsWith('delete_') ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'
                          }`}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>

                  <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-primary/50" />
                </div>
              </div>
            )
          }

          {/* Blog Editor Modal */}
          {/* Reschedule Modal */}
          {
            showRescheduleModal && selectedRescheduleAppt && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-12 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 relative mx-4">
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                  <div className="text-center mb-10">
                    <span className="inline-block p-4 rounded-3xl bg-secondary/10 text-secondary mb-6">
                      <span className="material-symbols-outlined text-4xl">edit_calendar</span>
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Reagendar Cita</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Cambio de fecha para: <span className="text-slate-900 dark:text-white font-bold">{selectedRescheduleAppt.title}</span>
                    </p>
                  </div>

                  {rescheduleStep === 1 ? (
                    // Warning Step
                    <div className="space-y-8">
                      <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-2xl">
                        <h4 className="flex items-center gap-3 text-lg font-bold text-amber-700 dark:text-amber-400 mb-2">
                          <span className="material-symbols-outlined">warning</span>
                          Atención Requerida
                        </h4>
                        <p className="text-sm text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                          Antes de reagendar, es necesario que te comuniques personalmente con el cliente ({selectedRescheduleAppt.client_name}) para acordar la nueva fecha.
                          Además, si no cuentas con las llaves de la propiedad, verifica que el propietario también tenga disponibilidad.
                        </p>
                      </div>

                      <div className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            id="coordination-check"
                            checked={rescheduleCoordinationConfirmed}
                            onChange={(e) => setRescheduleCoordinationConfirmed(e.target.checked)}
                            className="w-6 h-6 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
                          />
                        </div>
                        <label htmlFor="coordination-check" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                          Confirmo que ya me coordiné con ambas partes (cliente y propietario/inquilino) para la nueva fecha y hora.
                        </label>
                      </div>

                      <button
                        disabled={!rescheduleCoordinationConfirmed}
                        onClick={() => setRescheduleStep(2)}
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                      >
                        Siguiente
                      </button>
                    </div>
                  ) : (
                    // Date/Time Selection Step
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nueva Fecha</label>
                          <input
                            type="date"
                            value={newRescheduleDate}
                            onChange={(e) => setNewRescheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nueva Hora</label>
                          <input
                            type="time"
                            value={newRescheduleTime}
                            onChange={(e) => setNewRescheduleTime(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-500/10 p-6 rounded-2xl text-center">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          La cita se actualizará automáticamente en el calendario y en la solicitud correspondiente.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setRescheduleStep(1)}
                          className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          Atrás
                        </button>
                        <button
                          disabled={!newRescheduleDate || !newRescheduleTime}
                          onClick={submitReschedule}
                          className="flex-[2] py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50"
                        >
                          Confirmar Cambio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {/* User Deletion Confirmation Modal */}
          {
            userToDelete && (
              <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-3xl animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
                    <span className="material-symbols-outlined text-4xl">person_remove</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white text-center mb-4 leading-tight">
                    ¿Eliminar Usuario?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-bold uppercase tracking-widest mb-10 leading-relaxed">
                    Estás seguro de que quieres eliminar a <span className="text-red-500">{userToDelete.name}</span>. Esta acción no se puede deshacer.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        handleDeleteUser(userToDelete.id, userToDelete.name);
                        setUserToDelete(null);
                      }}
                      className="w-full py-5 bg-red-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                    >
                      Sí, Eliminar Permanentemente
                    </button>
                    <button
                      onClick={() => setUserToDelete(null)}
                      className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {
            showBlogEditor && (
              <BlogEditor
                post={editingBlogPost}
                onClose={() => {
                  setShowBlogEditor(false);
                  setEditingBlogPost(null);
                }}
                onSave={onSaveBlog}
                existingPosts={blogPosts}
              />
            )
          }
          {/* Approval Progress Modal */}
          {
            isProcessingApproval && (
              <div className="fixed inset-0 z-[300] bg-white/40 dark:bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6 transition-all duration-500">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-12 border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 fade-in duration-300">
                  {/* Spinning Indicator */}
                  <div className="relative w-24 h-24 mb-10">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 border-r-amber-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-500 text-3xl animate-pulse">description</span>
                    </div>
                  </div>

                  {/* Progress Text */}
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white text-center mb-3">
                    Procesando
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-bold uppercase tracking-[0.2em] animate-pulse">
                    {approvalStep}
                  </p>

                  {/* Subtle Progress Bar */}
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-10 overflow-hidden">
                    <div className="h-full bg-amber-500 w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )
          }
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
