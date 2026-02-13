import React, { useState, useEffect, useRef, useMemo } from 'react';
import ProfileManager from '../components/ProfileManager';
import RecruitmentDetailsModal from '../components/RecruitmentDetailsModal';
import { useNavigate } from 'react-router-dom';
import { Property, PropertyStatus, User, UserRole, PaymentProof, TimelineEvent, Appraisal, Notification, RentalApplication, Appointment, BlogPost } from '../types';
import { supabase } from '../services/supabaseClient';
import { tokkoService } from '../services/tokkoService';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import RecruitmentPDF from '../components/documents/RecruitmentPDF';
import KeyReceiptPDF from '../components/documents/KeyReceiptPDF';
import OwnerReportPDF from '../components/documents/OwnerReportPDF';
import { useToast } from '../context/ToastContext';
import Timeline from './Timeline';
import CalendarView from '../components/CalendarView';
import BlogEditor from '../components/BlogEditor';

import TeamManagement from '../components/TeamManagement';
import PendingConfirmations from '../components/PendingConfirmations';
import AdvisorCounterControls from '../components/AdvisorCounterControls';
import { asesorService } from '../services/asesorService';
import { Lead, AdvisorProfile, LeadStatus, LeadIntent } from '../types';

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
  type: 'status' | 'delete' | 'edit' | 'delete_user' | 'delete_proof' | 'delete_report' | 'delete_appraisal' | 'delete_rental_app' | 'delete_blog_post' | 'crm_status' | 'delete_lead';
  id: string;
  metadata?: any;
  newStatus?: PropertyStatus | LeadStatus;
  title: string;
  message: string;
  selectedReason?: string;
  showReasons?: boolean;
  selectedOption?: string;
  showUserOptions?: boolean;
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'client-panels' | 'reports' | 'comprobantes' | 'appraisals' | 'rental-apps' | 'appointments' | 'potential' | 'users-list' | 'blog' | 'recruitments' | 'signed-docs' | 'leads-crm' | 'team' | 'landing-pages' | 'advisors' | 'administration-hub' | 'internal-props' | 'advisors-hub' | 'ficha' | 'investigations' | 'calculator' | 'library' | 'achievements'>('inventory');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [advisorTypeFilter, setAdvisorTypeFilter] = useState<'cerrador' | 'opcionador' | null>(null);
  const [selectedAdvisorTab, setSelectedAdvisorTab] = useState<'leads' | 'appointments' | 'potential' | 'ficha'>('leads');
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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedRentalApp, setSelectedRentalApp] = useState<RentalApplication | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    date: '',
    time: '',
    leadId: '' as string | undefined,
    assignedTo: '' as string | undefined
  });
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);


  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [advisorSearchTerm, setAdvisorSearchTerm] = useState('');
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [blogSearchTerm, setBlogSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(propCurrentUser || null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(propCurrentUser?.role || null);
  const [activeAdvisorId, setActiveAdvisorId] = useState<string | null>(null);

  // Investigation Review State
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState<any | null>(null);
  const [reviewScore, setReviewScore] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [approvalStep, setApprovalStep] = useState('');
  const [advisorActivity, setAdvisorActivity] = useState<any[]>([]);
  const [formattedAveragePrice, setFormattedAveragePrice] = useState('');
  const [leadFormName, setLeadFormName] = useState('');
  const [leadFormPhone, setLeadFormPhone] = useState('');
  const [leadFormOpType, setLeadFormOpType] = useState('sale');
  const [leadFormSource, setLeadFormSource] = useState('Facebook');
  const [leadFormPropertyId, setLeadFormPropertyId] = useState('');

  const [calcPropertyId, setCalcPropertyId] = useState<string | null>(null);
  const [calcManualValue, setCalcManualValue] = useState<number>(0);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [calcType, setCalcType] = useState<'venta' | 'renta' | null>(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState<string | null>(null);

  const handleGenerateReport = async (prop: Property) => {
    try {
      setIsGeneratingReport(prop.id);

      // Gather broad interaction history for this specific property
      const propVisits = appointments.filter(appt => (appt as any).property_ref === prop.ref || appt.property_id === prop.id);
      const propRentalApps = rentalApps.filter(app => app.property_ref === prop.ref || app.property_id === prop.id);

      // CRITICAL: Filter out owner acquisition leads (intent: 'sell' or 'rent_out')
      // Only include buyer/renter prospect leads (intent: 'rent' or 'buy')
      const propLeads = leads.filter(l =>
        (l.property_id === prop.id || (l.property_snapshot?.ref === prop.ref)) &&
        (l.intent === 'rent' || l.intent === 'buy')
      );

      // Combine into a single history array for the PDF
      const interactionHistory = [
        ...propVisits.map(v => ({
          date: v.start_time,
          client_name: v.client_name,
          status: v.status
        })),
        ...propRentalApps.map(r => ({
          date: r.created_at,
          client_name: r.full_name,
          status: r.status === 'completed' || r.status === 'approved' ? 'completed' : 'scheduled'
        })),
        ...propLeads.map(l => ({
          date: l.created_at,
          client_name: l.full_name,
          status: l.status === 'closed_won' ? 'completed' : 'scheduled'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const blob = await pdf(<OwnerReportPDF property={prop} visits={interactionHistory} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Propietario_${prop.ref}.pdf`;
      link.click();
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('Report Generation Error:', err);
      error?.('Error al generar el reporte: ' + err.message);
    } finally {
      setIsGeneratingReport(null);
    }
  };


  // Tokko Selection State
  const [showTokkoSelector, setShowTokkoSelector] = useState(false);
  const [tokkoSearchQuery, setTokkoSearchQuery] = useState('');
  const [loadingTokkoSelect, setLoadingTokkoSelect] = useState(false);
  const [tokkoResults, setTokkoResults] = useState<any[]>([]);

  // Inventory Form State
  const [formProperty, setFormProperty] = useState<any>({
    status: PropertyStatus.AVAILABLE,
    type: 'sale',
    ref: '',
    title: '',
    price: 0,
    address: '',
    description: '',
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

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [allAdvisorProfiles, setAllAdvisorProfiles] = useState<AdvisorProfile[]>([]);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [isAdvisorEditing, setIsAdvisorEditing] = useState(false);
  const [leadDateFilter, setLeadDateFilter] = useState<'all' | 'today' | '7d' | '15d' | '30d' | '90d' | '6m' | '1y'>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadMonthFilter, setLeadMonthFilter] = useState<'all' | number>('all');
  const [isUploadingLeadPayment, setIsUploadingLeadPayment] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [apptDateFilter, setApptDateFilter] = useState<'all' | 'today' | '7d' | '15d' | '30d' | 'month'>('all');
  const [apptSubTab, setApptSubTab] = useState<'agenda' | 'calendar' | 'history'>('agenda');
  const [apptMonthFilter, setApptMonthFilter] = useState<number>(new Date().getMonth());
  const [apptStatusFilter, setApptStatusFilter] = useState<'all' | 'scheduled' | 'assigned' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const [closedTransactions, setClosedTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [feedbackSecurityStep, setFeedbackSecurityStep] = useState<'verify' | 'form'>('form');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [potentialTypeFilter, setPotentialTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [showLeadManagementPanel, setShowLeadManagementPanel] = useState(false);

  const linkedRecruitment = useMemo(() => {
    if (!selectedLead) return null;
    const leadEmail = selectedLead.email?.toLowerCase().trim();
    const leadPhone = selectedLead.phone?.replace(/\D/g, '');

    return recruitments.find(r => {
      const submissionEmail = r.form_data?.contact_email?.toLowerCase().trim();
      const profileEmail = r.profiles?.email?.toLowerCase().trim();
      const submissionPhone = r.form_data?.contact_phone?.replace(/\D/g, '');

      return (submissionEmail && submissionEmail === leadEmail) ||
        (profileEmail && profileEmail === leadEmail) ||
        (submissionPhone && submissionPhone === leadPhone);
    });
  }, [selectedLead, recruitments]);

  // Background polling for CRM synchronization
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showLeadManagementPanel && selectedLead && activeTab === 'leads-crm') {
      console.log('[CRM] Background polling started for:', selectedLead.full_name);
      interval = setInterval(() => {
        fetchRecruitments();
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showLeadManagementPanel, selectedLead?.id, activeTab]);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancellationNotes, setCancellationNotes] = useState<string>('');
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);
  const [investigationLink, setInvestigationLink] = useState('');
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'transfer' | 'cashless_withdrawal' | null>(null);
  const [showPaymentApprovalsModal, setShowPaymentApprovalsModal] = useState(false);
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState<any>(null);
  const [showOwnerAppointmentModal, setShowOwnerAppointmentModal] = useState(false);
  const [paymentProofModal, setPaymentProofModal] = useState<{ payments: any[], currentIndex: number } | null>(null);
  const [investigationScore, setInvestigationScore] = useState('');
  const [selectedLeadForCommission, setSelectedLeadForCommission] = useState<any>(null);
  const [uploadingDocumentLeadId, setUploadingDocumentLeadId] = useState<string | null>(null);

  // Moved from mid-file
  const [signedDocs, setSignedDocs] = useState<any[]>([]);
  const [allSignedDocs, setAllSignedDocs] = useState<any[]>([]);
  const [loadingAllSignedDocs, setLoadingAllSignedDocs] = useState(false);
  const [selectedFolderPropertyId, setSelectedFolderPropertyId] = useState<string | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [proofsFilter, setProofsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [proofsSearch, setProofsSearch] = useState('');
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [leadsCount, setLeadsCount] = useState(0);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'active' | 'reserved' | 'rented' | 'paused'>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [editingTimeline, setEditingTimeline] = useState<TimelineEvent[]>([]);


  const [showLinkPropertyModal, setShowLinkPropertyModal] = useState(false);
  const [linkLead, setLinkLead] = useState<Lead | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');

  const allAppointments = React.useMemo(() => {
    const rentalAppAppointments = rentalApps
      .filter(app => app.appointment_date && app.appointment_time)
      .map(app => {
        const start = `${app.appointment_date}T${app.appointment_time}`;
        let status: 'scheduled' | 'assigned' | 'confirmed' | 'completed' | 'cancelled' = 'scheduled';

        if (app.status === 'approved') status = 'confirmed';
        else if (app.status === 'cancelled' || app.status === 'rejected') status = 'cancelled';
        else if (app.assigned_to) status = 'assigned';

        const prop = properties.find(p => p.ref === app.property_ref);

        return {
          id: app.id,
          title: `${(app.application_type || 'rent') === 'sale' ? 'Venta' : 'Renta'} - ${app.property_ref}`,
          client_name: app.full_name,
          client_email: app.email,
          client_phone: app.phone,
          start_time: start,
          end_time: start,
          status: status,
          created_at: app.created_at || new Date().toISOString(),
          assigned_to: app.assigned_to,
          property_ref: app.property_ref,
          property_id: prop?.id, // Use actual UUID
          address: prop?.address || '',
          lead_id: app.id,
          isRental: true,
          is_potential: app.is_potential,
          feedback: app.feedback
        } as any as Appointment;
      });

    const dbAppointments = appointments.map(appt => {
      const prop = properties.find(p => p.ref === (appt as any).property_ref);
      return {
        ...appt,
        address: appt.address || prop?.address || ''
      };
    });

    return [...dbAppointments, ...rentalAppAppointments]
      .filter(appt => {
        // Role Access
        const hasAccess = (currentUserRole === 'admin' || currentUserRole === 'marketing') || (currentUserRole === 'asesor' && appt.assigned_to === currentUser?.id);
        if (!hasAccess) return false;

        const apptDate = new Date(appt.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = apptDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Hybrid Sub-Tabs logic
        if (apptSubTab === 'agenda') {
          // Show today and future actionable appointments
          const isFinished = appt.status === 'completed' || appt.status === 'cancelled';
          if (isFinished) return false;
          // Only show today and future
          if (diffDays < 0) return false;
        } else if (apptSubTab === 'history') {
          // Show past or finished appointments
          const isFinished = appt.status === 'completed' || appt.status === 'cancelled';
          if (!isFinished && diffDays >= 0) return false;
        }
        // 'calendar' tab shows everything (filtered by month usually)

        // Legacy Filters (still applied if not 'all')
        if (apptStatusFilter !== 'all' && appt.status !== apptStatusFilter) return false;

        if (apptDateFilter !== 'all') {
          if (apptDateFilter === 'today') return diffDays === 0;
          if (apptDateFilter === '7d') return diffDays >= 0 && diffDays <= 7;
          if (apptDateFilter === '15d') return diffDays >= 0 && diffDays <= 15;
          if (apptDateFilter === '30d') return diffDays >= 0 && diffDays <= 30;
          if (apptDateFilter === 'month') {
            return apptDate.getMonth() === apptMonthFilter && apptDate.getFullYear() === new Date().getFullYear();
          }
        }

        return true;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [appointments, rentalApps, currentUserRole, currentUser, apptDateFilter, apptStatusFilter, apptSubTab, apptMonthFilter]);

  const potentialClients = React.useMemo(() => {
    // 1. Get leads marked as potential
    const potentialLeads = leads
      .filter(l => l.is_potential)
      .map(l => ({
        id: l.id,
        full_name: l.full_name,
        email: l.email,
        phone: l.phone,
        intent: l.intent,
        status: l.status,
        property_id: l.property_id,
        updated_at: l.updated_at,
        investigation_notes: (l as any).investigation_notes,
        source: 'lead',
        assigned_to: l.assigned_to,
        referred_by: l.referred_by
      }));

    // 2. Get appointments marked as potential (from feedback)
    const potentialAppts = allAppointments
      .filter(a => (a as any).is_potential || (a.feedback as any)?.is_potential === 'true')
      .map(a => ({
        id: a.lead_id || a.id,
        full_name: a.client_name,
        email: a.client_email,
        phone: a.client_phone,
        intent: a.title.toLowerCase().includes('venta') ? 'buy' : 'rent',
        status: (a.feedback as any)?.result === 'paying_investigation' ? 'investigation_paid' : 'appointment',
        property_id: (a as any).property_id, // NEVER fallback to property_ref here
        updated_at: a.start_time,
        investigation_notes: (a.feedback as any)?.notes || (a.feedback as any)?.details,
        source: 'appointment',
        assigned_to: a.assigned_to,
        referred_by: undefined
      }));

    // 3. Get property submissions (recruitments) for Opcionador
    const recruitedOwners = recruitments
      .filter(r => currentUserRole === 'admin' || r.referred_by === currentUser?.id || r.owner_id === currentUser?.id)
      .map(r => ({
        id: r.id,
        full_name: r.form_data?.contact_first_names ? `${r.form_data.contact_first_names} ${r.form_data.contact_last_names}` : (r.owner?.full_name || 'Propietario'),
        email: r.form_data?.contact_email || r.owner?.email,
        phone: r.form_data?.contact_phone,
        intent: r.type === 'sale' ? 'sell' : 'rent_out',
        status: r.status === 'draft' ? 'Carga de datos' : (r.status === 'pending' ? 'Pendiente revisión' : r.status),
        property_id: undefined,
        updated_at: r.updated_at,
        investigation_notes: r.rejection_reason || r.feedback,
        source: 'recruitment',
        assigned_to: undefined,
        referred_by: r.referred_by
      }));

    // 4. Merge and deduplicate by email or phone or ID
    const merged = [...potentialLeads];
    potentialAppts.forEach(appt => {
      const exists = merged.find(m =>
        m.id === appt.id ||
        (appt.email && m.email === appt.email) ||
        (appt.phone && m.phone === appt.phone)
      );
      if (!exists) {
        merged.push(appt as any);
      }
    });

    // Add recruited owners
    recruitedOwners.forEach(owner => {
      const exists = merged.find(m =>
        m.id === owner.id ||
        (owner.email && m.email === owner.email) ||
        (owner.phone && m.phone === owner.phone)
      );
      if (!exists) {
        merged.push(owner as any);
      }
    });

    return merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [leads, allAppointments, recruitments, currentUser]);


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
        } else if (role === 'asesor' && !['potential', 'appointments', 'appraisals', 'leads', 'team', 'advisor-properties', 'ficha', 'calculator', 'library', 'achievements'].includes(activeTab)) {
          setActiveTab('team');
        }
      }
    };

    determineUser();
  }, [users, activeTab, propCurrentUser]);

  // Fetch leads for advisors or admin
  useEffect(() => {
    if ((currentUserRole === 'admin' || currentUserRole === 'asesor') && (activeTab === 'leads' || activeTab === 'inventory' || activeTab === 'advisors' || activeTab === 'advisor-properties' || activeTab === 'payment_approvals')) {
      fetchLeads();
    }
  }, [currentUserRole, activeTab, currentUser]);

  const advisorPhotoInputRef = useRef<HTMLInputElement>(null);
  const leadPaymentInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLeadId, setUploadingLeadId] = useState<string | null>(null);
  const [approvedFilter, setApprovedFilter] = useState<'7d' | '15d' | '30d'>('7d');

  const fetchAdvisorProfiles = async () => {
    const { data } = await supabase.from('asesor_profiles').select('*');
    setAllAdvisorProfiles(data || []);
  };

  // Fetch advisor profile and advisor list
  useEffect(() => {
    if (currentUserRole === 'asesor' && activeTab === 'team' && currentUser) {
      asesorService.getAdvisorProfile(currentUser.id).then(setAdvisorProfile);
    }
    if ((currentUserRole === 'admin' || currentUserRole === 'asesor' || currentUserRole === 'marketing') &&
      (activeTab === 'rental-apps' || activeTab === 'team' || activeTab === 'appointments' || activeTab === 'leads' || activeTab === 'advisor-properties' || activeTab === 'advisors' || activeTab === 'blog')) {
      fetchAdvisorProfiles();

      // Fallback: If for some reason the prop users is empty, fetch them here too (staff only)
      if (users.length === 0) {
        supabase.from('profiles').select('id, email, full_name, role, sold_count, rented_count').then(({ data }) => {
          if (data) {
            const mapped = data.map((u: any) => ({
              id: u.id,
              email: u.email || '',
              name: u.full_name || 'Sin Nombre',
              role: u.role as UserRole,
              sold_count: u.sold_count || 0,
              rented_count: u.rented_count || 0
            }));
            onUsersUpdate(mapped);
          }
        });
      }
    }
  }, [currentUserRole, activeTab, currentUser, users.length, onUsersUpdate]);

  // Proactive missing profile identification and resolution
  useEffect(() => {
    if (!supabase || allAppointments.length === 0) return;

    const missingIds = Array.from(new Set(allAppointments
      .filter(a => a.assigned_to && !users.some(u => u.id === a.assigned_to))
      .map(a => a.assigned_to as string)
    ));

    if (missingIds.length > 0) {
      supabase.from('profiles')
        .select('id, full_name, role')
        .in('id', missingIds)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const newMapped = data.map((u: any) => ({
              id: u.id,
              email: '',
              name: u.full_name || 'Sin Nombre',
              role: u.role as UserRole
            }));
            // Only update if we actually found something new
            onUsersUpdate([...users, ...newMapped.filter(nm => !users.some(u => u.id === nm.id))]);
          }
        });
    }
  }, [allAppointments, users, onUsersUpdate]);

  const fetchClosedTransactions = async (advisorId: string) => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('advisor_transactions')
        .select('*')
        .eq('advisor_id', advisorId)
        .in('transaction_type', ['sale', 'rental'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClosedTransactions(data || []);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (showLeadForm) {
      if (selectedLead) {
        setLeadFormName(selectedLead.full_name || '');
        setLeadFormPhone(selectedLead.phone || '');
        setLeadFormOpType(selectedLead.operation_type || 'sale');
        setLeadFormSource(selectedLead.source || 'Facebook');
        setLeadFormPropertyId(selectedLead.property_id || '');
        setFormattedAveragePrice(selectedLead.average_price ? selectedLead.average_price.toLocaleString() : '');
      } else {
        setLeadFormName('');
        setLeadFormPhone('');
        setLeadFormOpType('sale');
        setLeadFormSource('Facebook');
        setLeadFormPropertyId('');
        setFormattedAveragePrice('');
      }
    } else {
      setLeadFormName('');
      setLeadFormPhone('');
      setLeadFormOpType('sale');
      setLeadFormSource('Facebook');
      setLeadFormPropertyId('');
      setFormattedAveragePrice('');
    }
  }, [showLeadForm, selectedLead]);

  useEffect(() => {
    if (showAppointmentForm && selectedLead) {
      setAppointmentForm(prev => ({
        ...prev,
        clientName: selectedLead.full_name,
        clientPhone: selectedLead.phone,
        leadId: selectedLead.id,
        title: `Visita - ${selectedLead.full_name}`
      }));
    } else if (!showAppointmentForm) {
      // Form is reset in handleCreateAppointment on success, 
      // but let's ensure it's clean if just closed.
      setAppointmentForm({ title: '', clientName: '', clientPhone: '', clientEmail: '', date: '', time: '', leadId: undefined, assignedTo: undefined });
    }
  }, [showAppointmentForm, selectedLead]);

  useEffect(() => {
    if (selectedAdvisorId) {
      fetchClosedTransactions(selectedAdvisorId);
    } else {
      setClosedTransactions([]);
    }
  }, [selectedAdvisorId]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const data = await asesorService.getLeads(currentUserRole === 'asesor' ? currentUser?.id : undefined);
      setLeads(data);
      if (currentUser?.id) {
        const activity = await asesorService.getActivityLogs(currentUser.id);
        setAdvisorActivity(activity);
      }
    } catch (err) {
      error('Error al cargar prospectos');
    } finally {
      setLoadingLeads(false);
    }
  };

  const getAdvisorName = (id?: string) => {
    if (!id) return 'Sin Asignar';
    const found = users.find(u => u.id === id);
    if (found) return found.name;
    if (id === currentUser?.id) return currentUser.name;
    if (allAdvisorProfiles.some(ap => ap.user_id === id)) return 'Asesor Magno';
    return `ID: ${id.slice(0, 8)} `;
  };

  const handleAdvisorPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setIsUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `advisors/${currentUser.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('media').getPublicUrl(fileName);
      await asesorService.updateAdvisorProfile(currentUser.id, { photo_url: data.publicUrl });

      const newPhotoUrl = data.publicUrl;
      setAdvisorProfile(prev => prev ?
        { ...prev, photo_url: newPhotoUrl, updated_at: new Date().toISOString() } :
        {
          user_id: currentUser.id,
          photo_url: newPhotoUrl,
          is_verified: false,
          sold_count: 0,
          rented_count: 0,
          weekly_goal: 50000,
          advisor_type: 'cerrador',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
      success('Foto actualizada con éxito');
    } catch (err: any) {
      console.error('Storage Error:', err);
      error('Error al subir foto: ' + (err.message || 'Error de permisos'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus, metadata: any = {}) => {
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // CRITICAL: ID Conflict Protection
    if (leadId === currentUser?.id) {
      console.error("[CRM] Critical Error: Attempted to update Advisor profile as a Lead.", leadId);
      error("Error de Sincronización: ID de Asesor detectado como Lead. Por favor refresca la página.");
      return false;
    }

    // Sanitize metadata property_id
    if (metadata.property_id && !isUUID(metadata.property_id)) {
      console.warn(`[CRM] Sanitizing non-UUID property_id: ${metadata.property_id}`);
      delete metadata.property_id;
    }

    try {
      let updatedLead: Lead;
      try {
        updatedLead = await asesorService.updateLeadStatus(leadId, newStatus, metadata);
      } catch (err: any) {
        // Fallback: If lead doesn't exist in CRM table yet, try to create it from current context
        if (err.message.includes('No se encontró') && selectedLead && (selectedLead.id === leadId || (selectedLead.email && metadata.email === selectedLead.email))) {
          console.log("[CRM] Lead not found in CRM table. Synchronizing from source...");

          const sanitizedPropertyId = selectedLead.property_id && isUUID(selectedLead.property_id)
            ? selectedLead.property_id
            : undefined;

          const newLeadData = {
            full_name: selectedLead.full_name,
            email: selectedLead.email,
            phone: selectedLead.phone,
            intent: selectedLead.intent || 'rent',
            property_id: sanitizedPropertyId,
            status: newStatus,
            assigned_to: currentUser?.id,
            ...metadata
          };
          updatedLead = await asesorService.createLead(newLeadData);
          console.log("[CRM] Lead created and synchronized successfully:", updatedLead.id);
        } else {
          throw err;
        }
      }

      // Auto-increment metrics on closing
      if (newStatus === 'closed_won') {
        const lead = leads.find(l => l.id === leadId) || updatedLead;
        if (lead && lead.assigned_to) {
          await asesorService.incrementAdvisorMetrics(lead.assigned_to, lead.intent === 'rent' ? 'rent' : 'sale');
        }
      }

      // Synchronize state
      fetchLeads(); // Refresh leads list
      if (selectedLead && (selectedLead.id === leadId || selectedLead.id === updatedLead.id)) {
        setSelectedLead(updatedLead);
      }

      return true;
    } catch (err: any) {
      console.error("[CRM] Error updating lead status:", err);
      // More specific error message for the user if it's still failing
      if (err.message.includes('No se encontró')) {
        error("El prospecto no está registrado en el CRM todavía. Prueba 'Registrar Prospecto' primero.");
      } else {
        error(`Error: ${err.message} `);
      }
      return false;
    }
  };

  const handleReviewInvestigation = async (status: 'approved' | 'rejected') => {
    if (!selectedInvestigation) return;

    setIsProcessingApproval(true);
    try {
      const updates: any = {
        investigation_status: status === 'approved' ? 'approved' : 'rejected',
        investigation_reviewed_at: new Date().toISOString(),
        investigation_reviewed_by: currentUser?.id
      };

      if (status === 'approved') {
        const score = parseInt(reviewScore);
        if (isNaN(score) || score < 0 || score > 100) {
          error('Por favor ingresa un puntaje válido (0-100)');
          setIsProcessingApproval(false);
          return;
        }
        updates.investigation_score = score;
        updates.investigation_notes = reviewNotes;

        if (selectedInvestigation.source === 'rental_app') {
          await supabase.from('rental_applications').update({
            status: 'investigation_passed', // Workflow: pending -> investigating -> investigation_passed
            ...updates
          }).eq('id', selectedInvestigation.id);
        } else {
          // For leads, we use the helper to update status and other fields
          await handleUpdateLeadStatus(selectedInvestigation.id, 'investigation_passed', updates);
        }
        success('Investigación Aprobada');
      } else {
        // REJECTED
        updates.investigation_score = 0;
        updates.investigation_notes = reviewNotes;
        updates.archived_at = new Date().toISOString();
        updates.investigation_status = 'rejected';

        if (selectedInvestigation.source === 'rental_app') {
          await supabase.from('rental_applications').update({
            status: 'archived_potential',
            ...updates
          }).eq('id', selectedInvestigation.id);
        } else {
          // For leads
          await handleUpdateLeadStatus(selectedInvestigation.id, 'archived_potential', updates);
        }
        success('Investigación Rechazada y Archivada');
      }

      setShowInvestigationModal(false);
      setReviewScore('');
      setReviewNotes('');
      fetchLeads();
      fetchRentalApps();
    } catch (err: any) {
      console.error(err);
      error('Error al procesar investigación: ' + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };


  function renderInvestigationReview() {
    // Combine Leads and Rental Apps in 'investigating' status
    const investigatingLeads = leads.filter(l => l.status === 'investigating').map(l => ({ ...l, source: 'lead', name: l.full_name }));
    const investigatingApps = rentalApps.filter(a => a.status === 'investigating').map(a => ({ ...a, source: 'rental_app', name: a.full_name, property_ref: a.property_ref }));

    const items = [...investigatingLeads, ...investigatingApps];

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_check</span>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay investigaciones pendientes</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-400" />

            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">
                  {item.source === 'rental_app' ? 'Solicitud Renta' : 'Prospecto CRM'}
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{item.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">{item.email}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-slate-100 dark:text-slate-800 absolute top-8 right-8">fact_check</span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Propiedad Ref</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.property_ref || item.property_id || 'N/A'}</p>
              </div>
              {item.investigation_link && (
                <a href={item.investigation_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:text-blue-400 text-xs font-bold transition-colors">
                  <span className="material-symbols-outlined text-lg">link</span>
                  Ver Expediente de Investigación
                </a>
              )}
              <div className="text-xs text-slate-400 font-medium">
                Iniciado: {new Date(item.investigation_started_at || item.created_at).toLocaleDateString()}
              </div>
            </div>

            <button
              onClick={() => { setSelectedInvestigation(item); setShowInvestigationModal(true); }}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">rate_review</span>
              Calificar Resultados
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderArchivedPotential() {
    const archivedLeads = leads.filter(l => l.status === 'archived_potential').map(l => ({ ...l, source: 'lead', name: l.full_name }));
    const archivedApps = rentalApps.filter(a => a.status === 'archived_potential').map(a => ({ ...a, source: 'rental_app', name: a.full_name, property_ref: a.property_ref }));
    const items = [...archivedLeads, ...archivedApps].sort((a, b) => new Date(b.archived_at || b.updated_at).getTime() - new Date(a.archived_at || a.updated_at).getTime());

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">archive</span>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay investigaciones rechazadas en archivo</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group opacity-75 hover:opacity-100 transition-opacity">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-200 dark:bg-slate-700" />

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-500 text-[8px] font-black uppercase tracking-widest mb-2 border border-red-100">
                  Rechazado
                </span>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {item.source === 'rental_app' ? 'Solicitud Renta' : 'Prospecto CRM'}
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">{item.name}</h3>
              </div>
              <span className="material-symbols-outlined text-4xl text-slate-100 dark:text-slate-800 absolute top-8 right-8">folder_off</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-6">
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-2">Notas de Rechazo</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">
                "{item.investigation_notes || 'Sin notas registradas'}"
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Ref: {item.property_ref || item.property_id || 'N/A'}</span>
              <span>{new Date(item.archived_at || item.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleCancelProcess = async (reason: string, notes: string) => {
    if (!selectedLead) return;
    setIsProcessingCancellation(true);
    try {
      await handleUpdateLeadStatus(selectedLead.id, 'closed_lost', {
        cancellation_reason: reason,
        investigation_notes: notes ? `Cancelación: ${notes}` : undefined
      });
      setShowCancellationModal(false);
      setCancellationReason('');
      setCancellationNotes('');
      setShowLeadManagementPanel(false);
      success('Proceso de prospecto detenido');
    } catch (err) {
      error('Error al detener proceso');
    } finally {
      setIsProcessingCancellation(false);
    }
  };

  const handleLeadPaymentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingLeadId) return;
    setIsUploadingLeadPayment(true);
    try {
      const url = await asesorService.uploadPaymentProof(uploadingLeadId, file);
      // Update lead with payment proof and set to investigation_paid status
      // Use only date part for payment_date to match Postgres DATE column
      const statusUpdated = await handleUpdateLeadStatus(uploadingLeadId, 'investigation_paid', {
        payment_proof_url: url,
        payment_method: selectedPaymentMethod || 'transfer',
        payment_date: new Date().toISOString().split('T')[0],
        payment_status: 'under_review'
      });

      if (statusUpdated) {
        success('¡COMPROBANTE OK! - Sincronizando CRM...');
        setSelectedPaymentMethod(null);
        setShowPaymentMethodModal(false);
      }
    } catch (err: any) {
      console.error('Error uploading lead payment:', err);
      error(`Error al subir comprobante: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsUploadingLeadPayment(false);
      setUploadingLeadId(null);
    }
  };

  const handleApprovePayment = async () => {
    if (!selectedPaymentForApproval || !investigationLink.trim()) {
      error('Por favor ingresa el link de investigación');
      return;
    }

    try {
      // Determine if this is a Rental Application or a CRM Lead
      const isRentalApp = rentalApps.some(app => app.id === selectedPaymentForApproval.id);
      const intent = selectedPaymentForApproval.intent || (selectedPaymentForApproval as any).application_type;

      // Determine next status based on intent
      const nextStatus: LeadStatus = (intent === 'rent' || intent === 'rent_out')
        ? 'investigating'
        : 'investigation_passed';

      if (isRentalApp) {
        // Update rental_applications table
        const { error: updateError } = await supabase
          .from('rental_applications')
          .update({
            payment_status: 'approved',
            status: nextStatus as any,
            investigation_link: investigationLink.trim(),
            investigation_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPaymentForApproval.id);

        if (updateError) throw updateError;
      } else {
        // Update leads_prospectos table via helper
        await handleUpdateLeadStatus(selectedPaymentForApproval.id, nextStatus, {
          payment_status: 'approved',
          investigation_link: investigationLink.trim(),
          investigation_started_at: new Date().toISOString()
        });
      }

      success('Pago aprobado. Link de investigación enviado al asesor.');
      setSelectedPaymentForApproval(null);
      setInvestigationLink('');

      // Refresh data
      fetchLeads();
      fetchRentalApps();
    } catch (err) {
      console.error('Error in handleApprovePayment:', err);
      error('Error al aprobar el pago');
    }
  };




  const handleRequestCommission = async () => {
    if (!selectedLeadForCommission) return;

    try {
      // 1. Create commission record
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert({
          lead_id: selectedLeadForCommission.id,
          advisor_id: currentUser?.id,
          amount: selectedLeadForCommission.budget || 0,
          status: 'pending',
          property_address: selectedLeadForCommission.property_ref
        });

      if (commissionError) throw commissionError;

      // 2. Update lead status
      await handleUpdateLeadStatus(selectedLeadForCommission.id, 'closed_won', {
        commission_requested: true,
        commission_requested_at: new Date().toISOString()
      });

      success('Comisión solicitada correctamente');
      setSelectedLeadForCommission(null);
    } catch (err) {
      console.error('Error asking for commission:', err);
      error('Error al solicitar comisión');
    }
  };

  const handleInvestigationDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, leadId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/investigation_documents/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('leads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('leads')
        .getPublicUrl(fileName);

      await handleUpdateLeadStatus(leadId, 'appointment', {
        documents_signed: true,
        documents_url: publicUrl,
        documents_uploaded_at: new Date().toISOString()
      });

      success('Documentos de investigación subidos correctamente');
    } catch (err) {
      console.error('Error uploading documents:', err);
      error('Error al subir documentos');
    } finally {
      setUploadingDocumentLeadId(null);
    }
  };

  const handleCreateLead = async (leadData: Partial<Lead>) => {
    try {
      // Clean average_price from commas if it's a string from the form
      const cleanedPrice = leadData.average_price ? Number(leadData.average_price.toString().replace(/,/g, '')) : undefined;
      const dataToSubmit = { ...leadData, average_price: cleanedPrice };

      if (selectedLead) {
        await asesorService.updateLeadStatus(selectedLead.id, dataToSubmit.status || selectedLead.status, dataToSubmit);
        success('Prospecto actualizado correctamente');
      } else {
        if (!currentUser) throw new Error('Usuario no identificado');

        // Infer intent based on operation type and advisor type
        let inferredIntent: LeadIntent = 'rent';
        const opType = dataToSubmit.operation_type || 'sale';
        const isOpcionador = advisorProfile?.advisor_type === 'opcionador';

        if (opType === 'sale') {
          inferredIntent = isOpcionador ? 'sell' : 'buy';
        } else {
          inferredIntent = isOpcionador ? 'rent_out' : 'rent';
        }

        const leadPayload = {
          ...dataToSubmit,
          intent: inferredIntent,
          assigned_to: currentUser.id,
          referred_by: currentUser.id,
          status: 'contacting' as LeadStatus
        };
        await asesorService.createLead(leadPayload);
        success('Prospecto registrado correctamente');
      }
      setShowLeadForm(false);
      fetchLeads();
    } catch (err) {
      error('Error al registrar prospecto');
    }
  };

  const handleOwnerAppointmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const mode = formData.get('mode') as string;

    if (!selectedLead || !currentUser) return;

    try {
      // 1. Create Appointment Record
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const { error: apptError } = await supabase.from('appointments').insert({
        lead_id: selectedLead.id,
        property_id: selectedLead.property_id, // Might be null
        title: `Cita Propietario - ${selectedLead.full_name}`,
        client_name: selectedLead.full_name,
        client_phone: selectedLead.phone,
        client_email: selectedLead.email,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        assigned_to: currentUser.id, // Opcionador assigns to self
        status: 'confirmed',
        description: `Cita con propietario (${mode === 'virtual' ? 'Virtual' : 'Presencial'}). Origen: Prospección Opcionador.`
      });

      if (apptError) throw apptError;

      // 2. Update Lead Status
      // We use 'meeting_doubts' as the next step for Opcionador
      const updateData: any = {
        investigation_notes: `Cita agendada: ${date} a las ${time} (${mode === 'virtual' ? 'Virtual' : 'Presencial'})`
      };

      await asesorService.updateLeadStatus(selectedLead.id, 'meeting_doubts' as LeadStatus, updateData);

      success('Cita con propietario agendada correctamente');
      setShowOwnerAppointmentModal(false);
      fetchLeads(); // Refresh to update status in UI
    } catch (err: any) {
      console.error(err);
      error('Error al agendar cita: ' + err.message);
    }
  };


  function renderAppointmentsView(advisorId?: string) {
    const filteredAppts = advisorId
      ? allAppointments.filter(appt => appt.assigned_to === advisorId)
      : allAppointments;

    return (
      <div className="space-y-8">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit">
          {[
            { id: 'agenda', label: 'Agenda', icon: 'event_note' },
            { id: 'history', label: 'Historial', icon: 'history' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setApptSubTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${apptSubTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {filteredAppts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">calendar_today</span>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay citas registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAppts.map(appt => (
              <div key={appt.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between mb-6">
                  <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${appt.status === 'confirmed' ? 'bg-green-500 text-white' :
                    appt.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                    {appt.status}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {new Date(appt.start_time).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
                  {appt.title}
                </h3>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined text-lg">person</span>
                    <p className="text-xs font-bold uppercase tracking-widest">{appt.client_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {new Date(appt.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {appt.address && (
                    <div className="flex items-start gap-3 text-slate-500">
                      <span className="material-symbols-outlined text-lg mt-0.5">location_on</span>
                      <p className="text-xs font-bold line-clamp-2">{appt.address}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedAppointment(appt); setShowAppointmentForm(true); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Editar
                  </button>
                  {appt.client_phone && (
                    <a
                      href={`https://wa.me/${appt.client_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-green-500/10 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined">chat</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }


  function renderPotentialClientsView(advisorId?: string) {
    const filteredPotential = advisorId
      ? potentialClients.filter(pc => pc.assigned_to === advisorId || pc.referred_by === advisorId)
      : potentialClients;

    return (
      <div className="space-y-8">
        {filteredPotential.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">rocket_launch</span>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay clientes potenciales</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPotential.map(pc => (
              <div key={pc.id} className="relative group bg-[#0f0f13] p-8 rounded-[2.5rem] border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 overflow-hidden">
                {/* Neon Background Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-600/20 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 group-hover:bg-indigo-600/20 transition-all duration-700"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${pc.source === 'lead'
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                      : pc.source === 'recruitment' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                        : 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                      }`}>
                      {pc.source === 'lead' ? 'Prospecto' : pc.source === 'recruitment' ? 'Dueño' : 'Cita'}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
                      <span className="material-symbols-outlined text-white text-lg">rocket_launch</span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2 leading-tight">
                    {pc.full_name}
                  </h3>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-purple-200 transition-colors">
                      <span className="material-symbols-outlined text-lg">mail</span>
                      <p className="text-xs font-bold lowercase truncate">{pc.email || 'Sin email'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-purple-200 transition-colors">
                      <span className="material-symbols-outlined text-lg">call</span>
                      <p className="text-xs font-bold uppercase tracking-widest">{pc.phone || 'Sin teléfono'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-purple-200 transition-colors">
                      <span className="material-symbols-outlined text-lg">info</span>
                      <p className="text-xs font-bold uppercase tracking-widest">{pc.status}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (pc.source === 'lead') {
                        const lead = leads.find(l => l.id === pc.id);
                        if (lead) { setSelectedLead(lead); setShowLeadManagementPanel(true); }
                      } else {
                        const appt = allAppointments.find(a => (a.lead_id || a.id) === pc.id);
                        if (appt) { setSelectedAppointment(appt); setShowAppointmentForm(true); }
                      }
                    }}
                    className="w-full py-4 bg-white text-[#0f0f13] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl hover:shadow-purple-500/20"
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleTogglePotential = async (lead: Lead) => {
    try {
      const isPotential = lead.is_potential;
      const { error: updateError } = await supabase
        .from('leads_prospectos')
        .update({ is_potential: !isPotential })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      success(!isPotential ? '¡Cliente marcado como Potencial!' : 'Cliente removido de Potenciales');
      fetchLeads();
    } catch (err) {
      error('Error al actualizar estado');
    }
  };

  function renderLeadsTab(leadsSource: Lead[] = leads) {
    const targetAdvisorProfile = selectedAdvisorId ? allAdvisorProfiles.find(ap => ap.user_id === selectedAdvisorId) : null;
    const isTargetOpcionador = targetAdvisorProfile?.advisor_type === 'opcionador';
    const isCerradorDetail = selectedAdvisorId && !isTargetOpcionador;
    const isOpcionadorDetail = selectedAdvisorId && isTargetOpcionador;

    return (
      <div className="grid grid-cols-1 gap-6">
        {selectedAdvisorId && (
          <div className="mb-6">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Prospectos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 ml-1">Gestión Centralizada de Cliente</p>
          </div>
        )}
        {/* Filters Panel - Restored & Polished */}
        <div className="flex flex-col gap-6 mb-4 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
          {/* Search and Month Filter Row */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group w-full">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input
                type="text"
                placeholder="BUSCAR PROSPECTO POR NOMBRE..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-950 rounded-[1.8rem] border border-slate-100 dark:border-white/5 font-black text-[10px] uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:text-white"
              />
            </div>
            <div className="relative w-full md:w-72 group">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">calendar_view_month</span>
              <select
                value={leadMonthFilter}
                onChange={(e) => setLeadMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full pl-16 pr-12 py-5 bg-slate-50 dark:bg-slate-950 rounded-[1.8rem] border border-slate-100 dark:border-white/5 font-black text-[10px] uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-white"
              >
                <option value="all">TODOS LOS MESES</option>
                {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="h-px bg-slate-50 dark:bg-white/5 w-full" />

          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
            <span className="material-symbols-outlined text-slate-400 shrink-0">history</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {[
                { id: 'all', label: 'Todo el tiempo' },
                { id: 'today', label: 'Hoy' },
                { id: '7d', label: '7 días' },
                { id: '30d', label: 'Este mes' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setLeadDateFilter(f.id as any);
                    setLeadMonthFilter('all'); // Clear month filter if standard period selected
                  }}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${leadDateFilter === f.id && leadMonthFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg scale-105'
                    : 'bg-transparent text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <span className="material-symbols-outlined text-slate-400 shrink-0">filter_alt</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {((isOpcionadorDetail || (advisorProfile?.advisor_type === 'opcionador' && !selectedAdvisorId)) ? [
                { id: 'all', label: 'Todos' },
                { id: 'contacting', label: 'Contactando' },
                { id: 'interested', label: 'Interesados' },
                { id: 'meeting_doubts', label: 'Revisión Dudas' },
                { id: 'property_loading', label: 'En Carga' },
                { id: 'property_signing', label: 'En Firma' },
                { id: 'published', label: 'Publicada' },
                { id: 'closed_won', label: 'Cerrados' }
              ] : [
                { id: 'all', label: 'Todos' },
                { id: 'contacting', label: 'Contactando' },
                { id: 'appointment', label: 'Citas' },
                { id: 'investigation_paid', label: 'En Fila (Pago Revisión)' },
                { id: 'investigating', label: 'En Investigación' },
                { id: 'investigation_passed', label: 'Aprobados' },
                { id: 'ready_to_close', label: 'En Cierre' },
                { id: 'closed_won', label: 'Cerrados' }
              ]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setLeadStatusFilter(s.id as any)}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${leadStatusFilter === s.id
                    ? 'bg-[#b4975a] text-white border-[#b4975a] shadow-lg shadow-[#b4975a]/20 transform scale-105'
                    : 'bg-transparent text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingLeads ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#b4975a] border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leadsSource
              .filter(l => {
                const matchesSearch = !leadSearchQuery || l.full_name.toLowerCase().includes(leadSearchQuery.toLowerCase());
                const matchesMonth = leadMonthFilter === 'all' || new Date(l.created_at).getMonth() === leadMonthFilter;

                const matchesDate = (() => {
                  if (leadMonthFilter !== 'all') return true; // Month filter overrides standard date filters
                  const now = new Date();
                  const leadDate = new Date(l.created_at);
                  if (leadDateFilter === 'today') return leadDate.toDateString() === now.toDateString();
                  if (leadDateFilter === '7d') return (now.getTime() - leadDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
                  if (leadDateFilter === '30d') return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
                  return true;
                })();

                const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
                return matchesSearch && matchesMonth && matchesDate && matchesStatus;
              })
              .map(l => (
                <div
                  key={l.id}
                  className={`group relative p-10 rounded-[4rem] transition-all duration-700 overflow-hidden flex flex-col justify-between h-full border ${(l as any).is_potential
                    ? 'bg-slate-950 border-purple-500/30'
                    : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none'
                    } hover:-translate-y-3 hover:scale-[1.02] active:scale-[0.98] cursor-default`}
                >
                  {/* Decorative Background Elements */}
                  <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-30 pointer-events-none transition-colors duration-700 ${(l as any).is_potential ? 'bg-purple-600' : 'bg-primary/40'
                    }`} />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Header: Avatar + Status/Star */}
                    <div className="flex items-start justify-between mb-10">
                      <div className="relative group/avatar">
                        <div className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center transition-all duration-500 transform group-hover/avatar:rotate-6 ${(l as any).is_potential
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-2xl shadow-purple-500/40'
                          : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600'
                          }`}>
                          <span className="material-symbols-outlined text-4xl">
                            {(l as any).is_potential ? 'auto_awesome' : 'home_work'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${l.status === 'closed_won' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                          l.status === 'appointment' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            (l as any).is_potential ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5'
                          }`}>
                          {l.status}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePotential(l);
                          }}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${(l as any).is_potential
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-300 hover:text-amber-500 border border-slate-100 dark:border-white/10 shadow-sm'
                            }`}
                        >
                          <span className={`material-symbols-outlined text-2xl transition-transform duration-500 cursor-pointer ${(l as any).is_potential ? 'fill-current scale-110' : 'group-hover:rotate-12'
                            }`}>
                            {(l as any).is_potential ? 'grade' : 'star'}
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              type: 'delete_lead',
                              id: l.id,
                              title: 'Eliminar Prospecto',
                              message: `¿Estás seguro de eliminar a ${l.full_name}? Esta acción no se puede deshacer.`,
                              showReasons: false
                            });
                          }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 border border-slate-100 dark:border-white/10 shadow-sm transition-all hover:bg-red-50 dark:hover:bg-red-900/10 group/delete"
                        >
                          <span className="material-symbols-outlined text-xl group-hover/delete:scale-110 transition-transform">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Content: Name + Contact */}
                    <div className="mb-10">
                      <h3 className={`text-2xl font-black uppercase tracking-tighter mb-4 leading-none transition-colors ${(l as any).is_potential ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`} title={l.full_name}>
                        {l.full_name}
                      </h3>

                      <div className="space-y-3">

                        <div className="flex items-center gap-4 group/contact cursor-pointer">
                          <div className={`p-2.5 rounded-xl transition-colors ${(l as any).is_potential ? 'bg-white/5 text-purple-400' : 'bg-slate-50 dark:bg-white/5 text-slate-400 group-hover/contact:text-primary'
                            }`}>
                            <span className="material-symbols-outlined text-lg">smartphone</span>
                          </div>
                          <p className={`text-[11px] font-black tracking-widest transition-colors ${(l as any).is_potential ? 'text-slate-400 group-hover/contact:text-white' : 'text-slate-500 group-hover/contact:text-slate-900 dark:group-hover/contact:text-white'
                            }`}>
                            {l.phone || 'NO DISPONIBLE'}
                          </p>
                        </div>

                        {l.average_price && (
                          <div className="flex items-center gap-4 group/price cursor-pointer border-t border-slate-100 dark:border-white/5 pt-3">
                            <div className={`p-2.5 rounded-xl transition-colors ${(l as any).is_potential ? 'bg-white/5 text-purple-400' : 'bg-slate-50 dark:bg-white/5 text-slate-400 group-hover/price:text-primary'
                              }`}>
                              <span className="material-symbols-outlined text-lg">payments</span>
                            </div>
                            <p className={`text-[11px] font-black tracking-widest transition-colors ${(l as any).is_potential ? 'text-slate-400 group-hover/price:text-white' : 'text-slate-500 group-hover/price:text-slate-900 dark:group-hover/price:text-white'
                              }`}>
                              ${Number(l.average_price).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}

                    {/* Link Property Button (Manual Override) */}
                    {(l.status === 'property_loading' || l.status === 'property_signing') && !l.is_potential && (
                      <div className="col-span-2 mb-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkLead(l);
                            setShowLinkPropertyModal(true);
                          }}
                          className="w-full py-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">link</span>
                          Vincular Propiedad (Ya Firmó)
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <button
                        onClick={() => { setSelectedLead(l); setShowLeadForm(true); }}
                        className={`py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all ${(l as any).is_potential
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        Perfil
                      </button>

                      <button
                        onClick={() => { setSelectedLead(l); setShowLeadManagementPanel(true); }}
                        className={`py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all transform shadow-xl ${(l as any).is_potential
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-purple-900/40 hover:brightness-110 active:scale-95'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/10 dark:shadow-white/10 hover:scale-[1.05] active:scale-95'
                          } flex items-center justify-center gap-2`}
                      >
                        Gestionar
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>

                    {/* Special CTA for Contacting */}
                    {l.status === 'contacting' && (
                      <button
                        onClick={() => {
                          setSelectedLead(l);
                          setShowAppointmentForm(true);
                        }}
                        className="mt-4 w-full py-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xs">event</span>
                        Agendar Cita
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  function renderAdvisorPropertiesList(advisorProps: any[], visits: any[], isGeneratingReport: string | null, handleGenerateReport: (prop: any) => void) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {advisorProps.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">home_work</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin propiedades reclutadas</p>
          </div>
        ) : (
          advisorProps.map(prop => {
            const propVisits = visits.filter(v => v.property_id === prop.id).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

            return (
              <div key={prop.id} className="group bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col">
                <div className="relative h-48 overflow-hidden shrink-0">
                  <img
                    src={prop.main_image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 text-[7px] font-black uppercase tracking-widest text-white shadow-lg">
                      {prop.source === 'tokko' ? 'Tokko' : 'Magno'}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex justify-between items-end">
                      <div className="min-w-0">
                        <p className="text-primary font-black text-[8px] uppercase tracking-widest mb-0.5">{prop.ref}</p>
                        <h4 className="text-white text-sm font-black uppercase tracking-tighter truncate">{prop.title}</h4>
                      </div>
                      <p className="text-white text-lg font-black tracking-tighter shrink-0 ml-4">
                        ${prop.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex-1 flex flex-col">
                  {/* Address */}
                  <div className="flex items-center gap-3 text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-white/5" >
                    <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                    <p className="text-[9px] font-bold uppercase tracking-widest truncate">{prop.address}</p>
                  </div>

                  {/* Visits Section */}
                  <div className="space-y-3 flex-1" >
                    <div className="flex justify-between items-center px-2">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">history</span>
                        Visitas
                      </h5>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[7px] font-black text-slate-500">
                        {propVisits.length}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 no-scrollbar">
                      {propVisits.length > 0 ? propVisits.slice(0, 3).map((visit) => (
                        <div key={visit.id} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group/visit hover:border-primary/30 transition-all">
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-900 dark:text-white mb-0.5">{visit.client_name}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{new Date(visit.start_time).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${visit.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
                            }`}>
                            {visit.status === 'completed' ? 'Realizada' : 'Pendiente'}
                          </span>
                        </div>
                      )) : (
                        <div className="py-4 text-center bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Sin visitas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => handleGenerateReport(prop)}
                      disabled={isGeneratingReport === prop.id}
                      className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      {isGeneratingReport === prop.id ? 'Generando...' : 'Reporte Propietario'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  function renderRecruitmentsList(data: any[]) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {data.map((sub: any) => (
          <div key={sub.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 hover:border-primary/30 transition-all hover:shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 ${sub.type === 'sale' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  <span className="material-symbols-outlined text-3xl">{sub.type === 'sale' ? 'monetization_on' : 'key'}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1 truncate">
                    {sub.owner?.full_name || 'Sin Nombre'}
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
                  {sub.advisor && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">person_pin</span>
                      Referido por: {sub.advisor.full_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 md:border-l border-slate-100 dark:border-white/5 md:pl-10">
                <button
                  onClick={() => { setSelectedRecruitment(sub); }}
                  className="w-12 h-12 rounded-full border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all hover:scale-110 shadow-sm"
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
        ))}
      </div>
    );
  }

  function renderAdvisorFichaTab() {
    const advisorId = selectedAdvisorId || (currentUserRole === 'asesor' ? currentUser?.id : null);
    const targetAdvisor = users.find(u => u.id === advisorId);
    const targetProfile = allAdvisorProfiles.find(p => (p.id === advisorId || p.user_id === advisorId));

    if (!targetAdvisor) return (
      <div className="p-20 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest">Asesor no encontrado</p>
      </div>
    );

    return (
      <div className="relative min-h-screen -mt-20 -mx-4 md:-mx-12 lg:-mx-20 pt-32 pb-40 px-6 overflow-hidden">
        {/* Management Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            alt="Luxury House"
            className="w-full h-full object-cover opacity-10 blur-[1px] scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/90 to-slate-50 dark:from-[#020617] dark:via-[#020617]/95 dark:to-[#020617]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Profile Header */}
          <div className="relative overflow-hidden bg-[#0a0a0a]/80 dark:bg-[#000]/80 backdrop-blur-3xl p-8 md:p-12 rounded-[4.5rem] border border-[#b4975a]/30 shadow-[0_0_50px_rgba(180,151,90,0.1)] flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left group/card">
            <div className="relative group z-10">
              <div className="absolute inset-[-4px] rounded-[3.2rem] bg-gradient-to-tr from-[#b4975a] via-amber-200 to-[#b4975a] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
              <div className="relative w-40 h-40 rounded-[3rem] bg-slate-900 overflow-hidden border-4 border-[#b4975a]/20 group-hover:border-transparent transition-colors shadow-2xl flex items-center justify-center">
                {isUploadingPhoto ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-[#b4975a]/30 border-t-[#b4975a] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#b4975a] animate-pulse">Subiendo...</span>
                  </div>
                ) : targetProfile?.photo_url ? (
                  <img src={targetProfile.photo_url} alt={targetAdvisor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <span className="material-symbols-outlined text-6xl text-[#b4975a]/50">person</span>
                  </div>
                )}
              </div>
              {(currentUserRole === 'admin' || currentUser?.id === targetAdvisor.id) && (
                <>
                  <button
                    onClick={() => advisorPhotoInputRef.current?.click()}
                    className="absolute -bottom-3 -right-3 w-12 h-12 bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all z-20 border-4 border-slate-900"
                  >
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                  </button>
                  <input type="file" ref={advisorPhotoInputRef} onChange={handleAdvisorPhotoUpload} accept="image/*" className="hidden" />
                </>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 mb-3">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-tight">
                  {targetAdvisor.name}
                </h2>
                {targetProfile?.is_verified && (
                  <span className="material-symbols-outlined text-[#b4975a] text-2xl md:text-3xl" title="Asesor Verificado">verified</span>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-[#b4975a] font-black uppercase tracking-[0.4em] mb-8">
                {targetProfile?.advisor_type === 'opcionador' ? 'Opcionador Inmobiliario' : 'Cerrador Inmobiliario'}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/asesor/${targetAdvisor.id}`;
                    navigator.clipboard.writeText(url);
                    success('Enlace de ficha técnica copiado');
                  }}
                  className="px-8 py-4 bg-[#b4975a] text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Compartir Ficha
                </button>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] border border-[#b4975a]/20 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-4">
              <span className="material-symbols-outlined text-[#b4975a]">description</span>
              Sobre Mí / Biografía
            </h3>
            <textarea
              defaultValue={targetProfile?.bio || ''}
              onBlur={(e) => asesorService.updateAdvisorProfile(targetAdvisor.id, { bio: e.target.value }).then(() => success('Biografía actualizada'))}
              className="w-full px-8 py-6 bg-black/40 rounded-[2rem] border border-white/10 font-bold text-slate-300 outline-none focus:border-[#b4975a]/50 transition-all text-sm leading-relaxed"
              rows={6}
              placeholder="Cuéntale a tus prospectos sobre tu experiencia..."
            />
          </div>
        </div>
      </div>
    );
  }

  function renderCommissionCalculator() {
    const isOpcionador = advisorProfile?.advisor_type === 'opcionador';
    const advisorProps = properties.filter(p => {
      const isMine = isOpcionador ? p.referred_by === currentUser?.id : true;
      if (!isMine) return false;
      if (!calcType) return true;
      // Filter by type: renta or sale
      const pType = p.type?.toLowerCase();
      return calcType === 'venta' ? pType === 'sale' : pType === 'rent';
    });

    const selectedProp = advisorProps.find(p => p.id === calcPropertyId);
    const propertyValue = selectedProp ? (selectedProp.price || 0) : calcManualValue;

    // Updated Logic:
    // Venta: 1.5% of property value
    // Renta: 25% of property value (assuming entered value is 1 month rent)
    const opcionadorPart = calcType === 'venta' ? propertyValue * 0.015 : propertyValue * 0.25;
    const cerradorPart = calcType === 'venta' ? propertyValue * 0.015 : propertyValue * 0.25;

    // Helper for formatting input value with commas
    const formatValue = (val: number) => {
      if (!val) return '';
      return val.toLocaleString('en-US');
    };

    if (!calcType) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-4xl mx-auto py-12">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">Calculadora de Honorarios</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Selecciona el tipo de operación para comenzar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { id: 'venta', title: 'Operación: Venta', icon: 'sell', color: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-500/20', desc: 'Comisión del 1.5% del valor total de la propiedad.' },
              { id: 'renta', title: 'Operación: Renta', icon: 'key', color: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-500/20', desc: 'Honorarios del 25% del monto de renta mensual.' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setCalcType(type.id as any)}
                className="group relative bg-[#0a1120] border-2 border-white/5 p-10 rounded-[3rem] hover:border-primary/30 transition-all duration-500 hover:scale-[1.02] shadow-2xl text-left"
              >
                <div className={`w-24 h-24 bg-gradient-to-br ${type.color} rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl ${type.shadow} group-hover:scale-110 transition-transform duration-500`}>
                  <span className="material-symbols-outlined text-4xl text-white">{type.icon}</span>
                </div>
                <h4 className="text-3xl font-black uppercase text-white mb-4 tracking-tighter">{type.title}</h4>
                <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-[280px]">
                  {type.desc}
                </p>
                <div className="inline-flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest pt-4 border-t border-slate-50 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                  Comenzar Proyección
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-12 pb-20">
        <button
          onClick={() => {
            setCalcType(null);
            setCalcPropertyId(null);
            setCalcManualValue(0);
          }}
          className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Regresar a Selección
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-16 border border-slate-100 dark:border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full -mr-48 -mt-48" />

          <div className="relative z-10 flex flex-col lg:flex-row gap-16">
            <div className="flex-1 space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Calculadora de Honorarios</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mt-2">
                    PROYECCIÓN DE {calcType === 'venta' ? 'VENTA' : 'RENTA'} MAGNO
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${calcType === 'venta' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                  {calcType}
                </div>
              </div>

              <div className="space-y-10">
                {/* Property Selection */}
                {/* Better Property Selector - Custom Component */}
                <div className="relative group mb-8">
                  <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    Seleccionar de mis propiedades reclutadas
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                      className={`w-full p-6 bg-white/5 border-2 rounded-[2rem] flex items-center justify-between cursor-pointer transition-all duration-300 group ${showPropertyDropdown ? 'border-primary shadow-glow shadow-primary/20' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.07]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${!calcPropertyId ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                          <span className="material-symbols-outlined text-2xl">
                            {!calcPropertyId ? 'bolt' : 'domain'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight">
                            {!calcPropertyId ? 'Ingreso Manual' : advisorProps.find(p => p.id === calcPropertyId)?.address || 'Propiedad Seleccionada'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {calcPropertyId ? `Monto: $${advisorProps.find(p => p.id === calcPropertyId)?.price?.toLocaleString() || '0'}` : 'Escribe el monto abajo'}
                          </p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined transition-transform duration-300 ${showPropertyDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>

                    {showPropertyDropdown && (
                      <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-[#0a1120] border-2 border-white/10 rounded-[2.5rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-3">
                          {/* Manual Option */}
                          <button
                            onClick={() => {
                              setCalcPropertyId(null);
                              setShowPropertyDropdown(false);
                            }}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all mb-2 ${!calcPropertyId ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'}`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl">bolt</span>
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black text-white uppercase">Ingreso Manual</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Calcula sobre cualquier monto</p>
                            </div>
                          </button>

                          <div className="h-px bg-white/5 my-2 mx-4" />

                          {advisorProps.length > 0 ? (
                            advisorProps.map(prop => (
                              <button
                                key={prop.id}
                                onClick={() => {
                                  setCalcPropertyId(prop.id);
                                  setShowPropertyDropdown(false);
                                }}
                                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all mb-1 ${calcPropertyId === prop.id ? 'bg-primary/20 border border-primary/30 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${calcPropertyId === prop.id ? 'bg-primary text-white shadow-glow' : 'bg-white/10 text-slate-500'}`}>
                                  <span className="material-symbols-outlined text-xl">domain</span>
                                </div>
                                <div className="text-left flex-1">
                                  <p className="text-xs font-black uppercase truncate max-w-[200px]">{prop.address}</p>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-primary">${prop.price?.toLocaleString()}</p>
                                </div>
                                <div className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-tighter text-slate-500">
                                  {prop.type || 'P'}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-10 text-center">
                              <span className="material-symbols-outlined text-4xl text-slate-700 mb-4 block">sentiment_dissatisfied</span>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No se encontraron propiedades de este tipo</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {!calcPropertyId && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                      <span className="material-symbols-outlined text-sm">payments</span>
                      {calcType === 'venta' ? 'Valor Total de la Propiedad (MXN)' : 'Monto de Renta Mensual (MXN)'}
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700" />
                      <input
                        type="text"
                        value={calcManualValue ? calcManualValue.toLocaleString() : ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '');
                          if (/^\d*$/.test(val)) setCalcManualValue(Number(val));
                        }}
                        placeholder="0.00"
                        className="relative w-full px-10 py-10 rounded-[2.5rem] bg-[#0a1120] border-2 border-white/5 focus:border-primary focus:outline-none transition-all font-black text-6xl text-white tracking-tighter shadow-2xl"
                      />
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xl uppercase tracking-widest pointer-events-none">
                        MXN
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 p-10 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comisión Opcionador ({calcType === 'venta' ? '1.5%' : '25%'})</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">${opcionadorPart.toLocaleString()}</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comisión Cerrador ({calcType === 'venta' ? '1.5%' : '25%'})</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">${cerradorPart.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  function renderAdvisorsTab() {
    if (!selectedAdvisorId) {
      if (!advisorTypeFilter) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {[
              { id: 'cerrador', title: 'Cerradores', desc: 'Asesores dedicados al cierre de Ventas y Rentas.', icon: 'handshake', color: 'from-blue-500 to-indigo-600' },
              { id: 'opcionador', title: 'Opcionadores', desc: 'Asesores enfocados en Reclutamiento y Captación.', icon: 'campaign', color: 'from-amber-500 to-orange-600' }
            ].map(type => (
              <div
                key={type.id}
                onClick={() => setAdvisorTypeFilter(type.id as any)}
                className="group bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] cursor-pointer transition-all duration-500 relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${type.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />
                <div className={`w-24 h-24 rounded-[2.5rem] bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <span className="material-symbols-outlined text-5xl">{type.icon}</span>
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 transition-colors group-hover:text-primary">
                  {type.title}
                </h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10">
                  {type.desc}
                </p>
                <div className="text-primary font-black text-[10px] uppercase tracking-[0.2em] pt-6 border-t border-slate-50 dark:border-white/5 w-full flex items-center justify-center gap-3 group-hover:gap-5 transition-all">
                  Ver Equipo <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        );
      }

      const filteredAdvisors = users.filter(u => {
        const profile = allAdvisorProfiles.find(ap => ap.user_id === u.id);
        const matchesType = advisorTypeFilter === 'cerrador' ? (profile?.advisor_type !== 'opcionador') : (profile?.advisor_type === 'opcionador');
        return u.role === 'asesor' && matchesType;
      });

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-6 mb-12">
            <button
              onClick={() => setAdvisorTypeFilter(null)}
              className="flex items-center gap-3 text-slate-500 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-colors group"
            >
              <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Volver a tipo
            </button>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {advisorTypeFilter === 'cerrador' ? 'Equipo de Cerradores' : 'Equipo de Opcionadores'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAdvisors.map(advisor => {
              const advisorLeads = leads.filter(l => l.assigned_to === advisor.id || l.referred_by === advisor.id);
              const advisorPotential = potentialClients.filter(p => p.assigned_to === advisor.id || p.referred_by === advisor.id);

              return (
                <div
                  key={advisor.id}
                  onClick={() => {
                    setSelectedAdvisorId(advisor.id);
                    setSelectedAdvisorTab('leads');
                  }}
                  className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] hover:shadow-2xl hover:shadow-[#b4975a]/10 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#b4975a]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-150" />

                  <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-2 border-[#b4975a]/20 group-hover:border-[#b4975a] transition-colors relative overflow-hidden">
                      <span className="material-symbols-outlined text-4xl text-[#b4975a]">person</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{advisor.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] font-black text-[#b4975a] uppercase tracking-widest">{advisor.phoneContact || 'Sin teléfono'}</p>
                        <span className={`text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md ${allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.advisor_type === 'opcionador' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                          {allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.advisor_type === 'opcionador' ? 'Opcionador' : 'Cerrador'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Leads</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{advisorLeads.length}</p>
                    </div>
                    <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Citas</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">
                        {allAppointments.filter(a => a.assigned_to === advisor.id).length}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">P. Clientes</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{advisorPotential.length}</p>
                    </div>
                  </div>

                  <button className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 group-hover:bg-[#b4975a] group-hover:text-white transition-all">
                    Ver Detalles
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const selectedAdvisor = users.find(u => u.id === selectedAdvisorId);
    if (!selectedAdvisor) return null;

    const selectedAdvisorProfile = allAdvisorProfiles.find(ap => ap.user_id === selectedAdvisorId);
    const advisorLeads = leads.filter(l => l.assigned_to === selectedAdvisorId || l.referred_by === selectedAdvisorId);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <button
            onClick={() => setSelectedAdvisorId(null)}
            className="flex items-center gap-3 text-slate-500 hover:text-[#b4975a] font-black text-[10px] uppercase tracking-widest transition-colors group"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Volver a la lista
          </button>

          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            {[
              { id: 'leads', icon: 'person_search', label: 'Leads' },
              { id: 'potential', icon: 'rocket_launch', label: 'Potenciales' },
              { id: 'appointments', icon: 'calendar_month', label: 'Citas' },
              ...(selectedAdvisorProfile?.advisor_type === 'opcionador' ? [
                { id: 'propietarios', icon: 'history_edu', label: 'Propietarios' }
              ] : []),
              { id: 'ficha', icon: 'description', label: 'Ficha Técnica' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedAdvisorTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${selectedAdvisorTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-[#b4975a] shadow-lg shadow-[#b4975a]/10'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 mb-12 p-8 bg-[#b4975a]/10 dark:bg-[#b4975a]/5 rounded-[3.5rem] border border-[#b4975a]/20">
          <div className="w-24 h-24 rounded-[2.5rem] bg-[#b4975a] flex items-center justify-center text-white shadow-xl shadow-[#b4975a]/20">
            <span className="material-symbols-outlined text-5xl">person</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selectedAdvisor.name}</h2>
              <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-[8px] font-black text-[#b4975a] uppercase tracking-widest">Asesor</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold tracking-wide">{selectedAdvisor.email}</p>
          </div>

          {/* Admin Configuration Pane */}
          {currentUserRole === 'admin' && (
            <div className="flex-1 md:ml-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-white/5 p-4 rounded-[2rem] border border-[#b4975a]/10">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-2 ml-2">Cuota Semanal (MXN)</p>
                <input
                  key={selectedAdvisorId}
                  type="number"
                  defaultValue={allAdvisorProfiles.find(p => p.user_id === selectedAdvisorId)?.weekly_goal || 50000}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val)) return;
                    try {
                      if (!selectedAdvisorId) return;
                      await asesorService.updateAdvisorProfile(selectedAdvisorId, { weekly_goal: val });
                      success('Meta semanal actualizada');
                      fetchAdvisorProfiles();
                    } catch (err: any) {
                      console.error('Error updating goal:', err);
                      error('Error al actualizar meta: ' + (err.message || 'Error de permisos'));
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl font-black text-sm text-primary outline-none focus:ring-2 ring-primary/20 transition-all"
                />
              </div>
              <div className="bg-white/50 dark:bg-white/5 p-4 rounded-[2rem] border border-[#b4975a]/10 flex flex-col justify-center">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-2">Rol Inmobiliario</p>
                <p className="px-6 text-sm font-black text-primary uppercase tracking-widest">
                  {allAdvisorProfiles.find(p => p.user_id === selectedAdvisorId)?.advisor_type === 'opcionador' ? 'Opcionador (Reclutamiento)' : 'Cerrador (Ventas/Rentas)'}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedAdvisorTab === 'leads' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderLeadsTab(advisorLeads)}
          </div>
        )}

        {selectedAdvisorTab === 'appointments' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderAppointmentsView(selectedAdvisorId!)}
          </div>
        )}

        {selectedAdvisorTab === 'potential' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderPotentialClientsView(selectedAdvisorId!)}
          </div>
        )}

        {selectedAdvisorTab === 'ficha' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderAdvisorFichaTab()}
          </div>
        )}

        {(selectedAdvisorTab as any) === 'propietarios' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderAdvisorPropertiesList(properties.filter(p => p.referred_by === selectedAdvisorId), allAppointments, isGeneratingReport, handleGenerateReport)}
          </div>
        )}
      </div>
    );
  }

  // Signed Documents State

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
      error(`Error: ${err.message} `);
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
      error(`Error: ${err.message} `);
    } finally {
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
        properties(
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
        owner: owner_id(full_name, email),
        advisor: referred_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setRecruitments(data || []);
    } catch (err: any) {
      console.error('Error fetching recruitments:', err);
      error(`Error: ${err.message} `);
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
            message: `Tu propiedad "${fd.title || 'Propiedad'}" ha sido aprobada.La estamos subiendo a los portales globales(Tokko, Inmuebles24, etc.).Te avisaremos en cuanto esté pública.`,
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
            error(`Error al vincular documentos: ${docGenError.message} `);
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

      const assignedTo = appointmentForm.assignedTo || (currentUserRole === 'asesor' ? currentUser?.id : undefined);
      const { error: submitErr } = await supabase
        .from('appointments')
        .insert([{
          title: appointmentForm.title || `Visita - ${appointmentForm.clientName}`,
          client_name: appointmentForm.clientName,
          client_phone: appointmentForm.clientPhone,
          client_email: appointmentForm.clientEmail,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: assignedTo ? 'assigned' : 'scheduled',
          lead_id: appointmentForm.leadId,
          assigned_to: assignedTo
        }]);

      if (submitErr) throw submitErr;

      // Automatically update lead status if linked
      if (appointmentForm.leadId) {
        await supabase
          .from('leads_prospectos')
          .update({ status: 'appointment' })
          .eq('id', appointmentForm.leadId);
        fetchLeads(); // Refresh leads
      }

      success('Cita agendada correctamente');
      setShowAppointmentForm(false);
      fetchAppointments();
      setAppointmentForm({ title: '', clientName: '', clientPhone: '', clientEmail: '', date: '', time: '', leadId: undefined, assignedTo: undefined });
    } catch (err: any) {
      error(`Error: ${err.message} `);
    }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    try {
      // 1. Try manual appointments table
      const { error: apptErr, data: apptData } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)
        .select();

      let updated = apptData && apptData.length > 0;

      // 2. Try rental_applications table if not found
      if (!updated) {
        // Map common app statuses for rental_applications if needed
        let rentalStatus = newStatus;
        if (newStatus === 'cancelled') rentalStatus = 'rejected';
        if (newStatus === 'confirmed') rentalStatus = 'reviewed'; // or keep separate?

        await supabase
          .from('rental_applications')
          .update({ status: rentalStatus })
          .eq('id', id);

        updated = true; // assume success for notification refresh
      }

      if (updated) {
        setAppointments(prev => prev.map(appt => appt.id === id ? { ...appt, status: newStatus } : appt));
        fetchRentalApps();
        const msg = newStatus === 'confirmed' ? 'Cita confirmada' : (currentUserRole === 'admin' ? 'Cita cancelada' : 'Cita rechazada');
        success(msg);
      }
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
              `Pago Aprobado: ${proof.monthYear} `,
              `Monto: $${proof.amount?.toLocaleString()}.Usuario: ${proof.userName} `
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
          await logTimelineEvent(resultProp.id, `Estado Actualizado: ${resultProp.status === 'available' ? 'Disponible' : resultProp.status === 'rented' ? 'Rentada' : 'Vendida'} `, `El estado de la propiedad cambió manualmente a ${resultProp.status}.`);
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
      error(`Error al guardar: ${err.message || 'Error desconocido'} `);
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

    let confirmMsg = `¿Estás seguro de que deseas ${statusLabel} la propiedad "${updated.title}" ? `;
    if (newStatus === PropertyStatus.AVAILABLE && (updated.status === PropertyStatus.RESERVED || updated.status_reason === 'Inquilino en investigación')) {
      confirmMsg = `¿Deseas DESAPARTAR esta propiedad y volverla a poner como ACTIVA ? `;
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
        success(`Estado de "${updated.title}" actualizado a ${newStatus} `);

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
      error(`Error al actualizar estado: ${err.message || 'Error desconocido'} `);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const updated = properties.find(p => p.id === id);
    setConfirmAction({
      type: 'delete',
      id,
      title: 'ELIMINAR PROPIEDAD',
      message: `¿Estás seguro de que deseas eliminar la propiedad "${updated?.title || ''}" ? Esta acción eliminará permanentemente todos los registros asociados.`
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
        error(`Error al eliminar: ${msg} `);
      }
    }
  };

  const handleLinkProperty = async (property: Property) => {
    if (!linkLead) return;
    try {
      // 1. Update Lead Status
      const updateData: any = {
        status: 'published',
        property_snapshot: {
          ref: property.ref,
          title: property.title,
          address: property.address,
          price: property.price,
          type: property.type
        },
        updated_at: new Date().toISOString()
      };

      // Only set property_id for actual properties (not submissions)
      // Submissions exist in property_submissions table, not properties table
      if (!property.is_submission) {
        updateData.property_id = property.id;
      }

      const { error: leadError } = await supabase.from('leads_prospectos').update(updateData).eq('id', linkLead.id);

      if (leadError) throw leadError;

      // 2. Update Property (Link to Advisor)
      // 2. Update Property (Link to Advisor) - ONLY for actual properties, not submissions
      if (currentUser?.id && !property.is_submission) {
        const { error: propError } = await supabase.from('properties').update({
          referred_by: currentUser.id
        }).eq('id', property.id);
        if (propError) throw propError;
      }

      // 3. Update Local State
      setLeads(prev => prev.map(l => l.id === linkLead.id ? { ...l, status: 'published', property_id: property.id } : l));

      // Use toast if available, otherwise console
      try { success('Propiedad vinculada correctamente'); } catch (e) { console.log('Linked'); }
      setShowLinkPropertyModal(false);
    } catch (err: any) {
      try { error('Error al vincular: ' + err.message); } catch (e) { console.error(err); }
      console.error(err);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, id, newStatus, metadata } = confirmAction;
    setConfirmAction(null); // Close modal first for responsiveness

    if (type === 'status' && newStatus) {
      await executePropertyStatusUpdate(id, newStatus, confirmAction.selectedReason);
    } else if (type === 'delete') {
      const property = properties.find(p => p.id === id);
      if (property?.is_submission) await executeDeleteRecruitment(id);
      else await executeDeleteProperty(id);
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
      await executeDeleteRentalApp(id, metadata);
    } else if (type === 'delete_blog_post') {
      await executeDeleteBlogPost(id);
    } else if (type === 'delete_recruitment') {
      await executeDeleteRecruitment(id);
    } else if (type === 'delete_lead') {
      await executeDeleteLead(id);
    } else if (type === 'crm_status' && newStatus) {
      await handleUpdateLeadStatus(id, newStatus as LeadStatus, metadata);
    }
  };

  const handleDeleteRecruitment = (id: string) => {
    setConfirmAction({
      type: 'delete_recruitment',
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
      error(`Error al eliminar: ${err.message || 'Error desconocido'} `);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setConfirmAction({
      type: 'delete_user',
      id,
      metadata: { name },
      title: 'ELIMINAR USUARIO',
      message: `¿Cómo deseas proceder con la eliminación de "${name}" ? `,
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
      success(`Usuario "${name}" eliminado correctamente(${purgeAssets ? 'Limpieza total' : 'Desvinculado'}).`);
    } catch (err: any) {
      error(`Error al eliminar usuario: ${err.message} `);
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

  const handleTokkoSearch = async () => {
    if (!tokkoSearchQuery.trim()) return;
    setLoadingTokkoSelect(true);
    try {
      const allProps = await tokkoService.fetchProperties(200);
      const filtered = allProps.filter((p: any) =>
        p.reference_code?.toLowerCase().includes(tokkoSearchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(tokkoSearchQuery.toLowerCase()) ||
        p.publication_title?.toLowerCase().includes(tokkoSearchQuery.toLowerCase())
      );
      setTokkoResults(filtered);
    } catch (err) {
      error('Error al buscar en Tokko');
    } finally {
      setLoadingTokkoSelect(false);
    }
  };

  const handleSelectTokkoProperty = async (tokkoProp: any) => {
    if (!selectedLead) return;

    try {
      const metadata = {
        tokko_id: tokkoProp.id.toString(),
        property_ref: tokkoProp.reference_code,
        property_snapshot: {
          ref: tokkoProp.reference_code,
          title: tokkoProp.publication_title || tokkoProp.address,
          address: tokkoProp.address,
          price: tokkoProp.operations?.find((op: any) => op.operation_type === 'Sale')?.prices[0]?.price || 0,
          type: 'tokko'
        }
      };

      await handleUpdateLeadStatus(selectedLead.id, 'published', metadata);
      setShowTokkoSelector(false);
      setTokkoSearchQuery('');
      setTokkoResults([]);
      success('Propiedad vinculada y publicada exitosamente');
    } catch (err) {
      error('Error al vincular propiedad');
    }
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

  const executeDeleteLead = async (id: string) => {
    try {
      const { error: err } = await supabase.from('leads_prospectos').delete().eq('id', id);
      if (err) throw err;
      setLeads(prev => prev.filter(l => l.id !== id));
      success('Prospecto eliminado correctamente');
    } catch (err: any) {
      error('Error al eliminar prospecto: ' + err.message);
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
        author_id: postData.author_id || user?.id,
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
    if (activeTab === 'blog' || activeTab === 'team') fetchBlogPosts();
    if (activeTab === 'comprobantes') fetchPaymentProofs();
    if (activeTab === 'reports') {
      fetchReports();
      fetchRentalApps();
      fetchAppointments();
    }
    if (activeTab === 'internal-props' || activeTab === 'calculator') fetchInternalProperties();
    if (activeTab === 'appraisals') fetchAppraisals();
    if (activeTab === 'recruitments') fetchRecruitments();
    if (activeTab === 'rental-apps' || activeTab === 'inventory') {
      fetchRentalApps();
      fetchAppointments();
    }
    if (activeTab === 'payment_approvals' || activeTab === 'leads-crm') {
      fetchLeads();
      fetchRentalApps();
      fetchRecruitments();
    }
    if (activeTab === 'appointments') {
      fetchAppointments();
      fetchRentalApps();
      fetchLeads();
    }
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
              error(`La propiedad con folio "${clientForm.propertyCode}" no existe.Para crearla automáticamente, debes llenar el Título y la Dirección.`);
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
          error(`Usuario creado pero hubo un error guardando detalles: ${updateError.message} `);
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
      error(`Error: ${err.message} `);
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
            className={`px - 4 py - 3 rounded - xl text - [10px] font - bold uppercase tracking - wider transition - all border ${selected.includes(item)
              ? 'bg-primary text-white border-primary shadow-glow'
              : 'bg-white dark:bg-slate-800 text-slate-500 border-gray-100 dark:border-gray-700 hover:border-primary/50'
              } `}
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
        error(`Sincronización con ${results.errors} errores.Último: ${results.lastError} `);
      } else {
        success(`Sincronización completada: ${results.updated} propiedades actualizadas.`);
      }
      // Give the user time to see the toast before reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      error(`Error en sincronización: ${err.message} `);
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
      error(`Error al cargar reportes: ${err.message} `);
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
          `Incidencia: "${changedReport.title}".Estado cambiado a ${newStatus}.`
        );
      }

      success('Estado actualizado correctamente');
    } catch (err: any) {
      console.error('Error updating report:', err);
      error(`Error al actualizar: ${err.message} `);
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

  const executeDeleteRentalApp = async (id: string, metadata?: any) => {
    try {
      if (metadata?.status === 'rejected') {
        const { error: err } = await supabase.from('rental_applications').update({ status: 'rejected' }).eq('id', id);
        if (err) throw err;
        setRentalApps(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        success('Cita rechazada correctamente');
      } else {
        const { error: err } = await supabase.from('rental_applications').delete().eq('id', id);
        if (err) throw err;
        setRentalApps(prev => prev.filter(r => r.id !== id));
        success('Solicitud eliminada correctamente');
      }
      setSelectedRentalApp(null);
    } catch (err: any) {
      error('Error al procesar: ' + err.message);
    }
  };
  const renderAdministrationHub = () => {
    const adminCards = [
      {
        id: 'team',
        title: 'Gestión de Equipo',
        description: 'Administra los accesos, roles y perfiles de tu personal administrativo y asesores.',
        icon: 'diversity_3',
        color: 'from-blue-500 to-indigo-600',
        actionLabel: 'Gestionar Equipo'
      },
      {
        id: 'users-list',
        title: 'Lista de Usuarios',
        description: 'Control total de cuentas registradas, folios de propiedad y credenciales de acceso.',
        icon: 'group',
        color: 'from-emerald-500 to-teal-600',
        actionLabel: 'Ver Usuarios'
      },
      {
        id: 'internal-props',
        title: 'Propiedades Internas',
        description: 'Administración de unidades internas, estados de ocupación y vinculación a usuarios.',
        icon: 'domain',
        color: 'from-purple-500 to-pink-600',
        actionLabel: 'Administrar Unidades'
      },
      {
        id: 'client-panels',
        title: 'Portales Administrativos',
        description: 'Control de accesos para inquilinos y propietarios. Asignación de identidades y credenciales.',
        icon: 'badge',
        color: 'from-amber-500 to-orange-600',
        actionLabel: 'Gestionar Accesos'
      },
      {
        id: 'landing-pages',
        title: 'Landing Pages',
        description: 'Gestión de páginas de captura, campañas de marketing y rastreo de conversiones.',
        icon: 'rocket_launch',
        color: 'from-blue-600 to-indigo-700',
        actionLabel: 'Editar Landings'
      },
      {
        id: 'blog',
        title: 'Blog & Noticias',
        description: 'Editor de contenidos, gestión de artículos y novedades oficiales de Magno.',
        icon: 'article',
        color: 'from-slate-600 to-slate-800',
        actionLabel: 'Gestionar Blog'
      }
    ];

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminCards.map((card) => (
            <div
              key={card.id}
              onClick={() => setActiveTab(card.id as any)}
              className="group bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />

              <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <span className="material-symbols-outlined text-4xl">{card.icon}</span>
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 transition-colors group-hover:text-primary">
                {card.title}
              </h3>

              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 flex-1">
                {card.description}
              </p>

              <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.2em] pt-6 border-t border-slate-50 dark:border-white/5 group-hover:gap-5 transition-all">
                {card.actionLabel}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-5xl animate-pulse">verified_user</span>
            </div>
            <div>
              <h4 className="text-white text-2xl font-black uppercase tracking-tighter mb-2">Panel de Control para Directores</h4>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                Este centro de mando está diseñado para centralizar todas las funciones críticas de administración técnica y humana de Magno. Mantén el control total de tu equipo y base de datos desde un solo lugar.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentApprovalsTab = () => {
    // Unified Pending Payments: Combine from rentalApps and CRM leads
    const pendingFromApps = (rentalApps as any[]).filter(lead =>
      lead.payment_proof_url && lead.payment_status === 'under_review'
    );
    const pendingFromCRMLeads = leads.filter(lead =>
      lead.payment_proof_url && lead.payment_status === 'under_review'
    );

    const pendingPayments = [...pendingFromApps, ...pendingFromCRMLeads];

    // Unified Pending Documents: Combine from rentalApps and CRM leads
    const docsFromApps = (rentalApps as any[]).filter(lead =>
      lead.investigation_score && !lead.documents_signed
    );
    const docsFromCRMLeads = leads.filter(lead =>
      lead.investigation_score && !lead.documents_signed
    );

    const pendingDocuments = [...docsFromApps, ...docsFromCRMLeads];

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
            Comprobantes Pendientes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Revisa y aprueba los comprobantes de pago de investigación enviados por los asesores.
          </p>
        </div>

        {pendingPayments.length === 0 && pendingDocuments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-6xl text-slate-400">check_circle</span>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
              Todo al día
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              No hay comprobantes ni documentos pendientes de revisión.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Pending Payments Section */}
            {pendingPayments.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                    Pagos por Aprobar
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pendingPayments.map((lead) => {
                    const advisor = users.find(u => u.id === lead.assigned_to);
                    const property = properties.find(p =>
                      (lead.property_ref && p.ref === lead.property_ref) ||
                      (lead.property_id && p.id === lead.property_id) ||
                      (lead.property_snapshot?.ref && p.ref === lead.property_snapshot.ref)
                    );

                    return (
                      <div key={lead.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-white/5 shadow-md hover:shadow-lg transition-all duration-300 group">
                        {/* Compact Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-[7px] font-black uppercase tracking-wider">
                            En Revisión
                          </span>
                          <span className="text-[7px] text-slate-400 font-bold">
                            {new Date(lead.payment_date || lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2 line-clamp-1">
                          {lead.full_name}
                        </h3>

                        {/* Compact Info */}
                        <div className="space-y-1.5 mb-2">
                          <div>
                            <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Asesor</p>
                            <p className="text-[9px] font-bold text-slate-900 dark:text-white line-clamp-1">
                              {advisor?.full_name || 'No asignado'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Propiedad</p>
                            <p className="text-[9px] font-bold text-slate-900 dark:text-white line-clamp-1">
                              {property?.ref || lead.property_ref || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Payment Proof Thumbnail - Clickable */}
                        <div
                          className="mb-2 cursor-pointer relative overflow-hidden rounded-lg group-hover:shadow-md transition-all"
                          onClick={() => {
                            const currentIndex = pendingPayments.findIndex(p => p.id === lead.id);
                            setPaymentProofModal({ payments: pendingPayments, currentIndex });
                          }}
                        >
                          <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mb-1">Comprobante</p>
                          {lead.payment_proof_url?.endsWith('.pdf') ? (
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex items-center justify-center gap-2 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors h-24 w-full">
                              <span className="material-symbols-outlined text-xl text-red-500">picture_as_pdf</span>
                              <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400">PDF</span>
                            </div>
                          ) : (
                            <div className="relative overflow-hidden rounded-lg w-full h-24">
                              <img
                                src={lead.payment_proof_url}
                                alt="Comprobante"
                                className="w-full h-full object-cover border border-slate-200 dark:border-white/10 group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity">zoom_in</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Compact Actions */}
                        <button
                          onClick={() => setSelectedPaymentForApproval(lead)}
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:scale-[1.02] transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Aprobar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approved Payments History Section */}
            {
              (() => {
                // Logic for Approved Payments
                // 1. Get approved from rentalApps
                const approvedApps = (rentalApps as any[])
                  .filter(app => app.payment_status === 'approved')
                  .map(app => ({ ...app, source: 'rental_app' }));

                // 2. Get approved from CRM leads
                console.log('Total Leads:', leads.length); const approvedLeads = leads
                  .filter(lead => lead.payment_status === 'approved')
                  .map(lead => ({ ...lead, source: 'lead' }));

                // 3. Combine
                const allApproved = [...approvedApps, ...approvedLeads];

                // 4. Filter by date based on approvedFilter
                const filteredApproved = allApproved.filter(item => {
                  const dateToUse = item.updated_at || item.payment_date || item.created_at;
                  const itemDate = new Date(dateToUse);
                  const now = new Date();
                  const diffTime = Math.abs(now.getTime() - itemDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (approvedFilter === '7d') return diffDays <= 7;
                  if (approvedFilter === '15d') return diffDays <= 15;
                  if (approvedFilter === '30d') return diffDays <= 30;
                  return true;
                }).sort((a, b) => {
                  const dateA = new Date(a.updated_at || a.payment_date || a.created_at);
                  const dateB = new Date(b.updated_at || b.payment_date || b.created_at);
                  return dateB.getTime() - dateA.getTime();
                });

                // condition removed

                return (
                  <div className="space-y-8 pt-10 border-t border-slate-100 dark:border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                          <span className="material-symbols-outlined text-2xl">history</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                            Historial de Pagos
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Mostrando últimos {approvedFilter === '7d' ? '7 días' : approvedFilter === '15d' ? '15 días' : '30 días'}
                          </p>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
                        {(['7d', '15d', '30d'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setApprovedFilter(filter)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${approvedFilter === filter
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                          >
                            {filter === '7d' ? '7 Días' : filter === '15d' ? '15 Días' : '30 Días'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredApproved.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-10 text-center border border-slate-100 dark:border-white/5 border-dashed">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                          No hay pagos aprobados en este periodo
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredApproved.map((item) => {
                          const advisor = users.find(u => u.id === item.assigned_to);
                          const property = properties.find(p =>
                            (item.property_ref && p.ref === item.property_ref) ||
                            (item.property_id && p.id === item.property_id) ||
                            (item.property_snapshot?.ref && p.ref === item.property_snapshot.ref)
                          );

                          return (
                            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-white/5 opacity-75 hover:opacity-100 transition-opacity">
                              {/* Compact Header */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[7px] font-black uppercase tracking-wider flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[10px]">check</span>
                                  Aprobado
                                </span>
                                <span className="text-[7px] text-slate-400 font-bold">
                                  {new Date(item.updated_at || item.payment_date || item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>

                              {/* Name */}
                              <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2 line-clamp-1">
                                {item.full_name}
                              </h3>

                              {/* Compact Info */}
                              <div className="space-y-1.5 mb-2">
                                <div>
                                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Asesor</p>
                                  <p className="text-[9px] font-bold text-slate-900 dark:text-white line-clamp-1">
                                    {advisor?.full_name || 'No asignado'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Propiedad</p>
                                  <p className="text-[9px] font-bold text-slate-900 dark:text-white line-clamp-1">
                                    {property?.ref || item.property_ref || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {/* Payment Proof Thumbnail - View Only */}
                              <div
                                className="cursor-pointer group relative"
                                onClick={() => window.open(item.payment_proof_url, '_blank')}
                              >
                                {item.payment_proof_url?.endsWith('.pdf') ? (
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 flex items-center justify-center gap-2 h-16 w-full border border-slate-100 dark:border-white/5">
                                    <span className="material-symbols-outlined text-lg text-red-500">picture_as_pdf</span>
                                    <span className="text-[8px] font-bold text-slate-500">Ver PDF</span>
                                  </div>
                                ) : (
                                  <div className="relative overflow-hidden rounded-lg w-full h-16">
                                    <img
                                      src={item.payment_proof_url}
                                      alt="Comprobante"
                                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <span className="material-symbols-outlined text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()
            }

            {/* Pending Documents Section */}
            {pendingDocuments.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                    Documentos de Investigación
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {pendingDocuments.map((lead) => {
                    const advisor = users.find(u => u.id === lead.assigned_to);

                    return (
                      <div key={lead.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        {/* Lead Info */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-6">
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              Investigación Lista
                            </span>
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Score:</span>
                              <span className={`text-sm font-black ${parseInt(lead.investigation_score || '0') >= 80 ? 'text-emerald-500' :
                                parseInt(lead.investigation_score || '0') >= 60 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                {lead.investigation_score}/100
                              </span>
                            </div>
                          </div>

                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                            {lead.full_name}
                          </h3>

                          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Asesor</p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{advisor?.full_name || 'No asignado'}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Propiedad</p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{lead.property_ref || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Upload Action */}
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Subir Resultados Firmados (PDF)</label>
                          <div className="relative group">
                            <input
                              type="file"
                              accept=".pdf"
                              disabled={uploadingDocumentLeadId === lead.id}
                              onChange={(e) => handleInvestigationDocumentUpload(e, lead.id)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                            />
                            <div className={`w-full py-6 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 ${uploadingDocumentLeadId === lead.id
                              ? 'bg-slate-50 border-slate-200'
                              : 'border-purple-500/30 bg-purple-500/5 group-hover:bg-purple-500/10 group-hover:border-purple-500'
                              }`}>
                              {uploadingDocumentLeadId === lead.id ? (
                                <>
                                  <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Subiendo documento...</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-white text-xl">upload_file</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="block text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 group-hover:text-purple-500 transition-colors">
                                      Seleccionar Archivo
                                    </span>
                                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                      Formato PDF requerido
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAdvisorDashboard = () => {
    const isOpcionador = advisorProfile?.advisor_type === 'opcionador';
    const weeklyGoal = advisorProfile?.weekly_goal || 50000;

    // Metrics based on Leads (CRM)
    const myLeads = leads.filter(l => l.assigned_to === currentUser?.id || l.referred_by === currentUser?.id);
    const totalProspects = myLeads.length;
    const procesoCount = myLeads.filter(l => !['closed_won', 'closed_lost', 'archived_potential'].includes(l.status)).length;
    const reclutadoCount = myLeads.filter(l => l.status === 'closed_won').length;

    // Financial Progress
    const currentEarnings = myLeads
      .filter(l => l.status === 'closed_won')
      .reduce((sum, l) => sum + (l.commission_amount || 0), 0);

    const progressPercent = weeklyGoal > 0 ? (currentEarnings / weeklyGoal) * 100 : 0;

    // Streak Calculation Logic
    const calculateStreak = () => {
      // Use activity logs for streak persistence (even if lead is deleted)
      // Fallback to myLeads for backward compatibility
      const activityFromLogs = advisorActivity.map(a => new Date(a.created_at).toISOString().split('T')[0]);
      const activityFromLeads = myLeads.map(l => new Date(l.created_at).toISOString().split('T')[0]);

      const activityDates = Array.from(new Set([
        ...activityFromLogs,
        ...activityFromLeads
      ]));

      let streak = 0;
      let checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      const MAX_DAYS = 365;
      let firstDayChecked = true;

      for (let i = 0; i < MAX_DAYS; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const isSunday = checkDate.getDay() === 0;
        const hasActivity = activityDates.includes(dateStr);

        if (hasActivity) {
          streak++;
        } else {
          if (isSunday) {
            // Sundays are rest days. Skip without breaking or incrementing.
          } else if (firstDayChecked) {
            // Today is a workday but no activity yet. Skip to yesterday without breaking.
          } else {
            // A workday with no activity breaks the streak.
            break;
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
        firstDayChecked = false;
      }

      return { count: streak, activeDays: activityDates };
    };

    const streakData = calculateStreak();

    const renderStreakModal = () => {
      if (!showStreakModal) return null;

      const daysOfWeek = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
      const todayIdx = (new Date().getDay() + 6) % 7; // Adjust to start on Monday

      return (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <style>{`
            @keyframes pounce {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-15px) scale(1.05); }
            }
            @keyframes slide {
              0% { transform: translateX(-20px); }
              50% { transform: translateX(20px); }
              100% { transform: translateX(-20px); }
            }
            .animate-pounce-slide {
              animation: pounce 2s ease-in-out infinite, slide 4s ease-in-out infinite;
            }
          `}</style>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-3xl relative">
            <div className="absolute top-6 right-6 z-10">
              <button
                onClick={() => setShowStreakModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-10 pt-16 text-center space-y-8 relative">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full" />
                <video
                  src="https://res.cloudinary.com/dmifhcisp/video/upload/v1770402578/12ed3b1b-daae-43d5-a42c-a65f0f934e60_t9fqqy.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-96 h-80 object-contain relative z-10 hover:scale-110 transition-transform duration-500 cursor-pointer"
                />
              </div>

              <div>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">
                  {streakData.count > 0 ? `¡Racha de ${streakData.count} ${streakData.count === 1 ? 'Día' : 'Días'}!` : '¡Activa tu Instinto!'}
                </h3>
                <p className="text-slate-500 text-sm font-medium px-4">
                  {streakData.count > 0
                    ? "¡Tienes la galla de un líder! Tu actividad es imparable. No dejes que nadie detenga tu racha de éxito."
                    : "Un león no espera su presa, sale a buscarla. Registra tu prospecto de hoy y enciende el fuego de tu racha."}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-2 px-4">
                {daysOfWeek.map((day, idx) => {
                  const checkDate = new Date();
                  checkDate.setDate(checkDate.getDate() - (todayIdx - idx));
                  const dateStr = checkDate.toISOString().split('T')[0];
                  const isActive = streakData.activeDays.includes(dateStr);
                  const isCurrent = idx === todayIdx;

                  return (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : (isCurrent ? 'border-2 border-orange-500/30' : (idx === 6 ? 'bg-slate-200/50 dark:bg-white/10 opacity-40' : 'bg-slate-100 dark:bg-white/5'))
                        }`}>
                        {isActive ? (
                          <span className="material-symbols-outlined text-lg fill-1">local_fire_department</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">{day}</span>
                        )}
                      </div>
                      {isCurrent && <div className="w-1 h-1 rounded-full bg-orange-500" />}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setShowStreakModal(false);
                  setActiveTab('leads');
                }}
                className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                ¡VAMOS CON TODO!
              </button>
            </div>
          </div>
        </div>
      );
    };

    // Performance Calculations (Funnel)
    const totalPotential = potentialClients.length;

    const totalClosed = reclutadoCount;

    const potentialRate = totalProspects > 0 ? (totalPotential / totalProspects) * 100 : 0;
    const closingRate = totalPotential > 0 ? (totalClosed / totalPotential) * 100 : 0;

    const navBlocks = [
      { id: 'leads', title: 'Prospectos CRM', desc: 'Gestiona tus nuevos leads y seguimiento diario.', icon: 'group', color: 'from-blue-500 to-indigo-600' },
      ...(advisorProfile?.advisor_type === 'opcionador' ? [
        { id: 'potential', title: 'Propietarios Potenciales', desc: 'Dueños en proceso de carga de datos.', icon: 'rocket_launch', color: 'from-emerald-500 to-teal-600' },
        { id: 'advisor-properties', title: 'Propietarios Magno', desc: 'Propiedades reclutadas y publicadas.', icon: 'verified', color: 'from-amber-500 to-orange-600' }
      ] : [
        { id: 'potential', title: 'Potenciales', desc: 'Clientes en proceso de cierre o investigación.', icon: 'rocket_launch', color: 'from-emerald-500 to-teal-600' },
        { id: 'advisor-properties', title: 'Propiedades Internas', desc: 'Gestiona y comparte el catálogo de inmuebles internos.', icon: 'domain', color: 'from-amber-500 to-orange-600' }
      ]),
      { id: 'ficha', title: 'Mi Perfil', desc: 'Personaliza tu landing page y biografía.', icon: 'badge', color: 'from-slate-600 to-slate-800' },
      { id: 'appointments', title: 'Mi Agenda', desc: 'Control de citas y visitas a propiedades.', icon: 'calendar_month', color: 'from-purple-500 to-pink-600' },
      { id: 'calculator', title: 'Calculadora de Honorarios', desc: 'Estima tus comisiones en base al valor de la propiedad.', icon: 'calculate', color: 'from-indigo-500 to-blue-600' }
    ];

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
        {/* Performance Trading-Style Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Card (Weekly Goal) */}
          <div className="lg:col-span-2 bg-[#020617] rounded-[3.5rem] p-12 relative overflow-hidden group shadow-[0_0_50px_rgba(180,151,90,0.1)] border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-70" />
            <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,_transparent,_primary/10,_transparent)] animate-[spin_10s_linear_infinite] opacity-30" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2 uppercase">Cuota Semanal Meta</h4>
                  <div className="flex items-baseline gap-4">
                    <span className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      ${weeklyGoal.toLocaleString()}
                    </span>
                    <span className="text-primary font-black text-xl uppercase drop-shadow-[0_0_10px_rgba(180,151,90,0.5)]">MXN</span>
                  </div>
                </div>
                <div className="w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl animate-pulse">monitoring</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/5">
                <div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">Prospectos</p>
                  <p className="text-3xl font-black text-white">{totalProspects}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">En Proceso</p>
                  <p className="text-3xl font-black text-white">{procesoCount}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">Reclutados</p>
                  <p className="text-3xl font-black text-emerald-400">{reclutadoCount}</p>
                </div>
                <button
                  onClick={() => setShowStreakModal(true)}
                  className="flex flex-col items-start group/streak hover:scale-105 transition-all text-left"
                >
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2 group-hover/streak:text-orange-500">Días de Racha</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-black text-blue-400 italic">
                      {streakData.count}
                    </p>
                    {streakData.count > 0 && (
                      <span className="material-symbols-outlined text-orange-500 animate-bounce fill-1 text-xl">local_fire_department</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {renderStreakModal()}

          {/* Funnel Visualizer */}
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-white/5 flex flex-col justify-between shadow-xl">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Embudo de Conversión</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-500">Prospectos a Potenciales</span>
                    <span className="text-primary">{potentialRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${potentialRate}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-500">Potenciales a Cierre</span>
                    <span className="text-blue-500">{closingRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${closingRate}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center border border-slate-100 dark:border-white/5">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total de Prospectos Hoy</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{totalProspects}</p>
            </div>
          </div>
        </div>

        {/* Navigation Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {navBlocks.map((block) => (
            <div
              key={block.id}
              onClick={() => setActiveTab(block.id as any)}
              className="group bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full relative overflow-hidden"
            >
              <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${block.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />

              <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${block.color} flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <span className="material-symbols-outlined text-4xl">{block.icon}</span>
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 transition-colors group-hover:text-primary">
                {block.title}
              </h3>

              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 flex-1">
                {block.desc}
              </p>

              <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.2em] pt-6 border-t border-slate-50 dark:border-white/5 group-hover:gap-5 transition-all">
                ACCEDER
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAdvisorsHub = () => {
    const advisorHubCards = [
      {
        id: 'advisors',
        title: 'Gestión de Asesores',
        description: 'Perfiles individuales, propiedades asignadas y seguimiento de desempeño directo.',
        icon: 'manage_accounts',
        color: 'from-blue-500 to-indigo-600',
        actionLabel: 'Ver Asesores',
        comingSoon: false
      },
      {
        id: 'payment_approvals',
        title: 'Comprobantes de Pago',
        description: 'Revisa y aprueba pagos de investigación enviados por asesores.',
        icon: 'receipt_long',
        color: 'from-amber-500 to-orange-600',
        actionLabel: 'Ver Comprobantes',
        comingSoon: false
      }
    ];

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {advisorHubCards.map((card) => (
            <div
              key={card.id}
              onClick={() => !card.comingSoon && setActiveTab(card.id as any)}
              className={`group bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-white/5 shadow-xl transition-all duration-500 relative overflow-hidden ${card.comingSoon ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] cursor-pointer'}`}
            >
              {card.comingSoon && (
                <div className="absolute top-8 right-8 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">
                  Próximamente
                </div>
              )}

              {/* Background Glow */}
              <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />

              <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <span className="material-symbols-outlined text-4xl">{card.icon}</span>
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 transition-colors group-hover:text-primary">
                {card.title}
              </h3>

              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 flex-1">
                {card.description}
              </p>

              <div className={`flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] pt-6 border-t border-slate-50 dark:border-white/5 transition-all ${card.comingSoon ? 'text-slate-300' : 'text-primary group-hover:gap-5'}`}>
                {card.actionLabel}
                {!card.comingSoon && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-5xl animate-pulse">support_agent</span>
            </div>
            <div>
              <h4 className="text-white text-2xl font-black uppercase tracking-tighter mb-2">Centro de Control de Asesores</h4>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                Monitorea el desempeño, establece metas y gestiona la fuerza de ventas de Magno. Esta sección centraliza todas las herramientas necesarias para potenciar el talento de tu equipo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvisorPropertiesTab = () => {
    const isOpcionador = advisorProfile?.advisor_type === 'opcionador';

    const combinedProperties = Array.from(new Map<string, any>(
      properties
        .filter(p => isOpcionador ? p.referred_by === currentUser?.id : true)
        .filter(p =>
          p.ref?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
          p.title?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
          p.address?.toLowerCase().includes(propertySearchTerm.toLowerCase())
        )
        .map(p => [p.id, { ...p, source: p.isInternal ? 'internal' : 'tokko' }])
    ).values());

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Search Bar */}
        <div className="relative group max-w-xl mx-auto mb-16">
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">search</span>
          <input
            type="text"
            placeholder="Buscar por referencia, título o dirección..."
            value={propertySearchTerm}
            onChange={(e) => setPropertySearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-8 focus:ring-primary/10 focus:border-primary transition-all shadow-2xl"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-10">
          {combinedProperties.map((prop) => {
            const propVisits = allAppointments.filter(appt => appt.property_ref === prop.ref);

            return (
              <div key={prop.id} className="group bg-white dark:bg-slate-900/60 rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden flex flex-col">
                <div className="relative h-72 overflow-hidden shrink-0">
                  <img
                    src={prop.main_image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div className="absolute top-6 left-6">
                    <span className="px-5 py-2 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 text-[9px] font-black uppercase tracking-widest text-white shadow-2xl">
                      {prop.source === 'tokko' ? 'Tokko' : 'Exclusiva Magno'}
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-8 right-8">
                    <div className="flex justify-between items-end">
                      <div className="min-w-0">
                        <p className="text-primary font-black text-[10px] uppercase tracking-widest mb-1">{prop.ref}</p>
                        <h4 className="text-white text-xl font-black uppercase tracking-tighter truncate">{prop.title}</h4>
                      </div>
                      <p className="text-white text-2xl font-black tracking-tighter shrink-0 ml-4">
                        ${prop.price?.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">{prop.type === 'rent' ? 'Mensual' : ''}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-8 flex-1 flex flex-col">
                  {/* Address */}
                  <div className="flex items-center gap-4 text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5" >
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest truncate">{prop.address}</p>
                  </div>

                  {/* Visits Section */}
                  <div className="space-y-4 flex-1" >
                    <div className="flex justify-between items-center px-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Historial de Visitas
                      </h5>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-500">
                        {propVisits.length} Atenciones
                      </span>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                      {propVisits.length > 0 ? propVisits.map((visit) => (
                        <div key={visit.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group/visit hover:border-primary/30 transition-all">
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-900 dark:text-white mb-1">{visit.client_name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(visit.start_time).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${visit.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
                            }`}>
                            {visit.status === 'completed' ? 'Realizada' : 'Pendiente'}
                          </span>
                        </div>
                      )) : (
                        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/10 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Sin visitas registradas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marketing & Reports Section */}
                  <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${prop.status === 'available' ? 'bg-green-500' :
                          prop.status === 'rented' || prop.status === 'sold' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {prop.status === 'available' ? 'Disponible' :
                            prop.status === 'rented' ? 'Rentada' :
                              prop.status === 'sold' ? 'Vendida' : prop.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => handleGenerateReport(prop)}
                        disabled={isGeneratingReport === prop.id}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined">description</span>
                        {isGeneratingReport === prop.id ? 'Generando Reporte...' : 'Generar Reporte Propietario'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col md:flex-row">
      {/* Mobile Burger Toggle */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="md:hidden fixed top-6 left-6 z-[100] w-12 h-12 bg-[#020617] border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"
      >
        <span className="material-symbols-outlined text-xl">{isSidebarCollapsed ? 'menu' : 'close'}</span>
      </button>

      {/* Sidebar Overlay (Mobile Only) */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90] md:hidden transition-all duration-500"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <aside className={`bg-[#020617] text-white p-4 fixed inset-y-0 left-0 flex flex-col z-[95] transition-all duration-300 ease-in-out shadow-2xl overflow-x-hidden ${currentUserRole === 'asesor' ? 'hidden' : (!isSidebarCollapsed
        ? 'translate-x-0 w-80'
        : '-translate-x-full md:translate-x-0 md:w-24')
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

        <nav className="space-y-3 flex-1 overflow-y-auto">
          {(currentUser?.role === 'asesor' ? [
            { id: 'leads', icon: 'person_search', label: 'Prospectos', roles: ['asesor'] },
            { id: 'advisor-properties', icon: 'domain', label: 'Inmuebles', roles: ['asesor'] },
            { id: 'team', icon: 'diversity_3', label: 'Magno Asesor', roles: ['asesor'] },
            ...(advisorProfile?.advisor_type === 'cerrador' ? [
              { id: 'investigations', icon: 'fact_check', label: 'Resultados', count: ([...leads, ...rentalApps].filter(i => i.status === 'investigating').length), color: 'bg-indigo-500', roles: ['asesor'] },
              { id: 'archived_potential', icon: 'archive', label: 'Archivo', count: ([...leads, ...rentalApps].filter(i => i.status === 'archived_potential').length), color: 'bg-slate-400', roles: ['asesor'] },
            ] : [])
          ] : [
            { id: 'inventory', icon: 'real_estate_agent', label: 'Patrimonio', roles: ['admin'] },
            { id: 'comprobantes', icon: 'receipt_long', label: 'Comprobantes', count: paymentProofs.filter(p => p.status === 'pending').length, color: 'bg-red-500', roles: ['admin'] },
            { id: 'reports', icon: 'report_problem', label: 'Reportes', roles: ['admin'] },
            { id: 'appraisals', icon: 'analytics', label: 'Valuaciones', count: appraisals.filter(a => a.status === 'pending').length, color: 'bg-primary', roles: ['admin'] },
            { id: 'recruitments', icon: 'campaign', label: 'Reclutamiento', count: recruitments.filter(r => r.status === 'pending').length, color: 'bg-amber-500 shadow-glow shadow-amber-500/50', roles: ['admin'] },
            { id: 'rental-apps', icon: 'home_work', label: 'Solicitudes', count: rentalApps.filter(ra => ra.status === 'pending').length, color: 'bg-primary', roles: ['admin'] },
            { id: 'signed-docs', icon: 'folder_open', label: 'Documentos', roles: ['admin'] },
            // Removed potential, appointments, leads, investigations and archived_potential from main sidebar for admin
            { id: 'advisors-hub', icon: 'manage_accounts', label: 'Asesores', roles: ['admin'] }
          ]).filter(item => currentUser?.role && item.roles.includes(currentUser.role)).map((item) => (
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

        {currentUserRole === 'admin' && (
          <div className="mt-auto pt-6 border-t border-white/5 flex flex-col items-center">
            <button
              onClick={() => {
                setActiveTab('administration-hub');
                if (window.innerWidth < 768) setIsSidebarCollapsed(true);
              }}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl text-xl font-black uppercase tracking-widest transition-all duration-500 relative group ${activeTab === 'administration-hub'
                ? 'bg-primary text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)] scale-110'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="material-symbols-outlined text-2xl shrink-0">settings</span>
              <div className="absolute left-[calc(100%+15px)] px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 shadow-2xl z-[100] whitespace-nowrap pointer-events-none translate-x-[-10px] group-hover:translate-x-0 border border-white/10">
                Administración
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45"></div>
              </div>
            </button>
          </div>
        )}

        {currentUserRole !== 'admin' && (
          <div className="mt-auto pt-6 border-t border-white/5 flex flex-col items-center opacity-0 pointer-events-none h-14">
            {/* Intentional space to match layout height without adding a button */}
          </div>
        )}
      </aside>

      <main className={`flex-1 p-4 md:p-12 lg:p-20 overflow-x-hidden pt-32 md:pt-12 lg:pt-20 transition-all duration-300 ${currentUserRole === 'asesor' ? 'ml-0' : (!isSidebarCollapsed ? 'md:ml-80' : 'md:ml-24')}`}>
        {/* Header Action Bar - Hidden when an advisor is selected for a cleaner view */}
        {!(activeTab === 'advisors' && selectedAdvisorId) && (
          <div className="relative z-20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 md:mb-20 px-2 sm:px-0">
            <div>
              <div className="flex items-center gap-4 mb-2">
                {(activeTab === 'team' || activeTab === 'users-list' || activeTab === 'internal-props' || activeTab === 'client-panels' || activeTab === 'landing-pages' || activeTab === 'blog' || activeTab === 'advisors' || activeTab === 'leads' || activeTab === 'appointments' || activeTab === 'potential' || activeTab === 'ficha' || activeTab === 'calculator') && (
                  <button
                    onClick={() => {
                      if (currentUserRole === 'asesor') {
                        setActiveTab('team');
                        return;
                      }
                      if (activeTab === 'advisors' || activeTab === 'leads') {
                        setActiveTab('advisors-hub');
                      } else {
                        setActiveTab('administration-hub');
                      }
                    }}
                    className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-400 hover:text-primary transition-all group"
                  >
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                  </button>
                )}
                <h2 className="text-3xl md:text-6xl font-extrabold uppercase tracking-tighter text-slate-900 dark:text-white font-display leading-none">
                  {activeTab === 'inventory' ? 'Inventario' :
                    activeTab === 'leads' ? 'Prospectos' :
                      activeTab === 'internal-props' ? 'Propiedades' :
                        activeTab === 'reports' ? 'Reportes' :
                          activeTab === 'comprobantes' ? 'Pagos' :
                            activeTab === 'appraisals' ? 'Valuaciones' :
                              activeTab === 'rental-apps' ? 'Solicitudes' :
                                activeTab === 'appointments' ? 'Citas' :
                                  activeTab === 'users-list' ? 'Lista de Usuarios' :
                                    activeTab === 'team' ? (currentUserRole === 'asesor' ? 'Magno Asesor' : 'Equipo') :
                                      activeTab === 'advisors' ? 'Gestión de Asesores' :
                                        activeTab === 'advisors-hub' ? 'Centro de Asesores' :
                                          activeTab === 'blog' ? 'Blog & Noticias' :
                                            activeTab === 'potential' ? 'Clientes Potenciales' :
                                              activeTab === 'signed-docs' ? 'Documentos' :
                                                activeTab === 'landing-pages' ? 'Landing Pages' :
                                                  activeTab === 'advisor-properties' ? 'Propiedades Internas' :
                                                    activeTab === 'administration-hub' ? 'Administración' :
                                                      activeTab === 'client-panels' ? 'Accesos' :
                                                        activeTab === 'investigations' ? 'Resultados de Investigación' :
                                                          activeTab === 'archived_potential' ? 'Archivo de Investigaciones' :
                                                            activeTab === 'ficha' ? 'Landing Page' :
                                                              activeTab === 'calculator' ? '' :
                                                                'Accesos'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400">
                  {activeTab === 'leads' ? 'Seguimiento y conversión de clientes potenciales' :
                    activeTab === 'users-list' ? 'Gestión total de cuentas registradas' :
                      activeTab === 'blog' ? 'Editor de contenidos y novedades de Magno' :
                        activeTab === 'team' ? (currentUserRole === 'asesor' ? 'Tu perfil y herramientas de asesor' : 'Gestión de colaboradores y permisos') :
                          activeTab === 'advisors' ? 'Control de prospectos, ventas y contadores' :
                            activeTab === 'advisors-hub' ? 'Monitoreo de desempeño, metas y fuerza de ventas' :
                              activeTab === 'signed-docs' ? 'Archivo digital de contratos y firmas' :
                                activeTab === 'landing-pages' ? 'Gestión de páginas de captura y marketing' :
                                  activeTab === 'advisor-properties' ? 'Gestión y seguimiento de tus propiedades reclutadas' :
                                    activeTab === 'administration-hub' ? 'Centro de mando para directores y control administrativo' :
                                      activeTab === 'investigations' ? 'Revisión y calificación de investigaciones de prospectos' :
                                        activeTab === 'archived_potential' ? 'Archivo de Investigaciones' :
                                          activeTab === 'ficha' ? 'Personaliza tu landing page y biografía' :
                                            activeTab === 'calculator' ? 'Proyección de ingresos para asesores Magno' :
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

              {currentUser?.role === 'admin' && (
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
              )}


              {activeTab === 'inventory' ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); openCreateModal(); }}
                  className="bg-slate-950 text-white px-6 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-[0_20px_40_px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-105 transition-all"
                >
                  + Alta de Propiedad
                </button>
              ) : activeTab === 'leads' ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSelectedLead(null); setShowLeadForm(true); }}
                  className="bg-primary text-white px-6 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  Nuevo Prospecto
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
        )}

        {activeTab === 'administration-hub' && renderAdministrationHub()}
        {activeTab === 'advisors-hub' && renderAdvisorsHub()}

        {/* Advisor-Specific Navigation / Dashboard */}
        {currentUserRole === 'asesor' && activeTab === 'team' && renderAdvisorDashboard()}
        {currentUserRole === 'asesor' && activeTab === 'appointments' && renderAppointmentsView(currentUser?.id)}
        {currentUserRole === 'asesor' && activeTab === 'potential' && renderPotentialClientsView(currentUser?.id)}
        {activeTab === 'ficha' && renderAdvisorFichaTab()}
        {activeTab === 'calculator' && renderCommissionCalculator()}

        {activeTab === 'advisor-properties' && renderAdvisorPropertiesTab()}

        {activeTab === 'inventory' && currentUser?.role === 'admin' && (
          <div className="flex flex-col gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                {['active', 'paused', 'all'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={(e) => { e.preventDefault(); setInventoryStatusFilter(st as any); }}
                    className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${inventoryStatusFilter === st
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-xl scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                  >
                    {st === 'active' ? 'Activas' : st === 'paused' ? 'No Disponibles' : 'Todas'}
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
                        p.status === PropertyStatus.PAUSED ? (p.status_reason || 'No Disponible') :
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

        {activeTab === 'leads' && renderLeadsTab()}




        {activeTab === 'payment_approvals' && renderPaymentApprovalsTab()}


        {/* Note: Investigations and Archived Potential tabs are rendered below with proper headers */}

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
        {/* Team Management / Advisor Ficha View */}
        {activeTab === 'team' && currentUser && (
          currentUserRole === 'admin' ? (
            <TeamManagement currentUser={currentUser} />
          ) : null // Handled above by renderAdvisorDashboard
        )}

        {activeTab === 'advisors' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderAdvisorsTab()}
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {appraisals.map((appraisal) => (
                  <div key={appraisal.id} className="relative bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
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
              renderRecruitmentsList(recruitments.filter(r => recruitmentFilter === 'all' || r.status === recruitmentFilter))
            )}
          </div>
        )}






        {/* Rental Applications View */}
        {
          activeTab === 'rental-apps' && (
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
                          {app.referred_by && (
                            <div className="flex items-center gap-2">
                              <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800">
                                REF: {users.find(u => u.id === app.referred_by)?.name || app.referred_by}
                              </span>
                              {users.find(u => u.id === app.referred_by)?.personalInfo?.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const phone = users.find(u => u.id === app.referred_by)?.personalInfo?.phone?.replace(/\D/g, '');
                                    window.open(`https://wa.me/${phone}`, '_blank');
                                  }}
                                  className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                  title="Contactar Referente (WA)"
                                >
                                  <span className="material-symbols-outlined text-[14px]">chat</span>
                                </button>
                              )}
                            </div>
                          )}
                          {app.payment_status && (
                            <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${app.payment_status === 'under_review'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-700'
                              : app.payment_status === 'approved'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700'
                              }`}>
                              Pago: {app.payment_status === 'under_review' ? 'En Revisión' : app.payment_status === 'approved' ? 'Aprobado' : 'Rechazado'}
                            </span>
                          )}
                          {app.investigation_link && (
                            <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white border-2 border-emerald-600 flex items-center gap-1.5 shadow-sm">
                              <span className="material-symbols-outlined text-[10px]">description</span>
                              REPORTADO
                            </span>
                          )}
                          {app.investigation_score && (
                            <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 text-purple-700 border-2 border-purple-200">
                              SCORE: {app.investigation_score}
                            </span>
                          )}
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
                        {currentUserRole === 'admin' && (
                          <div className="mt-6 space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Asignar Seguimiento</p>
                            <div className="flex items-center gap-3">
                              <select
                                value={app.assigned_to || ''}
                                onChange={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await supabase.from('rental_applications').update({ assigned_to: e.target.value }).eq('id', app.id);
                                    success('Asesor asignado a solicitud');
                                    fetchRentalApps();
                                  } catch (err) {
                                    error('Error al asignar asesor');
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 max-w-xs px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-600 dark:text-slate-300"
                              >
                                <option value="">Sin asesor asignado</option>
                                {users.filter(u => u.role === 'asesor').map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                              {app.assigned_to && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const advisor = users.find(u => u.id === app.assigned_to);
                                      if (advisor) {
                                        success(`Redirigiendo a gestión de ${advisor.name}`);
                                      }
                                    }}
                                    className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                                    title="Ver Perfil de Asesor"
                                  >
                                    <span className="material-symbols-outlined text-lg">person_search</span>
                                  </button>
                                  {users.find(u => u.id === app.assigned_to)?.personalInfo?.phone && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const phone = users.find(u => u.id === app.assigned_to)?.personalInfo?.phone?.replace(/\D/g, '');
                                        window.open(`https://wa.me/${phone}`, '_blank');
                                      }}
                                      className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm"
                                      title="Contactar Asesor (WA)"
                                    >
                                      <span className="material-symbols-outlined text-lg">chat</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center md:text-right bg-slate-50 dark:bg-slate-800 px-8 py-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-2">Visita Programada</p>
                        <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">{app.appointment_date}</p>
                        <p className="text-[10px] font-bold text-slate-400">{app.appointment_time} hrs</p>
                      </div>

                      {/* Advisor Ready to Close Button */}
                      {currentUserRole === 'asesor' && app.assigned_to === currentUser.id && app.status !== 'ready_to_close' && app.status !== 'completed' && (
                        <div className="md:ml-4">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('¿Confirmas que este trámite está listo para cerrarse? El administrador recibirá una solicitud de confirmación de comisión.')) {
                                try {
                                  // Archive Snapshot immediately
                                  let snapshot = null;
                                  if (app.property_ref) {
                                    const { data: propData } = await supabase.from('properties').select('*').eq('ref', app.property_ref).maybeSingle();
                                    const { data: intPropData } = await supabase.from('internal_properties').select('*').eq('ref', app.property_ref).maybeSingle();
                                    const p = propData || intPropData;
                                    if (p) {
                                      snapshot = { ref: p.ref, title: p.title || 'Propiedad', address: p.address, price: p.price, type: propData ? 'tokko' : 'internal' };
                                    }
                                  }

                                  await supabase.from('rental_applications').update({
                                    status: 'ready_to_close',
                                    property_snapshot: snapshot
                                  }).eq('id', app.id);

                                  success('Solicitud enviada al administrador para cierre final');
                                  fetchRentalApps();
                                } catch (err) {
                                  error('Error al actualizar estado');
                                }
                              }
                            }}
                            className="px-6 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Listo para Cerrar
                          </button>
                        </div>
                      )}
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
          )
        }

        {/* Blog Management View */}
        {
          activeTab === 'blog' && (
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
                    console.log('🔵 [BLOG BUTTON] Click detectado');
                    console.log('🔵 [BLOG BUTTON] Estado actual showBlogEditor:', showBlogEditor);
                    setEditingBlogPost(null);
                    console.log('🔵 [BLOG BUTTON] editingBlogPost reseteado a null');
                    setShowBlogEditor(true);
                    console.log('🔵 [BLOG BUTTON] showBlogEditor cambiado a TRUE');
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
          )
        }

        {/* Landing Pages View */}
        {
          activeTab === 'landing-pages' && (
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
          )
        }

        {/* Users List Tab Content */}
        {
          activeTab === 'investigations' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Resultados</span> de Investigación
                  </h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Revisa y califica los candidatos
                  </p>
                </div>
              </div>
              {renderInvestigationReview()}
            </div>
          )
        }

        {
          activeTab === 'archived_potential' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-400">Archivo</span> de Candidatos
                  </h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Historial de investigaciones rechazadas
                  </p>
                </div>
              </div>
              {renderArchivedPotential()}
            </div>
          )
        }

        {/* Modal for Investigation Review */}
        {
          showInvestigationModal && selectedInvestigation && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Dictamen de Investigación</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Candidato: {selectedInvestigation.name}</p>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Puntaje (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value)}
                      className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/50 px-6 font-black text-2xl outline-none transition-all"
                      placeholder="85"
                    />
                    <p className="text-[9px] text-slate-400 mt-2 ml-1">* Menor a 60 se considera riesgo alto.</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Notas del Analista</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/50 p-4 font-bold text-sm outline-none transition-all resize-none"
                      placeholder="Detalles sobre antecedentes, referencias, etc..."
                    />
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                  <button
                    onClick={() => handleReviewInvestigation('rejected')}
                    disabled={isProcessingApproval}
                    className="flex-1 py-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleReviewInvestigation('approved')}
                    disabled={isProcessingApproval || !reviewScore}
                    className="flex-[2] py-4 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingApproval ? 'Procesando...' : 'Aprobar Candidato'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          activeTab === 'users-list' && (
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
          )
        }

        {/* Signed Documents View */}
        {
          activeTab === 'signed-docs' && (
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
            <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 overflow-hidden">
              <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl md:rounded-[4rem] flex flex-col overflow-hidden shadow-3xl max-h-[95vh] md:max-h-[92vh] border border-slate-100 dark:border-slate-800">
                <div className="px-6 py-6 md:px-12 md:py-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-1 md:mb-2 leading-none">Detalle de Solicitud</h2>
                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Folio: {selectedRentalApp.property_ref}</p>
                  </div>
                  <button onClick={() => { setSelectedRentalApp(null); setIsAdvisorEditing(false); }} className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 md:space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <section className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary">Información Personal</h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-4">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</p>
                          <p className="text-lg md:text-xl font-black">{selectedRentalApp.full_name}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Teléfono</p>
                            <p className="font-bold text-sm md:text-base">{selectedRentalApp.phone}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Email</p>
                            <p className="font-bold text-[10px] md:text-xs truncate">{selectedRentalApp.email}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary">Detalles de la Visita</h3>
                      <div className="bg-slate-950 text-white p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-4 shadow-xl">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Fecha Programada</p>
                          <p className="text-xl md:text-2xl font-black">{selectedRentalApp.appointment_date}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Horario</p>
                          <p className="text-lg md:text-xl font-bold">{selectedRentalApp.appointment_time} hrs</p>
                        </div>

                        {/* Google Calendar Sync Indicator */}
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                              <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="#4285F4" />
                            </svg>
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400 leading-tight">Sincronizado con Google Calendar</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Investigation Section (similar to Lead Management) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <section className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary">Estado de Investigación</h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-6 border border-slate-100 dark:border-white/5">
                        <div className="flex flex-wrap gap-3">
                          <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${selectedRentalApp.payment_status === 'approved' ? 'bg-green-500 text-white border-green-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                            Pago de Inv: {selectedRentalApp.payment_status === 'approved' ? 'Aprobado' : selectedRentalApp.payment_status === 'under_review' ? 'En Revisión' : 'Pendiente'}
                          </span>
                          {selectedRentalApp.investigation_score && (
                            <span className="px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest bg-purple-500 text-white border border-purple-600">
                              SCORE: {selectedRentalApp.investigation_score}
                            </span>
                          )}
                        </div>

                        {selectedRentalApp.investigation_link && (
                          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Enlace de Investigación</p>
                            <a
                              href={selectedRentalApp.investigation_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-primary/20 hover:border-primary transition-all group"
                            >
                              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">description</span>
                              <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex-1 truncate">Ver Reporte Detallado</span>
                              <span className="material-symbols-outlined text-slate-300 text-sm">open_in_new</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary">Documentos Firmados</h3>
                      <div className={`p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border flex items-center justify-between gap-4 transition-all ${selectedRentalApp.documents_signed ? 'bg-green-50 dark:bg-green-900/10 border-green-200 text-green-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-white/5 text-slate-400'}`}>
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-2xl">{selectedRentalApp.documents_signed ? 'task_alt' : 'history_edu'}</span>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Estado de Firma</p>
                            <p className="text-sm font-black uppercase tracking-tighter">{selectedRentalApp.documents_signed ? 'Contrato Firmado' : 'Pendiente de Firma'}</p>
                          </div>
                        </div>
                        {selectedRentalApp.documents_signed && (
                          <span className="material-symbols-outlined text-lg">verified</span>
                        )}
                      </div>
                    </section>
                  </div>

                  <section className="space-y-4 md:space-y-6">
                    <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Asesor Responsable
                      </div>
                      {selectedRentalApp.status === 'approved' && !isAdvisorEditing && currentUserRole !== 'asesor' && (
                        <button
                          onClick={() => setIsAdvisorEditing(true)}
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-primary/10 text-primary rounded-xl text-[7px] md:text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all whitespace-nowrap"
                        >
                          Cambiar Asesor
                        </button>
                      )}
                    </h3>

                    {selectedRentalApp.referred_by && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-5 py-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
                          REFERIDO POR: {users.find(u => u.id === selectedRentalApp.referred_by)?.name || selectedRentalApp.referred_by}
                        </span>
                        {users.find(u => u.id === selectedRentalApp.referred_by)?.personalInfo?.phone && (
                          <button
                            onClick={(e) => {
                              const phone = users.find(u => u.id === selectedRentalApp.referred_by)?.personalInfo?.phone?.replace(/\D/g, '');
                              window.open(`https://wa.me/${phone}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm group"
                            title="Contactar Referente (WA)"
                          >
                            <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">chat</span>
                          </button>
                        )}
                      </div>
                    )}

                    {!isAdvisorEditing && selectedRentalApp.status === 'approved' && selectedRentalApp.assigned_to ? (
                      // Summary View for Approved/Assigned
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl flex-shrink-0">
                            {allAdvisorProfiles.find(ap => ap.user_id === selectedRentalApp.assigned_to)?.photo_url ? (
                              <img src={allAdvisorProfiles.find(ap => ap.user_id === selectedRentalApp.assigned_to)?.photo_url} alt="Asesor" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-2xl">person</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm md:text-base font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight mb-1 truncate">
                              {getAdvisorName(selectedRentalApp.assigned_to)}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest text-slate-400">Asesor Asignado</span>
                              <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] md:text-[8px] font-black text-slate-400">V/R:</span>
                                <span className="text-[10px] font-black text-primary">
                                  {allAdvisorProfiles.find(ap => ap.user_id === selectedRentalApp.assigned_to)?.sold_count || 0} / {allAdvisorProfiles.find(ap => ap.user_id === selectedRentalApp.assigned_to)?.rented_count || 0}
                                </span>
                              </div>
                              {users.find(u => u.id === selectedRentalApp.assigned_to)?.personalInfo?.phone && (
                                <>
                                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                  <button
                                    onClick={() => {
                                      const phone = users.find(u => u.id === selectedRentalApp.assigned_to)?.personalInfo?.phone?.replace(/\D/g, '');
                                      window.open(`https://wa.me/${phone}`, '_blank');
                                    }}
                                    className="flex items-center gap-1.5 text-green-500 hover:text-green-600 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">chat</span>
                                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20 w-fit">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          <span className="text-[8px] font-black uppercase tracking-widest">Cita Confirmada</span>
                        </div>
                      </div>
                    ) : (
                      // Selection Grid (for new apps or when editing)
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-4 md:space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                            Selecciona al asesor responsable de atender esta cita.
                          </p>
                          {isAdvisorEditing && (
                            <button onClick={() => setIsAdvisorEditing(false)} className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:underline">Cancelar</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
                          {users
                            .filter(u => u.role === 'asesor')
                            .map((advisor) => {
                              // Conflict Detection Logic
                              const isBusy = [...appointments, ...rentalApps.map(ra => ({
                                assigned_to: ra.assigned_to,
                                date: ra.appointment_date,
                                time: ra.appointment_time,
                                isRental: true,
                                id: ra.id
                              }))].some(appt => {
                                if (appt.assigned_to !== advisor.id) return false;
                                if ((appt as any).id === selectedRentalApp.id) return false;

                                const apptDate = (appt as any).isRental ? (appt as any).date : (appt as any).start_time.split('T')[0];
                                const apptTime = (appt as any).isRental ? (appt as any).time : (appt as any).start_time.split('T')[1]?.substring(0, 5);

                                return apptDate === selectedRentalApp.appointment_date && apptTime === selectedRentalApp.appointment_time;
                              });

                              return (
                                <button
                                  key={advisor.id}
                                  onClick={() => {
                                    const isCurrentlySelected = selectedRentalApp.assigned_to === advisor.id;
                                    const newAssignedTo = isCurrentlySelected ? undefined : advisor.id;

                                    setRentalApps(prev => prev.map(a => a.id === selectedRentalApp.id ? { ...a, assigned_to: newAssignedTo } : a));
                                    setSelectedRentalApp({ ...selectedRentalApp, assigned_to: newAssignedTo });
                                  }}
                                  className={`p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group relative overflow-hidden ${selectedRentalApp.assigned_to === advisor.id
                                    ? 'bg-primary border-primary text-white shadow-2xl scale-105 z-10'
                                    : isBusy
                                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 opacity-60'
                                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/50 shadow-sm'
                                    }`}
                                >
                                  {/* Advisor Photo */}
                                  <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                    {allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.photo_url ? (
                                      <img src={allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.photo_url} alt={advisor.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="material-symbols-outlined text-slate-400 text-xl md:text-3xl">person</span>
                                    )}
                                  </div>

                                  <div className="text-center space-y-1 w-full">
                                    <p className="text-[10px] md:text-xs font-black uppercase tracking-tighter truncate leading-none">{advisor.name}</p>
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="flex flex-col items-center">
                                        <p className={`text-[5px] md:text-[6px] font-black uppercase tracking-widest ${selectedRentalApp.assigned_to === advisor.id ? 'text-white/60' : 'text-slate-400'}`}>Ventas</p>
                                        <p className="text-[8px] md:text-[10px] font-black">{allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.sold_count || 0}</p>
                                      </div>
                                      <div className="w-[1px] h-3 md:h-4 bg-slate-200 dark:bg-slate-700"></div>
                                      <div className="flex flex-col items-center">
                                        <p className={`text-[5px] md:text-[6px] font-black uppercase tracking-widest ${selectedRentalApp.assigned_to === advisor.id ? 'text-white/60' : 'text-slate-400'}`}>Rentas</p>
                                        <p className="text-[8px] md:text-[10px] font-black">{allAdvisorProfiles.find(ap => ap.user_id === advisor.id)?.rented_count || 0}</p>
                                      </div>
                                    </div>

                                    {/* Mini Agenda hoy/mañana */}
                                    <div className={`mt-3 w-full p-2 md:p-3 rounded-2xl md:rounded-[1.5rem] text-[6px] md:text-[7px] text-left space-y-2 md:space-y-3 border transition-colors ${selectedRentalApp.assigned_to === advisor.id ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                                      {[
                                        { label: 'Hoy', date: new Date().toISOString().split('T')[0] },
                                        { label: 'Mañana', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                                      ].map((day) => {
                                        const dayAppts = allAppointments.filter(app =>
                                          app.assigned_to === advisor.id &&
                                          app.start_time.startsWith(day.date)
                                        ).sort((a, b) => a.start_time.localeCompare(b.start_time));

                                        return (
                                          <div key={day.label} className="space-y-1">
                                            <div className="flex items-center justify-between opacity-40">
                                              <p className="font-black uppercase tracking-widest">{day.label}</p>
                                              <p className="text-[5px] md:text-[6px] font-bold">{day.date.split('-').reverse().slice(0, 2).join('/')}</p>
                                            </div>
                                            {dayAppts.length > 0 ? (
                                              <div className="space-y-1">
                                                {dayAppts.slice(0, 2).map((da, idx) => (
                                                  <div key={idx} className="flex flex-col leading-tight">
                                                    <span className={`font-black tracking-tighter ${selectedRentalApp.assigned_to === advisor.id ? 'text-white' : 'text-primary'}`}>{da.start_time.split('T')[1]?.substring(0, 5)} hrs</span>
                                                    <span className="truncate opacity-70">{da.client_name || da.title}</span>
                                                  </div>
                                                ))}
                                                {dayAppts.length > 2 && <p className="opacity-40 italic">+{dayAppts.length - 2} más</p>}
                                              </div>
                                            ) : (
                                              <p className="opacity-30 italic text-[5px] md:text-[6px]">Libre</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {isBusy && (
                                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[5px] md:text-[6px] font-bold animate-pulse z-20">
                                      <span className="material-symbols-outlined text-[7px] md:text-[8px]">event_busy</span>
                                      OCUPADO
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                        {users.filter(u => u.role === 'asesor').some(advisor => {
                          const isBusy = [...appointments, ...rentalApps.map(ra => ({
                            assigned_to: ra.assigned_to,
                            date: ra.appointment_date,
                            time: ra.appointment_time,
                            isRental: true,
                            id: ra.id
                          }))].some(appt => {
                            if (appt.assigned_to !== advisor.id) return false;
                            if ((appt as any).id === selectedRentalApp.id) return false;
                            const apptDate = (appt as any).isRental ? (appt as any).date : (appt as any).start_time.split('T')[0];
                            const apptTime = (appt as any).isRental ? (appt as any).time : (appt as any).start_time.split('T')[1]?.substring(0, 5);
                            return apptDate === selectedRentalApp.appointment_date && apptTime === selectedRentalApp.appointment_time;
                          });
                          return advisor.id === selectedRentalApp.assigned_to && isBusy;
                        }) && (
                            <div className="flex items-center gap-2 p-3 md:p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50">
                              <span className="material-symbols-outlined text-red-500 text-xs md:text-sm">warning</span>
                              <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Atención: Conflicto de horario.</p>
                            </div>
                          )}
                      </div>
                    )}
                  </section>

                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 md:gap-4">
                    {/* Contextual Action Button */}
                    {(selectedRentalApp.status !== 'approved' || isAdvisorEditing) ? (
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase
                            .from('rental_applications')
                            .update({
                              status: 'approved',
                              assigned_to: selectedRentalApp.assigned_to
                            })
                            .eq('id', selectedRentalApp.id);

                          if (!err) {
                            // Notify Advisor if assigned
                            if (selectedRentalApp.assigned_to) {
                              await supabase.from('notifications').insert([{
                                type: 'appraisal',
                                title: 'Nueva Cita Asignada',
                                message: `Se te ha asignado la solicitud de ${selectedRentalApp.full_name} para la propiedad ${selectedRentalApp.property_ref}.`,
                                user_id: selectedRentalApp.assigned_to,
                                is_read: false
                              }]);
                            }

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

                            setRentalApps(prev => prev.map(a => a.id === selectedRentalApp.id ? { ...a, status: 'approved', assigned_to: selectedRentalApp.assigned_to } : a));
                            setIsAdvisorEditing(false); // Reset editing mode
                            success(selectedRentalApp.status === 'approved' ? 'Asignación actualizada' : 'Solicitud aprobada y asesor asignado');
                          }
                        }}
                        disabled={!selectedRentalApp.assigned_to}
                        className="flex-1 py-4 md:py-5 bg-green-600 disabled:bg-slate-400 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        {selectedRentalApp.status === 'approved' ? 'Guardar Cambios' : 'Aprobar y Asignar'}
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-4 bg-green-500/5 rounded-2xl md:rounded-3xl border border-green-500/10">
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-green-600">Gestión de Cita Finalizada</p>
                      </div>
                    )}

                    {!(currentUserRole === 'asesor' && selectedRentalApp.status === 'approved') && (
                      <button
                        onClick={async () => {
                          setConfirmAction({
                            type: 'delete_rental_app', // Reusing but with status update mapping
                            id: selectedRentalApp.id,
                            title: 'RECHAZAR SOLICITUD',
                            message: '¿Estás seguro de que deseas rechazar esta solicitud? Esta acción marcará la cita como rechazada y notificará al sistema.',
                            metadata: { status: 'rejected' }
                          });
                        }}
                        className="flex-1 py-4 md:py-5 bg-red-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                      >
                        Rechazar Cita
                      </button>
                    )}
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
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Nombre del Cliente</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">person</span>
                        <input
                          required
                          placeholder="NOMBRE COMPLETO"
                          className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-black text-sm uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                          value={appointmentForm.clientName}
                          onChange={e => setAppointmentForm({ ...appointmentForm, clientName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Teléfono de Contacto</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">call</span>
                        <input
                          required
                          placeholder="33 0000 0000"
                          className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-black text-sm uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                          value={appointmentForm.clientPhone}
                          onChange={e => setAppointmentForm({ ...appointmentForm, clientPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Fecha de Visita</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">calendar_today</span>
                          <input
                            required
                            type="date"
                            className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-black text-sm uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            value={appointmentForm.date}
                            onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Hora (HH:MM)</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">schedule</span>
                          <input
                            required
                            type="text"
                            placeholder="EJ. 10:00"
                            className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-black text-sm uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            value={appointmentForm.time}
                            onChange={e => {
                              let val = e.target.value.replace(/[^0-9:]/g, '');
                              if (val.length === 2 && !val.includes(':')) val += ':';
                              if (val.length > 5) val = val.substring(0, 5);
                              setAppointmentForm({ ...appointmentForm, time: val });
                            }}
                          />
                        </div>
                      </div>
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
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
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

        {/* Tokko Property Selector Portal */}
        {
          showTokkoSelector && (
            <div className="fixed inset-0 z-[500] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-2xl max-h-[85vh] rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-10 border-b border-slate-50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">add_business</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Vincular Anuncio Tokko</h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Busca y selecciona la propiedad publicada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTokkoSelector(false)}
                    className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="px-10 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 shrink-0">
                  <div className="relative flex gap-3">
                    <div className="relative flex-1 group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                      <input
                        type="text"
                        value={tokkoSearchQuery}
                        onChange={(e) => setTokkoSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTokkoSearch()}
                        placeholder="Busca por referencia, calle o título..."
                        className="w-full bg-white dark:bg-slate-800/50 pl-14 pr-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest border border-slate-100 dark:border-white/5 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleTokkoSearch}
                      disabled={loadingTokkoSelect}
                      className="px-8 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loadingTokkoSelect ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar overscroll-contain">
                  {loadingTokkoSelect ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando API de Tokko...</p>
                    </div>
                  ) : tokkoResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {tokkoResults.map((prop) => (
                        <div
                          key={prop.id}
                          onClick={() => handleSelectTokkoProperty(prop)}
                          className="group bg-white dark:bg-slate-800/30 p-6 rounded-[2.5rem] border border-slate-50 dark:border-white/5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer flex items-center gap-6"
                        >
                          <div className="w-20 h-20 rounded-[2rem] overflow-hidden shrink-0 border border-slate-100 dark:border-white/5">
                            <img
                              src={prop.photos?.[0]?.image || 'https://via.placeholder.com/150'}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              alt={prop.reference_code}
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/20">
                                REF: {prop.reference_code}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                {prop.property_type?.name} • {prop.operations?.[0]?.operation_type}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-xs">{prop.publication_title || prop.address}</h3>
                            <p className="text-[10px] text-slate-400 font-bold truncate">{prop.address}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio</p>
                            <p className="text-lg font-black text-primary italic">
                              ${(prop.operations?.find((op: any) => op.operation_type === 'Sale')?.prices[0]?.price || 0).toLocaleString()}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                        </div>
                      ))}
                    </div>
                  ) : tokkoSearchQuery ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 mb-4">search_off</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No se encontraron propiedades con ese criterio</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 mb-4">inventory_2</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresa una referencia o dirección para comenzar</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-10 py-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
                  <button
                    onClick={() => setShowTokkoSelector(false)}
                    className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all border border-slate-100 dark:border-white/5"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Blog Editor Modal */}
        {
          showProfileManager && selectedAdvisorId && (
            <ProfileManager
              userId={selectedAdvisorId}
              onClose={() => setShowProfileManager(false)}
              onUpdate={() => {
                // Refresh profiles if needed, or handle as transparent update
                fetchAdvisorProfiles();
              }}
            />
          )
        }
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

        {/* Lead Registration Modal */}
        {
          showLeadForm && (
            <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 sm:p-10">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 relative shadow-3xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setShowLeadForm(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl font-black">close</span>
                </button>

                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                      {selectedLead ? 'Editar Prospecto' : 'Nuevo Prospecto'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Información del cliente potencial</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  formData.set('full_name', leadFormName);
                  formData.set('phone', leadFormPhone);
                  formData.set('operation_type', leadFormOpType);
                  formData.set('source', leadFormSource);
                  formData.set('average_price', formattedAveragePrice);
                  if (leadFormPropertyId) formData.set('property_id', leadFormPropertyId);

                  const data = Object.fromEntries(formData.entries());
                  handleCreateLead(data as any);
                }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Nombre Completo</label>
                      <input
                        name="full_name"
                        required
                        value={leadFormName}
                        onChange={(e) => setLeadFormName(e.target.value)}
                        className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Teléfono</label>
                      <input
                        name="phone"
                        required
                        value={leadFormPhone}
                        onChange={(e) => setLeadFormPhone(e.target.value)}
                        className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Operación</label>
                      <div className="relative group">
                        <select
                          name="operation_type"
                          value={leadFormOpType}
                          onChange={(e) => setLeadFormOpType(e.target.value)}
                          className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest appearance-none text-left"
                        >
                          <option value="sale">Venta</option>
                          <option value="rent">Renta</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">expand_more</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Origen</label>
                      <div className="relative group">
                        <select
                          name="source"
                          value={leadFormSource}
                          onChange={(e) => setLeadFormSource(e.target.value)}
                          className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest appearance-none text-left"
                        >
                          <option value="Facebook">Facebook</option>
                          <option value="Boca a boca">Boca a boca</option>
                          <option value="Lona">Lona</option>
                          <option value="Otro">Otro</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">expand_more</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Precio de la Propiedad</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">payments</span>
                      <input
                        name="average_price"
                        required
                        type="text"
                        value={formattedAveragePrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (val === '') {
                            setFormattedAveragePrice('');
                          } else {
                            setFormattedAveragePrice(Number(val).toLocaleString());
                          }
                        }}
                        placeholder="E.G. 2,500,000"
                        className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest"
                      />
                    </div>
                  </div>

                  {advisorProfile?.advisor_type !== 'opcionador' && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Inmueble de Interés (Opcional)</label>
                      <div className="relative group">
                        <select
                          name="property_id"
                          value={leadFormPropertyId}
                          onChange={(e) => setLeadFormPropertyId(e.target.value)}
                          className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-sm tracking-widest appearance-none"
                        >
                          <option value="">Selecciona una propiedad...</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.ref} - {p.title}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none">apartment</span>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const cleanPrice = formattedAveragePrice.replace(/,/g, '');
                    const originalPrice = selectedLead?.average_price?.toString() || '';

                    const isDirty = !selectedLead ||
                      leadFormName !== (selectedLead.full_name || '') ||
                      leadFormPhone !== (selectedLead.phone || '') ||
                      leadFormOpType !== (selectedLead.operation_type || 'sale') ||
                      leadFormSource !== (selectedLead.source || 'Facebook') ||
                      leadFormPropertyId !== (selectedLead.property_id || '') ||
                      cleanPrice !== originalPrice;

                    return (
                      <button
                        type="submit"
                        disabled={selectedLead && !isDirty}
                        className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl transition-all text-sm mt-8 border-b-4 ${selectedLead && !isDirty
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 border-slate-400 pointer-events-none'
                          : 'bg-primary text-white shadow-primary/40 hover:scale-[1.02] active:scale-95 border-primary-dark'
                          }`}
                      >
                        {selectedLead ? 'ACEPTAR CAMBIOS' : 'REGISTRAR PROSPECTO'}
                      </button>
                    );
                  })()}


                </form>
              </div>
            </div>
          )
        }

        {/* Lead Management Panel (CRM Flow) */}
        {
          showLeadManagementPanel && selectedLead && (
            <div className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
              {/* Main Modal Container - Narrower and Centered */}
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-xl max-h-[90vh] rounded-[3.5rem] flex flex-col overflow-hidden shadow-3xl border border-slate-100 dark:border-white/10 relative">

                {/* Close Button - Top Right Floating */}
                <button
                  onClick={() => setShowLeadManagementPanel(false)}
                  className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all z-50"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>

                <div className="px-10 pt-12 pb-10 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col items-center text-center gap-2 flex-shrink-0">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-3xl">hub</span>
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">CRM: {selectedLead.full_name}</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Cierre Premium</p>

                  <button
                    onClick={() => setShowCancellationModal(true)}
                    className="mt-4 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-red-500/20"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    Detener Proceso
                  </button>
                </div>

                <div className="flex-1 p-10 space-y-10 overflow-y-auto custom-scrollbar">
                  {/* Status Timeline */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado del Proceso</h3>
                    </div>
                    <div className="relative px-2 py-4">
                      {/* Vertical line connector */}
                      <div className="absolute top-0 bottom-0 left-[21px] w-0.5 bg-slate-100 dark:bg-white/5 -z-0"></div>

                      <div className="flex flex-col gap-8">
                        {(() => {
                          const isOpcionador = advisorProfile?.advisor_type === 'opcionador';
                          const isRent = selectedLead.intent?.toLowerCase().includes('rent');

                          const isContractSigned = linkedRecruitment?.is_signed;

                          const config = isOpcionador ? [
                            { id: 'contacting', icon: 'chat', label: 'Contacto Inicial' },
                            { id: 'interested', icon: 'favorite', label: 'Propietario Interesado' },
                            { id: 'property_loading', icon: 'upload_file', label: 'Carga de Expediente' },
                            {
                              id: 'property_signing',
                              icon: isContractSigned ? 'verified' : 'draw',
                              label: isContractSigned ? 'Documentación Firmada' : 'Firma de Documentación',
                              isCompleted: isContractSigned
                            },
                            { id: 'published', icon: 'public', label: 'Propiedad Publicada' },
                            { id: 'closed_won', icon: 'stars', label: 'Proceso Exitoso' }
                          ] : (isRent ? [
                            { id: 'contacting', icon: 'chat', label: 'Contacto Inicial' },
                            { id: 'appointment', icon: 'event', label: 'Visita Realizada' },
                            { id: 'investigation_paid', icon: 'account_balance_wallet', label: 'Pago de Investigación' },
                            { id: 'investigating', icon: 'hourglass_top', label: 'Investigación en Curso' },
                            { id: 'ready_to_close', icon: 'lock', label: 'Proceso de Firma' },
                            { id: 'closed_won', icon: 'stars', label: 'Cierre Exitoso' }
                          ] : [
                            { id: 'contacting', icon: 'chat', label: 'Contacto Inicial' },
                            { id: 'appointment', icon: 'event', label: 'Visita Realizada' },
                            { id: 'investigation_paid', icon: 'account_balance_wallet', label: 'Pago de Investigación' },
                            { id: 'investigation_passed', icon: 'verified_user', label: 'Investigación Aprobada' },
                            { id: 'ready_to_close', icon: 'lock', label: 'Proceso de Firma' },
                            { id: 'closed_won', icon: 'stars', label: 'Cierre Exitoso' }
                          ]);

                          return config.map((step, idx) => {
                            const stepId = (step as any).id_ref || step.id;
                            const statuses = config.map(s => (s as any).id_ref || s.id);
                            const currentIdx = statuses.indexOf(selectedLead.status);
                            const isPast = (step as any).isCompleted || idx < currentIdx;
                            const isCurrent = idx === currentIdx;

                            return (
                              <div key={step.id} className="relative z-10 flex items-center gap-6 group">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${isCurrent ? 'bg-primary text-white shadow-primary/20 scale-110' :
                                  isPast ? 'bg-green-500 text-white' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60'
                                  }`}>
                                  <span className="material-symbols-outlined text-lg">
                                    {isPast && !(step as any).isCompleted ? 'check' : step.icon}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-primary' : isPast ? 'text-green-500' : 'text-slate-400'}`}>
                                    {step.label}
                                  </p>
                                  {isCurrent && (
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 animate-pulse">Etapa Actual</span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Summary & Actions */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Última Actualización</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {new Date(selectedLead.updated_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {advisorProfile?.advisor_type !== 'opcionador' && (
                      <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Inmueble de Interés</p>
                        <p className="text-sm font-black text-primary uppercase">
                          {properties.find(p => p.id === selectedLead.property_id)?.ref || selectedLead.property_snapshot?.ref || (selectedLead.property_id && !selectedLead.property_id.includes('-') ? selectedLead.property_id : 'Ref Pendiente')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Action Zone */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acción del Momento</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Opcionador Action Zone */}
                      {advisorProfile?.advisor_type === 'opcionador' && (
                        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-primary mb-4">
                            {selectedLead.status === 'contacting' ? 'waving_hand' :
                              selectedLead.status === 'interested' ? 'hub' :
                                selectedLead.status === 'meeting_doubts' ? 'event_repeat' :
                                  selectedLead.status === 'property_loading' ? 'hourglass_top' :
                                    selectedLead.status === 'property_signing' ? 'draw' : 'stars'}
                          </span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                            {selectedLead.status === 'contacting' ? '¿Ya hablaste con el dueño?' :
                              selectedLead.status === 'interested' ? '¿Qué sigue con este prospecto?' :
                                selectedLead.status === 'meeting_doubts' ? '¿Qué se decidió en la cita?' :
                                  selectedLead.status === 'property_loading' ? (linkedRecruitment ? 'Revisando Expediente...' : 'Esperando Carga...') :
                                    selectedLead.status === 'property_signing' ? '¿Ya se publicó?' : '¡Propiedad Lista!'}
                          </h4>

                          {/* Granular Heartbeat Activity Feed */}
                          {linkedRecruitment && (selectedLead.status === 'property_loading' || selectedLead.status === 'property_signing' || selectedLead.status === 'interested') && (
                            <div className="mt-4 p-6 bg-white dark:bg-slate-900/50 rounded-[2rem] border border-primary/10 w-full max-w-sm relative">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Seguimiento Real</p>
                                  <button
                                    onClick={() => fetchRecruitments()}
                                    className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-primary transition-all rounded-full hover:bg-primary/10"
                                    title="Actualizar estado real"
                                  >
                                    <span className={`material-symbols-outlined text-[10px] ${loadingRecruitments ? 'animate-spin text-primary' : ''}`}>sync</span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                                  <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                                  <span className="text-[7px] font-black text-green-500 uppercase tracking-tighter">En Línea</span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {/* Paso 1: Cuenta */}
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xs">person</span>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase">Usuario Creado</p>
                                    <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">Paso inicial completado</p>
                                  </div>
                                  <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                                </div>

                                {/* Paso 2: Documentos */}
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const hasINE = (linkedRecruitment.form_data?.id_urls?.length || 0) >= 1;
                                    const hasPredial = !!linkedRecruitment.form_data?.predial_url;
                                    const isDone = hasINE && hasPredial;
                                    const inProgress = hasINE || hasPredial;

                                    return (
                                      <>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500/20 text-green-500' : inProgress ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                          <span className="material-symbols-outlined text-xs">description</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                          <p className={`text-[9px] font-black uppercase ${isDone ? 'text-slate-900 dark:text-white' : inProgress ? 'text-amber-500' : 'text-slate-400'}`}>Expediente (INE/Predial)</p>
                                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">
                                            {!hasINE && !hasPredial ? 'Pendiente de inicio' :
                                              hasINE && !hasPredial ? 'Falta Predial' :
                                                !hasINE && hasPredial ? 'Falta INE' : 'Documentos listos'}
                                          </p>
                                        </div>
                                        <span className={`material-symbols-outlined text-sm ${isDone ? 'text-green-500' : inProgress ? 'text-amber-500 animate-pulse' : 'text-slate-200 dark:text-slate-700'}`}>
                                          {isDone ? 'check_circle' : inProgress ? 'pending' : 'circle'}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Paso 3: Fotos */}
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const photoCount = linkedRecruitment.form_data?.gallery_urls?.length || 0;
                                    const isDone = photoCount >= 3;
                                    const inProgress = photoCount > 0;

                                    return (
                                      <>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500/20 text-green-500' : inProgress ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                          <span className="material-symbols-outlined text-xs">photo_camera</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                          <p className={`text-[9px] font-black uppercase ${isDone ? 'text-slate-900 dark:text-white' : inProgress ? 'text-amber-500' : 'text-slate-400'}`}>Fotos de Propiedad</p>
                                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">
                                            {photoCount === 0 ? 'Sin fotos aún' : isDone ? 'Galería completa' : `Subidas: ${photoCount}/3 mín.`}
                                          </p>
                                        </div>
                                        <span className={`material-symbols-outlined text-sm ${isDone ? 'text-green-500' : inProgress ? 'text-amber-500 animate-pulse' : 'text-slate-200 dark:text-slate-700'}`}>
                                          {isDone ? 'check_circle' : inProgress ? 'pending' : 'circle'}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Paso 4: Firma */}
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const isDone = linkedRecruitment.is_signed;

                                    return (
                                      <>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                          <span className="material-symbols-outlined text-xs">contract</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                          <p className={`text-[9px] font-black uppercase ${isDone ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Documentación Firmada</p>
                                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">{isDone ? 'Contrato formalizado' : 'Esperando firma digital'}</p>
                                        </div>
                                        <span className={`material-symbols-outlined text-sm ${isDone ? 'text-green-500' : 'text-slate-200 dark:text-slate-700'}`}>
                                          {isDone ? 'check_circle' : 'circle'}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Dynamic Sync Banner */}
                              {linkedRecruitment.is_signed && selectedLead.status === 'property_loading' && (
                                <div className="mt-4 p-4 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center gap-2">
                                  <p className="text-[8px] font-black text-primary uppercase tracking-widest">Client ya firmó contrato</p>
                                  <button
                                    onClick={() => handleUpdateLeadStatus(selectedLead.id, 'property_signing')}
                                    className="w-full py-2 bg-primary text-white rounded-xl font-black text-[8px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                  >
                                    Sincronizar a Firma
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {!linkedRecruitment && selectedLead.status === 'property_loading' && (
                            <div className="mt-4 p-5 bg-amber-500/5 rounded-3xl border border-amber-500/20 w-full max-w-sm">
                              <p className="text-[10px] font-bold text-amber-600 leading-tight">
                                El cliente aún no ha iniciado su carga de datos. Asegúrate de enviarle tu link de referido para que su propiedad aparezca aquí.
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 justify-center mt-6">
                            {selectedLead.status === 'contacting' && (
                              <button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'interested')} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Sí, le interesa</button>
                            )}
                            {selectedLead.status === 'interested' && (
                              <div className="flex flex-col gap-4 w-full">
                                <button
                                  onClick={() => {
                                    setConfirmAction({
                                      type: 'crm_status',
                                      id: selectedLead.id,
                                      newStatus: 'property_loading',
                                      title: 'Iniciar Carga de Expediente',
                                      message: '¿Aceptas que tu prospecto ya va a comenzar a subir los datos de su propiedad? se actualizará tu CRM.',
                                    });
                                  }}
                                  className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                >
                                  Continuar a Carga
                                </button>
                                <button
                                  onClick={() => setShowOwnerAppointmentModal(true)}
                                  className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                  Agendar Cita
                                </button>
                              </div>
                            )}
                            {selectedLead.status === 'meeting_doubts' && (
                              <div className="flex flex-col gap-4 w-full">
                                <button
                                  onClick={() => {
                                    setConfirmAction({
                                      type: 'crm_status',
                                      id: selectedLead.id,
                                      newStatus: 'property_loading',
                                      title: 'Iniciar Carga de Expediente',
                                      message: '¿El cliente aceptó avanzar con el proceso de carga de datos?',
                                    });
                                  }}
                                  className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                >
                                  Avanzar a Carga
                                </button>
                                <button
                                  onClick={() => {
                                    setShowCancellationModal(true);
                                  }}
                                  className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                >
                                  No avanzar
                                </button>
                              </div>
                            )}
                            {selectedLead.status === 'property_loading' && (
                              <div className="flex flex-col gap-4 w-full">
                                {linkedRecruitment ? (
                                  <>
                                    <button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'property_signing')} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                                      Ir a Firma
                                    </button>
                                    <button
                                      onClick={() => {
                                        const isRent = selectedLead.intent?.toLowerCase().includes('rent');
                                        const intentPath = isRent ? 'rentar' : 'vender';
                                        const url = `${window.location.origin}/${intentPath}?ref=${currentUser?.id}`;
                                        navigator.clipboard.writeText(url);
                                        success(`Link de referido (${isRent ? 'Renta' : 'Venta'}) copiado`);
                                      }}
                                      className="px-6 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all flex items-center justify-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-xs">share</span>
                                      Re-copiar Link Firma
                                    </button>
                                    {/* Manual Link Button for Re-copy State */}
                                    <button
                                      onClick={() => {
                                        setLinkLead(selectedLead);
                                        setShowLinkPropertyModal(true);
                                      }}
                                      className="px-6 py-2 text-[8px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-xs">link</span>
                                      Ya firmó (Vincular)
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center w-full">
                                    <button
                                      onClick={() => {
                                        const isRent = selectedLead.intent?.toLowerCase().includes('rent');
                                        const intentPath = isRent ? 'rentar' : 'vender';
                                        const url = `${window.location.origin}/${intentPath}?ref=${currentUser?.id}&leadId=${selectedLead.id}`;
                                        navigator.clipboard.writeText(url);
                                        success(`Link de referido (${isRent ? 'Renta' : 'Venta'}) copiado`);
                                      }}
                                      className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 w-full"
                                    >
                                      <span className="material-symbols-outlined text-sm">share</span>
                                      Copiar Link Firma
                                    </button>

                                    <div className="mt-4 w-full border-t border-slate-100 dark:border-white/5 pt-4">
                                      <p className="text-[9px] text-center text-slate-400 mb-2 font-bold uppercase tracking-widest">¿El cliente ya firmó por su cuenta?</p>
                                      <button
                                        onClick={() => {
                                          setLinkLead(selectedLead);
                                          setShowLinkPropertyModal(true);
                                        }}
                                        className="w-full px-8 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center gap-3 group"
                                      >
                                        <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">link</span>
                                        Ya firmó (Vincular Propiedad)
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {selectedLead.status === 'property_signing' && (
                              <button
                                onClick={() => {
                                  setTokkoSearchQuery(selectedLead.full_name.split(' ')[0]); // Pre-fill with first name
                                  setShowTokkoSelector(true);
                                  handleTokkoSearch(); // Trigger initial search
                                }}
                                className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                              >
                                Propiedad Publicada
                              </button>
                            )}
                            {selectedLead.status === 'published' && (
                              <div className="flex flex-col gap-4 w-full">
                                <button
                                  onClick={() => {
                                    setLinkLead(selectedLead);
                                    setShowLinkPropertyModal(true);
                                  }}
                                  className="w-full px-8 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center gap-3 group"
                                >
                                  <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">link</span>
                                  Vincular Propiedad Publicada
                                </button>
                                {selectedLead.property_id || selectedLead.property_snapshot ? (
                                  <div className="space-y-4 w-full">
                                    <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl">
                                      <p className="text-[10px] text-green-600 dark:text-green-400 font-black uppercase leading-relaxed text-center">
                                        ¡Propiedad Vinculada con Éxito! Ya puedes solicitar tu comisión.
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleUpdateLeadStatus(selectedLead.id, 'closed_won')}
                                      className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all w-full shadow-lg shadow-primary/20"
                                    >
                                      Solicitar Comisión
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'closed_won')} className="px-8 py-3 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all w-full">Finalizar Proceso</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cerrador Action Zone */}
                      {advisorProfile?.advisor_type !== 'opcionador' && selectedLead.status === 'appointment' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">event_available</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Resultado de Visita</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Si la visita fue exitosa, solicita el pago de investigación</p>
                          <div className="flex flex-wrap gap-4 justify-center">
                            {selectedLead.payment_status === 'under_review' ? (
                              <div className="space-y-6 w-full">
                                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl animate-pulse">
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase leading-relaxed text-center">
                                    El comprobante ya fue enviado a revisión, en unos minutos te daremos un resultado y podrás seguir.
                                  </p>
                                </div>
                                <button
                                  onClick={() => { setUploadingLeadId(selectedLead.id); setShowPaymentMethodModal(true); }}
                                  className="w-full px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-[9px] flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-sm">edit_document</span>
                                  Cambiar Comprobante
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setUploadingLeadId(selectedLead.id); setShowPaymentMethodModal(true); }}
                                  className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 transition-all text-[9px]"
                                >
                                  Cargar Pago Inv.
                                </button>
                                <button
                                  onClick={() => {
                                    const appt = allAppointments.find(a => a.id === selectedLead.id || (a as any).lead_id === selectedLead.id);
                                    if (appt) {
                                      setSelectedRescheduleAppt(appt);
                                      setShowFeedbackModal(true);
                                    } else {
                                      error('Información de visita no encontrada');
                                    }
                                  }}
                                  className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-[9px]"
                                >
                                  Ver Detalle Cita
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedLead.status === 'investigation_paid' && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-blue-500 mb-4 animate-pulse">account_balance_wallet</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Validación de Pago</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Administración está validando el comprobante</p>
                          <div className="flex flex-col gap-4 w-full">
                            {selectedLead.payment_proof_url && (
                              <a
                                href={selectedLead.payment_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-12 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-[10px]"
                              >
                                Ver Comprobante Cargado
                              </a>
                            )}
                            {currentUserRole === 'admin' && (
                              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 space-y-6 w-full text-left">
                                <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 space-y-4">
                                  <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-2 border-b border-primary/10 pb-2">Información de Validación</p>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[8px] font-black uppercase text-slate-400">Inquilino</p>
                                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{selectedLead.full_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-black uppercase text-slate-400">Asesor</p>
                                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{getAdvisorName(selectedLead.assigned_to)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-black uppercase text-slate-400">Propiedad</p>
                                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{properties.find(p => p.ref === selectedLead.property_ref)?.ref || selectedLead.property_ref || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-black uppercase text-slate-400">Método</p>
                                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{(selectedLead as any).payment_method === 'cashless_withdrawal' ? 'Retiro sin Tarjeta' : 'Transferencia'}</p>
                                    </div>
                                  </div>

                                  <div className="pt-2">
                                    <p className="text-[8px] font-black uppercase text-slate-400">Contacto</p>
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{selectedLead.phone} • {selectedLead.email}</p>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <p className="text-[9px] font-black uppercase text-slate-400 text-center">Acciones de Administrador</p>
                                  <input
                                    type="text"
                                    placeholder="Enlace de Investigación (Requerido)"
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-white/10 text-[10px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    value={investigationLink}
                                    onChange={(e) => setInvestigationLink(e.target.value)}
                                  />
                                  <button
                                    onClick={() => handleUpdateLeadStatus(selectedLead.id, (selectedLead.intent === 'rent' || selectedLead.intent === 'rent_out') ? 'investigating' : 'investigation_passed', { investigation_link: investigationLink })}
                                    disabled={!investigationLink.trim()}
                                    className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Validar Pago y Activar Investigación
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedLead.status === 'investigating' && (
                        <div className="bg-purple-500/10 border border-purple-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-purple-500 mb-4 animate-bounce">link</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Investigación en Curso</h4>

                          {selectedLead.investigation_link ? (
                            <div className="mt-4 w-full space-y-4">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Link para el cliente:</p>
                              <div className="flex gap-2">
                                <input readOnly value={selectedLead.investigation_link} className="flex-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/10 rounded-xl px-4 text-[9px] truncate text-slate-500" />
                                <button
                                  onClick={() => { navigator.clipboard.writeText(selectedLead.investigation_link!); success('Link copiado al portapapeles'); }}
                                  className="p-4 bg-primary text-white rounded-xl hover:scale-105 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">El link de investigación será proporcionado por el administrador</p>
                          )}

                          {currentUserRole === 'admin' && (
                            <div className="flex flex-wrap gap-4 justify-center mt-8">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">
                                La investigación debe ser calificada en la pestaña "Resultados"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedLead.status === 'investigation_passed' && (
                        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-green-500 mb-4">verified</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">¡Investigación Exitosa!</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">El prospecto ha pasado satisfactoriamente las pruebas</p>
                          <button
                            onClick={() => handleUpdateLeadStatus(selectedLead.id, 'ready_to_close')}
                            className="px-12 py-5 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-500/20 hover:scale-105 transition-all text-[10px] flex items-center gap-3"
                          >
                            Proceder a Etapa de Firma
                            <span className="material-symbols-outlined text-sm">lock</span>
                          </button>
                        </div>
                      )}

                      {selectedLead.status === 'ready_to_close' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4 animate-pulse">edit_document</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Proceso de Firma</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                            {(selectedLead.intent === 'rent' || selectedLead.intent === 'rent_out')
                              ? 'La coordinación de la firma la realizará el departamento jurídico con el Director. Una vez que la firma se haya realizado, confirma aquí para finalizar.'
                              : 'Coordina la firma del contrato con todas las partes involucradas. Asegúrate de tener toda la documentación lista.'
                            }
                          </p>
                          <button
                            onClick={async () => {
                              if (confirm('¿Confirmas que la firma se ha realizado y deseas cerrar la operación?')) {
                                handleUpdateLeadStatus(selectedLead.id, 'closed_won');
                              }
                            }}
                            className="px-12 py-5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 transition-all text-[10px]"
                          >
                            Confirmar Firma Realizada
                          </button>
                        </div>
                      )}

                      {selectedLead.status === 'closed_won' && (
                        <div className="bg-green-500 p-10 rounded-[2.5rem] flex flex-col items-center text-center shadow-2xl shadow-green-500/20">
                          <span className="material-symbols-outlined text-6xl text-white mb-6">celebration</span>
                          <h4 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">¡Operación Finalizada!</h4>
                          <p className="text-[11px] text-white/80 font-bold uppercase tracking-widest leading-relaxed">
                            Al llegar a esta fase confirmas que: <br />
                            1. Se entregó la propiedad <br />
                            2. El cliente ya hizo el pago <br />
                            3. Estás listo para recibir tu comisión
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Appointment Feedback Modal */}
                    {
                      showFeedbackModal && selectedRescheduleAppt && (
                        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 sm:p-10">
                          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] p-8 md:p-12 relative shadow-3xl animate-in zoom-in-95 duration-300">
                            <button onClick={() => setShowFeedbackModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-3xl font-black">close</span>
                            </button>

                            <div className="flex items-center gap-4 mb-10">
                              <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">task_alt</span>
                              </div>
                              <div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Resultado de Cita</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedRescheduleAppt.title}</p>
                              </div>
                            </div>

                            {feedbackSecurityStep === 'verify' ? (
                              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-8 rounded-[2rem]">
                                  <div className="flex items-center gap-4 mb-4 text-amber-600 dark:text-amber-500">
                                    <span className="material-symbols-outlined text-3xl">warning</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Atención: Modificación Segura</h3>
                                  </div>
                                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Ya existe un resultado registrado para esta cita. Para modificarlo, es necesario verificar tu identidad.
                                  </p>

                                  <div className="mt-6 pt-6 border-t border-amber-200 dark:border-amber-900/30">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-2">Resultado Anterior:</p>
                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase italic">
                                      "{selectedRescheduleAppt.feedback?.notes || 'Sin notas'}"
                                    </p>
                                  </div>
                                </div>

                                <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  if (!currentUser?.email) return;
                                  setIsVerifying(true);
                                  try {
                                    const { error: authErr } = await supabase.auth.signInWithPassword({
                                      email: currentUser.email,
                                      password: verifyPassword
                                    });
                                    if (authErr) throw authErr;
                                    setFeedbackSecurityStep('form');
                                    setVerifyPassword('');
                                  } catch (err: any) {
                                    error('Contraseña incorrecta');
                                  } finally {
                                    setIsVerifying(false);
                                  }
                                }} className="space-y-6">
                                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-inner">
                                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Confirma tu Contraseña</label>
                                    <input
                                      type="password"
                                      required
                                      value={verifyPassword}
                                      onChange={(e) => setVerifyPassword(e.target.value)}
                                      placeholder="••••••••"
                                      className="w-full bg-transparent border-none p-0 font-black text-xl focus:ring-0 text-slate-900 dark:text-white"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={isVerifying}
                                    className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                  >
                                    {isVerifying ? (
                                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        <span className="material-symbols-outlined">verified</span>
                                        Verificar Identidad
                                      </>
                                    )}
                                  </button>
                                </form>
                              </div>
                            ) : (
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const feedback = {
                                  result: formData.get('result'),
                                  notes: formData.get('notes'),
                                  details: formData.get('details'),
                                  is_potential: formData.get('is_potential')
                                };
                                try {
                                  await asesorService.saveAppointmentFeedback(selectedRescheduleAppt.id, feedback, (selectedRescheduleAppt as any).isRental);

                                  // Auto-update linked lead status if applicable
                                  if (selectedRescheduleAppt.lead_id) {
                                    const newStatus = feedback.result === 'paying_investigation' ? 'investigation_paid' :
                                      feedback.result === 'considering' ? 'contacting' :
                                        feedback.result === 'not_interested' ? 'closed_lost' : 'contacting';
                                    await asesorService.updateLeadStatus(selectedRescheduleAppt.lead_id, newStatus);
                                    fetchLeads();
                                  }

                                  success('Resultado guardado con éxito');
                                  setShowFeedbackModal(false);
                                  fetchAppointments();
                                  fetchRentalApps();
                                } catch (err) {
                                  error('Error al guardar resultado');
                                }
                              }} className="space-y-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">¿Crees que el cliente seguirá?</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-950 px-6 py-4 rounded-2xl border border-slate-100 dark:border-white/5 flex-1 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                      <input type="radio" name="is_potential" value="true" className="w-4 h-4 accent-primary" required defaultChecked={selectedRescheduleAppt.feedback?.is_potential === 'true'} />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">SÍ, ES POTENCIAL</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-950 px-6 py-4 rounded-2xl border border-slate-100 dark:border-white/5 flex-1 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/5 transition-all">
                                      <input type="radio" name="is_potential" value="false" className="w-4 h-4 accent-red-500" defaultChecked={selectedRescheduleAppt.feedback?.is_potential === 'false'} />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">NO</span>
                                    </label>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">¿Cómo terminó la cita?</label>
                                  <select name="result" defaultValue={selectedRescheduleAppt.feedback?.result || 'no_show'} required className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] border border-slate-100 dark:border-white/5 font-black text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-[10px] tracking-widest appearance-none">
                                    <option value="no_show">El cliente no asistió</option>
                                    <option value="not_interested">No le interesó (ver notas)</option>
                                    <option value="considering">Lo está pensando</option>
                                    <option value="paying_investigation">Pagará Investigación</option>
                                    <option value="other">Otro / Seguimiento</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Notas adicionales</label>
                                  <textarea name="notes" defaultValue={selectedRescheduleAppt.feedback?.notes || ''} placeholder="Ej: No le gustó la cocina, el precio es alto..." className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] border border-slate-100 dark:border-white/5 font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase text-[10px] tracking-widest" rows={4} />
                                </div>

                                <button
                                  type="submit"
                                  className="w-full py-6 bg-green-500 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-green-500/30 hover:scale-[1.02] active:scale-95 transition-all text-sm mt-6"
                                >
                                  Guardar Resultado
                                </button>
                              </form>
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

                    {/* Payment Method Selection Modal */}
                    {showPaymentMethodModal && (
                      <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative shadow-3xl animate-in zoom-in-95 duration-300">
                          <button
                            onClick={() => {
                              setShowPaymentMethodModal(false);
                              setSelectedPaymentMethod(null);
                            }}
                            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            disabled={isUploadingLeadPayment}
                          >
                            <span className="material-symbols-outlined text-2xl font-black">close</span>
                          </button>

                          {!selectedPaymentMethod ? (
                            <>
                              <div className="text-center mb-10">
                                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                                  <span className="material-symbols-outlined text-3xl">payments</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Método de Pago</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Selecciona cómo se realizó el pago</p>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedPaymentMethod('transfer');
                                  }}
                                  className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl hover:border-primary/50 transition-all group"
                                >
                                  <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">account_balance</span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Transferencia</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">SPEI / Depósito Bancario</p>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedPaymentMethod('cashless_withdrawal');
                                  }}
                                  className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl hover:border-primary/50 transition-all group"
                                >
                                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">atm</span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Retiro sin Tarjeta</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Clave de Retiro ATM</p>
                                  </div>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
                                <span className="material-symbols-outlined text-4xl">
                                  {selectedPaymentMethod === 'transfer' ? 'account_balance' : 'atm'}
                                </span>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900">
                                  <span className="material-symbols-outlined text-sm font-black">check</span>
                                </div>
                              </div>

                              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2">
                                {selectedPaymentMethod === 'transfer' ? 'Transferencia' : 'Retiro ATM'}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-10">Método seleccionado correctamente</p>

                              <div className="space-y-4">
                                <button
                                  onClick={() => leadPaymentInputRef.current?.click()}
                                  disabled={isUploadingLeadPayment}
                                  className="w-full py-6 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                  {isUploadingLeadPayment ? (
                                    <>
                                      <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                      <span>Subiendo...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined">upload_file</span>
                                      <span>Cargar Comprobante</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => setSelectedPaymentMethod(null)}
                                  disabled={isUploadingLeadPayment}
                                  className="w-full py-4 text-slate-400 hover:text-slate-600 dark:hover:text-white font-black uppercase tracking-widest text-[9px] transition-colors"
                                >
                                  Cambiar Método
                                </button>
                              </div>
                            </div>
                          )}

                          <input
                            type="file"
                            ref={leadPaymentInputRef}
                            onChange={handleLeadPaymentUpload}
                            accept="image/*,application/pdf"
                            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment Approval Modal */}
                    {selectedPaymentForApproval && (() => {
                      // Lookup property for comprehensive details
                      const modalProperty = properties.find(p =>
                        (selectedPaymentForApproval.property_ref && p.ref === selectedPaymentForApproval.property_ref) ||
                        (selectedPaymentForApproval.property_id && p.id === selectedPaymentForApproval.property_id) ||
                        (selectedPaymentForApproval.property_snapshot?.ref && p.ref === selectedPaymentForApproval.property_snapshot.ref)
                      );

                      return (
                        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
                          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 relative shadow-3xl animate-in zoom-in-95 duration-300 my-8">
                            <button
                              onClick={() => {
                                setSelectedPaymentForApproval(null);
                                setInvestigationLink('');
                              }}
                              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                              <span className="material-symbols-outlined text-2xl font-black">close</span>
                            </button>

                            <div className="text-center mb-8">
                              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                              </div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                Aprobar Pago
                              </h3>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                                Ingresa el link de investigación para el cliente
                              </p>
                            </div>

                            {/* Lead Summary */}
                            <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 mb-6">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">
                                Información del Prospecto
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {selectedPaymentForApproval.full_name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Teléfono</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {selectedPaymentForApproval.phone}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {selectedPaymentForApproval.email}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Propiedad</p>
                                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5">
                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">
                                      {modalProperty?.title || selectedPaymentForApproval.property_snapshot?.title || `Ref: ${selectedPaymentForApproval.property_ref || selectedPaymentForApproval.property_snapshot?.ref || modalProperty?.ref || 'N/A'}`}
                                    </p>
                                    {(modalProperty?.address || selectedPaymentForApproval.property_snapshot?.address) && (
                                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
                                        <span className="material-symbols-outlined text-[10px] inline-block mr-1 align-middle">location_on</span>
                                        {modalProperty?.address || selectedPaymentForApproval.property_snapshot?.address}
                                      </p>
                                    )}
                                    {(selectedPaymentForApproval.property_ref || selectedPaymentForApproval.property_snapshot?.ref || modalProperty?.ref) && (
                                      <p className="text-[8px] text-slate-400 font-bold">
                                        REF: {selectedPaymentForApproval.property_ref || selectedPaymentForApproval.property_snapshot?.ref || modalProperty?.ref}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Payment Proof */}
                            <div className="mb-6">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Comprobante de Pago</p>
                              {selectedPaymentForApproval.payment_proof_url?.endsWith('.pdf') ? (
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 flex items-center justify-center gap-4">
                                  <span className="material-symbols-outlined text-5xl text-red-500">picture_as_pdf</span>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Documento PDF</p>
                                    <button
                                      onClick={() => window.open(selectedPaymentForApproval.payment_proof_url, '_blank')}
                                      className="text-xs text-primary hover:underline font-bold mt-1"
                                    >
                                      Ver documento
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={selectedPaymentForApproval.payment_proof_url}
                                  alt="Comprobante"
                                  className="w-full h-64 object-cover rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(selectedPaymentForApproval.payment_proof_url, '_blank')}
                                />
                              )}
                            </div>

                            {/* Investigation Link Input */}
                            <div className="mb-8">
                              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                Link de Investigación *
                              </label>
                              <input
                                type="url"
                                value={investigationLink}
                                onChange={(e) => setInvestigationLink(e.target.value)}
                                placeholder="https://ejemplo.com/investigacion/12345"
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary/50 transition-all"
                              />
                              <p className="text-[9px] text-slate-400 mt-2 font-bold">
                                Este link será compartido con el asesor para que lo envíe al cliente
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                              <button
                                onClick={() => {
                                  setSelectedPaymentForApproval(null);
                                  setInvestigationLink('');
                                }}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleApprovePayment}
                                disabled={!investigationLink.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Aprobar y Enviar Link
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Payment Proof Modal */}
                    {
                      paymentProofModal && (() => {
                        const currentPayment = paymentProofModal.payments[paymentProofModal.currentIndex];
                        const advisor = users.find(u => u.id === currentPayment.assigned_to);
                        const property = properties.find(p =>
                          (currentPayment.property_ref && p.ref === currentPayment.property_ref) ||
                          (currentPayment.property_id && p.id === currentPayment.property_id) ||
                          (currentPayment.property_snapshot?.ref && p.ref === currentPayment.property_snapshot.ref)
                        );

                        const handlePrevious = () => {
                          if (paymentProofModal.currentIndex > 0) {
                            setPaymentProofModal({
                              ...paymentProofModal,
                              currentIndex: paymentProofModal.currentIndex - 1
                            });
                          }
                        };

                        const handleNext = () => {
                          if (paymentProofModal.currentIndex < paymentProofModal.payments.length - 1) {
                            setPaymentProofModal({
                              ...paymentProofModal,
                              currentIndex: paymentProofModal.currentIndex + 1
                            });
                          }
                        };

                        return (
                          <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
                            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] p-10 relative shadow-3xl animate-in zoom-in-95 duration-300 my-8">
                              {/* Close Button */}
                              <button
                                onClick={() => setPaymentProofModal(null)}
                                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white z-10"
                              >
                                <span className="material-symbols-outlined text-2xl font-black">close</span>
                              </button>

                              {/* Header */}
                              <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                  <span className="material-symbols-outlined text-3xl">receipt_long</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                  Comprobante de Pago
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                                  {paymentProofModal.currentIndex + 1} de {paymentProofModal.payments.length}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Payment Proof Image */}
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Comprobante</p>
                                  {currentPayment.payment_proof_url?.endsWith('.pdf') ? (
                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                                      <span className="material-symbols-outlined text-6xl text-red-500">picture_as_pdf</span>
                                      <div className="text-center">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Documento PDF</p>
                                        <button
                                          onClick={() => window.open(currentPayment.payment_proof_url, '_blank')}
                                          className="text-xs text-primary hover:underline font-bold"
                                        >
                                          Abrir documento
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={currentPayment.payment_proof_url}
                                      alt="Comprobante"
                                      className="w-full h-auto max-h-[500px] object-contain rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(currentPayment.payment_proof_url, '_blank')}
                                    />
                                  )}
                                </div>

                                {/* Right: Payment Details */}
                                <div className="space-y-6">
                                  {/* Upload Timestamp */}
                                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Fecha de Subida</p>
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {new Date(currentPayment.payment_date || currentPayment.created_at).toLocaleString('es-MX', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Applicant Info */}
                                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Solicitante</p>
                                    <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">
                                      {currentPayment.full_name}
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400 text-sm">phone</span>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                          {currentPayment.phone || 'N/A'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400 text-sm">email</span>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                                          {currentPayment.email || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Property Info */}
                                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Propiedad</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white mb-1">
                                      {property?.title || `Ref: ${currentPayment.property_ref || currentPayment.property_snapshot?.ref || property?.ref || 'N/A'}`}
                                    </p>
                                    {(property?.address || currentPayment.property_snapshot?.address) && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">location_on</span>
                                        {property?.address || currentPayment.property_snapshot?.address}
                                      </p>
                                    )}
                                  </div>

                                  {/* Advisor Info */}
                                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Asesor Asignado</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                      {advisor?.full_name || 'No asignado'}
                                    </p>
                                  </div>

                                  {/* Payment Method */}
                                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Método de Pago</p>
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-primary text-lg">
                                        {currentPayment.payment_method === 'cashless_withdrawal' ? 'atm' : 'account_balance'}
                                      </span>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {currentPayment.payment_method === 'cashless_withdrawal' ? 'Retiro sin Tarjeta' : 'Transferencia'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Navigation & Actions */}
                              <div className="flex items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                                {/* Previous Button */}
                                <button
                                  onClick={handlePrevious}
                                  disabled={paymentProofModal.currentIndex === 0}
                                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                                  Anterior
                                </button>

                                {/* Approve Button */}
                                <button
                                  onClick={() => {
                                    setSelectedPaymentForApproval(currentPayment);
                                    setPaymentProofModal(null);
                                  }}
                                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 shadow-lg"
                                >
                                  <span className="material-symbols-outlined text-sm">check_circle</span>
                                  Aprobar Pago
                                </button>

                                {/* Next Button */}
                                <button
                                  onClick={handleNext}
                                  disabled={paymentProofModal.currentIndex === paymentProofModal.payments.length - 1}
                                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  Siguiente
                                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    }

                    {/* Commission Request Modal */}
                    {selectedLeadForCommission && (
                      <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative shadow-3xl animate-in zoom-in-95 duration-300">
                          <button
                            onClick={() => setSelectedLeadForCommission(null)}
                            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            <span className="material-symbols-outlined text-2xl font-black">close</span>
                          </button>

                          <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                              <span className="material-symbols-outlined text-3xl">payments</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                              Solicitar Comisión
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                              Confirma que deseas cerrar esta operación
                            </p>
                          </div>

                          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 mb-8">
                            <div className="flex gap-4">
                              <button
                                onClick={() => setSelectedLeadForCommission(null)}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleRequestCommission}
                                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Confirmar Cierre
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {showOwnerAppointmentModal && (
                      <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 sm:p-10">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-8 md:p-10 relative shadow-3xl animate-in zoom-in-95 duration-300 overflow-hidden">
                          <button onClick={() => setShowOwnerAppointmentModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10">
                            <span className="material-symbols-outlined text-3xl font-black">close</span>
                          </button>

                          <div className="flex flex-col items-center mb-6 relative z-10">
                            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                              <span className="material-symbols-outlined text-3xl">calendar_month</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white text-center leading-none">
                              Agendar Cita
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">
                              Coordina la reunión con el propietario
                            </p>
                          </div>

                          <form onSubmit={handleOwnerAppointmentSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">¿Qué día?</label>
                                <input type="date" name="date" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">¿A qué hora?</label>
                                <input type="time" name="time" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500/50" />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Modalidad</label>
                              <div className="grid grid-cols-1 gap-4">

                                <label className="relative cursor-pointer group">
                                  <input type="radio" name="mode" value="virtual" className="peer sr-only" defaultChecked onChange={() => {
                                    const warningEl = document.getElementById('physical-warning');
                                    if (warningEl) warningEl.style.display = 'none';
                                  }} />
                                  <div className="p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 peer-checked:border-indigo-500 peer-checked:bg-indigo-500/5 transition-all flex flex-col items-center gap-2 group-hover:bg-slate-50 dark:group-hover:bg-white/5 h-full justify-center">
                                    <span className="material-symbols-outlined text-2xl text-slate-400 peer-checked:text-indigo-500">video_call</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 peer-checked:text-indigo-500 text-center">Virtual</span>
                                  </div>
                                </label>

                                <label className="relative cursor-pointer group">
                                  <input type="radio" name="mode" value="physical" className="peer sr-only" onChange={() => {
                                    const warningEl = document.getElementById('physical-warning');
                                    if (warningEl) warningEl.style.display = 'block';
                                  }} />
                                  <div className="p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 peer-checked:border-indigo-500 peer-checked:bg-indigo-500/5 transition-all flex flex-col items-center gap-2 group-hover:bg-slate-50 dark:group-hover:bg-white/5 h-full justify-center">
                                    <span className="material-symbols-outlined text-2xl text-slate-400 peer-checked:text-indigo-500">handshake</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 peer-checked:text-indigo-500 text-center">Presencial</span>
                                  </div>
                                </label>

                              </div>
                            </div>

                            <div id="physical-warning" className="hidden animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-2xl">
                                <p className="text-[10px] text-amber-800/80 dark:text-amber-200/80 font-medium leading-relaxed">
                                  <strong className="block uppercase text-[9px] mb-1 text-amber-600">Recomendación de Seguridad</strong>
                                  Procura reunirte con personas confiables y en lugares seguros. Es preferible una primera ciber-cita para validar al cliente.
                                </p>
                              </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98]">
                              Agendar Cita
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {showCancellationModal && (
                      <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 relative overflow-hidden shadow-3xl">
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Detener Proceso</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8 text-center">Selecciona la razón para archivar este prospecto</p>

                          <div className="space-y-4 mb-10">
                            {[
                              'El cliente ya no quiere seguir el proceso',
                              'No le gustó la propiedad',
                              'No realizó el pago de la investigación tras una semana',
                              'Otro cliente pagó la investigación (le ganaron)'
                            ].map(reason => (
                              <button
                                key={reason}
                                onClick={() => setCancellationReason(reason)}
                                className={`w-full p-6 rounded-2xl border text-left text-[10px] font-black uppercase tracking-widest transition-all ${cancellationReason === reason ? 'border-red-500 bg-red-500/5 text-red-500' : 'border-slate-100 dark:border-white/5 text-slate-500'}`}
                              >
                                {reason}
                              </button>
                            ))}
                          </div>

                          <textarea
                            placeholder="Notas adicionales (opcional)..."
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-2xl mb-8 text-[10px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
                            value={cancellationNotes}
                            onChange={(e) => setCancellationNotes(e.target.value)}
                          />

                          <div className="flex gap-4">
                            <button onClick={() => setShowCancellationModal(false)} className="flex-1 py-5 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black uppercase tracking-widest text-[9px] text-slate-500">Atrás</button>
                            <button
                              disabled={!cancellationReason || isProcessingCancellation}
                              onClick={() => handleCancelProcess(cancellationReason, cancellationNotes)}
                              className="flex-1 py-5 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[9px] shadow-glow shadow-red-500/20 disabled:opacity-50"
                            >
                              {isProcessingCancellation ? 'Cancelando...' : 'Confirmar Cancelación'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          showLinkPropertyModal && (
            <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 relative overflow-hidden shadow-3xl max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Vincular Propiedad</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8 text-center">Selecciona la propiedad de Tokko correspondiente a este cliente</p>

                <div className="mb-6 relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por título o referencia..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary/50"
                    value={propertySearchQuery}
                    onChange={e => setPropertySearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {(() => {
                    console.log('🔍 Total properties:', properties.length);
                    console.log('🔍 Submissions:', properties.filter(p => p.is_submission).length);
                    console.log('🔍 Current user:', currentUser?.id);
                    console.log('🔍 With referred_by:', properties.filter(p => p.referred_by).length);
                    return properties
                  })()
                    .filter(p => {
                      // CASE 1: Lead is in 'published' stage - Show TOKKO properties (not submissions)
                      if (linkLead?.status === 'published') {
                        // Hide submissions, show actual TOKKO/Internal properties
                        if (p.is_submission) return false;

                        // Check if already linked to another lead
                        const isAlreadyLinked = leads.some(l => l.property_id === p.id && l.id !== linkLead.id);
                        return !isAlreadyLinked;
                      }

                      // CASE 2: Lead is in 'property_loading' or 'property_signing' - Show Submissions referred by user
                      // Must be referred by current user
                      if (p.referred_by !== currentUser?.id) return false;

                      // Check if property is linked to any lead
                      const linkedLead = leads.find(l => l.property_id === p.id);

                      // If no lead linked, show it
                      if (!linkedLead) return true;

                      // If linked to a lead in property_loading or property_signing, show it (manual link needed)
                      if (linkedLead.status === 'property_loading' || linkedLead.status === 'property_signing') return true;

                      // Otherwise hide it (already successfully linked)
                      return false;
                    })
                    .filter(p => p.title.toLowerCase().includes(propertySearchQuery.toLowerCase()) || p.ref.toLowerCase().includes(propertySearchQuery.toLowerCase()))
                    .map(p => (
                      <button key={p.id} onClick={() => handleLinkProperty(p)} className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-primary/50 cursor-pointer transition-all flex items-center gap-4 group bg-slate-50 dark:bg-slate-950">
                        <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                          {p.images[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-400">image_not_supported</span></div>}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{p.title}</h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.ref} • {p.address}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-lg">link</span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <button onClick={() => setShowLinkPropertyModal(false)} className="mt-6 w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black uppercase tracking-widest text-[9px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            </div>
          )
        }


      </main >
      {/* Blog Editor Modal - Moved outside main for z-index safety */}
      {(() => {
        console.log('🟡 [RENDER CHECK] showBlogEditor:', showBlogEditor);
        return showBlogEditor;
      })() && (
          <BlogEditor
            post={editingBlogPost}
            onClose={() => {
              setShowBlogEditor(false);
              setEditingBlogPost(null);
            }}
            onSave={onSaveBlog}
            existingPosts={blogPosts}
            users={users}
          />
        )}
    </div >
  );
};

export default AdminDashboard;
