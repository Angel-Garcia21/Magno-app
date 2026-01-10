import React, { useState } from 'react';
import { Appointment } from '../types';

interface CalendarViewProps {
    appointments: Appointment[];
    onEventClick: (appointment: Appointment) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, onEventClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Find appointments for this day
        // Note: appointment.start_time is UTC ISO string. We need to match local date or simple string match if consistently stored.
        // Assuming ISO strings, we compare YYYY-MM-DD parts. 
        // Ideally we convert appointment date to local YYYY-MM-DD.
        const dayAppointments = appointments.filter(apt => {
            const aptDate = new Date(apt.start_time || apt.startTime || ''); // Handle potential naming diffs in types
            return aptDate.getDate() === day && aptDate.getMonth() === month && aptDate.getFullYear() === year;
        });

        days.push(
            <div key={day} className="min-h-[8rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col gap-1 relative group">
                <span className={`text-xs font-bold ${new Date().toDateString() === new Date(year, month, day).toDateString() ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>
                    {day}
                </span>

                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-24 no-scrollbar">
                    {dayAppointments.map(apt => (
                        <button
                            key={apt.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(apt); }}
                            className={`text-[8px] sm:text-[9px] text-left px-2 py-1.5 rounded-lg border-l-2 font-bold truncate transition-all hover:scale-105 active:scale-95 shadow-sm ${apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-500 dark:bg-green-900/20 dark:text-green-400' :
                                    apt.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-500 dark:bg-red-900/20 dark:text-red-400' :
                                        'bg-blue-50 text-blue-700 border-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}
                        >
                            {new Date(apt.start_time || apt.startTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.client_name || apt.clientName}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        {monthNames[month]} <span className="text-primary">{year}</span>
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onClick={handleNextMonth} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
                <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                    Hoy
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {days}
            </div>
        </div>
    );
};

export default CalendarView;
