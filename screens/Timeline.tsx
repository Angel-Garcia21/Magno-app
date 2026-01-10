
import React, { useState } from 'react';
import { Property, TimelineEvent } from '../types';

interface TimelineProps {
  property: Property;
  timeline: TimelineEvent[];
  onAddEvent?: (event: Omit<TimelineEvent, 'id' | 'status'>) => Promise<void>;
  canEdit: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ property, timeline, onAddEvent, canEdit }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '' });
  const [loading, setLoading] = useState(false);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !onAddEvent) return;

    setLoading(true);
    try {
      await onAddEvent({
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        propertyId: property.id
      });
      setNewEvent({ title: '', description: '', date: '' });
      setShowAdd(false);
    } catch (e) {
      console.error(e);
      alert('Error al agregar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-32 px-4 sm:px-6 pt-8 sm:pt-12 max-w-2xl mx-auto">
      <header className="mb-6 sm:mb-8 flex justify-between items-center px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Línea de Tiempo</h1>
          <p className="text-[10px] sm:text-sm text-subtext-light dark:text-subtext-dark font-bold uppercase tracking-widest mt-1">Historial • {property.ref}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-glow active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">{showAdd ? 'close' : 'add'}</span>
          </button>
        )}
      </header>

      {showAdd && canEdit && (
        <div className="mb-8 bg-surface-light dark:bg-surface-dark p-6 sm:p-8 rounded-[2rem] shadow-2xl animate-in slide-in-from-top duration-300 border border-slate-100 dark:border-slate-800">
          <h3 className="text-[10px] font-black mb-6 uppercase tracking-[0.2em] text-primary">Nuevo Registro de Evento</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Título del evento"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl sm:rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl sm:rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl sm:rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 h-24 resize-none transition-all font-medium"
            />
            <button
              onClick={handleAddEvent}
              className="w-full bg-primary text-white font-black py-5 rounded-xl sm:rounded-2xl shadow-glow active:scale-[0.98] transition-all uppercase tracking-widest text-[11px] mt-2"
            >
              Guardar Evento
            </button>
          </div>
        </div>
      )}

      <div className="relative px-1">
        <div className="absolute left-[11px] sm:left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-slate-800" />

        <div className="space-y-6 sm:space-y-8">
          {timeline.map((event) => (
            <div key={event.id} className="relative pl-9 sm:pl-12">
              <div className={`absolute left-0 sm:left-1 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-4 border-white dark:border-background-dark z-10 flex items-center justify-center shadow-sm ${event.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                }`}>
                <span className="material-symbols-outlined text-[10px] sm:text-[12px] text-white font-black">
                  {event.status === 'completed' ? 'check' : 'schedule'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-1 mb-2">
                  <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-slate-800 dark:text-slate-200">{event.title}</h3>
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.date}</span>
                </div>
                {event.description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {event.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-[8px] sm:text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${event.status === 'completed'
                    ? 'bg-green-50 text-green-600 border-green-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                    {event.status === 'completed' ? 'Completado' : 'Procesando'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
