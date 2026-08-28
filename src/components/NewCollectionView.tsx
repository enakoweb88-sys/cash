import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Camera, 
  Save, 
  UploadCloud, 
  Check, 
  X, 
  Crosshair, 
  AlertCircle, 
  FileCheck, 
  Calendar 
} from 'lucide-react';
import { Client, Collection, TransactionStatus, ViewType } from '../types';
import { formatXAF } from '../data/mockData';

interface NewCollectionViewProps {
  clients: Client[];
  initialSelectedClient?: Client | null;
  onSaveCollection: (collection: Omit<Collection, 'id'>, isDraft: boolean) => void;
  onNavigate: (view: ViewType) => void;
  isOffline: boolean;
}

export const NewCollectionView: React.FC<NewCollectionViewProps> = ({
  clients,
  initialSelectedClient,
  onSaveCollection,
  onNavigate,
  isOffline,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialSelectedClient || null);
  const [clientSearchQuery, setClientSearchQuery] = useState(
    initialSelectedClient ? `${initialSelectedClient.id} - ${initialSelectedClient.name}` : ''
  );
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [amount, setAmount] = useState<string>(
    initialSelectedClient && initialSelectedClient.outstandingBalance > 0 
      ? String(initialSelectedClient.outstandingBalance) 
      : ''
  );
  const [location, setLocation] = useState<string>(initialSelectedClient ? initialSelectedClient.address : '');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Format current local time in ISO string for datetime-local
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [collectionTime, setCollectionTime] = useState<string>(getCurrentDateTimeLocal());
  const [transactionState, setTransactionState] = useState<TransactionStatus>('COMPLETE');
  const [notes, setNotes] = useState<string>('');
  
  // Receipt file upload
  const [receiptFile, setReceiptFile] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Error alert
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When initialSelectedClient changes
  useEffect(() => {
    if (initialSelectedClient) {
      setSelectedClient(initialSelectedClient);
      setClientSearchQuery(`${initialSelectedClient.id} - ${initialSelectedClient.name}`);
      setLocation(initialSelectedClient.address);
      if (initialSelectedClient.outstandingBalance > 0 && !amount) {
        setAmount(String(initialSelectedClient.outstandingBalance));
      }
    }
  }, [initialSelectedClient]);

  // Client search filtering
  const matchingClients = clients.filter((c) => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearchQuery(`${client.id} - ${client.name}`);
    setLocation(client.address);
    if (!amount && client.outstandingBalance > 0) {
      setAmount(String(client.outstandingBalance));
    }
    setShowClientDropdown(false);
    setErrorMessage(null);
  };

  // Location handler using Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation('GPS: 4.0511° N, 9.7679° E (Douala Commercial Hub)');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLocation(`GPS: ${lat}° N, ${lng}° E (Field Point)`);
      },
      () => {
        setIsLocating(false);
        setLocation(selectedClient ? selectedClient.address : 'Douala Port Terminal Sector A');
      },
      { timeout: 5000 }
    );
  };

  // Handle Receipt photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const fakeUrl = URL.createObjectURL(file);
      setReceiptFile({
        name: file.name,
        url: fakeUrl,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fakeUrl = URL.createObjectURL(file);
      setReceiptFile({
        name: file.name,
        url: fakeUrl,
      });
    }
  };

  const validateForm = () => {
    if (!selectedClient) {
      setErrorMessage('Please select a valid client from the directory or search.');
      return false;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid collection amount in XAF.');
      return false;
    }
    return true;
  };

  const handleSave = (isDraft: boolean) => {
    if (!validateForm()) return;
    if (!selectedClient) return;

    const numAmount = Number(amount);
    const dateObj = new Date(collectionTime);
    const timeFormatted = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    onSaveCollection(
      {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        amount: numAmount,
        time: timeFormatted,
        timestamp: dateObj.toISOString(),
        status: isDraft ? 'PENDING' : transactionState,
        location: location || selectedClient.address,
        notes: notes || undefined,
        receiptName: receiptFile?.name,
        receiptUrl: receiptFile?.url,
        isDraft: isDraft,
      },
      isDraft
    );
  };

  const outstandingBal = selectedClient ? selectedClient.outstandingBalance : 75000;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32">
      {/* Page Header */}
      <div className="border-b border-[#e5e5e5] pb-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1c] mb-1">
          New Collection
        </h2>
        <p className="text-sm text-[#4a4a4a]">
          Record a new cash transaction from a client.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-[#ffdad6] border border-[#e4beb9] text-[#93000a] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Collection Form */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Client Selection */}
        <div className="bg-[#ffffff] p-6 border border-[#e5e5e5] relative">
          <label 
            htmlFor="client_name"
            className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c] mb-2"
          >
            Client Name
          </label>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
            <input
              id="client_name"
              type="text"
              value={clientSearchQuery}
              onChange={(e) => {
                setClientSearchQuery(e.target.value);
                setShowClientDropdown(true);
                setSelectedClient(null);
              }}
              onFocus={() => setShowClientDropdown(true)}
              placeholder="Search client name or ID..."
              className="w-full h-12 pl-12 pr-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-base text-[#1a1c1c] placeholder:text-[#4a4a4a] outline-none transition-all"
            />

            {clientSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setClientSearchQuery('');
                  setSelectedClient(null);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#1a1c1c]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showClientDropdown && (
            <div className="absolute left-6 right-6 top-[calc(100%-8px)] z-30 bg-[#ffffff] border border-[#e5e5e5] shadow-lg max-h-60 overflow-y-auto divide-y divide-[#e5e5e5]">
              {matchingClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="p-3.5 hover:bg-[#f3f3f3] cursor-pointer flex justify-between items-center text-left transition-colors"
                >
                  <div>
                    <div className="text-sm font-bold text-[#1a1c1c]">
                      {client.name}
                    </div>
                    <div className="text-xs text-[#5f5e5e] flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-[#0891b2]">{client.id}</span>
                      <span>•</span>
                      <span>{client.address}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-[#5f5e5e]">Balance</div>
                    <div className="text-xs font-mono font-bold text-[#1a1c1c]">
                      {formatXAF(client.outstandingBalance)} XAF
                    </div>
                  </div>
                </div>
              ))}

              {matchingClients.length === 0 && (
                <div className="p-4 text-center text-xs text-[#5f5e5e]">
                  No matching clients found in directory.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="bg-[#ffffff] p-4 sm:p-6 border border-[#e5e5e5] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-end">
            <div className="flex-1 w-full">
              <label 
                htmlFor="amount"
                className="block text-xs font-bold uppercase tracking-widest text-[#0891b2] mb-2"
              >
                Amount Collected
              </label>

              <div className="relative flex items-center border border-[#e5e5e5] bg-[#ffffff] focus-within:border-[#0891b2] focus-within:ring-1 focus-within:ring-[#0891b2] transition-all">
                <span className="pl-3 sm:pl-4 font-mono text-base sm:text-xl font-bold text-[#4a4a4a] select-none shrink-0">
                  XAF
                </span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="0"
                  className="w-full h-14 sm:h-16 px-3 sm:px-4 bg-transparent border-none focus:ring-0 text-2xl sm:text-4xl md:text-5xl font-bold text-[#1a1c1c] text-right tracking-tight outline-none font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Outstanding balance box */}
            <div className="w-full md:w-auto bg-[#eeeeee] p-3 sm:p-4 border border-[#e5e5e5] shrink-0 min-w-[160px] flex md:block justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#4a4a4a] mb-0 md:mb-1">
                Outstanding Bal.
              </p>
              <p className="font-mono text-base sm:text-lg font-bold text-[#1a1c1c] tabular-nums">
                {formatXAF(outstandingBal)} <span className="text-xs font-sans text-[#5f5e5e]">XAF</span>
              </p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
          <div className="bg-[#ffffff] p-6 border border-[#e5e5e5] flex flex-col justify-between">
            <div>
              <label 
                htmlFor="location"
                className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c] mb-2"
              >
                Location / Address
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter collection address"
                className="w-full h-12 px-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] mb-4 outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="flex items-center justify-center gap-2 text-[#0891b2] text-xs font-bold uppercase tracking-widest hover:bg-[#ecfeff] px-4 py-2.5 border border-[#e5e5e5] transition-colors w-full cursor-pointer"
            >
              <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
            </button>
          </div>

          {/* Timestamp & Status */}
          <div className="space-y-6">
            <div className="bg-[#ffffff] p-6 border border-[#e5e5e5]">
              <label 
                htmlFor="timestamp"
                className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c] mb-2"
              >
                Collection Time
              </label>
              <div className="relative">
                <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#4a4a4a] pointer-events-none" />
                <input
                  id="timestamp"
                  type="datetime-local"
                  value={collectionTime}
                  onChange={(e) => setCollectionTime(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] font-mono text-sm text-[#1a1c1c] outline-none"
                />
              </div>
            </div>

            <div className="bg-[#ffffff] p-6 border border-[#e5e5e5]">
              <label 
                htmlFor="status"
                className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c] mb-2"
              >
                Transaction State
              </label>
              <select
                id="status"
                value={transactionState}
                onChange={(e) => setTransactionState(e.target.value as TransactionStatus)}
                className="w-full h-12 px-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] font-bold outline-none cursor-pointer uppercase"
              >
                <option value="COMPLETE">COMPLETE</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[#ffffff] p-6 border border-[#e5e5e5]">
          <label 
            htmlFor="notes"
            className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c] mb-2"
          >
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened with the client? (e.g. Partial payment agreed)"
            className="w-full p-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] resize-none outline-none"
          />
        </div>

        {/* Receipt Upload Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="bg-[#ffffff] p-8 border border-[#e5e5e5] text-center"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto bg-[#f3f3f3] rounded-full flex items-center justify-center mb-3 text-[#4a4a4a] border border-[#e5e5e5]">
            <Camera className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-[#1a1c1c] mb-1">
            Upload Receipt / Slip
          </h3>
          <p className="text-xs text-[#4a4a4a] mb-6">
            Drag and drop or browse files
          </p>

          {receiptFile ? (
            <div className="inline-flex items-center gap-3 p-3 bg-[#f3f3f3] border border-[#e5e5e5] text-xs">
              <FileCheck className="w-4 h-4 text-[#0891b2]" />
              <span className="font-mono font-medium text-[#1a1c1c] max-w-[200px] truncate">
                {receiptFile.name}
              </span>
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                className="text-[#ba1a1a] hover:underline font-bold"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#f9f9f9] text-[#1a1c1c] border border-[#e5e5e5] hover:bg-[#eeeeee] text-xs font-bold h-12 px-8 transition-colors uppercase tracking-widest cursor-pointer"
            >
              Select Photo
            </button>
          )}
        </div>
      </form>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-[#ffffff] border-t border-[#e5e5e5] p-4 z-40">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex-1 bg-[#f9f9f9] text-[#1a1c1c] border border-[#e5e5e5] h-12 text-xs font-bold hover:bg-[#eeeeee] transition-colors flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex-1 bg-[#0891b2] text-white h-12 text-xs font-bold hover:bg-[#0e7490] transition-colors flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Submit to API</span>
          </button>
        </div>
      </div>
    </div>
  );
};
