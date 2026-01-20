import React from 'react';
import { Property } from '../types';

interface PropertyMapProps {
    properties: Property[];
    height?: string;
    className?: string;
    onScheduleClick?: () => void;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
    properties,
    height = '400px',
    className = '',
    onScheduleClick
}) => {
    // If no properties, or no valid property to show
    if (!properties || properties.length === 0) {
        return (
            <div
                className={`bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <p className="text-slate-400 text-sm font-medium">Ubicación no disponible</p>
            </div>
        );
    }

    // We take the first property to show
    // For lists, this component might need adapting, but for Details view (main use case) it works perfectly.
    const property = properties[0];

    // Build the most specific address possible
    let addressToQuery = '';
    if (property.fullAddress && property.fullAddress.trim()) {
        addressToQuery = property.fullAddress;
    } else if (property.address && property.address.trim()) {
        addressToQuery = property.address;
    } else if (property.title) {
        // Last resort: use title which often contains location info
        addressToQuery = property.title + ', Monterrey, Nuevo León';
    } else {
        addressToQuery = 'Monterrey, Nuevo León';
    }

    // Construct Google Maps Embed URL with zoom parameter
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(addressToQuery)}&zoom=15&language=es`;

    return (
        <div
            className={`relative rounded-[2rem] overflow-hidden shadow-soft ${className}`}
            style={{ height }}
        >
            {/* Map iframe */}
            <iframe
                width="100%"
                height="100%"
                src={mapUrl}
                frameBorder="0"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Mapa de ${property.title}`}
                className="w-full h-full"
            />

            {/* Floating "Agendar Visita" Button */}
            {onScheduleClick && (
                <button
                    onClick={onScheduleClick}
                    className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary/90 text-white font-black px-4 py-2 sm:px-8 sm:py-4 rounded-[1rem] sm:rounded-[2rem] text-[9px] sm:text-sm uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-2xl flex items-center gap-2 sm:gap-3 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 border sm:border-2 border-white/20 whitespace-nowrap max-w-[90%]"
                >
                    <span className="material-symbols-outlined text-sm sm:text-xl">{property.type === 'sale' ? 'real_estate_agent' : 'home_work'}</span>
                    {property.type === 'sale' ? 'Quiero comprar' : 'Quiero rentar'} <span className="hidden sm:inline">esta propiedad</span>
                </button>
            )}
        </div>
    );
};

export default PropertyMap;
