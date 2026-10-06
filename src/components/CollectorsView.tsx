import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Building, 
  Key, 
  Phone, 
  Mail, 
  Plus, 
  X, 
  RotateCw,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Calendar,
  Banknote,
  ChevronRight
} from 'lucide-react';
import { UserAccount, CollectorUser, Collection } from '../types';
import { formatXAF } from '../data/mockData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CollectorsViewProps {
  accounts: UserAccount[];
  collections: Collection[];
  currentUser: CollectorUser;
  onAddAccount: (account: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onNavigate: (view: any) => void;
}

export const CollectorsView: React.FC<CollectorsViewProps> = ({
  accounts,
  collections,
  currentUser,
  onAddAccount,
  onShowToast,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selected Collector for Full Standalone Profile & History Page
  const [selectedCollector, setSelectedCollector] = useState<UserAccount | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState<'current-month' | 'last-month' | 'specific-month' | 'all'>('current-month');
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth());
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());

  // Registration Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [branch, setBranch] = useState('Douala Main Hub');
  const [role, setRole] = useState('Field Cash Collector');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const periodInfo = useMemo(() => {
    const now = new Date();
    if (selectedPeriodPreset === 'current-month') {
      const m = now.getMonth();
      const y = now.getFullYear();
      return {
        month: m,
        year: y,
        label: `${MONTH_NAMES[m]} ${y}`,
        isAllTime: false
      };
    } else if (selectedPeriodPreset === 'last-month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const m = lastMonthDate.getMonth();
      const y = lastMonthDate.getFullYear();
      return {
        month: m,
        year: y,
        label: `${MONTH_NAMES[m]} ${y}`,
        isAllTime: false
      };
    } else if (selectedPeriodPreset === 'specific-month') {
      return {
        month: historyMonth,
        year: historyYear,
        label: `${MONTH_NAMES[historyMonth]} ${historyYear}`,
        isAllTime: false
      };
    } else {
      return {
        month: null,
        year: null,
        label: 'All Time History',
        isAllTime: true
      };
    }
  }, [selectedPeriodPreset, historyMonth, historyYear]);

  // Helper to load logo for PDF exports
  const getPublicLogoDataUrl = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo.svg';
    });
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (acc.fullName || `${acc.firstName} ${acc.lastName}`).toLowerCase().includes(q);
        const matchEmail = (acc.email || '').toLowerCase().includes(q);
        const matchTerminal = (acc.terminalId || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTerminal) return false;
      }
      if (branchFilter && acc.branch !== branchFilter) {
        return false;
      }
      return true;
    });
  }, [accounts, search, branchFilter]);

  // Collector specific collections
  const selectedCollectorCollections = useMemo(() => {
    if (!selectedCollector) return [];
    return collections.filter(
      (c) =>
        c.assignedCollectorId === selectedCollector.terminalId ||
        c.assignedCollectorId === selectedCollector.id ||
        (c.assignedCollectorName && c.assignedCollectorName.toLowerCase().includes(selectedCollector.firstName.toLowerCase()))
    );
  }, [collections, selectedCollector]);

  const parseCollectionDate = (c: Collection): Date => {
    if (c.timestamp) {
      const d = new Date(c.timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const filteredCollectorHistory = useMemo(() => {
    return selectedCollectorCollections.filter((c) => {
      // Month / Period Filtering
      if (!periodInfo.isAllTime && periodInfo.month !== null && periodInfo.year !== null) {
        const d = parseCollectionDate(c);
        if (d.getMonth() !== periodInfo.month || d.getFullYear() !== periodInfo.year) {
          return false;
        }
      }

      // Search Filtering
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchClient = (c.clientName || '').toLowerCase().includes(q);
        const matchId = (c.id || '').toLowerCase().includes(q);
        const matchLoc = (c.location || '').toLowerCase().includes(q);
        if (!matchClient && !matchId && !matchLoc) return false;
      }
      return true;
    });
  }, [selectedCollectorCollections, periodInfo, historySearch]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      onShowToast('Please fill out all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    const generatedTerminalId = `TRM-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      onAddAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+237 600000000',
        password: password || '123456',
        branch,
        role,
        terminalId: generatedTerminalId,
        status: 'ACTIVE',
      });

      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('123456');
      setIsSubmitting(false);
      setIsAddModalOpen(false);
      onShowToast(`New Collector ${firstName} (${generatedTerminalId}) registered successfully!`, 'success');
    }, 300);
  };

  // Export PDF Statement for Selected Collector & Period
  const exportCollectorPdf = async () => {
    if (!selectedCollector) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const logoDataUrl = await getPublicLogoDataUrl();
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 8, 20, 20);
      }

      const periodVol = filteredCollectorHistory
        .filter((c) => c.status === 'COMPLETE')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 28, 28);
      doc.text('E-NAKO CASH SYSTEM', 38, 14);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(95, 94, 94);
      doc.text('Collector Monthly Statement & Field Operations Audit Report', 38, 20);

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 38, 25);

      doc.setDrawColor(229, 229, 229);
      doc.setLineWidth(0.5);
      doc.line(14, 30, 196, 30);

      // Profile & Period Header Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(8, 145, 178);
      doc.text(`COLLECTOR: ${selectedCollector.fullName.toUpperCase()}`, 14, 37);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 28, 28);
      doc.text(`Terminal ID: ${selectedCollector.terminalId}   |   Branch: ${selectedCollector.branch}`, 14, 43);
      doc.text(`Email: ${selectedCollector.email}   |   Phone: ${selectedCollector.phone || 'N/A'}`, 14, 48);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(14, 116, 144);
      doc.text(`STATEMENT PERIOD: ${periodInfo.label.toUpperCase()}`, 14, 54);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 28, 28);
      doc.text(`Tasks in Period: ${filteredCollectorHistory.length}   |   Settled Volume: ${formatXAF(periodVol)} FCFA`, 14, 59);

      const tableData = filteredCollectorHistory.map((c) => [
        new Date(c.timestamp || Date.now()).toLocaleDateString(),
        c.time || 'Now',
        c.clientName,
        `${formatXAF(c.amount)} FCFA`,
        c.location || 'Field Location',
        c.depositDestination || 'Cash Collection',
        c.status,
      ]);

      autoTable(doc, {
        startY: 64,
        head: [['Date', 'Time', 'Client Name', 'Amount', 'Location', 'Destination', 'Status']],
        body: tableData,
        headStyles: { fillColor: [47, 49, 49], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [26, 28, 28] },
        alternateRowStyles: { fillColor: [249, 249, 249] },
        margin: { left: 14, right: 14 },
      });

      const safePeriodLabel = periodInfo.label.replace(/\s+/g, '_');
      doc.save(`Collector_Statement_${selectedCollector.terminalId}_${safePeriodLabel}.pdf`);
      onShowToast(`Monthly PDF Statement (${periodInfo.label}) generated for ${selectedCollector.fullName}!`, 'success');
    } catch (e) {
      onShowToast('Failed to generate PDF report.', 'error');
    }
  };

  // Export Excel Statement for Selected Collector & Period
  const exportCollectorExcel = () => {
    if (!selectedCollector) return;
    const excelData = filteredCollectorHistory.map((c) => ({
      'Collection ID': c.id,
      'Statement Period': periodInfo.label,
      'Date': new Date(c.timestamp || Date.now()).toLocaleDateString(),
      'Time': c.time,
      'Client Name': c.clientName,
      'Amount (FCFA)': c.amount,
      'Location / Address': c.location,
      'Deposit Destination': c.depositDestination || 'Cash Collection',
      'Collector Name': selectedCollector.fullName,
      'Collector Terminal': selectedCollector.terminalId,
      'Status': c.status,
      'Notes': c.notes || c.summaryNote || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collector Statement');
    const safePeriodLabel = periodInfo.label.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Collector_History_${selectedCollector.terminalId}_${safePeriodLabel}.xlsx`);
    onShowToast(`Excel statement (${periodInfo.label}) downloaded for ${selectedCollector.fullName}!`, 'success');
  };

  // RENDER STANDALONE COLLECTOR PROFILE & HISTORY PAGE IF A COLLECTOR IS SELECTED
  if (selectedCollector) {
    const periodSettledVol = filteredCollectorHistory
      .filter((c) => c.status === 'COMPLETE')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const periodPendingCount = filteredCollectorHistory.filter((c) => c.status === 'PENDING').length;
    const lastMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans">
        {/* Top Header & Back Button */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedCollector(null)}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0891b2] hover:underline mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Collectors Directory</span>
            </button>
            <h1 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
              Collector Profile: {selectedCollector.fullName}
            </h1>
            <p className="text-xs text-[#595959] mt-0.5">
              Terminal ID: <strong className="text-[#1a1c1c]">{selectedCollector.terminalId}</strong> · Branch: {selectedCollector.branch}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportCollectorPdf}
              className="px-4 py-2 bg-[#2f3131] hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#a5f3fc]" />
              <span>Download PDF Statement ({periodInfo.label})</span>
            </button>

            <button
              onClick={exportCollectorExcel}
              className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Export ({periodInfo.label})</span>
            </button>
          </div>
        </div>

        {/* Statement Period & Month Selection Control Toolbar */}
        <div className="bg-gradient-to-r from-[#ecfeff] to-white p-4 border border-[#a5f3fc] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0891b2] text-white rounded-sm shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0e7490]">
                Statement Period & Monthly Report Filter
              </h3>
              <p className="text-xs text-[#595959] mt-0.5">
                Select a month or timeframe to filter history and download statements for <strong className="text-[#1a1c1c]">{periodInfo.label}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Period Preset Dropdown */}
            <select
              value={selectedPeriodPreset}
              onChange={(e) => setSelectedPeriodPreset(e.target.value as any)}
              className="bg-white border border-[#0891b2] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#0891b2] shadow-xs cursor-pointer"
            >
              <option value="current-month">Current Month ({MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()})</option>
              <option value="last-month">Last Month ({MONTH_NAMES[lastMonthDate.getMonth()]} {lastMonthDate.getFullYear()})</option>
              <option value="specific-month">Select Specific Month & Year...</option>
              <option value="all">All Time (Complete History)</option>
            </select>

            {/* Custom Month & Year Dropdowns when 'specific-month' is selected */}
            {selectedPeriodPreset === 'specific-month' && (
              <div className="flex items-center gap-2">
                <select
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(Number(e.target.value))}
                  className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2] cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>

                <select
                  value={historyYear}
                  onChange={(e) => setHistoryYear(Number(e.target.value))}
                  className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2] cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card & Key Metrics for Selected Period */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-3 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#ecfeff] border border-[#a5f3fc] flex items-center justify-center font-black text-lg text-[#0891b2]">
                {selectedCollector.firstName[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1a1c1c]">{selectedCollector.fullName}</h3>
                <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#86efac] text-[9px] font-black uppercase tracking-wider">
                  {selectedCollector.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#e5e5e5] text-xs text-[#595959]">
              <p><strong className="text-[#1a1c1c]">Role:</strong> {selectedCollector.role || 'Field Cash Collector'}</p>
              <p><strong className="text-[#1a1c1c]">Terminal ID:</strong> {selectedCollector.terminalId}</p>
              <p><strong className="text-[#1a1c1c]">Branch:</strong> {selectedCollector.branch}</p>
              <p><strong className="text-[#1a1c1c]">Email:</strong> {selectedCollector.email}</p>
              <p><strong className="text-[#1a1c1c]">Phone:</strong> {selectedCollector.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#0891b2] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PERIOD TASKS ({periodInfo.label.toUpperCase()})</p>
            <p className="text-3xl font-black text-[#1a1c1c] mt-2">{filteredCollectorHistory.length}</p>
            <p className="text-[11px] text-[#595959] mt-1 font-medium">Field collection assignments</p>
          </div>

          <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#ca8a04] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PERIOD PENDING ({periodInfo.label.toUpperCase()})</p>
            <p className="text-3xl font-black text-[#1a1c1c] mt-2">{periodPendingCount}</p>
            <p className="text-[11px] text-[#ca8a04] mt-1 font-bold">Awaiting agent completion</p>
          </div>

          <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#16a34a] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PERIOD VOLUME ({periodInfo.label.toUpperCase()})</p>
            <p className="text-xl font-black text-[#1a1c1c] mt-2 font-mono">{formatXAF(periodSettledVol)} FCFA</p>
            <p className="text-[11px] text-[#16a34a] mt-1 font-bold">Successfully collected</p>
          </div>
        </div>

        {/* Collection History Table for Selected Collector */}
        <div className="bg-white border border-[#e5e5e5] shadow-xs overflow-hidden">
          <div className="p-4 bg-[#f9f9f9] border-b border-[#e5e5e5] flex flex-col md:flex-row gap-3 items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1a1c1c] uppercase tracking-wider">
                Collection History & Audit Log ({periodInfo.label})
              </h3>
              <p className="text-xs text-[#595959]">Showing {filteredCollectorHistory.length} collection records handled by {selectedCollector.fullName}</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#595959]" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search client name, collection ID, or address..."
                className="w-full bg-white border border-[#d6d6d6] pl-9 pr-3 py-2 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#2f3131] text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3.5">ID / Time</th>
                  <th className="p-3.5">Client Entity</th>
                  <th className="p-3.5">Amount (FCFA)</th>
                  <th className="p-3.5">Location / Address</th>
                  <th className="p-3.5">Deposit Destination</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] text-xs font-medium text-[#1a1c1c]">
                {filteredCollectorHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#595959] font-bold">
                      No collection history entries found for {periodInfo.label}.
                    </td>
                  </tr>
                ) : (
                  filteredCollectorHistory.map((col) => (
                    <tr key={col.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="p-3.5">
                        <p className="font-mono font-bold text-[#0891b2]">{col.id}</p>
                        <p className="text-[10px] text-[#595959]">{new Date(col.timestamp || Date.now()).toLocaleDateString()} {col.time}</p>
                      </td>
                      <td className="p-3.5 font-bold text-[#1a1c1c]">{col.clientName}</td>
                      <td className="p-3.5 font-mono font-bold text-[#1a1c1c]">{formatXAF(col.amount)} FCFA</td>
                      <td className="p-3.5 text-[#595959]">{col.location || 'Douala Field Sector'}</td>
                      <td className="p-3.5 font-semibold text-[#1a1c1c]">{col.depositDestination || 'Cash Collection'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${
                          col.status === 'COMPLETE'
                            ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                            : col.status === 'CANCELLED'
                            ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                            : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
                        }`}>
                          {col.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MAIN COLLECTORS DIRECTORY VIEW
  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
            <span>Team & Field Logistics</span>
            <span>/</span>
            <span>Collector Management</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1c1c] tracking-tight mt-1">
            Cash Collectors Directory
          </h1>
          <p className="text-xs text-[#595959] mt-0.5">
            Manage field cash agents, view standalone profile & collection history, and monitor live task assignments.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Collector</span>
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#0891b2] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">TOTAL FIELD AGENTS</p>
            <Users className="w-4 h-4 text-[#0891b2]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{accounts.length}</p>
          <p className="text-[11px] text-[#595959] mt-1 font-medium">Active terminal profiles</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#ca8a04] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PENDING FIELD TASKS</p>
            <Clock className="w-4 h-4 text-[#ca8a04]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">
            {collections.filter((c) => c.status === 'PENDING').length}
          </p>
          <p className="text-[11px] text-[#ca8a04] mt-1 font-bold">Assigned awaiting completion</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#16a34a] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">SETTLED VOLUME</p>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-xl font-black text-[#1a1c1c] mt-2 font-mono">
            {formatXAF(collections.filter((c) => c.status === 'COMPLETE').reduce((acc, c) => acc + (c.amount || 0), 0))} FCFA
          </p>
          <p className="text-[11px] text-[#16a34a] mt-1 font-bold">Successfully collected</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e5e5e5] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#595959]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent name, email, or terminal ID..."
            className="w-full bg-[#f9f9f9] border border-[#d6d6d6] pl-10 pr-3 py-2 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-[#f9f9f9] border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2] cursor-pointer"
          >
            <option value="">All Operational Hubs / Branches</option>
            <option value="Douala Main Hub">Douala Main Hub</option>
            <option value="Yaounde Branch">Yaounde Branch</option>
            <option value="Buea Office">Buea Office</option>
            <option value="Global Operations">Global Operations</option>
          </select>
        </div>
      </div>

      {/* Collectors List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-full p-12 bg-white border border-[#e5e5e5] text-center text-sm text-[#595959]">
            <Users className="w-8 h-8 text-[#0891b2] mx-auto mb-2" />
            <p className="font-bold">No collectors registered yet.</p>
            <p className="text-xs mt-1">Click "Register New Collector" above to create a collector terminal profile.</p>
          </div>
        ) : (
          filteredAccounts.map((acc) => {
            const stats = collections.filter(
              (c) => c.assignedCollectorId === acc.terminalId || c.assignedCollectorId === acc.id
            );
            const pendingCount = stats.filter((c) => c.status === 'PENDING').length;
            const completedVolume = stats
              .filter((c) => c.status === 'COMPLETE')
              .reduce((sum, c) => sum + (c.amount || 0), 0);

            return (
              <div 
                key={acc.id} 
                onClick={() => setSelectedCollector(acc)}
                className="bg-white border border-[#e5e5e5] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#0891b2] cursor-pointer transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#ecfeff] border border-[#a5f3fc] flex items-center justify-center font-bold text-sm text-[#0891b2] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
                        {acc.firstName[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors">{acc.fullName || `${acc.firstName} ${acc.lastName}`}</h3>
                        <p className="text-[11px] text-[#595959] font-medium">{acc.role || 'Cash Collector'}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#86efac] text-[9px] font-black uppercase tracking-wider">
                      {acc.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e5e5e5] space-y-2 text-xs text-[#595959]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">Terminal ID:</span>
                      <span className="font-mono font-bold text-[#1a1c1c] bg-[#f2f2f2] px-2 py-0.5 border border-[#d6d6d6]">{acc.terminalId}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">Branch:</span>
                      <span className="font-semibold text-[#1a1c1c]">{acc.branch}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">Email:</span>
                      <span className="font-medium text-[#1a1c1c] truncate max-w-[180px]">{acc.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-[#f9f9f9] border border-[#e5e5e5] grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[9px] font-bold text-[#ca8a04] uppercase">Pending Tasks</p>
                      <p className="text-base font-black text-[#1a1c1c] mt-0.5">{pendingCount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#16a34a] uppercase">Total Settled</p>
                      <p className="text-xs font-mono font-bold text-[#1a1c1c] mt-1">{formatXAF(completedVolume)} FCFA</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#0891b2] group-hover:underline">
                  <span>View Standalone Profile & History</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Register New Collector */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#e5e5e5] w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-[#e5e5e5] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[#1a1c1c]">Register Cash Collector</h3>
                <p className="text-xs text-[#595959]">Create field terminal credentials for a collector</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#595959] hover:text-[#1a1c1c] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alain"
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Mbarga"
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collector@enako.cm"
                  className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Terminal Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-bold outline-none focus:border-[#0891b2]"
                  >
                    <option value="Douala Main Hub">Douala Main Hub</option>
                    <option value="Yaounde Branch">Yaounde Branch</option>
                    <option value="Buea Office">Buea Office</option>
                    <option value="Global Operations">Global Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Role / Permission</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-bold outline-none focus:border-[#0891b2]"
                  >
                    <option value="Field Cash Collector">Field Cash Collector</option>
                    <option value="Senior Cash Officer">Senior Cash Officer</option>
                    <option value="Branch Operations Lead">Branch Operations Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">Security PIN / Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6-digit PIN"
                    className="w-full bg-[#f9f9f9] border border-[#d6d6d6] p-2.5 text-xs text-[#1a1c1c] font-mono font-bold outline-none focus:border-[#0891b2]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e5e5] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#f2f2f2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Register Collector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
