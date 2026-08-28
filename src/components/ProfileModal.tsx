import React from 'react';
import { X, User, Shield, Building, Key, LogOut } from 'lucide-react';
import { CollectorUser } from '../types';

interface ProfileModalProps {
  user: CollectorUser;
  onLogout: () => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onLogout,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#2f3131] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Field Officer Identity
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#c8c6c5] hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#ffffff]">
          <div className="flex items-center gap-4 border-b border-[#e5e5e5] pb-4">
            <div className="w-14 h-14 bg-[#0891b2] text-white flex items-center justify-center text-2xl font-bold rounded-full shadow-sm">
              {user.avatarLetter}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">{user.name}</h3>
              <p className="text-xs font-mono text-[#0891b2] font-semibold">{user.id}</p>
              <p className="text-xs text-[#5f5e5e]">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center gap-2 p-3 bg-[#f3f3f3] border border-[#e5e5e5]">
              <Building className="w-4 h-4 text-[#0891b2] shrink-0" />
              <div>
                <span className="text-[10px] text-[#5f5e5e] uppercase block font-sans">Assigned Branch</span>
                <strong>{user.branch}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-[#f3f3f3] border border-[#e5e5e5]">
              <Key className="w-4 h-4 text-[#0891b2] shrink-0" />
              <div>
                <span className="text-[10px] text-[#5f5e5e] uppercase block font-sans">Assigned POS Terminal</span>
                <strong>{user.terminalId} (FIPS Cryptographic Token)</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-[#f3f3f3] border border-[#e5e5e5]">
              <Shield className="w-4 h-4 text-[#0891b2] shrink-0" />
              <div>
                <span className="text-[10px] text-[#5f5e5e] uppercase block font-sans">Authorization Level</span>
                <strong>Tier 2 Field Cash Collector (Up to 10M XAF/day)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-4 py-2 border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0891b2] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0e7490] shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
