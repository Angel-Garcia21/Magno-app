import React, { useState } from 'react';

interface LocationInputProps {
    onLocationSelect: (data: {
        latitude: number;
        longitude: number;
        fullAddress: string;
    }) => void;
    initialAddress?: string;
    className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
    onLocationSelect,
    initialAddress = '',
    className = ''
}) => {
    const [address, setAddress] = useState(initialAddress);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');

    const handleUpdate = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);

        // If we have valid coords, pass them
        if (!isNaN(lat) && !isNaN(lng)) {
            onLocationSelect({
                latitude: lat,
                longitude: lng,
                fullAddress: address
            });
        } else if (address) {
            // If just address, pass generic coords (or zeros) letting the map component handle address-based query
            onLocationSelect({
                latitude: 0,
                longitude: 0,
                fullAddress: address
            });
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Dirección Completa
                </label>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={handleUpdate}
                    placeholder="Calle, Número, Colonia, Ciudad..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-2">
                    * El mapa se generará automáticamente basado en esta dirección.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Latitud (Opcional)
                    </label>
                    <input
                        type="number"
                        step="0.000001"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        onBlur={handleUpdate}
                        placeholder="25.xxxxxx"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Longitud (Opcional)
                    </label>
                    <input
                        type="number"
                        step="0.000001"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        onBlur={handleUpdate}
                        placeholder="-100.xxxxxx"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                    />
                </div>
            </div>
        </div>
    );
};

export default LocationInput;
