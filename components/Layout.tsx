import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Send, Settings, Menu, X, FileText } from 'lucide-react';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isDarkMode = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('btp-app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setCustomLogo(parsed.logo || null);
      } catch (e) {
        console.error("Erreur lecture settings", e);
      }
    }
  };

  useEffect(() => {
    loadSettings();
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener('btp-app-settings-updated', handleSettingsUpdate);
    return () => {
        window.removeEventListener('btp-app-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const navItems = [
    { id: 'overview', label: 'Tableau de Bord', icon: LayoutDashboard }, 
    { id: 'documents', label: 'Suivi Documents', icon: FileText }, 
    { id: 'bordereaux', label: 'Bordereaux', icon: Send },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen flex flex-col md:flex-row overflow-hidden`}>
      {/* Main Wrapper with Theme Background */}
      <div className="flex h-full w-full bg-gray-50 dark:bg-slate-900 dark:text-gray-100 transition-colors duration-300">
        
        {/* Sidebar Desktop */}
        {/* MODIFICATION ICI: bg-slate-900 (Clair) vs dark:bg-white (Sombre) */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl no-print border-r border-slate-700 dark:border-gray-200 z-20 transition-colors duration-300">
          <div className="p-6 border-b border-slate-700/50 dark:border-gray-200 flex items-center gap-3 backdrop-blur-sm">
            <div className="text-blue-500 shrink-0">
              {customLogo ? (
                  <img src={customLogo} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-md p-0.5 border border-gray-200" />
              ) : (
                  <Logo className="w-10 h-10 text-blue-500" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white dark:text-slate-800">
                SBF GED
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">Gestion Des Documents</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-6">
            <ul className="space-y-2 px-3">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg translate-x-1 border-l-2 border-white/20'
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-800/50 dark:hover:bg-gray-100 hover:text-white dark:hover:text-slate-900 hover:translate-x-1'
                    }`}
                  >
                    <item.icon size={20} className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                    {activeTab === item.id && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-glow animate-pulse"></div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-slate-700/50 dark:border-gray-200 text-center text-xs text-slate-500 dark:text-slate-400">
              v1.3.0 - © 2024 SBF
          </div>
        </aside>

        {/* Mobile Header */}
        {/* MODIFICATION ICI: bg-slate-900 (Clair) vs dark:bg-white (Sombre) */}
        <div className="md:hidden fixed top-0 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 z-50 flex items-center justify-between p-4 shadow-md no-print border-b border-transparent dark:border-gray-200 transition-colors duration-300">
          <div className="flex items-center gap-2">
              <div className="text-blue-500">
                  {customLogo ? (
                      <img src={customLogo} alt="Logo" className="w-8 h-8 object-contain bg-white rounded-md p-0.5 border border-gray-200" />
                  ) : (
                      <Logo className="w-8 h-8" />
                  )}
              </div>
              <h1 className="text-xl font-bold">SBF GED</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white dark:text-slate-900">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-slate-900 dark:bg-white z-40 pt-20 px-4 no-print transition-colors duration-300">
            <nav>
              <ul className="space-y-3">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg font-medium transition-all ${
                        activeTab === item.id 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'text-slate-300 dark:text-slate-600 hover:bg-slate-800 dark:hover:bg-gray-100 hover:text-white dark:hover:text-slate-900'
                      }`}
                    >
                      <item.icon size={24} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 relative w-full print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
};