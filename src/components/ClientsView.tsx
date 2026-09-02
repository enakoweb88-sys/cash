import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  Tag, 
  Banknote, 
  Check, 
  ChevronDown,
  Filter,
  X,
  Phone,
  Mail
} from 'lucide-react';
import { Client, FilterOptions } from '../types';
import { formatXAF } from '../data/mockData';

interface ClientsViewProps {
  clients: Client[];
  onSelectClientForCollection: (client: Client) => void;
  onAddNewClient: (client: Omit<Client, 'id'>) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onSelectClientForCollection,
  onAddNewClient,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    region: '',
    balanceFilter: '',
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientRegion, setNewClientRegion] = useState<Client['region']>('Douala');
  const [newClientBalance, setNewClientBalance] = useState('0');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(q);
        const matchesId = client.id.toLowerCase().includes(q);
        const matchesAddr = client.address.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesAddr) return false;
      }

      // Region filter
      if (filters.region && client.region !== filters.region) {
        return false;
      }

      // Balance filter
      if (filters.balanceFilter === 'high' && client.outstandingBalance < 50000) {
        return false;
      }
      if (filters.balanceFilter === 'low' && (client.outstandingBalance <= 0 || client.outstandingBalance >= 50000)) {
        return false;
      }
      if (filters.balanceFilter === 'zero' && client.outstandingBalance > 0) {
        return false;
      }

      return true;
    });
  }, [clients, filters]);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientAddress.trim()) return;

    onAddNewClient({
      name: newClientName.trim(),
      address: newClientAddress.trim(),
      region: newClientRegion,
      lastVisit: 'Never',
      outstandingBalance: Number(newClientBalance) || 0,
      phone: newClientPhone.trim() || undefined,
      email: newClientEmail.trim() || undefined,
    });

    // Reset form
    setNewClientName('');
    setNewClientAddress('');
    setNewClientBalance('0');
    setNewClientPhone('');
    setNewClientEmail('');
    setIsAddModalOpen(false);
  };

  // Helper for initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1c] mb-1">
            Client Directory
          </h1>
          <p className="text-sm text-[#5f5e5e]">
            Manage and locate clients for collection.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] p-3 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            placeholder="Search by name or ID..."
            className="w-full py-2.5 pl-10 pr-8 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm text-[#1a1c1c] placeholder:text-[#5f5e5e] transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#1a1c1c]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full md:w-auto">
          {/* Region dropdown */}
          <div className="relative w-full sm:w-48">
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="w-full py-2.5 pl-3.5 pr-8 bg-[#ffffff] border border-[#e5e5e5] appearance-none focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-xs sm:text-sm text-[#1a1c1c] cursor-pointer"
            >
              <option value="">All Regions</option>
              <option value="Douala">Douala</option>
              <option value="Yaounde">Yaounde</option>
              <option value="Buea">Buea</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a4a] pointer-events-none" />
          </div>

          {/* Balance dropdown */}
          <div className="relative w-full sm:w-56">
            <select
              value={filters.balanceFilter}
              onChange={(e) => setFilters({ ...filters, balanceFilter: e.target.value })}
              className="w-full py-2.5 pl-3.5 pr-8 bg-[#ffffff] border border-[#e5e5e5] appearance-none focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-xs sm:text-sm text-[#1a1c1c] cursor-pointer"
            >
              <option value="">Balance: Any</option>
              <option value="high">Outstanding &gt; 50k XAF</option>
              <option value="low">Outstanding &lt; 50k XAF</option>
              <option value="zero">No Balance (0 XAF)</option>
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a4a] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data List */}
      <div className="flex flex-col border border-[#e5e5e5] bg-[#ffffff] divide-y divide-[#e5e5e5]">
        {filteredClients.map((client) => {
          const hasBalance = client.outstandingBalance > 0;
          return (
            <div
              key={client.id}
              className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-[#f3f3f3]/70 transition-colors group"
            >
              {/* Client Info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="h-11 w-11 rounded-full border border-[#a5f3fc] flex items-center justify-center shrink-0 text-[#0891b2] font-bold text-xs bg-[#ecfeff] tracking-wider">
                  {getInitials(client.name)}
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors">
                    {client.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[#5f5e5e] text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#4a4a4a]" />
                      <span>{client.address}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#4a4a4a]" />
                      <span>Last Visit: {client.lastVisit}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Tag className="w-3.5 h-3.5 text-[#4a4a4a]" />
                      <span>ID: <strong className="text-[#1a1c1c]">{client.id}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Balance */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t border-[#e5e5e5] md:border-none">
                <div className="text-left md:text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 text-[#5f5e5e]">
                    Current Balance
                  </div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-[#1a1c1c] tabular-nums">
                    {formatXAF(client.outstandingBalance)}{' '}
                    <span className="text-xs font-normal text-[#5f5e5e] font-sans">FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="p-12 text-center text-sm text-[#5f5e5e]">
            No clients match the current search or filters.
          </div>
        )}
      </div>

      {/* Add New Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[#1a1c1c]">Add New Client</h3>
                <p className="text-xs text-[#5f5e5e]">Register a merchant or client in the terminal</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#5f5e5e] hover:text-[#1a1c1c] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                  Client / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Marché Mokolo Store #12"
                  className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                  Address / Physical Location *
                </label>
                <input
                  type="text"
                  required
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="e.g. 45 Rue de Nachtigal, Yaoundé"
                  className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                    Region / Sector
                  </label>
                  <select
                    value={newClientRegion}
                    onChange={(e) => setNewClientRegion(e.target.value as Client['region'])}
                    className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaounde">Yaounde</option>
                    <option value="Buea">Buea</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                    Initial Balance (XAF)
                  </label>
                  <input
                    type="number"
                    value={newClientBalance}
                    onChange={(e) => setNewClientBalance(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@domain.cm"
                    className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e5e5] flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-[#e5e5e5] text-xs font-bold uppercase tracking-wider text-[#1a1c1c] hover:bg-[#f3f3f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
