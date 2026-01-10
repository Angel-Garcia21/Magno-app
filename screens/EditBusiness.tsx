
import React, { useState } from 'react';
import { Property, PropertyStatus } from '../types';
import { summarizePropertyDescription } from '../services/geminiService';

interface EditBusinessProps {
  property: Property;
  setProperty: (p: Property) => void;
}

const EditBusiness: React.FC<EditBusinessProps> = ({ property, setProperty }) => {
  const [loadingAI, setLoadingAI] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProperty({
        ...property,
        [parent]: {
          ...(property[parent as keyof Property] as any),
          [child]: value
        }
      });
    } else {
      setProperty({ ...property, [name]: value });
    }
  };

  const handleAIEnhance = async () => {
    setLoadingAI(true);
    try {
      const enhanced = await summarizePropertyDescription(property.description);
      if (enhanced) {
        setProperty({ ...property, description: enhanced });
      }
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="pb-32 px-6 pt-12 max-w-2xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark">Gestiona los detalles de tu inmueble</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-icons-round">tune</span>
        </div>
      </header>

      <div className="space-y-6">
        <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-soft border border-border-light dark:border-border-dark">
          <h2 className="text-sm font-bold uppercase tracking-widest text-subtext-light mb-4">Información General</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 opacity-60">Título del Inmueble</label>
              <input 
                type="text" 
                name="title"
                value={property.title}
                onChange={handleInputChange}
                className="w-full bg-input-light dark:bg-input-dark border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 opacity-60">Precio de Renta (MXN)</label>
              <input 
                type="number" 
                name="price"
                value={property.price}
                onChange={handleInputChange}
                className="w-full bg-input-light dark:bg-input-dark border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 opacity-60">Estado Actual</label>
              <select 
                name="status"
                value={property.status}
                onChange={handleInputChange}
                className="w-full bg-input-light dark:bg-input-dark border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value={PropertyStatus.AVAILABLE}>Disponible</option>
                <option value={PropertyStatus.RENTED}>Rentado</option>
                <option value={PropertyStatus.MAINTENANCE}>En Mantenimiento</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-soft border border-border-light dark:border-border-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-subtext-light">Descripción</h2>
            <button 
              onClick={handleAIEnhance}
              disabled={loadingAI}
              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
                loadingAI ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white hover:shadow-glow'
              }`}
            >
              <span className="material-icons-round text-xs">{loadingAI ? 'sync' : 'auto_awesome'}</span>
              {loadingAI ? 'Mejorando...' : 'IA Polish'}
            </button>
          </div>
          <textarea 
            name="description"
            rows={5}
            value={property.description}
            onChange={handleInputChange}
            className="w-full bg-input-light dark:bg-input-dark border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            placeholder="Escribe una descripción..."
          />
        </section>

        <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl">
          <div className="flex gap-3">
            <span className="material-icons-round text-amber-600">vpn_key</span>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-1">Código de Acceso Admin</p>
              <p className="text-sm font-mono font-bold text-amber-900 dark:text-amber-100">{property.accessCode}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditBusiness;
