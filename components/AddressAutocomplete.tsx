import React, { useEffect, useRef, useState } from 'react';

declare var google: any;

interface AddressAutocompleteProps {
    value: string;
    onChange: (address: string) => void;
    placeholder?: string;
    label: string;
    name: string;
    className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    placeholder,
    label,
    name,
    className
}) => {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteService = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) return;
        autocompleteService.current = new google.maps.places.AutocompleteService();

        // Close details on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        if (!newValue) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                {
                    input: newValue,
                    componentRestrictions: { country: 'mx' },
                    types: ['address']
                },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setSuggestions(predictions);
                        setShowSuggestions(true);
                    } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                    }
                }
            );
        }
    };

    const handleSelect = (prediction: any) => {
        onChange(prediction.description);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className={`space-y-2 relative ${className}`} ref={wrapperRef}>
            <label className="text-[10px] font-black uppercase text-slate-400 pl-3">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    autoComplete="off"
                    onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
                />

                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <ul className="max-h-60 overflow-y-auto py-2">
                            {suggestions.map((prediction) => (
                                <li
                                    key={prediction.place_id}
                                    onClick={() => handleSelect(prediction)}
                                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center gap-3 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-base text-slate-400 group-hover:text-primary">location_on</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                            {prediction.structured_formatting.main_text}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {prediction.structured_formatting.secondary_text}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-4 opacity-50 contrast-0 grayscale" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddressAutocomplete;
