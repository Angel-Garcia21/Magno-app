import React, { useState, useEffect, useRef } from 'react';
import { Property, User, TimelineEvent, PaymentProof } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DashboardProps {
  user: User;
  property: Property;
  // timeline: TimelineEvent[]; // Removed to focus on the new "Trading" UI for now
}

const Dashboard: React.FC<DashboardProps> = ({ user, property }) => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  // State for Report Modal
  const [activeReport, setActiveReport] = useState<'property' | 'person' | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportImages, setReportImages] = useState<File[]>([]);

  // State for Vouchers Modal
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherMonth, setVoucherMonth] = useState('');
  const [voucherType, setVoucherType] = useState<'Retiro sin tarjeta' | 'Transferencia' | ''>('');


  // Data State
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [payments, setPayments] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch Data (Timeline & Payments)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!property?.id) return;

        // Get authenticated user ID
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('🔍 AUTH USER CHECK:', {
          authUser: authUser,
          authUserId: authUser?.id,
          propUserId: user.id,
          match: authUser?.id === user.id
        });

        if (!authUser) {
          console.error('❌ No authenticated user found');
          return;
        }

        // Fetch Timeline (independent try-catch to not block payment proofs)
        try {
          const { data: timelineData, error: timelineError } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('property_id', property.id)
            .order('date', { ascending: false });  // FIXED: Use 'date' not 'event_date'

          if (timelineError) throw timelineError;
          if (timelineData) {
            const formattedTimeline: TimelineEvent[] = timelineData.map(t => ({
              id: t.id,
              propertyId: t.property_id,
              title: t.title,
              description: t.description,
              date: t.date,  // FIXED: Use 'date' column
              status: t.status
            }));
            setTimeline(formattedTimeline);
          }
        } catch (timelineErr) {
          console.error('⚠️ Error loading timeline (non-critical):', timelineErr);
          // Don't throw - let payment proofs load even if timeline fails
        }

        // Fetch Payment Proofs (Only for the current user)
        // FIXED: Use authUser.id instead of user.id to ensure RLS policies work correctly
        try {
          console.log('📋 FETCHING PAYMENT PROOFS FOR:', authUser.id);

          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payment_proofs')
            .select('*')
            .eq('user_id', authUser.id)  // ← FIXED: Use auth user ID
            .order('month_year', { ascending: true });

          console.log('📊 PAYMENT QUERY RESULT:', {
            data: paymentsData,
            error: paymentsError,
            count: paymentsData?.length || 0
          });

          if (paymentsError) throw paymentsError;
          if (paymentsData) {
            const formattedPayments: PaymentProof[] = paymentsData.map(p => ({
              id: p.id,
              userId: p.user_id,
              propertyId: p.property_id,
              monthYear: p.month_year,
              amount: p.amount,
              proofUrl: p.proof_url,
              status: p.status,
              createdAt: p.created_at
            }));
            console.log('✅ FORMATTED PAYMENTS:', formattedPayments);
            setPayments(formattedPayments);
          }
        } catch (paymentErr) {
          console.error('💥 Error loading payment proofs:', paymentErr);
        }

      } catch (err) {
        console.error('💥 Error in fetchData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime Subscription for Payment Status Updates
    const subscription = supabase
      .channel('payment_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_proofs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Payment updated:', payload);
          setPayments((currentPayments) =>
            currentPayments.map((p) =>
              p.id === payload.new.id ? { ...p, status: payload.new.status } : p
            )
          );
          if (payload.new.status === 'approved') {
            success('¡Un pago ha sido aprobado!');
          } else if (payload.new.status === 'rejected') {
            error('Un pago ha sido rechazado. Verifica el archivo.');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [property?.id, user.id]);

  // Payment Graph Logic
  // Generate list of months for the contract duration
  // Assuming 12 months ending at contractEndDate. 
  // TODO: Add contractStartDate to User/Property type for better accuracy.
  const generateContractMonths = () => {
    if (!user.contractEndDate) return [];

    const end = new Date(user.contractEndDate);
    const start = user.contractStartDate ? new Date(user.contractStartDate) : new Date(end.getFullYear(), end.getMonth() - 11, 1);

    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const stopDate = new Date(end.getFullYear(), end.getMonth(), 1);

    // Safety break to prevent infinite loops
    let iterations = 0;
    while (current <= stopDate && iterations < 36) {
      const monthStr = current.toISOString().slice(0, 7); // YYYY-MM
      const payment = payments.find(p => p.monthYear === monthStr);
      const displayMonth = current.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

      months.push({
        month: displayMonth.replace('.', ''),
        fullDate: monthStr,
        amount: user.monthlyAmount || 0,
        // Status mapping: approved -> paid (vivid yellow), pending -> pending_review (vivid blue), null -> pending (subtle yellow)
        status: payment?.status === 'approved' ? 'paid' :
          payment?.status === 'pending' ? 'pending_review' :
            'pending'
      });

      current.setMonth(current.getMonth() + 1);
      iterations++;
    }
    return months;
  };

  const paymentGraphData = generateContractMonths();

  const isOwner = user.role === 'owner';

  // Handling Voucher Upload
  const handleVoucherSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoucherFile(e.target.files[0]);
    }
  };

  const submitVoucher = async () => {
    if (!voucherFile || !voucherMonth || !voucherType) {
      error('Selecciona un mes, tipo de pago y un archivo.');
      return;
    }


    setUploading(true);
    try {
      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Upload File
      const fileExt = voucherFile.name.split('.').pop();
      const fileName = `vouchers/${authUser.id}/${voucherMonth}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, voucherFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // 2. Insert Record
      const isInternal = (property as any).isInternal;
      const { error: dbError } = await supabase
        .from('payment_proofs')
        .insert({
          user_id: authUser.id,
          property_id: isInternal ? null : property.id,
          internal_property_id: isInternal ? property.id : null,
          month_year: voucherMonth,
          amount: user.monthlyAmount,
          proof_url: publicUrl,
          status: 'pending',
          payment_type: voucherType
        });


      if (dbError) throw dbError;

      success('Comprobante enviado exitosamente.');
      setShowVoucherModal(false);
      setVoucherFile(null);
      setVoucherMonth('');
      setVoucherType('');


      // Update local state instead of reload
      const newPayment: PaymentProof = {
        id: 'temp-' + Date.now(), // Temporary ID until refresh
        userId: authUser.id,
        propertyId: property.id,
        monthYear: voucherMonth,
        amount: user.monthlyAmount || 0,
        proofUrl: publicUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      setPayments(prev => [...prev, newPayment].sort((a, b) => a.monthYear.localeCompare(b.monthYear)));

    } catch (err: any) {
      console.error(err);
      error('Error al subir comprobante: ' + err.message);
    } finally {
      setUploading(false);
    }
  };


  // Support WhatsApp: 3319527172
  const handleSupport = () => {
    window.open('https://wa.me/523319527172', '_blank');
  };

  const handleReportImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setReportImages(Array.from(files));
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText || !reportTitle) {
      error('Por favor completa todos los campos');
      return;
    }

    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No autenticado');

      // Upload images to Supabase Storage
      const imageUrls: string[] = [];
      for (const file of reportImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${authUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('report-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Save report to database
      const isInternal = (property as any).isInternal;
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          user_id: authUser.id,
          property_id: isInternal ? null : property.id,
          internal_property_id: isInternal ? property.id : null,
          report_type: activeReport,
          title: reportTitle,
          description: reportText,
          image_urls: imageUrls,
          status: 'pending'
        });

      if (insertError) throw insertError;

      success('Reporte enviado exitosamente. Un asesor Magno se pondrá en contacto pronto.');
      setActiveReport(null);
      setReportTitle('');
      setReportText('');
      setReportImages([]);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      error(`Error al enviar reporte: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    // Simulate upload - in real app would go to supabase storage and update profiles.vouchers
    setTimeout(() => {
      setUploading(false);
      success('Comprobante subido exitosamente.');
    }, 1500);
  };

  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;

    setUploading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // Allow cross-origin images
        logging: false,
        backgroundColor: '#020617', // Match dark theme background
        windowWidth: 1200, // Force desktop width for consistency
        ignoreElements: (element) => element.id === 'operations-module', // Hide operations module in PDF
        onclone: (clonedDoc) => {
          // 1. Hide aesthetic background blobs
          const blob1 = clonedDoc.getElementById('aesthetic-blob-1');
          if (blob1) blob1.style.display = 'none';

          // 2. Fix Cut-off Name (remove line-clamp)
          const nameEl = clonedDoc.getElementById('linked-name');
          if (nameEl) {
            nameEl.classList.remove('line-clamp-1');
            nameEl.style.whiteSpace = 'normal';
            nameEl.style.overflow = 'visible';
            nameEl.style.wordBreak = 'break-word';
          }

          // 3. Ensure deep dark background for the container
          const container = clonedDoc.getElementById('dashboard-container');
          if (container) {
            container.style.backgroundColor = '#020617';
          }
          // Force body background in clone
          clonedDoc.body.style.backgroundColor = '#020617';
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      // If content is very long, we might need multiple pages or just fit to width
      // For this case, we'll fit to width and allow it to be long (single page scaled or multiple pages)
      // Actually standard A4 is fixed height. Let's try to fit width and split pages if needed.

      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfImgHeight;
      let position = 0;
      let page = 1;

      // Helper to set background
      const setDarkBackground = () => {
        pdf.setFillColor(2, 6, 23); // #020617
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      };

      // First Page
      setDarkBackground();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
      heightLeft -= pdfHeight;

      // Subsequent Pages
      while (heightLeft > 0) {
        position = -pdfHeight * page; // Move the image up by exactly one page height
        pdf.addPage();
        setDarkBackground();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
        heightLeft -= pdfHeight;
        page++;
      }

      pdf.save(`Reporte_Magno_${new Date().toISOString().split('T')[0]}.pdf`);
      success('Reporte descargado correctamente.');
    } catch (err) {
      console.error('Error generating PDF:', err);
      error('Error al generar el PDF.');
    } finally {
      setUploading(false);
    }
  };

  if (user?.role === 'owner') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8"></div>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">
          Redirigiendo al Portal de Clientes...
        </p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 border border-primary/20">
          <span className="material-symbols-outlined text-4xl text-primary">pending_actions</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">Panel Inactivo</h1>
        <p className="text-slate-500 max-w-sm mb-8 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
          No tienes una propiedad activa asignada. Si eres propietario, por favor dirígete al Portal de Clientes.
        </p>
        <button
          onClick={() => navigate('/client-portal')}
          className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-glow shadow-primary/20"
        >
          Ir al Portal de Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 pb-24 selection:bg-primary/30">
      {/* HUD Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-primary/30 shadow-glow shadow-primary/20 transition-transform active:scale-95">
            <span className="material-symbols-outlined text-primary font-black text-xl sm:text-2xl">waving_hand</span>
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-slate-900 dark:text-white">
              Hola, {user.name || 'Usuario'}
            </h1>
            <p className="text-[8px] sm:text-[9px] text-primary font-bold uppercase tracking-wider mt-1.5">
              Bienvenido a tu panel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10" />
      </header>

      <main ref={dashboardRef} className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10">
        {/* Main Ticker Card */}
        {/* DEBUG: Property ID: {property.id} */}
        <div className="relative bg-white dark:bg-slate-900/40 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 border border-slate-200 dark:border-white/5 shadow-2xl mb-6 sm:mb-8 overflow-hidden group">
          <div id="aesthetic-blob-1" className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10 relative z-10">
            <div className="flex-1">
              <span className="bg-primary/10 text-primary px-3 sm:px-4 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-primary/20 mb-3 sm:mb-4 inline-block">
                Contrato Activo • {property.status === 'rented' || user.role === 'owner' ? (user.role === 'owner' ? 'Propietario' : 'Inquilino') : 'Disponible'}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tighter leading-[0.9] mb-3 sm:mb-4 text-slate-900 dark:text-white font-display">
                {user.propertyTitle || property.title}
              </h2>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest leading-tight">
                <span className="material-symbols-outlined text-sm shrink-0">location_on</span>
                {user.propertyAddress || property.address}
              </div>
            </div>

            <div className="flex flex-row gap-4 sm:gap-6 w-full md:w-auto">
              <div className="flex-1 bg-slate-100 dark:bg-white/5 backdrop-blur-md p-5 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center min-w-[120px] sm:min-w-[180px] shadow-sm group-hover:scale-105 transition-transform duration-500">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 sm:mb-2 text-center">Folio Magno</p>
                <p className="text-sm sm:text-lg lg:text-xl font-black text-primary font-mono uppercase truncate w-full text-center">{(user.propertyCode || property.ref || '').toUpperCase()}</p>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-white/5 backdrop-blur-md p-5 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center min-w-[120px] sm:min-w-[180px] shadow-sm group-hover:scale-105 transition-transform duration-500">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 sm:mb-2 text-center">Monto Mes</p>
                <p className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white text-center">${(user.monthlyAmount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Payment Cycle Card */}
          <div className="bg-primary shadow-glow shadow-primary/20 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden border border-white/10 min-h-[160px] sm:min-h-[200px]">
            <div className="relative z-10 text-center">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Día de Pago</p>
              <p className="text-4xl sm:text-6xl font-black text-white">{user.depositDay || 'N/A'}</p>
            </div>
            <div className="relative z-10 max-w-sm mx-auto w-full mt-6">
              <div className="h-2 w-full bg-white/20 rounded-full mb-3 overflow-hidden shadow-inner">
                <div className="h-full bg-white w-2/3 shadow-[0_0_10px_white]" />
              </div>
              <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-white/80 text-center">Ciclo de Cobro Activo</p>
            </div>
            <span className="absolute -right-4 -top-4 material-symbols-outlined text-7xl sm:text-9xl text-white/[0.05] rotate-12">payments</span>
          </div>
        </div>


        {/* Payment History Chart - Only for Tenants */}
        {!isOwner && (
          <section className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Historial de Pagos</h3>
              <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 sm:p-10 border border-slate-200 dark:border-white/5 shadow-xl overflow-visible">
              <div className="flex items-end justify-between gap-4 sm:gap-6 h-64 overflow-x-auto overflow-y-visible pt-8 pb-4 scrollbar-hide snap-x px-4 sm:px-0">
                {paymentGraphData.map((payment, index) => {
                  const maxAmount = Math.max(...paymentGraphData.map(p => p.amount), user.monthlyAmount || 10000);
                  // Ensure height has minimum visibility
                  const heightPercent = Math.max((payment.amount / maxAmount) * 100, 10);

                  // Status Colors: paid = primary, pending = amber, pending_review = blue/purple? or just amber
                  // pending_review = uploaded but not approved

                  // VIVID NEON Colors - Normalized Brightness
                  let bgClass = 'bg-slate-200 dark:bg-slate-800';
                  let extraClasses = '';
                  const isFuture = new Date(payment.fullDate) > new Date();

                  // Status priority: Paid > In Review > Future Placeholder > Pending

                  // Paid = NEON YELLOW + Stronger Glow (Visible in Light Mode)
                  if (payment.status === 'paid') {
                    bgClass = 'bg-gradient-to-t from-yellow-500 via-yellow-400 to-yellow-200';
                    extraClasses = 'shadow-[0_0_25px_rgba(234,179,8,0.4),0_0_50px_rgba(234,179,8,0.2)] dark:shadow-[0_0_30px_rgba(250,204,21,0.6)] z-10 saturate-[1.6] isolate border border-yellow-400/20';
                  }
                  // In Review = NEON BLUE + Strong Glow
                  else if (payment.status === 'pending_review') {
                    bgClass = 'bg-gradient-to-t from-blue-600 via-blue-400 to-cyan-300';
                    extraClasses = 'shadow-[0_0_25px_rgba(37,99,235,0.4),0_0_50px_rgba(37,99,235,0.2)] dark:shadow-[0_0_30px_rgba(59,130,246,0.6)] z-10 saturate-[1.6] isolate border border-blue-400/20';
                  }
                  // Future months = Defined Placeholder (Only if NOT paid/in review)
                  else if (isFuture) {
                    bgClass = 'bg-slate-50/50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10';
                    extraClasses = 'opacity-40 grayscale-[0.2]';
                  }
                  // Pending = Visible Yellow Fill (Stronger in Light Mode)
                  else if (payment.status === 'pending') {
                    bgClass = 'bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/50';
                    extraClasses = 'isolate opacity-100';
                  }

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-3 min-w-[45px] sm:min-w-[60px] px-1 snap-center">
                      <div className="relative w-full flex items-end justify-center isolate" style={{ height: '200px' }}>
                        <div
                          className={`w-full rounded-t-2xl transition-all duration-500 hover:scale-110 ${bgClass} ${extraClasses}`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white whitespace-nowrap">
                              ${payment.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">{payment.month}</p>
                        <div className={`w-1.5 h-1.5 rounded-full mx-auto transition-all ${payment.status === 'paid' ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' :
                          payment.status === 'pending_review' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' :
                            'bg-yellow-400/20'
                          }`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pagado</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">En Revisión</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-50 border-2 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pendiente</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Action Hub */}
        <section id="operations-module" className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Módulo de Operaciones</h3>
            <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {!isOwner && (
              <div className="col-span-2 bg-white dark:bg-[#0a101f] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6 group hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined font-black">receipt_long</span>
                  </div>
                  <button onClick={() => setShowVoucherModal(true)} className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all">
                    Subir Pago
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight mb-1 text-slate-900 dark:text-white">Comprobantes</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Historial de mensualidades</p>
                </div>
              </div>
            )}

            <button onClick={() => setActiveReport('property')} className="bg-white dark:bg-[#0a101f] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6 text-left group hover:border-blue-400/30 transition-all">
              <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition-all">
                <span className="material-symbols-outlined font-black">home_repair_service</span>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight mb-1 text-slate-900 dark:text-white">Inmueble</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Reportar Falla</p>
              </div>
            </button>

            <button onClick={() => setActiveReport('person')} className="bg-white dark:bg-[#0a101f] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6 text-left group hover:border-purple-400/30 transition-all">
              <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-400 group-hover:text-white transition-all">
                <span className="material-symbols-outlined font-black">person_alert</span>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight mb-1 text-slate-900 dark:text-white">{isOwner ? 'Inquilino' : 'Propietario'}</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Incidencia</p>
              </div>
            </button>

            <button onClick={handleSupport} className="bg-slate-100 dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6 text-left group hover:bg-green-500/10 hover:border-green-500/30 transition-all">
              <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined font-black">headset_mic</span>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight mb-1 text-slate-900 dark:text-white">Soporte</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Magno WhatsApp</p>
              </div>
            </button>
          </div>
        </section>

        {/* Payment Archive Section */}
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Archivo de Pagos</h3>
            <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
          </div>

          <div className="bg-white dark:bg-slate-900/40 rounded-[3rem] p-8 sm:p-10 border border-slate-200 dark:border-white/5 shadow-xl">
            {payments.filter(p => p.proofUrl !== 'manual_approval_by_admin').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {payments
                  .filter(p => p.proofUrl !== 'manual_approval_by_admin')
                  .map((payment) => (
                    <div key={payment.id} className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${payment.status === 'approved' ? 'bg-green-100 border-green-200 text-green-600' :
                          payment.status === 'rejected' ? 'bg-red-100 border-red-200 text-red-600' :
                            'bg-amber-100 border-amber-200 text-amber-600'
                          }`}>
                          <span className="material-symbols-outlined text-lg font-black">
                            {payment.status === 'approved' ? 'check' : payment.status === 'rejected' ? 'close' : 'hourglass_empty'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            {new Date(payment.monthYear + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            ${payment.amount?.toLocaleString()} • {payment.status === 'approved' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'En Revisión'}
                          </p>
                        </div>
                      </div>

                      <a
                        href={payment.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 transition-all"
                        title="Ver Comprobante"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </a>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 mb-4">receipt_long</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin comprobantes cargados</p>
              </div>
            )}
          </div>
        </section>

        {/* HUD Footer Information */}
        <div className="bg-slate-100 dark:bg-slate-900/20 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Término de Contrato</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{user.contractEndDate || 'VIGENTE'}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <button
              onClick={handleDownloadPDF}
              disabled={uploading}
              className="text-left group transition-all hover:scale-105 active:scale-95"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 group-hover:text-primary transition-colors">Acciones</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary">download</span>
                <p className="text-sm font-black text-primary group-hover:underline decoration-2 underline-offset-4 decoration-primary/30">
                  {uploading ? 'GENERANDO...' : 'DESCARGAR REPORTE'}
                </p>
              </div>
            </button>
          </div>
          <p className="text-[8px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em]">Grupo Magno Inmobiliario © 2025</p>
        </div>


      </main>

      {/* Reporting Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-slate-200 dark:border-white/10 shadow-3xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8 sm:mb-10">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-tight pr-4 text-slate-900 dark:text-white">
                {activeReport === 'property' ? 'Reporte Técnico Inmueble' : `Incidencia con ${isOwner ? 'Inquilino' : 'Propietario'}`}
              </h3>
              <button onClick={() => {
                setActiveReport(null);
                setReportTitle('');
                setReportText('');
                setReportImages([]);
              }} className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleReport} className="space-y-6">
              {/* Title Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block ml-4">
                  Título del Reporte
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5 font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary/50 transition-colors text-base"
                  placeholder={activeReport === 'property'
                    ? "Ej: Fuga de agua en baño principal"
                    : "Ej: Retraso en mensualidad / Ruidos molestos"}
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block ml-4">
                  Descripción Detallada
                </label>
                <textarea
                  required
                  rows={5}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5 font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary/50 transition-colors text-sm"
                  placeholder="Describe la situación a detalle para que un gestor lo resuelva..."
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block ml-4">
                  Evidencia Fotográfica (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReportImageChange}
                    className="hidden"
                    id="report-images"
                  />
                  <label
                    htmlFor="report-images"
                    className="w-full bg-slate-50 dark:bg-slate-950/50 p-8 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">add_photo_alternate</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {reportImages.length > 0 ? `${reportImages.length} imagen(es) seleccionada(s)` : 'Subir Fotos'}
                    </p>
                  </label>
                </div>

                {/* Image Previews */}
                {reportImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {reportImages.map((file, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setReportImages(reportImages.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className={`w-full py-5 sm:py-7 rounded-2xl sm:rounded-[2.5rem] font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.4em] shadow-glow transition-all ${uploading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>ENVIANDO...</span>
                  </div>
                ) : 'ENVIAR REPORTE AL TERMINAL'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Subir Comprobante</h3>
              <button onClick={() => setShowVoucherModal(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-4">Seleccionar Periodo</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5 font-bold text-slate-900 dark:text-white appearance-none cursor-pointer"
                    onChange={(e) => {
                      const month = e.target.value;
                      const currentYear = voucherMonth.split('-')[0] || new Date().getFullYear().toString();
                      setVoucherMonth(`${currentYear}-${month}`);
                    }}
                    value={voucherMonth.split('-')[1] || ''}
                  >
                    <option value="" disabled>Mes</option>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>{new Date(2000, parseInt(m) - 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</option>
                    ))}
                  </select>

                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5 font-bold text-slate-900 dark:text-white appearance-none cursor-pointer"
                    onChange={(e) => {
                      const year = e.target.value;
                      const currentMonth = voucherMonth.split('-')[1] || (new Date().getMonth() + 1).toString().padStart(2, '0');
                      setVoucherMonth(`${year}-${currentMonth}`);
                    }}
                    value={voucherMonth.split('-')[0] || ''}
                  >
                    <option value="" disabled>Año</option>
                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-4">Tipo de Pago</label>
                <select
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5 font-bold text-slate-900 dark:text-white appearance-none cursor-pointer"
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as any)}
                >
                  <option value="" disabled>Seleccionar tipo</option>
                  <option value="Retiro sin tarjeta">Retiro sin tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-4">Archivo (Imagen/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  onChange={handleVoucherSelect}
                />
              </div>


              <button
                onClick={submitVoucher}
                disabled={uploading}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>PROCESANDO...</span>
                  </div>
                ) : 'Enviar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
