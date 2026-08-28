import React, { useState } from 'react';
import { X, Settings, Wifi, WifiOff, HardDrive, RotateCcw, Shield } from 'lucide-react';
import { CollectorUser } from '../types';

interface SettingsModalProps {
  user: CollectorUser;
  isOffline: boolean;
  onToggleOffline: () => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOffline,
  onToggleOffline,
  onResetData,
  onClose,
}) => {
  const [cashLimit, setCashLimit] = useState('5,000,000');
  const [autoSyncInterval, setAutoSyncInterval] = useState('15');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#2f3131] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Terminal Settings & Diagnostics
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
          {/* Terminal Identity */}
          <div className="bg-[#f3f3f3] border border-[#e5e5e5] p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f5e5e] block mb-2">
              Registered Terminal Profile
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>Terminal ID: <strong>{user.terminalId}</strong></div>
              <div>Collector ID: <strong>{user.id}</strong></div>
              <div className="col-span-2">Agency: <strong>{user.branch}</strong></div>
              <div className="col-span-2">OS: <strong>CollectorOS v2.4.1 (Build 802)</strong></div>
            </div>
          </div>

          {/* Network & Offline Mode */}
          <div className="border border-[#e5e5e5] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase text-[#1a1c1c]">Field Offline Simulation</h4>
                <p className="text-xs text-[#5f5e5e]">Force offline queueing to test network dropout recovery</p>
              </div>

              <button
                type="button"
                onClick={onToggleOffline}
                className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors flex items-center gap-1.5 ${
                  isOffline
                    ? 'bg-[#ba1a1a] text-white border-[#93000a]'
                    : 'bg-[#eeeeee] text-[#1a1c1c] border-[#e5e5e5]'
                }`}
              >
                {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isOffline ? 'Offline Mode Active' : 'Online Mode'}</span>
              </button>
            </div>
          </div>

          {/* Limits & Parameters */}
          <div className="border border-[#e5e5e5] p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-[#1a1c1c]">Operating Thresholds</h4>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5f5e5e] mb-1">
                  Cash In Hand Limit (XAF)
                </label>
                <input
                  type="text"
                  value={cashLimit}
                  onChange={(e) => setCashLimit(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e5e5e5] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5f5e5e] mb-1">
                  Auto-Sync Interval (Mins)
                </label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e5e5e5] text-xs font-bold"
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Reset */}
          <div className="border border-[#ffdad6] p-4 bg-[#ffdad6]/20 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase text-[#93000a]">Reset Local Terminal Cache</h4>
              <p className="text-[11px] text-[#5f5e5e]">Restore factory demo data and initial client states</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset local cache to factory default collections and clients?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3 py-1.5 bg-[#ffffff] border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white text-xs font-bold uppercase transition-colors"
            >
              Reset Data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
