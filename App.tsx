import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DocumentList } from './components/DocumentList';
import { BordereauView } from './components/BordereauView';
import { SettingsView } from './components/SettingsView';
import { Dashboard } from './components/Dashboard';
import { BTPDocument, ApprovalStatus } from './types';
import { fetchDocumentsFromSheet, saveDocumentsToSheet } from './services/googleSheetService';
import { Loader2 } from 'lucide-react';

const INITIAL_DOCS: BTPDocument[] = [
  {
    id: '1',
    lot: '01',
    classement: 'A',
    poste: 'GC',
    code: 'GC-FND-Z1-001',
    name: 'Plan de fondation - Zone Nord',
    currentRevisionIndex: 0,
    revisions: [
      { 
        id: 'r1', 
        index: '00', 
        transmittalRef: 'B-001', 
        transmittalDate: '2023-10-15', 
        observationRef: 'VISA-001', 
        observationDate: '2023-10-20',
        approvalDate: '2023-10-22',
        returnDate: '2023-10-25',
        status: ApprovalStatus.APPROVED,
        transmittalFiles: [],
        observationFiles: []
      }
    ]
  },
  {
    id: '2',
    lot: '02',
    classement: 'B',
    poste: 'ELEC',
    code: 'EL-SCH-GEN-001',
    name: 'Schéma unifilaire général',
    currentRevisionIndex: 0,
    revisions: [
      { 
        id: 'r1', 
        index: '01', 
        transmittalRef: 'B-002', 
        transmittalDate: '2023-10-28', 
        observationRef: 'OBS-005', 
        observationDate: '2023-11-02', 
        status: ApprovalStatus.REJECTED,
        transmittalFiles: [],
        observationFiles: [] 
      }
    ]
  },
  {
    id: '3',
    lot: '01',
    classement: 'A',
    poste: 'GC',
    code: 'GC-COU-MV-004',
    name: 'Coupe de principe Mur Voile',
    currentRevisionIndex: 0,
    revisions: [
      { 
        id: 'r1', 
        index: '00', 
        transmittalRef: 'B-003', 
        transmittalDate: '2023-11-05', 
        status: ApprovalStatus.NO_RESPONSE,
        transmittalFiles: [],
        observationFiles: [] 
      }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [initialDocFilter, setInitialDocFilter] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [bordereauSelectedDocs, setBordereauSelectedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [documents, setDocuments] = useState<BTPDocument[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initial Load
  useEffect(() => {
      // Load Theme Preference
      const savedTheme = localStorage.getItem('btp-dark-mode');
      if (savedTheme === 'true') {
          setIsDarkMode(true);
      }

      const initData = async () => {
          setLoading(true);
          try {
              const sheetDocs = await fetchDocumentsFromSheet();
              const localSaved = localStorage.getItem('btp-docs');
              const localDocs: BTPDocument[] = localSaved ? JSON.parse(localSaved) : [];

              if (sheetDocs && sheetDocs.length > 0) {
                  const mergedDocs = sheetDocs.map(sDoc => {
                      const lDoc = localDocs.find(l => l.id === sDoc.id);
                      if (lDoc) {
                          const mergedRevisions = sDoc.revisions.map(sRev => {
                              const lRev = lDoc.revisions.find(r => r.id === sRev.id);
                              if (lRev) {
                                  return {
                                      ...sRev,
                                      transmittalFiles: (sRev.transmittalFiles && sRev.transmittalFiles.length > 0) ? sRev.transmittalFiles : lRev.transmittalFiles,
                                      observationFiles: (sRev.observationFiles && sRev.observationFiles.length > 0) ? sRev.observationFiles : lRev.observationFiles
                                  };
                              }
                              return sRev;
                          });
                          return { ...sDoc, revisions: mergedRevisions };
                      }
                      return sDoc;
                  });
                  setDocuments(mergedDocs);
              } else if (localDocs.length > 0) {
                  setDocuments(localDocs);
              } else {
                  setDocuments(INITIAL_DOCS);
              }
          } catch (e) {
              console.error("Init Error", e);
              const localSaved = localStorage.getItem('btp-docs');
              setDocuments(localSaved ? JSON.parse(localSaved) : INITIAL_DOCS);
          } finally {
              setLoading(false);
              setIsInitialized(true);
          }
      };

      initData();
  }, []);

  // 2. Sync Effect
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('btp-docs', JSON.stringify(documents));

    const syncToSheet = async () => {
        setSyncing(true);
        await saveDocumentsToSheet(documents);
        setSyncing(false);
    };

    const timeoutId = setTimeout(() => {
        syncToSheet();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [documents, isInitialized]);

  const toggleTheme = () => {
      const newVal = !isDarkMode;
      setIsDarkMode(newVal);
      localStorage.setItem('btp-dark-mode', String(newVal));
  };

  const addDocument = (doc: BTPDocument) => {
    setDocuments(prev => [...prev, doc]);
  };

  const updateDocument = (updatedDoc: BTPDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setBordereauSelectedDocs(prev => prev.filter(docId => docId !== id));
  };

  const handleNavigateToDocs = (filter: ApprovalStatus | 'ALL') => {
      setInitialDocFilter(filter);
      setActiveTab('documents');
  };

  const handleAddToBordereau = (docId: string) => {
      if (!bordereauSelectedDocs.includes(docId)) {
          setBordereauSelectedDocs(prev => [...prev, docId]);
      }
      setActiveTab('bordereaux');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard documents={documents} onNavigateToDocs={handleNavigateToDocs} />;
      case 'documents':
        return <DocumentList 
            documents={documents} 
            onAddDocument={addDocument} 
            onUpdateDocument={updateDocument} 
            onDeleteDocument={deleteDocument}
            onNavigateToBordereau={() => setActiveTab('bordereaux')}
            onAddToBordereau={handleAddToBordereau}
            initialFilter={initialDocFilter}
        />;
      case 'bordereaux':
        return <BordereauView 
            documents={documents} 
            onAddDocument={addDocument} 
            onUpdateDocument={updateDocument} 
            onDeleteDocument={deleteDocument}
            selectedDocs={bordereauSelectedDocs}
            setSelectedDocs={setBordereauSelectedDocs}
        />;
      case 'settings':
        // @ts-ignore - Pass toggle props dynamically
        return <SettingsView isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
      default:
        return <Dashboard documents={documents} onNavigateToDocs={handleNavigateToDocs} />;
    }
  };

  if (loading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-gray-500 gap-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="text-gray-400">Démarrage SBF GED...</p>
          </div>
      );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode}>
      {syncing && (
          <div className="fixed bottom-4 right-4 bg-white/90 dark:bg-slate-800/90 shadow-lg border border-blue-100 dark:border-slate-700 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 z-50 animate-pulse">
              <Loader2 className="animate-spin" size={12} />
              Sauvegarde Cloud...
          </div>
      )}
      {renderContent()}
    </Layout>
  );
}