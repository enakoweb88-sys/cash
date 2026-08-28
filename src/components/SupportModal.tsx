import React from 'react';
import { X, HelpCircle, Phone, Radio, BatteryMedium, Cpu, ShieldCheck, Database } from 'lucide-react';
import { CollectorUser } from '../types';

interface SupportModalProps {
  user: CollectorUser;
  isOffline: boolean;
  draftCount: number;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  user,
  isOffline,
  draftCount,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#2f3131] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Field Collector Support
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
        <div className="p-6 overflow-y-auto space-y-5 bg-[#ffffff]">
          {/* Emergency Hotlines */}
          <div className="bg-[#f3f3f3] border border-[#e5e5e5] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f5e5e] block">
              Direct Contact Lines
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                <span>Agency Central Dispatch:</span>
                <strong className="font-mono text-[#0891b2]">+237 233 42 12 34</strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
                <span>Vault Settlement Desk:</span>
                <strong className="font-mono text-[#0891b2]">+237 233 42 56 78</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>IT & Terminal Systems:</span>
                <strong className="font-mono text-[#0891b2]">+237 677 00 11 22</strong>
              </div>
            </div>
          </div>

          {/* Device Telemetry Diagnostics */}
          <div className="border border-[#e5e5e5] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] block">
              Terminal Telemetry Diagnostics
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0891b2]" />
                <div>
                  <div className="text-[10px] text-[#5f5e5e]">Cellular Signal</div>
                  <div className="font-bold">{isOffline ? 'Disconnected' : '4G LTE (96%)'}</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center gap-2">
                <BatteryMedium className="w-4 h-4 text-[#0891b2]" />
                <div>
                  <div className="text-[10px] text-[#5f5e5e]">Battery Level</div>
                  <div className="font-bold">88% (Healthy)</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0891b2]" />
                <div>
                  <div className="text-[10px] text-[#5f5e5e]">Offline Storage</div>
                  <div className="font-bold">{draftCount} drafts cached</div>
                </div>
              </div>

              <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0891b2]" />
                <div>
                  <div className="text-[10px] text-[#5f5e5e]">Security HSM</div>
                  <div className="font-bold">FIPS-140-2 Valid</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0891b2] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0e7490] shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
