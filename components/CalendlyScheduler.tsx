import React, { useState } from 'react';
import { Property } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { generateGoogleCalendarLink } from '../services/calendarService';

interface CalendlySchedulerProps {
    property: Property;
    onClose: () => void;
    onSuccess?: () => void;
}

interface AppointmentData {
    fullName: string;
    phone: string;
    email: string;
    selectedDate: string;
    selectedTime: string;
}

export const CalendlyScheduler: React.FC<CalendlySchedulerProps> = ({ property, onClose, onSuccess }) => {
    const [step, setStep] = useState<'calendar' | 'success'>('calendar');
    const [appointmentData, setAppointmentData] = useState<AppointmentData>({
        fullName: '',
        phone: '',
        email: '',
        selectedDate: '',
        selectedTime: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [calendarLink, setCalendarLink] = useState('');
    const { success, error } = useToast();

    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    const handleConfirm = async () => {
        // Validation
        if (!appointmentData.fullName || !appointmentData.phone || !appointmentData.email) {
            error('Por favor completa todos tus datos personales');
            return;
        }
        if (!appointmentData.selectedDate || !appointmentData.selectedTime) {
            error('Por favor selecciona fecha y hora para tu visita');
            return;
        }

        setIsSubmitting(true);

        try {
            // Create appointment time objects
            const start = new Date(`${appointmentData.selectedDate}T${appointmentData.selectedTime}`);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

            // Insert into appointments table
            const { error: appointmentError } = await supabase.from('appointments').insert([{
                property_id: property.id,
                title: `Visita: ${property.title}`,
                client_name: appointmentData.fullName,
                client_phone: appointmentData.phone,
                client_email: appointmentData.email,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                calendar_event_id: `gcal_${Date.now()}`,
                status: 'scheduled'
            }]);

            if (appointmentError) throw appointmentError;

            // Insert into rental_applications table
            const { error: applicationError } = await supabase.from('rental_applications').insert([{
                property_id: property.id,
                property_ref: property.ref,
                full_name: appointmentData.fullName,
                phone: appointmentData.phone,
                email: appointmentData.email,
                appointment_date: appointmentData.selectedDate,
                appointment_time: appointmentData.selectedTime,
                status: 'pending',
                // Optional fields with defaults
                adults: 1,
                children: 0,
                has_pets: false,
                knows_area: false,
                duration: '1year',
                income_source: 'payroll',
                meets_ratio: false,
                bureau_status: 'clean',
                accepted_requirements: true
            }]);

            if (applicationError) throw applicationError;

            // Generate Google Calendar link
            const gcalLink = generateGoogleCalendarLink(
                `Visita: ${property.title}`,
                `Visita programada para conocer la propiedad.\n\nPropiedad: ${property.title}\nUbicación: ${property.address}\nContacto: ${appointmentData.fullName}\nTeléfono: ${appointmentData.phone}\nEmail: ${appointmentData.email}`,
                property.address,
                start.toISOString(),
                end.toISOString()
            );

            setCalendarLink(gcalLink);
            success('¡Cita agendada correctamente!');
            setStep('success');
            onSuccess?.();
        } catch (err: any) {
            error('Error al agendar la cita: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddToCalendar = () => {
        if (calendarLink) {
            window.open(calendarLink, '_blank');
        }
    };

    if (step === 'success') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 p-8 sm:p-12">
                {/* Success Icon */}
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-green-500 animate-in zoom-in duration-700">check_circle</span>
                    </div>
                </div>

                {/* Success Message */}
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">¡Cita Confirmada!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Tu visita ha sido agendada exitosamente</p>
                </div>

                {/* Appointment Details */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 space-y-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">event</span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fecha</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {new Date(appointmentData.selectedDate).toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">schedule</span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Hora</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{appointmentData.selectedTime}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">location_on</span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ubicación</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{property.address}</p>
                        </div>
                    </div>
                </div>

                {/* Google Calendar CTA */}
                <div className="space-y-3">
                    <button
                        onClick={handleAddToCalendar}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-6 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="white" />
                        </svg>
                        Agregar a Google Calendar
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8 sm:p-12">
            {/* Header */}
            <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Agenda tu Visita</h3>
                <p className="text-xs text-slate-400 font-bold">Selecciona fecha y hora para conocer {property.title}</p>
            </div>

            {/* Date Picker */}
            <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Selecciona una fecha</label>
                <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentData.selectedDate}
                    onChange={(e) => setAppointmentData({ ...appointmentData, selectedDate: e.target.value })}
                    className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-6 font-bold outline-none transition-all"
                />
            </div>

            {/* Time Slots */}
            {appointmentData.selectedDate && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Horarios Disponibles (Lapsos de 1 hora)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {timeSlots.map((time) => (
                            <button
                                key={time}
                                onClick={() => setAppointmentData({ ...appointmentData, selectedTime: time })}
                                className={`h-14 rounded-2xl font-black text-[10px] tracking-widest transition-all ${appointmentData.selectedTime === time
                                        ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Contact Information */}
            {appointmentData.selectedTime && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Tus Datos de Contacto</h4>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={appointmentData.fullName}
                            onChange={(e) => setAppointmentData({ ...appointmentData, fullName: e.target.value })}
                            placeholder="Tu nombre completo"
                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                            <input
                                type="tel"
                                value={appointmentData.phone}
                                onChange={(e) => setAppointmentData({ ...appointmentData, phone: e.target.value })}
                                placeholder="Número de celular"
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                            <input
                                type="email"
                                value={appointmentData.email}
                                onChange={(e) => setAppointmentData({ ...appointmentData, email: e.target.value })}
                                placeholder="correo@ejemplo.com"
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 font-bold outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="w-full bg-slate-950 text-white font-black py-6 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined text-xl">event_available</span>
                        {isSubmitting ? 'Agendando...' : 'Confirmar Cita'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendlyScheduler;
