import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText, 
  Eye, 
  Download,
  ArrowLeft
} from 'lucide-react';
import { KycSubmission, CollectorUser } from '../types';
import { fetchRemoteKycSubmissions, reviewRemoteKycSubmission, sendKycDecisionNotificationEmail } from '../api/cashApi';

interface KycViewProps {
  user: CollectorUser;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onAutoCreateClient?: (submission: KycSubmission) => void;
}

export const KycView: React.FC<KycViewProps> = ({ user, onShowToast, onAutoCreateClient }) => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Selected Applicant for Full Page Inspection & Review
  const [selectedApplicant, setSelectedApplicant] = useState<KycSubmission | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadKyc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRemoteKycSubmissions({
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 100,
      });
      if (Array.isArray(res)) {
        setSubmissions(res);
      } else if (res && Array.isArray((res as any).items)) {
        setSubmissions((res as any).items);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.warn('KYC load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  // Handle Review Submission
  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !reviewStatus) {
      onShowToast('Please select a decision status (APPROVED or REJECTED).', 'error');
      return;
    }

    if (reviewStatus === 'REJECTED' && !rejectionReason.trim()) {
      onShowToast('Please provide a reason for rejection.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const ok = await reviewRemoteKycSubmission(selectedApplicant.id, {
        status: reviewStatus,
        rejectionReason: reviewStatus === 'REJECTED' ? rejectionReason : undefined,
      });

      if (ok) {
        // Trigger automated KYC status update email to applicant
        sendKycDecisionNotificationEmail(
          selectedApplicant.applicantName,
          selectedApplicant.email,
          reviewStatus as any,
          reviewStatus === 'REJECTED' ? rejectionReason : undefined
        );

        if (reviewStatus === 'APPROVED' && onAutoCreateClient) {
          onAutoCreateClient({ ...selectedApplicant, status: 'APPROVED' });
        }
        onShowToast(`KYC decision recorded & notification email sent to ${selectedApplicant.applicantName}!`, 'success');
        setSelectedApplicant(null);
        setReviewStatus('');
        setRejectionReason('');
        loadKyc();
      } else {
        onShowToast('Failed to record KYC review decision.', 'error');
      }
    } catch (err) {
      onShowToast('Error submitting KYC decision.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Stats
  const totalCount = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;

  // Render full standalone inspection view if an applicant is selected (PAGE VIEW - NOT POPUP)
  if (selectedApplicant) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans">
        {/* Top Header with Back Button */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedApplicant(null)}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0891b2] hover:underline mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Verification Queue</span>
            </button>
            <h2 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
              KYC Inspection: {selectedApplicant.applicantName}
            </h2>
            <p className="text-xs text-[#595959] mt-0.5">
              Type: {selectedApplicant.applicantType} · Verification Status: {selectedApplicant.status}
            </p>
          </div>

          <div>
            <span className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border ${
              selectedApplicant.status === 'APPROVED'
                ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                : selectedApplicant.status === 'REJECTED'
                ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
            }`}>
              {selectedApplicant.status}
            </span>
          </div>
        </div>

        {/* Applicant General Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[#e5e5e5] shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-[#595959] uppercase tracking-wider">Applicant Name</p>
            <p className="text-sm font-bold text-[#1a1c1c] mt-0.5">{selectedApplicant.applicantName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#595959] uppercase tracking-wider">Email Address</p>
            <p className="text-sm font-bold text-[#1a1c1c] mt-0.5 truncate">{selectedApplicant.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#595959] uppercase tracking-wider">Phone Number</p>
            <p className="text-sm font-bold text-[#1a1c1c] mt-0.5">{selectedApplicant.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#595959] uppercase tracking-wider">Submission Date</p>
            <p className="text-sm font-bold text-[#1a1c1c] mt-0.5">{new Date(selectedApplicant.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Form Payload Info */}
        {selectedApplicant.payload && Object.keys(selectedApplicant.payload).length > 0 && (
          <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#0891b2] uppercase tracking-wider border-b border-[#e5e5e5] pb-2">
              Registration Form Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(selectedApplicant.payload).map(([k, v]) => (
                <div key={k} className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="font-bold text-xs text-[#1a1c1c] truncate">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Files Inspection */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-[#0891b2] uppercase tracking-wider border-b border-[#e5e5e5] pb-2">
            Attached Verification Documents
          </h4>

          {selectedApplicant.documents && selectedApplicant.documents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-[#e5e5e5] pb-2">
                {selectedApplicant.documents.map((doc, idx) => (
                  <button
                    key={doc.id || idx}
                    onClick={() => setActiveDocIndex(idx)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                      activeDocIndex === idx
                        ? 'bg-[#0891b2] text-white border-[#0891b2]'
                        : 'bg-white text-[#595959] border-[#d6d6d6] hover:bg-[#f2f2f2]'
                    }`}
                  >
                    {doc.documentType || `Document #${idx + 1}`}
                  </button>
                ))}
              </div>

              <div className="p-6 bg-[#f9f9f9] border border-[#d6d6d6] text-center space-y-3">
                <p className="text-sm font-bold text-[#1a1c1c]">{selectedApplicant.documents[activeDocIndex]?.fileName || 'Document File'}</p>
                <p className="text-xs text-[#595959]">Type: {selectedApplicant.documents[activeDocIndex]?.documentType}</p>
                {selectedApplicant.documents[activeDocIndex]?.fileUrl ? (
                  <a
                    href={selectedApplicant.documents[activeDocIndex]?.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2f3131] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>View / Download File</span>
                  </a>
                ) : (
                  <p className="text-xs text-[#dc2626] font-bold">File metadata present but link is offline.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#595959] italic p-4 bg-[#f9f9f9] border border-[#d6d6d6]">
              No document files uploaded for this submission.
            </p>
          )}
        </div>

        {/* Compliance Decision Form */}
        <form onSubmit={handleReviewDecision} className="bg-white p-6 border border-[#0891b2]/40 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-[#1a1c1c] uppercase tracking-wider border-b border-[#e5e5e5] pb-2">
            Record Compliance Decision
          </h4>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#166534]">
              <input
                type="radio"
                name="decision"
                value="APPROVED"
                checked={reviewStatus === 'APPROVED'}
                onChange={() => setReviewStatus('APPROVED')}
              />
              <span>APPROVE (Tier-1 Verified)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#991b1b]">
              <input
                type="radio"
                name="decision"
                value="REJECTED"
                checked={reviewStatus === 'REJECTED'}
                onChange={() => setReviewStatus('REJECTED')}
              />
              <span>REJECT (Action Required)</span>
            </label>
          </div>

          {reviewStatus === 'REJECTED' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595959] mb-1">
                Reason for Rejection *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify missing document, invalid address, or non-compliant details..."
                className="w-full bg-[#f9f9f9] border border-[#fca5a5] p-3 text-xs text-[#1a1c1c] outline-none resize-none"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedApplicant(null)}
              className="px-5 py-2.5 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#f2f2f2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submittingReview ? 'Saving Decision...' : 'Save Decision'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white p-5 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
            <span>Compliance & Risk Governance</span>
            <span>/</span>
            <span>KYC Verification Vault</span>
          </div>
          <h2 className="text-xl font-bold text-[#1a1c1c] tracking-tight mt-1">
            Entity Identity & KYC Verification Queue
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            Document inspection, compliance review, and risk tiering for client onboardings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadKyc}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-[#f2f2f2] border border-[#d6d6d6] text-[#1a1c1c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891b2] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#0891b2] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">TOTAL SUBMISSIONS</p>
            <ShieldCheck className="w-4 h-4 text-[#0891b2]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{totalCount}</p>
          <p className="text-[11px] text-[#595959] mt-1 font-medium">Recorded compliance filings</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#ca8a04] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PENDING INSPECTION</p>
            <Clock className="w-4 h-4 text-[#ca8a04]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{pendingCount}</p>
          <p className="text-[11px] text-[#ca8a04] mt-1 font-bold">Awaiting officer action</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#16a34a] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">APPROVED ENTITIES</p>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{approvedCount}</p>
          <p className="text-[11px] text-[#16a34a] mt-1 font-bold">Tier-1 Verified</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#dc2626] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">REJECTED / ACTION TAKEN</p>
            <XCircle className="w-4 h-4 text-[#dc2626]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{rejectedCount}</p>
          <p className="text-[11px] text-[#dc2626] mt-1 font-bold">Incomplete / Declined</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#e5e5e5] shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 bg-[#f9f9f9] border-b border-[#e5e5e5] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#595959]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant name, email or type..."
              className="w-full bg-white border border-[#d6d6d6] pl-9 pr-3 py-2 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2]"
            >
              <option value="">All Verification Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2f3131] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">Applicant Entity</th>
                <th className="p-3.5">Entity Type</th>
                <th className="p-3.5">Submission Date</th>
                <th className="p-3.5">Verification Status</th>
                <th className="p-3.5">Documents Attached</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] text-xs font-medium text-[#1a1c1c]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#595959] font-bold uppercase tracking-wider">
                    Loading KYC verification requests...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#595959] font-bold">
                    No KYC submissions found in the database queue.
                  </td>
                </tr>
              ) : (
                submissions.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-[#1a1c1c]">{item.applicantName}</p>
                      <p className="text-[10px] text-[#595959]">{item.email || 'No email provided'}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-[#f2f2f2] text-[#1a1c1c] text-[10px] font-bold uppercase tracking-wider border border-[#d6d6d6]">
                        {item.applicantType || 'INDIVIDUAL'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#595959]">
                      {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${
                        item.status === 'APPROVED'
                          ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                          : item.status === 'REJECTED'
                          ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                          : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
                      }`}>
                        {item.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#595959] font-semibold">
                      {item.documents?.length || 0} document file(s)
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedApplicant(item);
                          setActiveDocIndex(0);
                          setReviewStatus(item.status || 'APPROVED');
                          setRejectionReason(item.rejectionReason || '');
                        }}
                        className="px-3 py-1.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Review</span>
                      </button>
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
};
