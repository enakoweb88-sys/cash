import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { CollectorUser } from '../types';

interface LoginViewProps {
  onLogin: (credentials: { id: string; remember: boolean }) => void;
  currentUser: CollectorUser;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, currentUser }) => {
  const [collectorId, setCollectorId] = useState('COL-0921');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        id: collectorId || 'COL-0921',
        remember: rememberMe,
      });
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#f9f9f9] text-[#1a1c1c] flex flex-col items-center justify-center p-4 selection:bg-[#0891b2] selection:text-white">
      <main className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] shadow-sm p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <img src="/logo.png" alt="Company Logo" className="h-16 w-auto object-contain mb-2" />
            <h1 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              Collector Portal
            </h1>
            <p className="text-xs text-[#5f5e5e]">
              Enter your credentials to access the system securely.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Collector ID */}
            <div className="space-y-1.5">
              <label 
                htmlFor="collector-id"
                className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
              >
                Collector ID / Email
              </label>
              <input
                id="collector-id"
                type="text"
                required
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                placeholder="COL-XXXX"
                className="block w-full h-12 px-3.5 border border-[#0891b2] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password"
                  className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                >
                  Password / PIN
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMsg(true)}
                  className="text-[11px] font-bold text-[#0891b2] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full h-12 px-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
              />
            </div>

            {forgotMsg && (
              <div className="p-3 bg-[#f3f3f3] border border-[#e5e5e5] text-xs text-[#5f5e5e] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0891b2] shrink-0" />
                <span>Contact Central Security Supervisor at <strong>+237 233 42 00 00</strong> for PIN resets.</span>
              </div>
            )}

            {/* Keep Logged In Checkbox */}
            <div 
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 pt-1 cursor-pointer select-none"
            >
              {rememberMe ? (
                <CheckSquare className="w-4 h-4 text-[#0891b2]" />
              ) : (
                <Square className="w-4 h-4 text-[#64748b]" />
              )}
              <span className="text-xs text-[#4a4a4a]">
                Keep me logged in for offline access
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white text-sm font-bold tracking-wider uppercase transition-all active:scale-[0.99] cursor-pointer shadow-sm"
              >
                {isLoading ? 'Authenticating...' : 'Sign In securely'}
              </button>
            </div>
          </form>

          {/* Trust Indicators */}
          <div className="pt-4 border-t border-[#e5e5e5] text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-widest text-[#64748b] uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0891b2]" />
              <span>End-to-end encrypted connection</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs font-semibold text-[#64748b]">
            Secured by CollectorOS
          </p>
          <p className="text-[11px] font-bold tracking-wider text-[#64748b] uppercase">
            Version 2.4.1 (Build 802)
          </p>
        </div>
      </main>
    </div>
  );
};
