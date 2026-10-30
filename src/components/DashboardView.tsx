import React, { useState } from 'react';
import { 
  Plus, 
  Wallet, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  Check, 
  X, 
  FileText,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building,
  Eye,
  User,
  ArrowRight,
  Info,
  ArrowLeft,
  Download,
  ShieldCheck,
  Image as ImageIcon,
  Mail,
  Send,
  Paperclip,
  Camera,
  Upload
} from 'lucide-react';
import { Collection, ViewType, CollectorUser } from '../types';
import { formatXAF, INITIAL_USER } from '../data/mockData';
import { downloadReceiptPDF, downloadDailyReportPDF } from '../utils/exportUtils';
import { hasOperationalAccess, isSeniorCollector, canViewCollection } from '../utils/permissions';

interface DashboardViewProps {
  collections: Collection[];
  user?: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onSelectCollection: (col: Collection) => void;
  onOpenStatusUpdate?: (col: Collection) => void;
  onUpdateCollectionPhoto?: (id: string, photoUrl: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  collections,
  user,
  onNavigate,
  onSelectCollection,
  onOpenStatusUpdate,
  onUpdateCollectionPhoto,
}) => {
  const isCeoOrManager = hasOperationalAccess(user);
  const isSenior = isSeniorCollector(user);
  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Collector';

  // Helper to check if a collection was logged today (daily transactions)
  const isToday = (ts?: string | number | Date) => {
    if (!ts) return false;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // State for Field Collector tab view ('available' vs 'settled' vs 'lacking')
  const [collectorTab, setCollectorTab] = useState<'available' | 'settled' | 'lacking'>('available');

  // State for standalone Job Details Page view (replacing popup modals)
  const [selectedJobDetails, setSelectedJobDetails] = useState<Collection | null>(null);

  // State for inspecting the exact email dispatched to the client
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // File input ref for attaching/uploading photo on the detail page
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && selectedJobDetails) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setSelectedJobDetails((prev) => (prev ? { ...prev, receiptUrl: base64Url } : null));
        if (onUpdateCollectionPhoto) {
          onUpdateCollectionPhoto(selectedJobDetails.id, base64Url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter collections for current user if field collector
  const collectorCollections = collections.filter((c) => canViewCollection(user, c));

  // DAILY TRANSACTIONS ONLY vs ALL ACTIVE TOGGLE
  // Today is always the default. Historical records appear only after the user selects All.
  const [timeframeMode, setTimeframeMode] = useState<'today' | 'all'>('today');

  const dailyCollectorCollections = collectorCollections.filter((c) => isToday(c.timestamp));
  const dailyCompanyCollections = collections.filter((c) => isToday(c.timestamp));

  // Collections displayed on the dashboard according to active timeframe mode
  const activeCollectorCollections = timeframeMode === 'today' ? dailyCollectorCollections : collectorCollections;
  const activeCompanyCollections = timeframeMode === 'today' ? dailyCompanyCollections : collections;

  const availableJobs = activeCollectorCollections.filter((c) => c.status === 'PENDING');
  const settledJobs = activeCollectorCollections.filter((c) => c.status === 'COMPLETE');

  // Lacking / Deficit Jobs (jobs where an actual shortfall was recorded)
  const lackingJobs = activeCollectorCollections.filter((c) => {
    return Boolean(c.shortageAmount && Number(c.shortageAmount) > 0);
  });

  const totalLackingAmount = lackingJobs.reduce((sum, c) => {
    return sum + Number(c.shortageAmount || 0);
  }, 0);

  const totalPendingAmount = availableJobs.reduce((sum, c) => {
    return sum + Number(c.targetAmount || c.amount || 0);
  }, 0);

  // Total Outstanding Balance for Collector = Deficit on completed + uncollected pending
  const totalCollectorOutstanding = totalLackingAmount + totalPendingAmount;

  const totalActualCollected = settledJobs.reduce((sum, c) => {
    const actual = c.actualAmountCollected !== undefined 
      ? Number(c.actualAmountCollected) 
      : Number(c.amount || 0);
    return sum + actual;
  }, 0);

  // CEO / Executive Daily or All-Time Totals
  const totalCompletedAmount = activeCompanyCollections
    .filter((c) => c.status === 'COMPLETE')
    .reduce((sum, c) => {
      const actual = c.actualAmountCollected !== undefined 
        ? Number(c.actualAmountCollected) 
        : Number(c.amount || 0);
      return sum + actual;
    }, 0);

  const totalCompanyLackingAmount = activeCompanyCollections.reduce((sum, c) => {
    return sum + (c.shortageAmount && Number(c.shortageAmount) > 0 ? Number(c.shortageAmount) : 0);
  }, 0);

  const totalCompanyPendingAmount = activeCompanyCollections
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + Number(c.targetAmount || c.amount || 0), 0);

  const totalCompanyOutstanding = totalCompanyLackingAmount + totalCompanyPendingAmount;

  const pendingCount = activeCompanyCollections.filter((c) => c.status === 'PENDING').length;

  // DEDICATED JOB DETAILS SPECIFICATIONS PAGE (NO POPUP MODAL)
  if (selectedJobDetails) {
    const isCompleted = selectedJobDetails.status === 'COMPLETE';
    const clientEmail = `${selectedJobDetails.clientName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@enako.cm`;

    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
        {/* Top Header & Navigation Actions */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedJobDetails(null);
                setShowEmailPreview(false);
              }}
              className="p-2.5 bg-[#f3f3f3] hover:bg-[#e5e5e5] border border-[#e5e5e5] text-[#1a1c1c] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#0891b2]" />
              <span>Back to Dashboard</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[#0891b2]">{selectedJobDetails.id}</span>
                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                  selectedJobDetails.status === 'COMPLETE'
                    ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                    : selectedJobDetails.status === 'CANCELLED'
                    ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                    : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
                }`}>
                  {selectedJobDetails.status === 'COMPLETE' ? 'SETTLED & VERIFIED' : selectedJobDetails.status}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#1a1c1c] mt-0.5">
                Collection Specifications Detail Page
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => setShowEmailPreview(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-[#2f3131] text-[#2f3131] hover:bg-[#f3f3f3] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Mail className="w-4 h-4 text-[#0891b2]" />
              <span>View Client Email Dispatched</span>
            </button>

            <button
              onClick={() => downloadReceiptPDF(selectedJobDetails, user || INITIAL_USER)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-[#0891b2]" />
              <span>Download PDF Receipt</span>
            </button>

            {selectedJobDetails.status === 'PENDING' && (
              <button
                onClick={() => {
                  const target = selectedJobDetails;
                  setSelectedJobDetails(null);
                  if (onOpenStatusUpdate) onOpenStatusUpdate(target);
                  else onSelectCollection(target);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{onOpenStatusUpdate ? 'Complete Collection' : 'View Receipt'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal: Client Email Notification Preview */}
        {showEmailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-[#e5e5e5] w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
              <div className="bg-[#2f3131] text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-[#22d3ee]" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Client Automated Email Dispatch Details</h3>
                    <p className="text-[11px] text-[#c8c6c5]">Real-time email dispatched directly to client upon action</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="text-[#c8c6c5] hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#595959] uppercase font-bold">To:</span>
                    <strong className="text-[#1a1c1c]">{clientEmail}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#595959] uppercase font-bold">From:</span>
                    <span className="text-[#1a1c1c]">"ENAKO Cash Desk" &lt;cash@enakoos.com&gt;</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#595959] uppercase font-bold">Subject:</span>
                    <strong className="text-[#0891b2]">
                      {isCompleted 
                        ? `E-NAKO CONFIRMATION: Cash Collection Completed #${selectedJobDetails.id}` 
                        : `E-NAKO RECEIPT: Cash Collection Initiated #${selectedJobDetails.id}`}
                    </strong>
                  </div>
                </div>

                <div className="border border-[#e5e5e5] p-5 bg-white space-y-4 text-xs text-[#1a1c1c]">
                  <p className="font-semibold text-sm">Dear {selectedJobDetails.clientName},</p>
                  
                  <p className="leading-relaxed">
                    {isCompleted
                      ? `We are pleased to confirm that your cash collection of ${formatXAF(selectedJobDetails.amount)} FCFA has been verified, settled, and formally vaulted into the E-NAKO Central Liquidity Hub.`
                      : `A field cash collection has been initiated and collected by your assigned agent ${selectedJobDetails.assignedCollectorName || user?.name || 'Field Collector'}. Please find your receipt summary below.`}
                  </p>

                  <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded space-y-2">
                    <div className="font-bold text-xs text-[#0891b2] uppercase tracking-wider pb-1 border-b border-[#e2e8f0]">
                      Transaction Summary Breakdown
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-[#64748b]">Transaction Ref:</span> <strong className="font-mono text-[#0f172a] block">{selectedJobDetails.id}</strong></div>
                      <div><span className="text-[#64748b]">Amount Collected:</span> <strong className="font-mono text-[#0891b2] font-bold block">{formatXAF(selectedJobDetails.amount)} FCFA</strong></div>
                      <div><span className="text-[#64748b]">Collector Agent:</span> <span className="block text-[#0f172a]">{selectedJobDetails.assignedCollectorName || user?.name || 'Field Agent'}</span></div>
                      <div><span className="text-[#64748b]">Deposit Channel:</span> <span className="block text-[#0f172a]">{selectedJobDetails.depositDestination || 'Cash Collection'}</span></div>
                      <div><span className="text-[#64748b]">Location:</span> <span className="block text-[#0f172a]">{selectedJobDetails.location || 'Douala, Cameroon'}</span></div>
                      <div><span className="text-[#64748b]">Date & Time:</span> <span className="block text-[#0f172a]">{new Date(selectedJobDetails.timestamp || Date.now()).toLocaleDateString('en-GB')} at {selectedJobDetails.time || '11:27 AM'}</span></div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#ecfeff] border border-[#a5f3fc] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#0891b2]" />
                      <div>
                        <span className="text-xs font-bold text-[#0e7490] block">Attached PDF Receipt</span>
                        <span className="text-[10px] text-[#595959] font-mono">E_NAKO_Receipt_{selectedJobDetails.id}.pdf (A4 Official Receipt Slip)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#86efac] text-[9px] font-bold uppercase">ATTACHED</span>
                  </div>

                  <p className="text-[11px] text-[#595959]">
                    If you have questions regarding this transaction, contact your branch supervisor or email us at support@enako.com.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#f9f9f9] border-t border-[#e5e5e5] flex justify-end">
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="px-5 py-2 bg-[#2f3131] hover:bg-[#1a1c1c] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Transaction Info Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Amount Banner */}
            {(() => {
              const tgt = selectedJobDetails.targetAmount || selectedJobDetails.amount || 0;
              const act = selectedJobDetails.actualAmountCollected !== undefined 
                ? selectedJobDetails.actualAmountCollected 
                : (selectedJobDetails.status === 'COMPLETE' ? selectedJobDetails.amount : 0);
              const shortage = selectedJobDetails.shortageAmount !== undefined && selectedJobDetails.shortageAmount > 0
                ? selectedJobDetails.shortageAmount
                : Math.max(0, tgt - act);

              return (
                <div className="bg-white border border-[#e5e5e5] border-l-4 border-l-[#0891b2] p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a] block">TARGET EXPECTED</span>
                        <div className="text-xl font-bold text-[#1a1c1c] font-mono">
                          {formatXAF(tgt)} <span className="text-xs font-sans text-[#595959]">FCFA</span>
                        </div>
                      </div>

                      <div className="h-8 w-px bg-[#e5e5e5] hidden sm:block" />

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2] block">ACTUALLY RECEIVED</span>
                        <div className="text-2xl font-black text-[#0891b2] font-mono">
                          {formatXAF(act)} <span className="text-xs font-sans text-[#595959]">FCFA</span>
                        </div>
                      </div>

                      {shortage > 0 && (
                        <>
                          <div className="h-8 w-px bg-[#e5e5e5] hidden sm:block" />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba1a1a] block">BALANCE LACKING</span>
                            <div className="text-2xl font-black text-[#ba1a1a] font-mono">
                              {formatXAF(shortage)} <span className="text-xs font-sans text-[#ba1a1a]">FCFA</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-[#595959]">
                      Transaction Reference: <strong className="font-mono text-[#1a1c1c]">{selectedJobDetails.id}</strong>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end gap-2.5 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedJobDetails;
                        if (onOpenStatusUpdate) onOpenStatusUpdate(target);
                        else onSelectCollection(target);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>{onOpenStatusUpdate ? 'Update Received Cash' : 'View Receipt'}</span>
                    </button>

                    <div className="px-4 py-2 bg-[#ecfeff] border border-[#a5f3fc] text-right w-full sm:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e7490] block">RECORDED TIME</span>
                      <span className="text-xs font-mono font-bold text-[#1a1c1c] block mt-0.5">
                        {new Date(selectedJobDetails.timestamp || Date.now()).toLocaleDateString('en-GB')} at {selectedJobDetails.time || '11:27 AM'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Specifications Bento Card */}
            <div className="bg-white border border-[#e5e5e5] shadow-xs overflow-hidden">
              <div className="bg-[#2f3131] text-white px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#a5f3fc]" />
                  <span>Transaction Specifications & Clean Ledger</span>
                </h3>
                <span className="text-[10px] font-mono text-[#a5f3fc]">E-NAKO SECURE RECORD</span>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#595959] block">CLIENT NAME</span>
                  <p className="text-base font-bold text-[#1a1c1c]">{selectedJobDetails.clientName}</p>
                  <p className="text-[11px] text-[#595959]">Primary Entity</p>
                </div>

                <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#595959] block">CASH COLLECTOR</span>
                  <p className="text-base font-bold text-[#1a1c1c]">{selectedJobDetails.assignedCollectorName || user?.name || 'Test Collector'}</p>
                  <p className="text-[11px] text-[#595959]">Field Agent Officer</p>
                </div>

                <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#595959] block">LOCATION</span>
                  <p className="text-sm font-semibold text-[#1a1c1c] flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0891b2]" />
                    <span>{selectedJobDetails.location || 'Douala, Cameroon'}</span>
                  </p>
                </div>

                <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#595959] block">DEPOSIT DESTINATION</span>
                  <p className="text-sm font-semibold text-[#1a1c1c] flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-[#0891b2]" />
                    <span>{selectedJobDetails.depositDestination || 'Cash Collection'}</span>
                  </p>
                </div>
              </div>

              {selectedJobDetails.notes && (
                <div className="p-5 border-t border-[#e5e5e5] bg-[#f9f9f9]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#595959] block mb-1">FIELD NOTES & REMARKS</span>
                  <p className="text-xs text-[#1a1c1c] italic bg-white p-3 border border-[#e5e5e5]">
                    "{selectedJobDetails.notes}"
                  </p>
                </div>
              )}

              {selectedJobDetails.fxTransactionId && (
                <div className="p-4 border-t border-[#e5e5e5] bg-[#f0fdf4] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
                    <span className="text-xs font-bold text-[#166534]">LINKED FX TRANSACTION RECORD</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#15803d]">{selectedJobDetails.fxTransactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Transaction Image & Proof Voucher Frame */}
          <div className="space-y-6">
            <div className="bg-white border border-[#e5e5e5] shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1c1c] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#0891b2]" />
                  <span>Transaction Picture & Proof</span>
                </h3>
                <span className="px-2 py-0.5 bg-[#ecfeff] text-[#0891b2] text-[9px] font-bold uppercase">VERIFIED SLIP</span>
              </div>

              {/* Hidden file input for uploading or replacing photo proof */}
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Render Image or Payment Slip Proof Graphic */}
              <div className="relative border border-[#e5e5e5] bg-[#f8fafc] overflow-hidden flex flex-col items-center justify-center p-4 min-h-[280px]">
                {selectedJobDetails.receiptUrl ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <img
                      src={selectedJobDetails.receiptUrl}
                      alt="Transaction Proof"
                      className="w-full h-auto max-h-[360px] object-contain rounded border border-[#e5e5e5] shadow-xs bg-white"
                    />
                    <div className="flex items-center justify-between w-full pt-2 border-t border-[#e5e5e5] text-xs">
                      <span className="text-[#166534] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cash Proof Photo Attached</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[#0891b2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change / Re-upload</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-4">
                    <div className="w-full bg-white border border-[#0891b2] p-5 shadow-xs flex flex-col justify-between font-sans space-y-4 relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                        <ShieldCheck className="w-40 h-40 text-[#0891b2]" />
                      </div>

                      <div className="flex justify-between items-start border-b border-[#e5e5e5] pb-3">
                        <div>
                          <div className="font-black text-sm text-[#0891b2]">E-NAKO CASH</div>
                          <div className="text-[9px] text-[#595959] uppercase font-bold">DEPOSIT RECEIPT PROOF</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#86efac] text-[8px] font-black uppercase">OFFICIALLY VERIFIED</span>
                          <div className="text-[9px] font-mono text-[#595959] mt-1">{selectedJobDetails.id}</div>
                        </div>
                      </div>

                      <div className="my-2 text-center py-3 bg-[#ecfeff] border border-[#a5f3fc]">
                        <span className="text-[9px] text-[#0e7490] font-bold uppercase tracking-wider block">COLLECTED AMOUNT</span>
                        <span className="text-2xl font-black text-[#1a1c1c] font-mono block mt-0.5">
                          {formatXAF(selectedJobDetails.amount)} FCFA
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-[#1a1c1c]">
                        <div className="flex justify-between">
                          <span className="text-[#595959]">Client:</span>
                          <strong className="font-bold">{selectedJobDetails.clientName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#595959]">Collector:</span>
                          <span className="font-semibold">{selectedJobDetails.assignedCollectorName || user?.name || 'Field Agent'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#595959]">Date & Time:</span>
                          <span>{selectedJobDetails.time || '11:27 AM'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#595959]">Location:</span>
                          <span>{selectedJobDetails.location || 'Douala, Cameroon'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-[#cbd5e1] text-center font-mono text-[9px] text-[#595959]">
                        ||| | ||||| |||| |||||| |||| | ||||||||
                        <div className="text-[8px] text-[#0891b2] font-semibold mt-0.5">SHA-256 DIGITAL SECURITY TOKEN</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Upload / Attach Proof Photo</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => downloadReceiptPDF(selectedJobDetails, user || INITIAL_USER)}
                className="w-full py-2.5 bg-[#2f3131] hover:bg-[#1a1c1c] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIELD CASH COLLECTOR DASHBOARD
  if (!isCeoOrManager) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
        {/* Header & Quick Action */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
              <span>Daily Field Operations</span>
              <span>/</span>
              <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Welcome, {firstName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Terminal ID: <strong className="text-slate-800 font-mono">{user?.terminalId || 'TRM-ACTIVE'}</strong> · Branch: <span className="font-semibold text-slate-700">{user?.branch || 'Douala Main Hub'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Download Daily PDF Report Button */}
            <button
              onClick={() => downloadDailyReportPDF(dailyCollectorCollections, user || INITIAL_USER, new Date())}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Download PDF report for today's daily transactions"
            >
              <Download className="w-4 h-4 text-[#0891b2]" />
              <span>Download Daily PDF</span>
            </button>

            <button
              onClick={() => onNavigate('new-collection')}
              className="flex-1 md:flex-none px-5 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Collection</span>
            </button>
          </div>
        </div>

        {/* Timeframe Switcher & History Notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setTimeframeMode('today')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                timeframeMode === 'today'
                  ? 'bg-white text-[#0891b2] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today's Queue ({dailyCollectorCollections.length})
            </button>
            <button
              type="button"
              onClick={() => setTimeframeMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                timeframeMode === 'all'
                  ? 'bg-white text-[#0891b2] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Active ({collectorCollections.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              {timeframeMode === 'today'
                ? `Filtering exclusively to today (${dailyCollectorCollections.length} entries)`
                : `Showing all ${collectorCollections.length} active collection records`}
            </span>
            <button
              onClick={() => onNavigate('history')}
              className="font-bold text-[#0891b2] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-1"
            >
              <span>Full History Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {timeframeMode === 'today' && dailyCollectorCollections.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No collections logged yet for today. Switch to <strong>All Active ({collectorCollections.length})</strong> to inspect earlier active collections.</span>
            </div>
            <button
              onClick={() => setTimeframeMode('all')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs shrink-0"
            >
              View All Active Records
            </button>
          </div>
        )}

        {/* Operation Metrics Cards (Outstanding Balance, Volume, Tasks) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Today's Outstanding Balance Card */}
          <div 
            onClick={() => setCollectorTab('lacking')}
            className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-rose-400 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-rose-600 block">
                  Today's Outstanding Balance
                </span>
                <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight tabular-nums">
                    {formatXAF(totalCollectorOutstanding)}
                  </span>
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wide">FCFA</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-rose-100/70">
              <span className="text-slate-500 font-medium">
                {totalLackingAmount > 0 ? `${formatXAF(totalLackingAmount)} FCFA deficit` : '0 FCFA deficit'} · {availableJobs.length} pending
              </span>
              <span className="font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>View Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Today's Collected Volume */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-cyan-400 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0891b2] to-cyan-500" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#0891b2] block">
                  Today's Received Volume
                </span>
                <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                    {formatXAF(totalActualCollected)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">FCFA</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#0891b2] group-hover:scale-110 transition-transform shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">{settledJobs.length} completed settlements today</span>
              <span className="text-xs font-bold text-[#0891b2]">100% Synced</span>
            </div>
          </div>

          {/* Card 3: Today's Pending Tasks */}
          <div 
            onClick={() => setCollectorTab('available')}
            className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-amber-400 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 block">
                  Today's Pending Jobs
                </span>
                <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                    {availableJobs.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">TASKS</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-amber-100/70">
              <span className="text-amber-700 font-medium">Awaiting collection today</span>
              <span className="font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>View Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation for Available vs Settled vs Lacking Jobs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setCollectorTab('available')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                collectorTab === 'available'
                  ? 'bg-[#0891b2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Available Jobs ({availableJobs.length})</span>
            </button>

            <button
              onClick={() => setCollectorTab('settled')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                collectorTab === 'settled'
                  ? 'bg-[#16a34a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settled Jobs ({settledJobs.length})</span>
            </button>

            <button
              onClick={() => setCollectorTab('lacking')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                collectorTab === 'lacking'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-inherit" />
              <span>Lacking Balance ({lackingJobs.length})</span>
            </button>
          </div>

          <div className="hidden sm:block text-xs font-medium text-slate-500 pr-3">
            Click any collection card to inspect or update received volume
          </div>
        </div>

        {/* Available Jobs Card Grid */}
        {collectorTab === 'available' && (
          <div className="space-y-4">
            {availableJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-bold shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <p className="text-lg text-slate-900">No pending jobs assigned at the moment.</p>
                <p className="text-xs text-slate-500 font-normal mt-1">All field collections assigned to you are complete.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableJobs.map((col) => {
                  const target = col.targetAmount || col.amount;
                  const actual = col.actualAmountCollected !== undefined ? col.actualAmountCollected : 0;
                  const shortage = col.shortageAmount || (actual > 0 ? Math.max(0, target - actual) : 0);

                  return (
                    <div
                      key={col.id}
                      onClick={() => setSelectedJobDetails(col)}
                      className="bg-white border border-slate-200 rounded-2xl hover:border-[#0891b2] p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group space-y-4"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 group-hover:text-[#0891b2] transition-colors">
                              {col.id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{col.time || 'Pending'}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        </div>

                        {/* Main Job Details */}
                        <div className="mt-3 space-y-2.5">
                          <h4 className="font-bold text-base text-slate-900 group-hover:text-[#0891b2] transition-colors truncate">
                            {col.clientName}
                          </h4>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">TARGET DUE</span>
                            <div className="text-xl font-black text-slate-900 font-mono">
                              {formatXAF(target)} <span className="text-xs text-slate-500 font-sans font-bold">FCFA</span>
                            </div>
                          </div>

                          {shortage > 0 && (
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center justify-between">
                              <span>Balance Lacking:</span>
                              <span className="font-mono font-black">{formatXAF(shortage)} FCFA</span>
                            </div>
                          )}

                          <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#0891b2] shrink-0" />
                              <span className="truncate">{col.location || 'Douala Commercial Sector'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-[#0891b2] shrink-0" />
                              <span className="truncate">Destination: {col.depositDestination || 'Cash Collection'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0891b2] flex items-center gap-1 group-hover:underline">
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenStatusUpdate) onOpenStatusUpdate(col);
                            else onSelectCollection(col);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{onOpenStatusUpdate ? 'Complete Job' : 'View Receipt'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settled Jobs Card Grid */}
        {collectorTab === 'settled' && (
          <div className="space-y-4">
            {settledJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-bold shadow-xs">
                <p className="text-base text-slate-900">No settled jobs recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {settledJobs.map((col) => {
                  const target = col.targetAmount || col.amount;
                  const actual = col.actualAmountCollected !== undefined ? col.actualAmountCollected : col.amount;
                  const shortage = col.shortageAmount || Math.max(0, target - actual);

                  return (
                    <div
                      key={col.id}
                      onClick={() => setSelectedJobDetails(col)}
                      className="bg-white border border-slate-200 rounded-2xl hover:border-[#16a34a] p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group space-y-4"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {col.id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{new Date(col.timestamp || Date.now()).toLocaleDateString()} {col.time}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>SETTLED</span>
                          </span>
                        </div>

                        {/* Main Details */}
                        <div className="mt-3 space-y-2.5">
                          <h4 className="font-bold text-base text-slate-900 group-hover:text-[#16a34a] transition-colors truncate">
                            {col.clientName}
                          </h4>

                          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-baseline justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">COLLECTED</span>
                            <div className="text-xl font-black text-emerald-700 font-mono">
                              {formatXAF(actual)} <span className="text-xs text-emerald-600 font-sans font-bold">FCFA</span>
                            </div>
                          </div>

                          {shortage > 0 && (
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center justify-between">
                              <span>Shortfall Balance:</span>
                              <span className="font-mono font-black">{formatXAF(shortage)} FCFA</span>
                            </div>
                          )}

                          <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                              <span className="truncate">{col.location || 'Douala Commercial Sector'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                              <span className="truncate">Destination: {col.depositDestination || 'Cash Collection'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16a34a] flex items-center gap-1 group-hover:underline">
                          <Eye className="w-4 h-4" />
                          <span>View Full Record & Slip</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#16a34a]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lacking Balance Jobs Card Grid (The dedicated shortfall tab) */}
        {collectorTab === 'lacking' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <strong className="text-sm block font-bold">Transactions with Outstanding Shortfall / Lacking Balance</strong>
                <span className="text-rose-700">These collections were partially paid by the client. You can update how much was received when the remainder is handed over.</span>
              </div>
              <div className="font-mono text-base font-black px-4 py-2 bg-white rounded-xl border border-rose-200 text-rose-700 shrink-0 shadow-2xs">
                Total Shortfall: {formatXAF(totalLackingAmount)} FCFA
              </div>
            </div>

            {lackingJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-bold shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <p className="text-lg text-slate-900">No lacking balance or shortfall transactions!</p>
                <p className="text-xs text-slate-500 font-normal mt-1">All collections match 100% of their target amounts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {lackingJobs.map((col) => {
                  const target = col.targetAmount || col.amount;
                  const actual = col.actualAmountCollected !== undefined 
                    ? col.actualAmountCollected 
                    : (col.status === 'COMPLETE' ? col.amount : 0);
                  const shortage = col.shortageAmount || Math.max(0, target - actual);

                  return (
                    <div
                      key={col.id}
                      onClick={() => setSelectedJobDetails(col)}
                      className="bg-white border-2 border-rose-200 rounded-2xl hover:border-rose-500 p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group space-y-4"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/60">
                              {col.id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{col.time}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>DEFICIT</span>
                          </span>
                        </div>

                        {/* Client & Financial Metrics Breakdown */}
                        <div className="mt-3 space-y-3">
                          <h4 className="font-bold text-base text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                            {col.clientName}
                          </h4>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">TARGET</span>
                              <span className="text-xs font-mono font-bold text-slate-900">{formatXAF(target)}</span>
                            </div>
                            <div className="border-x border-slate-200">
                              <span className="text-[10px] text-[#0891b2] uppercase font-bold block">RECEIVED</span>
                              <span className="text-xs font-mono font-bold text-[#0891b2]">{formatXAF(actual)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-rose-600 uppercase font-bold block">LACKING</span>
                              <span className="text-xs font-mono font-black text-rose-600">{formatXAF(shortage)}</span>
                            </div>
                          </div>

                          {col.summaryNote && (
                            <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              Note: "{col.summaryNote}"
                            </p>
                          )}

                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate">{col.location || 'Douala Commercial Sector'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate">Destination: {col.depositDestination || 'Cash Collection'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0891b2] flex items-center gap-1 group-hover:underline">
                          <Eye className="w-4 h-4" />
                          <span>View Detail</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenStatusUpdate) onOpenStatusUpdate(col);
                            else onSelectCollection(col);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{onOpenStatusUpdate ? 'Update Amount' : 'View Receipt'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // CEO / SENIOR MANAGER EXECUTIVE DASHBOARD VIEW
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Header & Quick Action */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-col gap-1 text-[10px] font-bold text-[#0891b2] uppercase sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span>Executive Overview</span>
            <span className="hidden sm:inline">/</span>
            <span>Daily Operations ({new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })})</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Welcome, {firstName} ({isSenior ? 'Senior Cash Officer' : 'CEO'})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily cash collection & liquidity operations console.
          </p>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto">
          {/* Download Daily PDF Report Button for CEO */}
          <button
            onClick={() => downloadDailyReportPDF(dailyCompanyCollections, user || INITIAL_USER, new Date())}
            className="min-h-11 w-full xl:w-auto py-3 px-5 bg-white shrink-0 border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            title="Download PDF report for today's daily transactions"
          >
            <Download className="w-4 h-4 shrink-0 text-[#0891b2]" />
            <span>Download Daily PDF</span>
          </button>

          <button
            onClick={() => onNavigate('new-collection')}
            className="min-h-11 w-full xl:w-auto py-3 px-6 bg-[#0891b2] hover:bg-[#0e7490] text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
            <span>Assign / Start Collection</span>
          </button>
        </div>
      </div>

      {/* Timeframe Switcher & History Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTimeframeMode('today')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              timeframeMode === 'today'
                ? 'bg-white text-[#0891b2] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Queue ({dailyCompanyCollections.length})
          </button>
          <button
            type="button"
            onClick={() => setTimeframeMode('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              timeframeMode === 'all'
                ? 'bg-white text-[#0891b2] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All System Records ({collections.length})
          </button>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2 text-xs xl:flex-row xl:items-center">
          <span className="text-slate-500">
            {timeframeMode === 'today'
              ? `Filtering strictly to today's activity (${dailyCompanyCollections.length} records)`
              : `Viewing company-wide volume (${collections.length} total records)`}
          </span>
          <button
            onClick={() => onNavigate('history')}
            className="font-bold text-[#0891b2] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-1"
          >
            <span>Full Multi-Month History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {timeframeMode === 'today' && dailyCompanyCollections.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No collections logged yet for today. Displaying 0 entries for today. Switch to <strong>All System Records ({collections.length})</strong> to view all active operational data.</span>
          </div>
          <button
            onClick={() => setTimeframeMode('all')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs shrink-0"
          >
            Show All Active Data
          </button>
        </div>
      )}

      {/* CEO Executive Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today's Outstanding Balance / Company Shortfall */}
        <div className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-rose-400 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-600 block">
                Total Outstanding Balance (Today)
              </span>
              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight tabular-nums">
                  {formatXAF(totalCompanyOutstanding)}
                </span>
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wide">FCFA</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[11px] text-rose-600 font-semibold pt-3 mt-3 border-t border-rose-100/70">
            {totalCompanyLackingAmount > 0 ? `${formatXAF(totalCompanyLackingAmount)} FCFA deficit` : '0 FCFA deficit'} · {pendingCount} pending tasks
          </div>
        </div>

        {/* Card 2: Total Settled Today */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-cyan-400 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0891b2] to-cyan-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#0891b2] block">
                Total Settled (Today)
              </span>
              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {formatXAF(totalCompletedAmount)}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">FCFA</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#0891b2] group-hover:scale-110 transition-transform shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[11px] text-[#0891b2] font-semibold pt-3 mt-3 border-t border-slate-100">
            Across today's completed field settlements
          </div>
        </div>

        {/* Card 3: Pending Field Assignments Today */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-amber-400 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 block">
                Today's Pending Jobs
              </span>
              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {pendingCount}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">TASKS</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[11px] text-amber-700 font-semibold pt-3 mt-3 border-t border-amber-100/70">
            Awaiting today's field collection
          </div>
        </div>

        {/* Card 4: Total Daily Collections Logged */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-emerald-400 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#16a34a] to-emerald-400" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 block">
                Today's Queue Size
              </span>
              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {dailyCompanyCollections.length}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">RECORDS</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[11px] text-emerald-700 font-semibold pt-3 mt-3 border-t border-emerald-100/70">
            Live audit log synced for today
          </div>
        </div>
      </div>

      {/* CEO Company-wide Collections List (Strictly Today's Queue) */}
      <div className="min-w-0 bg-white border border-slate-200 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 px-4 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              Today's collections
            </h3>
            <p className="mt-1 text-xs text-slate-500">{dailyCompanyCollections.length} {dailyCompanyCollections.length === 1 ? 'record' : 'records'} today</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#0891b2] hover:underline cursor-pointer"
          >
            <span>View history</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="min-w-0 overflow-x-auto" role="region" aria-label="Today's collections" tabIndex={0}>
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">ID / Time</th>
                <th className="p-3.5">Client Name</th>
                <th className="p-3.5">Amount (FCFA)</th>
                <th className="p-3.5">Collector</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-900">
              {dailyCompanyCollections.map((col) => (
                <tr
                  key={col.id}
                  onClick={() => setSelectedJobDetails(col)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="p-3.5">
                    <p className="font-mono font-bold text-[#0891b2]">{col.id}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{col.time}</p>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{col.clientName}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{formatXAF(col.amount)} FCFA</td>
                  <td className="p-3.5 font-semibold text-slate-600">{col.assignedCollectorName || 'Field Agent'}</td>
                  <td className="p-3.5 text-slate-600">{col.depositDestination || 'Cash Collection'}</td>
                  <td className="p-3.5 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      col.status === 'COMPLETE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : col.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {col.status}
                    </span>
                  </td>
                </tr>
              ))}

              {dailyCompanyCollections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-bold text-slate-800">No collections recorded for today yet.</p>
                      <p className="text-slate-500">Use "Assign / Start Collection" to record today's tasks, or click below to browse the historical ledger.</p>
                      <button
                        onClick={() => onNavigate('history')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0891b2] hover:underline pt-2 cursor-pointer"
                      >
                        <span>Open Full Transaction History</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
;
