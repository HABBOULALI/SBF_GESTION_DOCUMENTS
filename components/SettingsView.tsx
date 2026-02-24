import React, { useState, useEffect, useRef } from 'react';
import { Save, Building, FileText, MapPin, Phone, Upload, Image as ImageIcon, Trash2, Check, Users, Plus, X } from 'lucide-react';
import { Logo } from './Logo';

interface Stakeholder {
    name: string;
    contacts: string[];
}

interface AppSettings {
    companyName: string;
    companySubtitle: string;
    projectCode: string;
    projectName: string;
    address: string;
    contact: string;
    defaultValidator: string;
    logo: string;
    stakeholders: {
        client: Stakeholder;
        consultant: Stakeholder;
        control: Stakeholder;
    };
}

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'Société Bouzguenda Frères',
    companySubtitle: 'Entreprise Générale de Bâtiments',
    projectCode: 'PRJ-2024-HZ',
    projectName: 'Construction Siège Horizon',
    address: '41 Rue 8600 ZI La Charguia 1. Tunis',
    contact: 'Tél. : 70 557 900 - Fax : 70 557 999',
    defaultValidator: 'Bureau de Contrôle',
    logo: '',
    stakeholders: {
        client: { name: 'Maître d\'Ouvrage', contacts: ['M. Le Directeur Technique'] },
        consultant: { name: 'Bureau d\'Études Structure', contacts: ['M. L\'Ingénieur Conseil'] },
        control: { name: 'Bureau de Contrôle', contacts: ['M. Le Contrôleur Technique'] }
    }
  });

  // Temp state for adding new contacts
  const [newContacts, setNewContacts] = useState({ client: '', consultant: '', control: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('btp-app-settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({
            ...prev,
            ...parsed,
            stakeholders: parsed.stakeholders || prev.stakeholders
        }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleStakeholderNameChange = (type: 'client' | 'consultant' | 'control', value: string) => {
      setSettings(prev => ({
          ...prev,
          stakeholders: {
              ...prev.stakeholders,
              [type]: { ...prev.stakeholders[type], name: value }
          }
      }));
  };

  const addContact = (type: 'client' | 'consultant' | 'control') => {
      const val = newContacts[type].trim();
      if (!val) return;
      setSettings(prev => ({
          ...prev,
          stakeholders: {
              ...prev.stakeholders,
              [type]: { 
                  ...prev.stakeholders[type], 
                  contacts: [...prev.stakeholders[type].contacts, val] 
              }
          }
      }));
      setNewContacts({ ...newContacts, [type]: '' });
  };

  const removeContact = (type: 'client' | 'consultant' | 'control', index: number) => {
      setSettings(prev => {
          const newContactsList = [...prev.stakeholders[type].contacts];
          newContactsList.splice(index, 1);
          return {
              ...prev,
              stakeholders: {
                  ...prev.stakeholders,
                  [type]: { ...prev.stakeholders[type], contacts: newContactsList }
              }
          };
      });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { 
          alert("Le fichier est trop volumineux (max 500KB).");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
      setSettings(prev => ({ ...prev, logo: '' }));
  };

  const handleSave = () => {
    try {
        localStorage.setItem('btp-app-settings', JSON.stringify(settings));
        window.dispatchEvent(new Event('btp-app-settings-updated'));
        alert("Paramètres enregistrés avec succès !");
    } catch (e) {
        alert("Erreur de sauvegarde (Image trop lourde ?).");
    }
  };

  const renderStakeholderSection = (title: string, type: 'client' | 'consultant' | 'control') => (
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">{title} (Organisme)</label>
          <input 
              value={settings.stakeholders[type].name}
              onChange={(e) => handleStakeholderNameChange(type, e.target.value)}
              className="w-full p-2 border border-blue-200 bg-blue-50 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-3 font-medium text-gray-900"
              placeholder={`Nom du ${title}`}
          />
          
          <label className="block text-xs font-bold text-gray-700 mb-2">Responsables / Contacts</label>
          <div className="space-y-2 mb-2">
              {settings.stakeholders[type].contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded text-sm">
                      <span className="flex-1 text-gray-700">{contact}</span>
                      <button onClick={() => removeContact(type, idx)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                      </button>
                  </div>
              ))}
          </div>
          <div className="flex gap-2">
              <input 
                  value={newContacts[type]}
                  onChange={(e) => setNewContacts({...newContacts, [type]: e.target.value})}
                  className="flex-1 p-2 border border-blue-200 bg-white rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Ajouter un nom..."
                  onKeyDown={(e) => e.key === 'Enter' && addContact(type)}
              />
              <button onClick={() => addContact(type)} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  <Plus size={16} />
              </button>
          </div>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-200 bg-slate-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Building className="text-blue-600" />
                Paramètres de l'Application
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configurez les informations globales, le logo et les interlocuteurs.</p>
        </div>
        
        <div className="p-8 space-y-8">
            
            {/* Section Logo */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
                    <ImageIcon size={20} />
                    Logo de l'Entreprise
                </h3>
                <div className="flex items-start gap-6">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative group shrink-0">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Logo className="w-16 h-16 text-gray-300" />
                        )}
                        {settings.logo && (
                            <button 
                                onClick={removeLogo}
                                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={24} />
                            </button>
                        )}
                    </div>
                    <div className="space-y-3 flex flex-col items-start">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <Upload size={16} />
                            Importer un logo
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoUpload}
                        />
                        <p className="text-xs text-gray-500">Format recommandé : PNG ou JPG (Max 500KB).<br/>Ce logo apparaîtra sur tous les exports PDF.</p>
                        
                        {settings.logo && (
                            <button 
                                onClick={handleSave} 
                                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-xs font-bold uppercase tracking-wide"
                            >
                                <Check size={14} />
                                Enregistrer le Logo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Section Entreprise */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-700">Informations Entreprise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la Société</label>
                        <input 
                            name="companyName" 
                            value={settings.companyName} 
                            onChange={handleChange} 
                            className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre / Activité</label>
                        <input 
                            name="companySubtitle" 
                            value={settings.companySubtitle} 
                            onChange={handleChange} 
                            className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <input 
                                name="address" 
                                value={settings.address} 
                                onChange={handleChange} 
                                className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact (Tél/Fax/Email)</label>
                        <div className="flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            <input 
                                name="contact" 
                                value={settings.contact} 
                                onChange={handleChange} 
                                className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Intervenants */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
                    <Users size={20} />
                    Intervenants & Responsables
                </h3>
                <p className="text-xs text-gray-500 italic mb-2">Ces informations alimentent les listes déroulantes du Bordereau d'Envoi.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {renderStakeholderSection('Client (M.O)', 'client')}
                    {renderStakeholderSection('Consultant / Architecte', 'consultant')}
                    {renderStakeholderSection('Bureau de Contrôle', 'control')}
                </div>
            </div>

            {/* Section Projet */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
                    <FileText size={20} />
                    Informations Projet
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Projet</label>
                        <input 
                            name="projectName" 
                            value={settings.projectName} 
                            onChange={handleChange} 
                            className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code Projet</label>
                        <input 
                            name="projectCode" 
                            value={settings.projectCode} 
                            onChange={handleChange} 
                            className="w-full p-2 border border-blue-200 bg-[#ADD8E6] rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                    onClick={handleSave} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Save size={18} />
                    Enregistrer les paramètres
                </button>
            </div>
        </div>
    </div>
  );
};