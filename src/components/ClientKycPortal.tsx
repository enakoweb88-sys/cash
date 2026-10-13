import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  FileText, 
  Camera, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  CreditCard,
  Lock,
  ArrowRight,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { submitClientKyc } from '../api/cashApi';

interface ClientKycPortalProps {
  onBackToTerminal?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ClientKycPortal: React.FC<ClientKycPortalProps> = ({ 
  onBackToTerminal,
  onShowToast 
}) => {
  const [applicantType, setApplicantType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Cameroon');
  const [country, setCountry] = useState('Cameroon');
  const [city, setCity] = useState('Douala');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [sourceOfFunds, setSourceOfFunds] = useState('Business Revenue & Trading');
  
  // Identification details
  const [idType, setIdType] = useState('National ID Card (CNI)');
  const [idNumber, setIdNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  
  // Agreement
  const [agreeTerms, setAgreeTerms] = useState(false);

  // File states
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);

  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [proofAddressFile, setProofAddressFile] = useState<File | null>(null);
  const [proofAddressPreview, setProofAddressPreview] = useState<string | null>(null);

  // State handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  // Hidden file inputs refs
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const proofAddressRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your primary telephone / WhatsApp number.');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMessage('Please provide your identity document number.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please acknowledge and accept the compliance declaration.');
      return;
    }

    // Documents check
    if (!idFrontFile) {
      setErrorMessage('Please upload the front of your National ID / Passport.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('applicantType', applicantType.toLowerCase());
      formData.append('applicantName', fullName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());

      const payload = {
        fullName: fullName.trim(),
        emailAddress: email.trim().toLowerCase(),
        phoneNumber: phone.trim(),
        dateOfBirth: dateOfBirth || '1990-01-01',
        nationality,
        residenceCountry: country,
        residentialAddress: residentialAddress.trim() || city,
        city,
        occupation: occupation.trim() || 'OTC Trader / Business Client',
        sourceOfFunds,
        idType,
        idNumber: idNumber.trim(),
        expiryDate: expiryDate || '2030-01-01',
        companyRegistrationNumber: applicantType === 'CORPORATE' ? companyRegistrationNumber : undefined,
        taxNumber: applicantType === 'CORPORATE' ? taxNumber : undefined,
        portalDomain: 'kyc.enakootc.com',
        submittedAt: new Date().toISOString(),
      };

      formData.append('payload', JSON.stringify(payload));

      if (idFrontFile) formData.append('idCardFront', idFrontFile, idFrontFile.name);
      if (idBackFile) formData.append('idCardBack', idBackFile, idBackFile.name);
      if (selfieFile) formData.append('selfiePhoto', selfieFile, selfieFile.name);
      if (proofAddressFile) formData.append('proofOfAddress', proofAddressFile, proofAddressFile.name);

      const result = await submitClientKyc(formData);

      if (result.success && result.data) {
        setSubmittedData(result.data);
        if (onShowToast) {
          onShowToast('KYC application submitted successfully! Confirmation email dispatched.', 'success');
        }
      } else {
        setErrorMessage(result.error || 'Failed to submit KYC verification. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedData(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setIdNumber('');
    setResidentialAddress('');
    setIdFrontFile(null);
    setIdFrontPreview(null);
    setIdBackFile(null);
    setIdBackPreview(null);
    setSelfieFile(null);
    setSelfiePreview(null);
    setProofAddressFile(null);
    setProofAddressPreview(null);
    setAgreeTerms(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased selection:bg-[#001f5b] selection:text-white">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#001f5b] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">ENAKO OTC</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Client Identity Verification & Compliance Desk (kyc.enakootc.com)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onBackToTerminal && (
              <button
                type="button"
                onClick={onBackToTerminal}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cash Terminal Portal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {submittedData ? (
          /* SUCCESS STATE */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-500 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>

            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Application Successfully Submitted
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 mb-2 tracking-tight">
              Identity Verification Received
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
              Thank you, <strong className="text-slate-900">{submittedData.applicantName || fullName}</strong>. Your documents have been securely uploaded to the ENAKO Compliance Registry.
            </p>

            {/* REFERENCE DETAILS CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left space-y-3">
              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Tracking Reference</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  #{String(submittedData.id || 'KYC-ONLINE').slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Recipient Email</span>
                <span className="font-semibold text-slate-900">{submittedData.email || email}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Review Window</span>
                <span className="font-bold text-[#001f5b]">24 to 48 business hours</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Current Status</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Under Active Review
                </span>
              </div>
            </div>

            {/* NOTIFICATION NOTICE */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3 text-left mb-8">
              <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Automated Notification Dispatched</strong>
                A submission confirmation receipt with your reference code has been automatically dispatched to <span className="underline font-semibold">{submittedData.email || email}</span>. You will also receive an update immediately once approved.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-[#001f5b] hover:bg-[#001744] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Submit Another Application</span>
              </button>
              {onBackToTerminal && (
                <button
                  type="button"
                  onClick={onBackToTerminal}
                  className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Return to Cash Dashboard
                </button>
              )}
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* INTRO HERO */}
            <div className="bg-gradient-to-br from-[#001f5b] via-[#001744] to-[#0f172a] text-white rounded-2xl p-8 sm:p-10 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 to-transparent pointer-events-none" />
              
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-blue-200 mb-4 border border-white/10">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Bank-Grade 256-Bit Encrypted KYC Portal
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
                  Client Identity Verification
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  In compliance with regulatory standards for OTC foreign exchange and cash collection, please provide your personal information and verified identification documents.
                </p>
              </div>

              {/* ACCOUNT TYPE SELECTOR */}
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setApplicantType('INDIVIDUAL')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    applicantType === 'INDIVIDUAL'
                      ? 'bg-white text-[#001f5b] shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Individual Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApplicantType('CORPORATE')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    applicantType === 'CORPORATE'
                      ? 'bg-white text-[#001f5b] shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Corporate Entity</span>
                </button>
              </div>
            </div>

            {/* ERROR ALERT */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-medium text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-bold">Please check your submission:</strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* SECTION 1: APPLICANT DETAILS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <User className="w-5 h-5 text-[#001f5b]" />
                  <span>1. Applicant Information</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {applicantType === 'INDIVIDUAL'
                    ? 'Official personal and contact information as stated on your legal identity document.'
                    : 'Company registration and primary authorized representative details.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {applicantType === 'INDIVIDUAL' ? 'Full Legal Name *' : 'Registered Business / Entity Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={applicantType === 'INDIVIDUAL' ? 'e.g., Joseph Nounga' : 'e.g., ENAKO OTC Trading SARL'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#001f5b] focus:ring-2 focus:ring-[#001f5b]/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@enako.com"
                      className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] focus:ring-2 focus:ring-[#001f5b]/20 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Automated confirmation and decision status will be emailed here.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone / WhatsApp Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+237 690 000 000"
                      className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] focus:ring-2 focus:ring-[#001f5b]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {applicantType === 'INDIVIDUAL' ? 'Date of Birth' : 'Date of Incorporation'}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nationality / Country
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="Cameroon"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Residential / Physical Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      placeholder="e.g., Boulevard de la Liberté, Akwa, Douala"
                      className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {applicantType === 'INDIVIDUAL' ? 'Occupation / Business' : 'Nature of Business'}
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g., Executive / OTC Trader"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Source of Funds
                  </label>
                  <select
                    value={sourceOfFunds}
                    onChange={(e) => setSourceOfFunds(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  >
                    <option value="Business Revenue & Trading">Business Revenue & Commercial Trading</option>
                    <option value="Employment Salary">Employment Salary & Compensation</option>
                    <option value="Crypto & OTC Arbitrage">Crypto & OTC FX Trading</option>
                    <option value="Investments & Capital Gains">Investments & Capital Returns</option>
                    <option value="Family Remittances">Family & Personal Remittances</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: IDENTITY DOCUMENTATION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#001f5b]" />
                  <span>2. Identity Verification & Document Numbers</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Specify the type of identification document and its valid registration code.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Identity Document Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  >
                    <option value="National ID Card (CNI)">National ID Card (CNI)</option>
                    <option value="International Passport">International Passport</option>
                    <option value="Driver's License">Driver's License</option>
                    <option value="Residence Permit">Residence Permit / Carte de Séjour</option>
                    <option value="Certificate of Incorporation">Certificate of Incorporation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Document Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g., LT-2023-894129"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#001f5b] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: UPLOAD ATTACHMENTS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#001f5b]" />
                  <span>3. Document File Uploads</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload clear photos or scans (PNG, JPG, PDF) of your official documents. Maximum 10MB per file.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1. ID FRONT */}
                <div className="border-2 border-dashed border-slate-200 hover:border-[#001f5b] rounded-2xl p-5 text-center transition-all bg-slate-50/50 flex flex-col justify-between">
                  <input
                    type="file"
                    ref={idFrontRef}
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setIdFrontFile, setIdFrontPreview)}
                  />
                  <div>
                    <span className="inline-block bg-blue-100 text-[#001f5b] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3">
                      Required
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">ID Document (Front)</h3>
                    <p className="text-xs text-slate-500 mb-4">Front face with photo, name, and validity clearly visible.</p>
                  </div>

                  {idFrontPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                      <img src={idFrontPreview} alt="ID Front" className="object-contain h-full w-full" />
                      <button
                        type="button"
                        onClick={() => removeFile(setIdFrontFile, setIdFrontPreview, idFrontRef)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => idFrontRef.current?.click()}
                      className="py-6 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-2 transition-all"
                    >
                      <Upload className="w-5 h-5 text-[#001f5b]" />
                      <span>Click to upload ID Front</span>
                    </button>
                  )}
                </div>

                {/* 2. ID BACK */}
                <div className="border-2 border-dashed border-slate-200 hover:border-[#001f5b] rounded-2xl p-5 text-center transition-all bg-slate-50/50 flex flex-col justify-between">
                  <input
                    type="file"
                    ref={idBackRef}
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setIdBackFile, setIdBackPreview)}
                  />
                  <div>
                    <span className="inline-block bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3">
                      Recommended
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">ID Document (Back)</h3>
                    <p className="text-xs text-slate-500 mb-4">Reverse side with barcode, chip, or address information.</p>
                  </div>

                  {idBackPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                      <img src={idBackPreview} alt="ID Back" className="object-contain h-full w-full" />
                      <button
                        type="button"
                        onClick={() => removeFile(setIdBackFile, setIdBackPreview, idBackRef)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => idBackRef.current?.click()}
                      className="py-6 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-2 transition-all"
                    >
                      <Upload className="w-5 h-5 text-slate-600" />
                      <span>Click to upload ID Back</span>
                    </button>
                  )}
                </div>

                {/* 3. LIVE SELFIE PHOTO */}
                <div className="border-2 border-dashed border-slate-200 hover:border-[#001f5b] rounded-2xl p-5 text-center transition-all bg-slate-50/50 flex flex-col justify-between">
                  <input
                    type="file"
                    ref={selfieRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
                  />
                  <div>
                    <span className="inline-block bg-blue-100 text-[#001f5b] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3">
                      Required
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">Selfie Portrait Photo</h3>
                    <p className="text-xs text-slate-500 mb-4">Clear portrait of yourself holding your ID card (liveness check).</p>
                  </div>

                  {selfiePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                      <img src={selfiePreview} alt="Selfie" className="object-contain h-full w-full" />
                      <button
                        type="button"
                        onClick={() => removeFile(setSelfieFile, setSelfiePreview, selfieRef)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selfieRef.current?.click()}
                      className="py-6 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-2 transition-all"
                    >
                      <Camera className="w-5 h-5 text-[#001f5b]" />
                      <span>Click to upload Selfie Photo</span>
                    </button>
                  )}
                </div>

                {/* 4. PROOF OF ADDRESS */}
                <div className="border-2 border-dashed border-slate-200 hover:border-[#001f5b] rounded-2xl p-5 text-center transition-all bg-slate-50/50 flex flex-col justify-between">
                  <input
                    type="file"
                    ref={proofAddressRef}
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setProofAddressFile, setProofAddressPreview)}
                  />
                  <div>
                    <span className="inline-block bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3">
                      Optional
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">Proof of Residence</h3>
                    <p className="text-xs text-slate-500 mb-4">Recent utility bill (ENEO, Camwater) or official bank statement.</p>
                  </div>

                  {proofAddressPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                      <img src={proofAddressPreview} alt="Proof of Residence" className="object-contain h-full w-full" />
                      <button
                        type="button"
                        onClick={() => removeFile(setProofAddressFile, setProofAddressPreview, proofAddressRef)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => proofAddressRef.current?.click()}
                      className="py-6 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-2 transition-all"
                    >
                      <FileText className="w-5 h-5 text-slate-600" />
                      <span>Click to upload Proof of Address</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: DECLARATION & SUBMISSION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-[#001f5b] focus:ring-[#001f5b] cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I hereby declare that all information and uploaded identification documents provided are authentic, accurate, and up to date. I consent to ENAKO OTC processing this data in accordance with statutory Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.
                </span>
              </label>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Submissions are encrypted and stored in private Supabase storage.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#001f5b] hover:bg-[#001744] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Uploading…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit KYC Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ENAKO COMPANY PLC. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-600">kyc.enakootc.com</span>
            <span>•</span>
            <span className="font-semibold text-slate-600">enakootc.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
