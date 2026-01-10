/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#0d59f2",
                secondary: "#f59e0b",
                "header-dark": "#0a1628",
                "background-light": "#F8FAFC",
                "background-dark": "#0a1628",
                "surface-light": "#FFFFFF",
                "surface-dark": "#0f1b2e",
                "text-light": "#1F2937",
                "text-dark": "#F1F5F9",
                "subtext-light": "#6B7280",
                "subtext-dark": "#94A3B8",
                "input-light": "#f8fafc",
                "input-dark": "#1e293b",
                "border-light": "#e5e7eb",
                "border-dark": "#1e293b",
            },
            fontFamily: {
                display: ["Tramillas", "Poppins", "sans-serif"],
                body: ["Poppins", "sans-serif"],
                sans: ["Poppins", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 4px 20px -2px rgba(13, 89, 242, 0.2)',
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/container-queries'),
    ],
};
