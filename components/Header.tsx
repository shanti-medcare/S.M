import React, { useRef, useState, useEffect } from 'react';

interface HeaderProps {
  onHome: () => void;
  onAdminAccess?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHome, onAdminAccess }) => {
  const timerRef = useRef<number | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const newDarkState = !isDark;
    setIsDark(newDarkState);
    if (newDarkState) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleTouchStart = () => {
    timerRef.current = window.setTimeout(() => {
      if (onAdminAccess) onAdminAccess();
    }, 3000); // 3 seconds long press for admin access
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <header className="sticky top-0 bg-[var(--bg-card)] backdrop-blur-lg border-b border-[var(--border-subtle)] py-3 px-4 z-50 flex items-center justify-between shadow-sm transition-all duration-500">
      <div 
        onClick={onHome}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className="group flex items-center gap-3 cursor-pointer active:scale-95 transition-all duration-300"
      >
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <div className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center p-1 bg-white border border-gray-100 shadow-sm animate-float-slow">
            <img 
              src="https://raw.githubusercontent.com/AnisurRahman-Anis/medicine-logo/main/shanti-logo.jpg" 
              alt="Shanti Medicare"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<i class="fa-solid fa-pills text-red-600 text-2xl"></i>';
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-black text-[var(--brand-red)] leading-none tracking-tighter">
            শান্তি
          </h1>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] leading-none tracking-widest mt-1 uppercase">
            মে ডি কে য়া র
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-card-shadow-1)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm active:scale-90 transition-all"
          aria-label="Toggle Dark Mode"
        >
          {isDark ? <i className="fa-solid fa-sun text-amber-400"></i> : <i className="fa-solid fa-moon text-blue-600"></i>}
        </button>

        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-full shadow-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Open</span>
        </div>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-float-slow {
          animation: float-slow 3s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
};

export default Header;