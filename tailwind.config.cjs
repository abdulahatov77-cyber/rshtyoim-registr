/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  safelist: [
    'text-left', 'text-center', 'text-right',
    'bg-white', 'bg-slate-50', 'text-slate-400', 'text-slate-500',
    'bg-red-100', 'text-red-700', 'bg-purple-100', 'text-purple-700',
    'bg-blue-100', 'text-blue-700', 'bg-green-100', 'text-green-700',
    'bg-amber-100', 'text-amber-700', 'bg-teal-100', 'text-teal-700'
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'] },
      colors: {
        primary: { 50:'#eff6ff', 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 900:'#1e3a8a' },
        dark: { 800:'#1e293b', 850:'#172032', 900:'#0f172a', 950:'#080d17' }
      }
    }
  },
  plugins: []
};
