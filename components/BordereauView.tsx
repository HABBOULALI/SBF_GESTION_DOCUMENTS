import React, { useState, useEffect } from 'react';
import { BTPDocument, ApprovalStatus } from '../types';
import { Square, CheckSquare, Archive, History, Trash2, Eye, X, AlertTriangle, CheckCircle, FileText, Printer, User, Users, Calendar, Hash, FileInput, PenTool, FileType, ChevronRight, Briefcase, Settings2, DownloadCloud, Search, Filter, ListPlus, MinusCircle, PlusCircle, Mic, MicOff, Plus } from 'lucide-react';
import { Logo } from './Logo';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, ImageRun, BorderStyle, AlignmentType, VerticalAlign, Header } from 'docx';

interface BordereauViewProps {
  documents: BTPDocument[];
  onAddDocument: (doc: BTPDocument) => void;
  onUpdateDocument: (doc: BTPDocument) => void;
  onDeleteDocument: (id: string) => void;
  selectedDocs: string[];
  setSelectedDocs: React.Dispatch<React.SetStateAction<string[]>>;
}

interface Stakeholder {
    name: string;
    contacts: string[];
}

interface SavedBordereau {
    id: string;
    refBE: string;
    date: string;
    recipient: string;
    project: string;
    documentCount: number;
    documents: { 
        id?: string; 
        code: string; 
        name: string; 
        index: string;
        lot?: string;
        poste?: string;
        classement?: string;
    }[];
    observations: Record<string, string>;
    copies: Record<string, number>;
    formDataSnapshot: any;
    timestamp: number;
}

const INTERNAL_DEPARTMENTS = [
    "Bureau d'Études",
    "Direction Technique",
    "Conduite de Travaux",
    "Service QHSE",
    "Direction Générale",
    "Service Achats"
];

