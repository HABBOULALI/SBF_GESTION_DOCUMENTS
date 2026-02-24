import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DocumentList } from './components/DocumentList';
import { BordereauView } from './components/BordereauView';
import { SettingsView } from './components/SettingsView';
import { Dashboard } from './components/Dashboard';
import { BTPDocument, ApprovalStatus } from './types';

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
  const [activeTab, setActiveTab] = useState('overview'); // Default to overview (Dashboard)
  // State to pass filter from Dashboard to DocumentList
  const [initialDocFilter, setInitialDocFilter] = useState<ApprovalStatus | 'ALL'>('ALL');

  // Shared State for Bordereau Selection
  const [bordereauSelectedDocs, setBordereauSelectedDocs] = useState<string[]>([]);

  const [documents, setDocuments] = useState<BTPDocument[]>(() => {
    const saved = localStorage.getItem('btp-docs');
    return saved ? JSON.parse(saved) : INITIAL_DOCS;
  });

  useEffect(() => {
    localStorage.setItem('btp-docs', JSON.stringify(documents));
  }, [documents]);

  const addDocument = (doc: BTPDocument) => {
    setDocuments(prev => [...prev, doc]);
  };

  const updateDocument = (updatedDoc: BTPDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    // Also remove from selection if deleted
    setBordereauSelectedDocs(prev => prev.filter(docId => docId !== id));
  };

  const handleNavigateToDocs = (filter: ApprovalStatus | 'ALL') => {
      setInitialDocFilter(filter);
      setActiveTab('documents');
  };

  // Function to add a doc to bordereau selection and navigate there
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
        return <SettingsView />;
      default:
        return <Dashboard documents={documents} onNavigateToDocs={handleNavigateToDocs} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}