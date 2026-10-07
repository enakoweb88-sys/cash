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
import { downloadReceiptPDF } from '../utils/exportUtils';

interface DashboardViewProps {
  collections: Collection[];
  user?: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onSelectCollection: (col: Collection) => void;
  onOpenStatusUpdate?: (col: Collection) => void;
  onOpenReport?: () => void;
  onUpdateCollectionPhoto?: (id: string, photoUrl: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  collections,
  user,
  onNavigate,
  onSelectCollection,
  onOpenStatusUpdate,
  onOpenReport,
  onUpdateCollectionPhoto,
}) => {
  const isCeoOrManager = user?.role === 'CEO / Senior Manager' || user?.email === 'ceo@enako.com' || user?.role === 'CEO' || user?.role === 'Senior Manager' || user?.role === 'Branch Operations Lead';
  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Collector';

  // State for Field Collector tab view ('available' vs 'settled')
  const [collectorTab, setCollectorTab] = useState<'available' | 'settled'>('available');

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
  const collectorCollections = collections.filter((c) => {
    if (isCeoOrManager) return true;
    if (!user) return true;
    return (
      c.assignedCollectorId === user.terminalId ||
      c.assignedCollectorId === user.id ||
      (c.assignedCollectorName && c.assignedCollectorName.toLowerCase().includes(firstName.toLowerCase()))
    );
  });

  const availableJobs = collectorCollections.filter((c) => c.status === 'PENDING');
  const settledJobs = collectorCollections.filter((c) => c.status === 'COMPLETE');

  // CEO / Executive Totals
  const totalCompletedAmount = collections
    .filter((c) => c.status === 'COMPLETE')
    .reduce((sum, c) => sum + c.amount, 0);

  const pendingCount = collections.filter((c) => c.status === 'PENDING').length;

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
                <span>Complete Collection</span>
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
            <div className="bg-white border border-[#e5e5e5] border-l-4 border-l-[#0891b2] p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2]">TOTAL COLLECTED AMOUNT</span>
                <div className="text-3xl font-black text-[#1a1c1c] font-mono mt-1">
                  {formatXAF(selectedJobDetails.amount)} <span className="text-sm font-sans font-bold text-[#595959]">FCFA</span>
                </div>
                <p className="text-xs text-[#595959] mt-1">
                  Transaction Reference: <strong className="font-mono text-[#1a1c1c]">{selectedJobDetails.id}</strong>
                </p>
              </div>

              <div className="px-4 py-3 bg-[#ecfeff] border border-[#a5f3fc] text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e7490] block">DATE & TIME RECORDED</span>
                <span className="text-xs font-mono font-bold text-[#1a1c1c] block mt-0.5">
                  {new Date(selectedJobDetails.timestamp || Date.now()).toLocaleDateString('en-GB')} at {selectedJobDetails.time || '11:27 AM'}
                </span>
              </div>
            </div>

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
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
              <span>Field Operations</span>
              <span>/</span>
              <span>Collector Terminal</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1a1c1c] mt-1">
              Welcome, {firstName}
            </h2>
            <p className="text-xs text-[#595959] mt-0.5">
              Terminal ID: <strong className="text-[#1a1c1c]">{user?.terminalId || 'TRM-ACTIVE'}</strong> · Branch: {user?.branch || 'Douala Main Hub'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-[#0891b2]" />
                <span>Generate Report</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('new-collection')}
              className="flex-1 md:flex-none px-5 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Collection</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation for Available vs Settled Jobs */}
        <div className="bg-white border border-[#e5e5e5] p-2 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollectorTab('available')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                collectorTab === 'available'
                  ? 'bg-[#0891b2] text-white shadow-xs'
                  : 'text-[#595959] hover:text-[#1a1c1c] hover:bg-[#f2f2f2]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Available Jobs ({availableJobs.length})</span>
            </button>

            <button
              onClick={() => setCollectorTab('settled')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                collectorTab === 'settled'
                  ? 'bg-[#16a34a] text-white shadow-xs'
                  : 'text-[#595959] hover:text-[#1a1c1c] hover:bg-[#f2f2f2]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settled Jobs ({settledJobs.length})</span>
            </button>
          </div>

          <div className="hidden sm:block text-xs font-medium text-[#595959] pr-3">
            Click any job card to inspect full details
          </div>
        </div>

        {/* Available Jobs Card Grid */}
        {collectorTab === 'available' && (
          <div className="space-y-4">
            {availableJobs.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] p-12 text-center text-[#595959] font-bold shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-[#16a34a] mx-auto mb-3" />
                <p className="text-base text-[#1a1c1c]">No pending jobs assigned at the moment.</p>
                <p className="text-xs text-[#595959] font-normal mt-1">All field collections assigned to you are complete.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableJobs.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => setSelectedJobDetails(col)}
                    className="bg-white border border-[#e5e5e5] hover:border-[#0891b2] p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#0891b2] group-hover:underline">{col.id}</span>
                          <span className="text-[10px] text-[#595959] font-mono">{col.time || 'Pending'}</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-[#fef9c3] text-[#854d0e] border border-[#fef08a] text-[9px] font-black uppercase tracking-wider">
                          PENDING ASSIGNMENT
                        </span>
                      </div>

                      {/* Main Job Details */}
                      <div className="mt-3 space-y-2">
                        <h4 className="font-bold text-base text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors">
                          {col.clientName}
                        </h4>

                        <div className="text-2xl font-black text-[#1a1c1c] font-mono">
                          {formatXAF(col.amount)} <span className="text-xs text-[#595959] font-sans font-bold">FCFA</span>
                        </div>

                        <div className="space-y-1 pt-2 text-xs text-[#595959]">
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
                    <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0891b2] flex items-center gap-1 group-hover:underline">
                        <Eye className="w-4 h-4" />
                        <span>View Details & Photo</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenStatusUpdate) onOpenStatusUpdate(col);
                          else onSelectCollection(col);
                        }}
                        className="px-3.5 py-1.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Complete Job</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settled Jobs Card Grid */}
        {collectorTab === 'settled' && (
          <div className="space-y-4">
            {settledJobs.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] p-12 text-center text-[#595959] font-bold shadow-xs">
                <p className="text-base text-[#1a1c1c]">No settled jobs recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settledJobs.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => setSelectedJobDetails(col)}
                    className="bg-white border border-[#e5e5e5] hover:border-[#16a34a] p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#16a34a] group-hover:underline">{col.id}</span>
                          <span className="text-[10px] text-[#595959] font-mono">{new Date(col.timestamp || Date.now()).toLocaleDateString()} {col.time}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#86efac] text-[9px] font-black uppercase tracking-wider">
                          SETTLED
                        </span>
                      </div>

                      {/* Main Details */}
                      <div className="mt-3 space-y-2">
                        <h4 className="font-bold text-base text-[#1a1c1c] group-hover:text-[#16a34a] transition-colors">
                          {col.clientName}
                        </h4>

                        <div className="text-2xl font-black text-[#1a1c1c] font-mono">
                          {formatXAF(col.amount)} <span className="text-xs text-[#595959] font-sans font-bold">FCFA</span>
                        </div>

                        <div className="space-y-1 pt-2 text-xs text-[#595959]">
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

                    <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#16a34a] flex items-center gap-1 group-hover:underline">
                        <Eye className="w-4 h-4" />
                        <span>View Full Record & Photo</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#16a34a]" />
                    </div>
                  </div>
                ))}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e5e5e5] pb-4 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
            <span>Executive Overview</span>
            <span>/</span>
            <span>Management Console</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1a1c1c] mt-1">
            Welcome, {firstName} (CEO)
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            Real-time multi-branch cash collection & liquidity operations status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="flex-1 md:flex-none h-11 px-5 bg-white border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#0891b2]" />
              <span>General Executive Report</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('new-collection')}
            className="flex-1 md:flex-none h-11 px-6 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Assign / Start Collection</span>
          </button>
        </div>
      </div>

      {/* CEO Executive Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5e5e5] border-l-4 border-l-[#0891b2] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-[#595959]">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Total Settled Volume
            </span>
            <Wallet className="w-5 h-5 text-[#0891b2]" />
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-[#1a1c1c] font-mono">
              {formatXAF(totalCompletedAmount)}
            </span>
            <span className="text-sm font-bold text-[#595959] ml-2">FCFA</span>
          </div>

          <div className="text-[11px] text-[#0891b2] font-semibold">
            Across all operational field terminals
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] border-l-4 border-l-[#ca8a04] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-[#595959]">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Pending Field Assignments
            </span>
            <Clock className="w-5 h-5 text-[#ca8a04]" />
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-[#1a1c1c] font-mono">
              {pendingCount}
            </span>
            <span className="text-xs font-bold text-[#595959] ml-2">TASKS</span>
          </div>

          <div className="text-[11px] text-[#ca8a04] font-semibold">
            Awaiting collector field completion
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] border-l-4 border-l-[#16a34a] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-[#595959]">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Total Collections Logged
            </span>
            <CheckCircle2 className="w-5 h-5 text-[#16a34a]" />
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-[#1a1c1c] font-mono">
              {collections.length}
            </span>
            <span className="text-xs font-bold text-[#595959] ml-2">RECORDS</span>
          </div>

          <div className="text-[11px] text-[#16a34a] font-semibold">
            Live audit log synced
          </div>
        </div>
      </div>

      {/* CEO Company-wide Collections List */}
      <div className="bg-white border border-[#e5e5e5] shadow-xs flex flex-col">
        <div className="p-4 bg-[#f9f9f9] border-b border-[#e5e5e5] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#1a1c1c] uppercase tracking-wider">All Company Collections & Live Audit Log</h3>
          <button
            onClick={() => onNavigate('history')}
            className="text-[#0891b2] text-xs font-bold tracking-wider uppercase hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Audit History</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2f3131] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">ID / Time</th>
                <th className="p-3.5">Client Name</th>
                <th className="p-3.5">Amount (FCFA)</th>
                <th className="p-3.5">Collector</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] text-xs font-medium text-[#1a1c1c]">
              {collections.slice(0, 10).map((col) => (
                <tr
                  key={col.id}
                  onClick={() => setSelectedJobDetails(col)}
                  className="hover:bg-[#f9f9f9] transition-colors cursor-pointer"
                >
                  <td className="p-3.5">
                    <p className="font-mono font-bold text-[#0891b2]">{col.id}</p>
                    <p className="text-[10px] text-[#595959]">{col.time}</p>
                  </td>
                  <td className="p-3.5 font-bold text-[#1a1c1c]">{col.clientName}</td>
                  <td className="p-3.5 font-mono font-bold text-[#1a1c1c]">{formatXAF(col.amount)} FCFA</td>
                  <td className="p-3.5 font-semibold text-[#595959]">{col.assignedCollectorName || 'Field Agent'}</td>
                  <td className="p-3.5 text-[#595959]">{col.depositDestination || 'Cash Collection'}</td>
                  <td className="p-3.5 text-right">
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
              ))}

              {collections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-[#595959]">
                    No collections recorded yet.
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