export const BordereauView: React.FC<BordereauViewProps> = ({ 
    documents, 
    onAddDocument, 
    onDeleteDocument,
    selectedDocs,
    setSelectedDocs
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [logo, setLogo] = useState('');

  // Search & Filter State for Document Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('ALL');

  // History State
  const [history, setHistory] = useState<SavedBordereau[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  
  // PDF Preview State (History)
  const [previewBordereau, setPreviewBordereau] = useState<SavedBordereau | null>(null);

  // New Document Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<string | null>(null);
  const [newDocForm, setNewDocForm] = useState({
      lot: '01',
      code: '',
      name: '',
      index: '00',
      status: ApprovalStatus.PENDING,
      transmittalDate: new Date().toISOString().slice(0, 10)
  });

  // Loaded Settings
  const [stakeholders, setStakeholders] = useState<{
    client: Stakeholder;
    consultant: Stakeholder;
    control: Stakeholder;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    ref: 'FR80',
    date: new Date().toISOString().slice(0, 10),
    version: 'B',
    project: 'Construction Siège Horizon',
    from: "Bureau d'Études",
    to: '', 
    attn: '', 
    object: 'Soumission des plans pour exécution',
    refBE: 'BE-PNS-0001',
    sender: 'Chef de Projet',
    recipient: 'Client',
    companyName: 'Société Bouzguenda Frères',
    companySubtitle: 'Entreprise Générale de Bâtiments et de Travaux Publics',
    address: '41 Rue 8600 ZI La Charguia 1. Tunis',
    contact: 'Tél. : 70 557 900 - Fax : 70 557 999',
  });

  const [docObs, setDocObs] = useState<Record<string, string>>({});
  const [docCopies, setDocCopies] = useState<Record<string, number>>({});

  const availableContacts = React.useMemo(() => {
      if (!stakeholders || !formData.to) return [];
      if (stakeholders.client.name === formData.to) return stakeholders.client.contacts;
      if (stakeholders.consultant.name === formData.to) return stakeholders.consultant.contacts;
      if (stakeholders.control.name === formData.to) return stakeholders.control.contacts;
      const st = (Object.values(stakeholders) as Stakeholder[]).find(s => s.name === formData.to);
      return st ? st.contacts : [];
  }, [stakeholders, formData.to]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('btp-app-settings');
    if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        const defaultStakeholders = {
            client: { name: 'Maître d\'Ouvrage', contacts: [] },
            consultant: { name: 'Bureau d\'Études', contacts: [] },
            control: { name: 'Bureau de Contrôle', contacts: [] }
        };

        const loadedStakeholders = parsed.stakeholders || defaultStakeholders;
        setStakeholders(loadedStakeholders);

        setFormData(prev => ({
            ...prev,
            project: parsed.projectName || prev.project,
            to: prev.to || loadedStakeholders.control?.name || '',
            companyName: parsed.companyName || prev.companyName,
            companySubtitle: parsed.companySubtitle || prev.companySubtitle,
            address: parsed.address || prev.address,
            contact: parsed.contact || prev.contact
        }));
        if (parsed.logo) setLogo(parsed.logo);
    }
  };

  const loadHistory = () => {
      const savedHistory = localStorage.getItem('btp-bordereau-history');
      if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
      }
  };

  useEffect(() => {
      if (history.length >= 0) {
          let maxId = 0;
          const regex = /^BE-PNS-(\d{4})$/;
          history.forEach(h => {
             const match = h.refBE.match(regex);
             if (match) {
                 const num = parseInt(match[1], 10);
                 if (!isNaN(num) && num > maxId) {
                     maxId = num;
                 }
             }
          });
          const nextRef = `BE-PNS-${String(maxId + 1).padStart(4, '0')}`;
          setFormData(prev => ({...prev, refBE: nextRef}));
      }
  }, [history]);

  useEffect(() => {
    loadSettings();
    loadHistory();
    const handleUpdate = () => loadSettings();
    window.addEventListener('btp-app-settings-updated', handleUpdate);
    return () => window.removeEventListener('btp-app-settings-updated', handleUpdate);
  }, []);

  const toggleDoc = (id: string) => {
    if (selectedDocs.includes(id)) {
      setSelectedDocs(selectedDocs.filter(d => d !== id));
    } else {
      setSelectedDocs([...selectedDocs, id]);
    }
  };

  const updateDocObs = (id: string, value: string) => {
      setDocObs(prev => ({ ...prev, [id]: value }));
  };
  
  const updateDocCopies = (id: string, value: string) => {
      const val = parseInt(value) || 1;
      setDocCopies(prev => ({ ...prev, [id]: val }));
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Erreur reconnaissance vocale", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  const handleCreateDocument = (e: React.FormEvent) => {
      e.preventDefault();
      const newDoc: BTPDocument = {
          id: crypto.randomUUID(),
          lot: newDocForm.lot,
          classement: 'A',
          poste: 'GEN',
          code: newDocForm.code,
          name: newDocForm.name,
          currentRevisionIndex: 0,
          revisions: [{
              id: crypto.randomUUID(),
              index: newDocForm.index,
              transmittalRef: formData.refBE,
              transmittalDate: newDocForm.transmittalDate,
              status: newDocForm.status
          }]
      };

      onAddDocument(newDoc);
      setSelectedDocs(prev => [...prev, newDoc.id]);
      setNewDocForm({
        lot: '01',
        code: '',
        name: '',
        index: '00',
        status: ApprovalStatus.PENDING,
        transmittalDate: new Date().toISOString().slice(0, 10)
      });
      setIsAddModalOpen(false);
  };

  const confirmDocDeletion = () => {
      if (deleteDocConfirmId) {
          onDeleteDocument(deleteDocConfirmId);
          setSelectedDocs(prev => prev.filter(id => id !== deleteDocConfirmId));
          setDeleteDocConfirmId(null);
      }
  };

  const filteredDocuments = documents.filter(doc => {
      if (!doc.revisions || doc.revisions.length === 0) return false;

      const revIndex = (doc.currentRevisionIndex !== undefined && doc.currentRevisionIndex >= 0 && doc.currentRevisionIndex < doc.revisions.length) 
        ? doc.currentRevisionIndex 
        : doc.revisions.length - 1;
      
      const currentRev = doc.revisions[revIndex];
      if (!currentRev) return false;
      
      const matchesSearch = searchTerm === '' || 
          doc.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
          doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || currentRev.status === statusFilter;
      
      return matchesSearch && matchesStatus;
  });

  const selectAllFiltered = () => {
      const ids = filteredDocuments.map(d => d.id);
      const newSelection = [...new Set([...selectedDocs, ...ids])];
      setSelectedDocs(newSelection);
  };

  const deselectAll = () => {
      setSelectedDocs([]);
  };

  const selectByStatus = (status: ApprovalStatus) => {
      const ids = documents
        .filter(d => {
            if (!d.revisions || d.revisions.length === 0) return false;
            const idx = (d.currentRevisionIndex !== undefined) ? d.currentRevisionIndex : d.revisions.length - 1;
            const rev = d.revisions[idx];
            return rev && rev.status === status;
        })
        .map(d => d.id);
      const newSelection = [...new Set([...selectedDocs, ...ids])];
      setSelectedDocs(newSelection);
  };

  const currentSelection = documents.filter(d => selectedDocs.includes(d.id));
  
  useEffect(() => {
      setDocCopies(prev => {
          const next = { ...prev };
          currentSelection.forEach(d => {
              if (!next[d.id]) next[d.id] = 1;
          });
          return next;
      });
  }, [selectedDocs.length]);

  const TARGET_ROWS = 13;

  const handleArchiveBordereau = async () => {
      if (currentSelection.length === 0) {
          alert("Veuillez sélectionner au moins un document avant d'enregistrer.");
          return;
      }

      const newEntry: SavedBordereau = {
          id: crypto.randomUUID(),
          refBE: formData.refBE,
          date: formData.date,
          recipient: formData.to || 'Non spécifié',
          project: formData.project,
          documentCount: currentSelection.length,
          timestamp: Date.now(),
          formDataSnapshot: { ...formData },
          observations: { ...docObs },
          copies: { ...docCopies },
          documents: currentSelection.map(d => {
             const revIdx = (d.currentRevisionIndex !== undefined) ? d.currentRevisionIndex : d.revisions.length - 1;
             const rev = d.revisions[revIdx];
             return {
                id: d.id,
                code: d.code,
                name: d.name,
                index: rev ? rev.index : '00',
                lot: d.lot,
                poste: d.poste,
                classement: d.classement
             };
          })
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('btp-bordereau-history', JSON.stringify(updatedHistory));

      try {
         await handleExportPDF('print-area', formData.refBE);
         alert("Bordereau enregistré et téléchargement du PDF lancé !");
      } catch(e) {
         console.error(e);
         alert("Erreur génération PDF");
      }

      setSelectedDocs([]);
      setDocObs({});
      setDocCopies({});
  };

  const confirmDeleteBordereau = () => {
      if (!deleteConfirmId) return;
      const updatedHistory = history.filter(h => h.id !== deleteConfirmId);
      setHistory(updatedHistory);
      localStorage.setItem('btp-bordereau-history', JSON.stringify(updatedHistory));
      setDeleteConfirmId(null);
  };

  const filteredHistory = history.filter(h => {
      const lowerSearch = historySearchTerm.toLowerCase();
      return (
          h.refBE.toLowerCase().includes(lowerSearch) ||
          h.recipient.toLowerCase().includes(lowerSearch) ||
          h.date.includes(lowerSearch) ||
          h.documents.some(d => d.name.toLowerCase().includes(lowerSearch)) ||
          h.documents.some(d => d.code.toLowerCase().includes(lowerSearch))
      );
  });

  const handleExportWord = async () => {
    if (currentSelection.length === 0) {
        alert("Veuillez sélectionner au moins un document.");
        return;
    }

    try {
        let imageBuffer: ArrayBuffer | null = null;
        if (logo) {
            try {
                const response = await fetch(logo);
                imageBuffer = await response.arrayBuffer();
            } catch (e) {
                console.warn("Could not load logo for Word export", e);
            }
        }

        const totalCopies = currentSelection.reduce((sum, doc) => sum + (docCopies[doc.id] || 1), 0);
        const transparentBorder = { top: { style: BorderStyle.NIL, size: 0 }, bottom: { style: BorderStyle.NIL, size: 0 }, left: { style: BorderStyle.NIL, size: 0 }, right: { style: BorderStyle.NIL, size: 0 } };
        const singleBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
        const allBorders = { top: singleBorder, bottom: singleBorder, left: singleBorder, right: singleBorder };

        const headerTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allBorders,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 15, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: imageBuffer ? [
                                        new ImageRun({
                                            data: imageBuffer,
                                            transformation: { width: 50, height: 50 },
                                            type: "png"
                                        })
                                    ] : [new TextRun("LOGO")]
                                })
                            ]
                        }),
                        new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                                new Paragraph({ 
                                    alignment: AlignmentType.CENTER, 
                                    children: [new TextRun({ text: formData.companyName.toUpperCase(), bold: true, size: 22 })]
                                }),
                                new Paragraph({ 
                                    alignment: AlignmentType.CENTER, 
                                    children: [new TextRun({ text: formData.companySubtitle.toUpperCase(), bold: true, size: 16 })]
                                }),
                                new Paragraph({ 
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 120 },
                                    children: [new TextRun({ text: formData.address, size: 16 })]
                                }),
                                new Paragraph({ 
                                    alignment: AlignmentType.CENTER,
                                    children: [new TextRun({ text: formData.contact, size: 16 })]
                                }),
                            ]
                        }),
                        new TableCell({
                            width: { size: 25, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Formulaire :", bold: true, underline: { type: "single" } })] }),
                                new Paragraph({ children: [new TextRun({ text: "Réf: FR80", bold: true })] }),
                                new Paragraph({ children: [new TextRun({ text: "Date: 21/10/2023" })] }),
                                new Paragraph({ children: [new TextRun({ text: "Version: B" })] }),
                            ]
                        })
                    ]
                })
            ]
        });

        const titleParagraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 300 },
            children: [ new TextRun({ text: "BORDEREAU D'ENVOI", bold: true, size: 32, allCaps: true }) ]
        });

        const infoTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allBorders,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Site/Projet:", bold: true })] })] }),
                        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph(formData.project)] }),
                        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "De la part de:", bold: true })] })] }),
                        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph(formData.from)] }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(formData.date)] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Destinataire:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formData.to, bold: true })] })] }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Réf B.E:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formData.refBE, bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "À l'Attention de:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(formData.attn)] }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Objet:", bold: true })] })] }),
                        new TableCell({ columnSpan: 3, children: [new Paragraph(formData.object)] }),
                    ]
                }),
            ]
        });

        const docHeaderRow = new TableRow({
            children: [
                new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "E5E7EB" }, children: [new Paragraph({ text: "N°", alignment: AlignmentType.CENTER,  children: [new TextRun({ text: "N°", bold: true })] })] }),
                new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, shading: { fill: "E5E7EB" }, children: [new Paragraph({ text: "Désignation des pièces", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Désignation des pièces", bold: true })] })] }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "E5E7EB" }, children: [new Paragraph({ text: "Nbre", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nbre", bold: true })] })] }),
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: "E5E7EB" }, children: [new Paragraph({ text: "Observations", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Observations", bold: true })] })] }),
            ]
        });

        const docRows = currentSelection.map((doc, index) => {
            const revIdx = (doc.currentRevisionIndex !== undefined) ? doc.currentRevisionIndex : doc.revisions.length - 1;
            const rev = doc.revisions[revIdx];
            const copies = docCopies[doc.id] || 1;
            const obs = docObs[doc.id] || '';
            const revIndexStr = rev ? rev.index : '00';
            
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(`${doc.code} - ${doc.name} (Ind. ${revIndexStr})`)] }),
                    new TableCell({ children: [new Paragraph({ text: copies.toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(obs)] }),
                ]
            });
        });

        const rowsToFill = Math.max(0, TARGET_ROWS - currentSelection.length);
        for (let i = 0; i < rowsToFill; i++) {
            docRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(" ")] }),
                    new TableCell({ children: [new Paragraph(" ")] }),
                    new TableCell({ children: [new Paragraph(" ")] }),
                    new TableCell({ children: [new Paragraph(" ")] }),
                ]
            }));
        }

        docRows.push(new TableRow({
            children: [
                new TableCell({ borders: { ...allBorders, right: singleBorder }, children: [new Paragraph("")] }),
                new TableCell({ borders: { ...allBorders, left: singleBorder }, children: [new Paragraph({ text: "Total des pièces", alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Total des pièces", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: totalCopies.toString(), alignment: AlignmentType.CENTER, children: [new TextRun({ text: totalCopies.toString(), bold: true })] })] }),
                new TableCell({ children: [new Paragraph("")] }),
            ]
        }));

        const docsTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allBorders,
            rows: [docHeaderRow, ...docRows]
        });

        const signatureTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            spacing: { before: 0 }, 
            borders: transparentBorder,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 45, type: WidthType.PERCENTAGE },
                            borders: allBorders,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Reçu les pièces mentionnées ci-dessus", bold: true, underline: { type: "single" } })] }),
                                new Paragraph({ text: "", spacing: { before: 200 } }),
                                new Paragraph({ text: "Date et lieu : _______________________" }),
                                new Paragraph({ text: "", spacing: { before: 400 } }),
                                new Paragraph({ text: "Signature & Cachet :" }),
                                new Paragraph({ text: "", spacing: { before: 800 } }),
                            ]
                        }),
                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph("")] }),
                        new TableCell({
                            width: { size: 45, type: WidthType.PERCENTAGE },
                            borders: allBorders,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Signature de l'Expéditeur", bold: true, underline: { type: "single" } })] }),
                                new Paragraph({ text: "", spacing: { before: 200 } }),
                                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formData.sender, italics: true })] }),
                                new Paragraph({ text: "", spacing: { before: 400 } }),
                                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Cachet", size: 16 })] }),
                                new Paragraph({ text: "", spacing: { before: 800 } }),
                            ]
                        })
                    ]
                })
            ]
        });

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                         margin: { top: 720, right: 720, bottom: 720, left: 720 },
                    },
                },
                children: [
                    headerTable,
                    titleParagraph,
                    infoTable,
                    new Paragraph({ text: "", spacing: { before: 200 } }),
                    docsTable,
                    new Paragraph({ text: "", spacing: { before: 400 } }),
                    signatureTable
                ],
            }],
        });

        Packer.toBlob(doc).then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bordereau_${formData.refBE}.docx`;
            link.click();
            window.URL.revokeObjectURL(url);
        });

    } catch (error) {
        console.error("Erreur export Word:", error);
        alert("Une erreur est survenue lors de l'exportation Word.");
    }
  };

  const handleExportPDF = (elementId: string, filenameRef: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const element = document.getElementById(elementId);
        if (!element) {
            reject("Element not found");
            return;
        }

        const opt = {
          margin:       0, 
          filename:     `Bordereau_${filenameRef.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
              scale: 2, 
              useCORS: true, 
              letterRendering: true, 
              scrollY: 0,
              windowHeight: 1123
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: 'avoid-all' }
        };

        setIsExporting(true);
        element.classList.add('pdf-mode');
        
        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save().then(() => {
                setIsExporting(false);
                element.classList.remove('pdf-mode');
                resolve();
            }).catch((err: any) => {
                setIsExporting(false);
                element.classList.remove('pdf-mode');
                reject(err);
            });
        } else {
            setIsExporting(false);
            element.classList.remove('pdf-mode');
            alert("La bibliothèque PDF n'est pas encore chargée.");
            reject("Lib not loaded");
        }
    });
  };

  const BordereauTemplate = ({ data, docs, isPreview = false }: { data: typeof formData, docs: typeof currentSelection | SavedBordereau['documents'], isPreview?: boolean }) => {
      const docList = isPreview ? (docs as SavedBordereau['documents']) : (docs as typeof currentSelection);
      
      const getObs = (doc: any) => {
          if (isPreview && previewBordereau) {
             if (doc.id && previewBordereau.observations[doc.id]) {
                 return previewBordereau.observations[doc.id];
             }
             return '';
          }
          return doc.id ? (docObs[doc.id] || '') : '';
      };

      const getCopies = (doc: any) => {
           if (isPreview && previewBordereau) {
               if (doc.id && previewBordereau.copies && previewBordereau.copies[doc.id]) {
                   return previewBordereau.copies[doc.id];
               }
               return 1;
           }
           return doc.id ? (docCopies[doc.id] || 1) : 1;
      };

      const totalPieces = docList.reduce((sum, doc) => sum + getCopies(doc), 0);

      // Le template du bordereau reste blanc/noir (papier) peu importe le thème
      return (
          <div className="flex flex-col h-full justify-between print-content-wrapper font-sans text-gray-900 p-8 bg-white">
            <div className="flex-1">
                {/* 1. HEADER BLOCK */}
                <div className="w-full flex border-2 border-gray-800 mb-2 h-28 text-gray-900">
                     {/* LEFT: LOGO */}
                     <div className="w-[15%] border-r-2 border-gray-800 flex items-center justify-center p-2">
                        {logo ? <img src={logo} alt="Logo" className="max-w-full max-h-24 object-contain" /> : <Logo className="w-16 h-16 text-gray-800" />}
                     </div>
                     
                     {/* CENTER: COMPANY INFO */}
                     <div className="w-[60%] border-r-2 border-gray-800 flex flex-col items-center justify-center text-center p-2">
                         <h1 className="text-sm font-bold uppercase mb-1">{data.companyName}</h1>
                         <p className="text-[10px] uppercase font-semibold mb-2">{data.companySubtitle}</p>
                         
                         <div className="text-[10px] text-gray-700 leading-tight space-y-0.5">
                             <p>{data.address}</p>
                             <p>{data.contact}</p>
                         </div>
                     </div>

                     {/* RIGHT: META DATA */}
                     <div className="w-[25%] text-[10px] p-2 flex flex-col justify-center bg-gray-50 text-gray-800">
                         <div className="mb-2 font-bold underline">Formulaire:</div>
                         <div className="flex justify-between mb-1"><span>Réf:</span><span className="font-mono font-bold">FR80</span></div>
                         <div className="flex justify-between mb-1">
                             <span>Date:</span>
                             <span>21/10/2023</span>
                         </div>
                         <div className="flex justify-between">
                             <span>Version:</span>
                             <span>B</span>
                         </div>
                     </div>
                </div>

                {/* 2. TITLE */}
                <div className="w-full text-center py-2 mb-4 border-t border-b border-gray-800 text-gray-900">
                    <h2 className="text-xl font-bold uppercase">Bordereau d'envoi</h2>
                </div>

                {/* 3. INFO GRID */}
                <div className="w-full mb-4 text-xs border-2 border-gray-800 p-2 text-gray-900">
                     <div className="flex mb-2">
                         <div className="w-1/2 flex gap-2 items-start">
                            <span className="font-bold w-32 shrink-0">Site/Projet:</span>
                            <span className="flex-1 font-medium break-words">{data.project}</span>
                         </div>
                         <div className="w-1/2 flex gap-2 pl-4 items-start">
                            <span className="font-bold w-32 shrink-0">De la part :</span>
                            <span className="flex-1 break-words">{data.from}</span>
                         </div>
                     </div>
                     <div className="flex mb-2">
                         <div className="w-1/2 flex gap-2 items-start">
                            <span className="font-bold w-32 shrink-0">Date :</span>
                            <span className="flex-1 break-words">{data.date}</span>
                         </div>
                         <div className="w-1/2 flex gap-2 pl-4 items-start">
                            <span className="font-bold w-32 shrink-0">Destinataire :</span>
                            <span className="flex-1 font-bold break-words">{data.to}</span>
                         </div>
                     </div>
                     <div className="flex mb-2">
                         <div className="w-1/2 flex gap-2 items-start">
                            <span className="font-bold w-32 shrink-0">Réf bordereau d'envoi:</span>
                            <span className="flex-1 font-bold break-words">{data.refBE}</span>
                         </div>
                         <div className="w-1/2 flex gap-2 pl-4 items-start">
                            <span className="font-bold w-32 shrink-0">A l'Attention de :</span>
                            <span className="flex-1 break-words">{data.attn}</span>
                         </div>
                     </div>
                     
                     <div className="flex items-start gap-2 border-t border-gray-300 pt-2 mt-2">
                        <span className="font-bold w-16 shrink-0">Objet:</span>
                        <span className="flex-1 block break-words">{data.object}</span>
                     </div>
                </div>

                {/* 4. TABLE */}
                <div className="w-full border border-gray-800 mt-2 text-[11px] text-gray-900">
                     <div className="flex bg-gray-100 font-bold border-b border-gray-800 text-center">
                         <div className="w-10 border-r border-gray-800 p-2">n°</div>
                         <div className="flex-1 border-r border-gray-800 p-2">Désignation des pièces</div>
                         <div className="w-20 border-r border-gray-800 p-2 leading-tight">Nbre pièces</div>
                         <div className="w-40 p-2">Observations</div>
                     </div>
                     {docList.map((doc, idx) => {
                         let code = doc.code;
                         let name = doc.name;
                         let index = doc.index;

                         if (!('index' in doc) && 'revisions' in doc) {
                              // @ts-ignore
                              const d = doc as BTPDocument;
                              const revIdx = (d.currentRevisionIndex !== undefined) ? d.currentRevisionIndex : d.revisions.length - 1;
                              const rev = d.revisions[revIdx];
                              code = d.code;
                              name = d.name;
                              index = rev ? rev.index : '00';
                         }

                         return (
                             <div key={idx} className="flex border-b border-gray-800 items-stretch h-8">
                                 <div className="w-10 border-r border-gray-800 p-1 text-center flex items-center justify-center">{idx + 1}</div>
                                 <div className="flex-1 border-r border-gray-800 p-1 pl-2 flex items-center font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                                     {code} - {name} (Ind. {index})
                                 </div>
                                 <div className="w-20 border-r border-gray-800 p-1 text-center flex items-center justify-center">
                                     <span>{getCopies(doc)}</span>
                                 </div>
                                 <div className="w-40 p-1 flex items-center overflow-hidden">
                                     <span className="px-1 truncate">{getObs(doc)}</span>
                                 </div>
                             </div>
                         )
                     })}
                     {Array.from({ length: Math.max(0, TARGET_ROWS - docList.length) }).map((_, i) => (
                         <div key={`empty-${i}`} className="flex border-b border-gray-800 h-8">
                             <div className="w-10 border-r border-gray-800"></div>
                             <div className="flex-1 border-r border-gray-800"></div>
                             <div className="w-20 border-r border-gray-800"></div>
                             <div className="w-40"></div>
                         </div>
                     ))}
                     <div className="flex border-b border-gray-800 bg-gray-50 font-bold h-8 items-center">
                         <div className="w-10 border-r border-gray-800 h-full"></div>
                         <div className="flex-1 border-r border-gray-800 p-1 text-right">Total des pièces</div>
                         <div className="w-20 border-r border-gray-800 p-1 text-center">{totalPieces}</div>
                         <div className="w-40 h-full"></div>
                     </div>
                </div>
             </div>

             <div className="mt-2 text-xs flex gap-4 h-32 text-gray-900">
                 <div className="w-1/2 border-2 border-gray-800 p-3 flex flex-col justify-between">
                     <p className="font-bold underline">Reçu les pièces mentionnées ci-dessus</p>
                     <div>
                        <p className="mb-6">Date et lieu : _______________________</p>
                        <p>Signature & Cachet :</p>
                     </div>
                 </div>
                 <div className="w-1/2 border-2 border-gray-800 p-3 flex flex-col justify-between">
                     <p className="font-bold underline">Signature de l'Expéditeur</p>
                     <div className="text-right">
                         <p className="italic mb-4">{data.sender}</p>
                         <p className="text-[10px] text-gray-500">Cachet</p>
                     </div>
                 </div>
             </div>
          </div>
      );
  };
  
  return (
    <div className="flex flex-col h-full space-y-6 bg-gray-50 dark:bg-slate-900 p-6 min-h-screen transition-colors">
      
      {/* --- HEADER ACTIONS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print border-b border-gray-200 dark:border-slate-700 pb-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Générateur de Bordereau</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Configurez l'envoi, sélectionnez les documents et générez vos bordereaux.</p>
         </div>
         <div className="flex gap-3">
             <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium transition-colors shadow-sm active:scale-95">
                <History size={16} /> Historique
             </button>
             <button onClick={handleExportWord} className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors shadow-sm active:scale-95 border border-blue-600">
                <FileText size={16} /> Word
             </button>
             <button 
                onClick={handleArchiveBordereau} 
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium transition-colors shadow-sm active:scale-95 border border-amber-500"
            >
                <DownloadCloud size={16} />
                Enregistrer & PDF
             </button>
         </div>
      </div>

      {/* --- SECTION 1: CONFIGURATION (Top Row) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          {/* INTERVENANTS */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
               <h3 className="text-sm font-bold text-amber-500 dark:text-amber-500 mb-5 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 dark:border-slate-700 pb-3">
                   <Users size={18} className="text-amber-500" /> Intervenants
               </h3>
               <div className="grid grid-cols-2 gap-5">
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">De la part de</label>
                       <select 
                           className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none"
                           value={formData.from}
                           onChange={e => setFormData({...formData, from: e.target.value})}
                       >
                           {INTERNAL_DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                           <option value="Autre">Autre...</option>
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Destinataire</label>
                       <select 
                           className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium transition-all appearance-none"
                           value={formData.to}
                           onChange={e => {
                               const newTo = e.target.value;
                               let newAttn = '';
                               if (stakeholders) {
                                    const found = (Object.values(stakeholders) as Stakeholder[]).find(s => s.name === newTo);
                                    if (found && found.contacts.length > 0) {
                                        newAttn = found.contacts[0];
                                    }
                               }
                               setFormData({...formData, to: newTo, attn: newAttn});
                           }}
                       >
                           <option value="" disabled>Sélectionner...</option>
                           {stakeholders && (
                               <>
                                   {stakeholders.client.name && <option value={stakeholders.client.name}>{stakeholders.client.name} (Client)</option>}
                                   {stakeholders.consultant.name && <option value={stakeholders.consultant.name}>{stakeholders.consultant.name} (M.O.E)</option>}
                                   {stakeholders.control.name && <option value={stakeholders.control.name}>{stakeholders.control.name} (Contrôle)</option>}
                               </>
                           )}
                       </select>
                   </div>
                   <div className="col-span-2">
                       <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">À l'attention de</label>
                       <select 
                           className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none"
                           value={formData.attn}
                           onChange={e => setFormData({...formData, attn: e.target.value})}
                           disabled={!formData.to}
                       >
                           <option value="">- Sélectionner Responsable -</option>
                           {availableContacts.map((c, i) => (<option key={i} value={c}>{c}</option>))}
                       </select>
                   </div>
               </div>
          </div>

          {/* META DATA */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
               <h3 className="text-sm font-bold text-amber-500 dark:text-amber-500 mb-5 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 dark:border-slate-700 pb-3">
                   <Settings2 size={18} className="text-amber-500" /> Détails Envoi
               </h3>
               <div className="grid grid-cols-2 gap-5 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Date d'Envoi</label>
                        <input 
                            type="date"
                            className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                    <div>
                       <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Réf. Transmise (BE)</label>
                       <input 
                           className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono"
                           value={formData.refBE}
                           onChange={e => setFormData({...formData, refBE: e.target.value})}
                       />
                   </div>
               </div>
               <div>
                   <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Objet</label>
                   <textarea 
                       className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none h-20 transition-all"
                       value={formData.object}
                       onChange={e => setFormData({...formData, object: e.target.value})}
                   />
               </div>
          </div>
      </div>

      {/* --- SECTION 2: DOCUMENT SELECTION TABLE (Zone de choix des documents) --- */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 flex flex-col no-print">
           {/* HEADER WITH FILTERS */}
           <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                        <CheckSquare size={18} className="text-emerald-500 dark:text-emerald-400" /> LISTE DES DOCUMENTS À INCLURE
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                        >
                            <Plus size={14} /> Nouveau Document
                        </button>
                        <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full">
                            {selectedDocs.length} sélectionné(s)
                        </span>
                    </div>
                </div>
                
                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row gap-3 items-center">
                    {/* SEARCH */}
                    <div className="relative flex-1 w-full">
                        <input 
                            type="text" 
                            placeholder="Rechercher par Code, Nom..." 
                            className="w-full pl-9 pr-10 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                             {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-400">
                                    <X size={12} />
                                </button>
                             )}
                            <button 
                                onClick={handleVoiceSearch}
                                className={`p-1 rounded-full transition-colors ${isListening ? 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400 animate-pulse' : 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-400'}`}
                                title="Recherche vocale"
                            >
                                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* FILTER STATUS */}
                    <div className="relative w-full md:w-48">
                        <select 
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                        >
                            <option value="ALL">Tous les statuts</option>
                            <option value={ApprovalStatus.PENDING}>En cours de révision</option>
                            <option value={ApprovalStatus.NO_RESPONSE}>Sans Réponse</option>
                            <option value={ApprovalStatus.APPROVED}>Approuvé</option>
                            <option value={ApprovalStatus.REJECTED}>Non Approuvé</option>
                        </select>
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button 
                            onClick={selectAllFiltered}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                            title="Tout cocher dans la liste visible"
                        >
                            <PlusCircle size={14} /> Tout cocher
                        </button>
                        <button 
                            onClick={() => selectByStatus(ApprovalStatus.PENDING)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-amber-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                            title="Cocher tous les documents En Cours"
                        >
                            <ListPlus size={14} /> + En Cours
                        </button>
                        <button 
                            onClick={deselectAll}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                            title="Tout décocher"
                        >
                            <MinusCircle size={14} /> Décocher
                        </button>
                    </div>
                </div>
           </div>
           
           <div className="overflow-x-auto max-h-96 overflow-y-auto">
               <table className="w-full text-left text-sm">
                   <thead className="bg-gray-100 dark:bg-slate-950 text-amber-600 dark:text-amber-500 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm border-b border-amber-200 dark:border-amber-500/50">
                       <tr>
                           <th className="p-4 w-12 text-center border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950">
                               <Square size={16} className="text-amber-500 mx-auto" />
                           </th>
                           <th className="p-4 w-40 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950">Code & Indice</th>
                           <th className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950">Titre du Document</th>
                           <th className="p-4 w-24 text-center border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950">Nbr Ex.</th>
                           <th className="p-4 w-1/3 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950">Observations (pour bordereau)</th>
                           <th className="p-4 w-10 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950"></th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                       {filteredDocuments.length === 0 ? (
                           <tr>
                               <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-slate-500 text-sm italic">
                                   {documents.length === 0 
                                      ? "Aucun document n'a été créé. Allez dans l'onglet 'Suivi Documents' pour en ajouter." 
                                      : "Aucun document ne correspond à vos filtres de recherche."}
                               </td>
                           </tr>
                       ) : filteredDocuments.map(doc => {
                           const isSelected = selectedDocs.includes(doc.id);
                           const revIdx = (doc.currentRevisionIndex !== undefined) ? doc.currentRevisionIndex : (doc.revisions ? doc.revisions.length - 1 : 0);
                           const currentRev = (doc.revisions && doc.revisions[revIdx]) ? doc.revisions[revIdx] : null;
                           const revIndexStr = currentRev ? currentRev.index : '00';
                           const status = currentRev ? currentRev.status : ApprovalStatus.PENDING;

                           return (
                               <tr 
                                   key={doc.id} 
                                   className={`transition-all duration-200 cursor-pointer ${isSelected ? 'bg-amber-50 dark:bg-amber-900/30 border-l-4 border-l-amber-500' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-l-4 border-l-transparent text-gray-700 dark:text-slate-300'}`}
                               >
                                   <td className="p-4 text-center" onClick={() => toggleDoc(doc.id)}>
                                       <div className={`flex justify-center transition-transform active:scale-90 ${isSelected ? 'text-amber-500' : 'text-gray-400 dark:text-slate-600'}`}>
                                           {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                       </div>
                                   </td>
                                   <td className="p-4 font-mono text-xs font-bold text-gray-800 dark:text-slate-200" onClick={() => toggleDoc(doc.id)}>
                                       {doc.code} <span className="text-gray-500 dark:text-slate-500 font-normal ml-1">v.{revIndexStr}</span>
                                       <div className="mt-1">
                                           <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                               status === ApprovalStatus.APPROVED ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                               status === ApprovalStatus.REJECTED ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                                               status === ApprovalStatus.NO_RESPONSE ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                                               'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                                           }`}>
                                               {status === ApprovalStatus.PENDING ? 'EN COURS' : status}
                                           </span>
                                       </div>
                                   </td>
                                   <td className="p-4 text-sm text-gray-800 dark:text-slate-200 font-medium" onClick={() => toggleDoc(doc.id)}>
                                       {doc.name}
                                   </td>
                                   <td className="p-3">
                                       <input 
                                           type="number" min="1"
                                           className={`w-full text-center border rounded-md p-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all ${!isSelected ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-600 border-transparent' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-500 font-bold text-gray-900 dark:text-white shadow-sm'}`}
                                           value={docCopies[doc.id] || 1}
                                           onChange={(e) => updateDocCopies(doc.id, e.target.value)}
                                           disabled={!isSelected}
                                           onClick={(e) => e.stopPropagation()}
                                       />
                                   </td>
                                   <td className="p-3">
                                       <div className="relative">
                                           <input 
                                               type="text"
                                               className={`w-full border rounded-md pl-8 p-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all ${!isSelected ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-600 border-transparent' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white shadow-sm'}`}
                                               value={docObs[doc.id] || ''}
                                               onChange={(e) => updateDocObs(doc.id, e.target.value)}
                                               placeholder={isSelected ? "R.A.S..." : ""}
                                               disabled={!isSelected}
                                               onClick={(e) => e.stopPropagation()}
                                           />
                                           <PenTool size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isSelected ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-slate-600'}`} />
                                       </div>
                                   </td>
                                   <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                       <button 
                                            onClick={() => setDeleteDocConfirmId(doc.id)}
                                            className="p-2 text-gray-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                            title="Supprimer ce document de la liste"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
           </div>
      </div>

      {/* --- SECTION 3: PREVIEW (Bottom) --- */}
      <div className="flex-1 bg-gray-200/50 dark:bg-slate-800/50 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-8 overflow-y-auto flex justify-center min-h-[600px] relative">
          <div className="flex flex-col items-center w-full">
            <h4 className="text-gray-500 dark:text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mb-8 flex items-center gap-2 no-print opacity-70">
                <FileText size={16} /> Aperçu Document Final (Prêt à imprimer)
            </h4>
            <div id="print-area" className="bg-white shadow-2xl pdf-mode ring-4 ring-black/5 dark:ring-black/20 transform transition-transform duration-300">
                 <BordereauTemplate data={formData} docs={currentSelection} isPreview={false} />
            </div>
          </div>
      </div>

      {/* CREATE NEW DOCUMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <PlusCircle className="text-amber-500" /> Ajouter un Document au Bordereau
                </h3>
                <form onSubmit={handleCreateDocument} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Code Document</label>
                            <input 
                                required 
                                value={newDocForm.code} 
                                onChange={e => setNewDocForm({...newDocForm, code: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                                placeholder="EX: GC-PL-001"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Indice</label>
                            <input 
                                required 
                                value={newDocForm.index} 
                                onChange={e => setNewDocForm({...newDocForm, index: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                                placeholder="00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Désignation (Titre)</label>
                        <input 
                            required 
                            value={newDocForm.name} 
                            onChange={e => setNewDocForm({...newDocForm, name: e.target.value})} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                            placeholder="Plan de coffrage..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Lot</label>
                            <input 
                                value={newDocForm.lot} 
                                onChange={e => setNewDocForm({...newDocForm, lot: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Date d'envoi</label>
                            <input 
                                type="date"
                                required
                                value={newDocForm.transmittalDate} 
                                onChange={e => setNewDocForm({...newDocForm, transmittalDate: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-slate-700 mt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsAddModalOpen(false)} 
                            className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-bold shadow-sm"
                        >
                            Créer et Sélectionner
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* DELETE DOCUMENT CONFIRMATION MODAL */}
      {deleteDocConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-slate-700">
             <div className="flex flex-col items-center text-center space-y-4">
               <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                 <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Supprimer le document ?</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Ce document sera définitivement supprimé de la base de données.</p>
               </div>
               <div className="flex gap-3 w-full mt-4">
                 <button onClick={() => setDeleteDocConfirmId(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium">Annuler</button>
                 <button onClick={confirmDocDeletion} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">Supprimer</button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {isHistoryOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-slate-700">
                  <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                      <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                              <History className="text-amber-500" />
                              Historique des Bordereaux Envoyés
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Consultez et gérez les traces de vos envois précédents.</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="relative">
                              <input 
                                  type="text" 
                                  placeholder="Rechercher..." 
                                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-64 focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-slate-800"
                                  value={historySearchTerm}
                                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                              />
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                          <button onClick={() => setIsHistoryOpen(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                              <X size={24} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-0 bg-white dark:bg-slate-800">
                      {filteredHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
                              <Archive size={48} className="mb-4 opacity-30" />
                              <p>Aucun envoi trouvé.</p>
                          </div>
                      ) : (
                          <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300">
                              <thead className="bg-gray-100 dark:bg-slate-950 text-amber-600 dark:text-amber-500 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm border-b border-gray-200 dark:border-amber-500/30">
                                  <tr>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800">Date</th>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800">Réf B.E.</th>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800">Destinataire</th>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800 w-1/4">Code Complet</th>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800 w-1/4">Désignation</th>
                                      <th className="p-4 border-b border-gray-200 dark:border-slate-800 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                  {filteredHistory.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                                          <td className="p-4 whitespace-nowrap font-medium text-gray-800 dark:text-slate-200">
                                              {new Date(item.date).toLocaleDateString()}
                                          </td>
                                          <td className="p-4 whitespace-nowrap font-bold text-amber-600 dark:text-amber-500">
                                              {item.refBE} <span className="text-gray-400 dark:text-slate-500 font-normal ml-1 text-xs">v.{item.formDataSnapshot.version}</span>
                                          </td>
                                          <td className="p-4 whitespace-nowrap">
                                              <span className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-2 py-1 rounded text-xs font-bold border border-gray-200 dark:border-slate-600">{item.recipient}</span>
                                          </td>
                                          <td className="p-4">
                                              <ul className="space-y-1">
                                                  {item.documents.map((doc, idx) => (
                                                      <li key={idx} className="font-mono text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700 w-fit">
                                                          {doc.lot || '??'}-{doc.poste || '??'}-{doc.classement || '?'}-{doc.code}-{doc.index}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </td>
                                          <td className="p-4 text-xs text-gray-500 dark:text-slate-400">
                                              <ul className="space-y-1">
                                                  {item.documents.map((doc, idx) => (
                                                      <li key={idx} className="truncate max-w-xs" title={doc.name}>
                                                          • {doc.name}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </td>
                                          <td className="p-4 text-right">
                                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button 
                                                      onClick={() => setPreviewBordereau(item)}
                                                      className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                      title="Voir PDF"
                                                  >
                                                      <FileText size={18} />
                                                  </button>
                                                  <button 
                                                      onClick={() => setDeleteConfirmId(item.id)}
                                                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                      title="Supprimer"
                                                  >
                                                      <Trash2 size={18} />
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {previewBordereau && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-700">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <FileText className="text-amber-500" />
                          Consultation Bordereau: {previewBordereau.refBE}
                      </h3>
                      <div className="flex gap-2">
                        <button 
                            onClick={() => handleExportPDF('history-preview-area', previewBordereau.refBE)}
                            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                        >
                            <Printer size={16} />
                            Imprimer / Télécharger
                        </button>
                        <button onClick={() => setPreviewBordereau(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-slate-900 p-8 flex justify-center">
                      <div id="history-preview-area" className="bg-white shadow-2xl pdf-mode origin-top scale-90 ring-1 ring-black/5">
                           <BordereauTemplate 
                                data={previewBordereau.formDataSnapshot} 
                                docs={previewBordereau.documents} 
                                isPreview={true} 
                           />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION MODAL (History) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-slate-700">
             <div className="flex flex-col items-center text-center space-y-4">
               <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                 <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Confirmer la suppression</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Voulez-vous vraiment supprimer cet envoi de l'historique ? Cette action est irréversible.</p>
               </div>
               <div className="flex gap-3 w-full mt-4">
                 <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium">Annuler</button>
                 <button onClick={confirmDeleteBordereau} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">Supprimer</button>
               </div>
             </div>
           </div>
        </div>
      )}
      
      <style>{`
        /* PDF MODE STYLES */
        .pdf-mode {
            width: 210mm !important;
            height: 296mm !important;
            padding: 15mm 10mm 10mm 10mm !important;
            background: white;
            margin: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .pdf-mode .print-content-wrapper {
             width: 100%;
             height: 100%;
        }
        
        .pdf-mode select,
        @media print select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background: transparent;
            border: none;
            font-weight: bold;
        }

        .pdf-mode .no-print,
        @media print .no-print {
            display: none !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};