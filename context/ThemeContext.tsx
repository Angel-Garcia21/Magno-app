
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage for saved theme preference
        const savedTheme = localStorage.getItem('magno-theme') as Theme;
        return savedTheme || 'light';
    });

    useEffect(() => {
        // Apply or remove 'dark' class on the <html> element
        const root = document.documentElement;
        console.log('[Magno Theme] Applying theme:', theme);
        console.log('[Magno Theme] HTML classes before:', root.className);

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        console.log('[Magno Theme] HTML classes after:', root.className);

        // Save theme preference to localStorage
        localStorage.setItem('magno-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
