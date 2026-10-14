import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Building, Phone, User, Mail, Lock, Key } from 'lucide-react';
import { CollectorUser } from '../types';

interface LoginViewProps {
  onLogin: (credentials: { emailOrPhone: string; password?: string; role?: string; remember: boolean }) => { success: boolean; error?: string };
  onSignUp: (userData: { firstName: string; lastName: string; email: string; phone?: string; branch: string; role: string; password?: string }) => { success: boolean; error?: string };
  currentUser: CollectorUser;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, currentUser }) => {
  // Login Role: CEO / Executive Manager vs Field Cash Collector / Senior Cash Officer
  const [loginRole, setLoginRole] = useState<'CEO' | 'SENIOR' | 'COLLECTOR'>('CEO');

  // CEO Credentials Defaults
  const [email, setEmail] = useState('ceo@enako.com');
  const [password, setPassword] = useState('Enako@2025!');

  // Collector Credentials Defaults (Phone & PIN)
  const [phoneOrTerminal, setPhoneOrTerminal] = useState('');
  const [pinCode, setPinCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      if (loginRole === 'CEO') {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail === 'ceo@enako.com' && password === 'Enako@2025!') {
          const res = onLogin({
            emailOrPhone: 'ceo@enako.com',
            password: 'Enako@2025!',
            role: 'CEO / Executive Manager',
            remember: true,
          });
          if (!res.success) setErrorMsg(res.error || 'Login failed.');
        } else {
          // Attempt standard login with typed credentials
          const res = onLogin({
            emailOrPhone: trimmedEmail,
            password: password,
            role: 'CEO / Executive Manager',
            remember: true,
          });
          if (!res.success) {
            setErrorMsg('Invalid CEO credentials. Ensure Email is ceo@enako.com and Password is Enako@2025!');
          }
        }
      } else {
        // Collector / Senior Cash Officer Login (Phone/Terminal ID + PIN)
        if (!phoneOrTerminal.trim()) {
          setErrorMsg('Please enter your Phone Number or Terminal ID.');
          setIsLoading(false);
          return;
        }

        if (!pinCode.trim()) {
          setErrorMsg('Please enter your Security PIN / Password.');
          setIsLoading(false);
          return;
        }

        const res = onLogin({
          emailOrPhone: phoneOrTerminal.trim(),
          password: pinCode,
          role: loginRole === 'SENIOR' ? 'Senior Cash Officer' : 'Field Cash Collector',
          remember: true,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Collector account not found or PIN code invalid.');
        }
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#f9f9f9] text-[#1a1c1c] flex flex-col items-center justify-center p-4 selection:bg-[#0891b2] selection:text-white font-sans">
      <main className="w-full max-w-md relative z-10">
        {/* Auth Card */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] shadow-sm p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <img src="/logo.svg" alt="Company Logo" className="h-16 w-auto object-contain mb-2" />
            <h1 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
              ENAKO Terminal Portal
            </h1>
            <p className="text-xs text-[#5f5e5e]">
              Sign in to your administrative dashboard or collector terminal.
            </p>
          </div>

          {/* Validation Error Notice */}
          {errorMsg && (
            <div className="p-3.5 bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-xs rounded flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="login-role" className="block text-[11px] font-bold tracking-wider text-[#0891b2] uppercase">
                Login As (Role) *
              </label>
              <select
                id="login-role"
                value={loginRole}
                onChange={(e) => {
                  const val = e.target.value as 'CEO' | 'SENIOR' | 'COLLECTOR';
                  setLoginRole(val);
                  setErrorMsg(null);
                  if (val === 'CEO') {
                    setEmail('ceo@enako.com');
                    setPassword('Enako@2025!');
                  } else {
                    setPhoneOrTerminal('');
                    setPinCode('');
                  }
                }}
                className="block w-full h-12 px-3 border border-[#0891b2] bg-[#ecfeff] text-[#0891b2] text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#0891b2] cursor-pointer"
              >
                <option value="CEO">CEO / Executive Manager</option>
                <option value="SENIOR">Senior Cash Officer</option>
                <option value="COLLECTOR">Field Cash Collector</option>
              </select>
            </div>

            {/* Fields for CEO / Executive Manager */}
            {loginRole === 'CEO' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase">
                    CEO / Executive Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f5e5e]" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ceo@enako.com"
                      className="block w-full h-12 pl-10 pr-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f5e5e]" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enako@2025!"
                      className="block w-full h-12 pl-10 pr-11 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#0891b2] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Fields for Cash Collector / Senior Cash Officer (Phone + PIN) */
              <>
                <div className="space-y-1.5">
                  <label htmlFor="phone-terminal" className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase">
                    Phone Number or Terminal ID *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f5e5e]" />
                    <input
                      id="phone-terminal"
                      type="text"
                      required
                      value={phoneOrTerminal}
                      onChange={(e) => setPhoneOrTerminal(e.target.value)}
                      placeholder="e.g. +237 6XX XX XX XX or TRM-9821"
                      className="block w-full h-12 pl-10 pr-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pin-code" className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase">
                    Security PIN Code / Password *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f5e5e]" />
                    <input
                      id="pin-code"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="Enter 6-digit PIN or password"
                      className="block w-full h-12 pl-10 pr-11 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#0891b2] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#0891b2] hover:bg-[#0e7490] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <span>Sign In to Terminal</span>
              )}
            </button>
          </form>

          {/* Footer Guarantee */}
          <div className="pt-4 border-t border-[#e5e5e5] flex items-center justify-center gap-2 text-[#5f5e5e] text-[11px]">
            <ShieldCheck className="w-4 h-4 text-[#0891b2]" />
            <span>256-Bit Encrypted Terminal Connection</span>
          </div>
        </div>
      </main>
    </div>
  );
};
