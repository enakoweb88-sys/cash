import React, { useState } from 'react';
import { ShieldCheck, CheckSquare, Square, AlertCircle, Eye, EyeOff, Building2, Phone, User, Mail, Lock } from 'lucide-react';
import { CollectorUser } from '../types';

interface LoginViewProps {
  onLogin: (credentials: { emailOrPhone: string; password?: string; remember: boolean }) => { success: boolean; error?: string };
  onSignUp: (userData: { firstName: string; lastName: string; email: string; phone?: string; branch: string; role: string; password?: string }) => { success: boolean; error?: string };
  currentUser: CollectorUser;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, currentUser }) => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('collector@enako.cm');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Douala Main Hub');
  const [role, setRole] = useState('Field Cash Collector');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          setErrorMsg('First name and last name are required.');
          setIsLoading(false);
          return;
        }

        if (!emailOrPhone.trim() || !emailOrPhone.includes('@')) {
          setErrorMsg('Please enter a valid email address.');
          setIsLoading(false);
          return;
        }

        if (password.length < 4) {
          setErrorMsg('Password must be at least 4 characters long.');
          setIsLoading(false);
          return;
        }

        if (confirmPassword && password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please re-enter your password.');
          setIsLoading(false);
          return;
        }

        const res = onSignUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: emailOrPhone.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          branch,
          role,
          password,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create account.');
        }
      } else {
        if (!emailOrPhone.trim()) {
          setErrorMsg('Please enter your registered email address or phone number.');
          setIsLoading(false);
          return;
        }

        const res = onLogin({
          emailOrPhone: emailOrPhone.trim().toLowerCase(),
          password,
          remember: rememberMe,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Invalid credentials. Check your email and password.');
        }
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#f9f9f9] text-[#1a1c1c] flex flex-col items-center justify-center p-4 selection:bg-[#0891b2] selection:text-white">
      <main className="w-full max-w-md relative z-10">
        {/* Auth Card */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] shadow-sm p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <img src="/logo.png" alt="Company Logo" className="h-16 w-auto object-contain mb-2" />
            <h1 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              {isSignUp ? 'Collector Sign Up' : 'Collector Portal'}
            </h1>
            <p className="text-xs text-[#5f5e5e]">
              {isSignUp 
                ? 'Register your field agent terminal profile securely.' 
                : 'Enter your credentials to access your collector terminal.'}
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
            {/* Sign Up Fields: First Name & Last Name */}
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="first-name"
                      className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                    >
                      First Name *
                    </label>
                    <input
                      id="first-name"
                      type="text"
                      required={isSignUp}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Christian"
                      className="block w-full h-12 px-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label 
                      htmlFor="last-name"
                      className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                    >
                      Last Name *
                    </label>
                    <input
                      id="last-name"
                      type="text"
                      required={isSignUp}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Enako"
                      className="block w-full h-12 px-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number & Branch */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="phone"
                      className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                    >
                      Mobile Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+237 670 123 456"
                      className="block w-full h-12 px-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label 
                      htmlFor="branch"
                      className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                    >
                      Hub / Branch *
                    </label>
                    <select
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="block w-full h-12 px-2.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] text-xs font-semibold focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                    >
                      <option>Douala Main Hub</option>
                      <option>Yaoundé Branch</option>
                      <option>Bamenda Station</option>
                      <option>Bafoussam Agency</option>
                      <option>Limbe Office</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email Address or Phone */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email"
                className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
              >
                {isSignUp ? 'Email Address *' : 'Email Address or Phone *'}
              </label>
              <input
                id="email"
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder={isSignUp ? 'collector@enako.cm' : 'collector@enako.cm or phone number'}
                className="block w-full h-12 px-3.5 border border-[#0891b2] bg-[#ffffff] text-[#1a1c1c] font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password"
                  className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                >
                  Password *
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setForgotMsg(!forgotMsg)}
                    className="text-[11px] font-bold text-[#0891b2] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create password' : '••••••••'}
                  className="block w-full h-12 pl-3.5 pr-11 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#0891b2] p-1 focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Mode) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label 
                  htmlFor="confirm-password"
                  className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                >
                  Confirm Password *
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required={isSignUp}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="block w-full h-12 px-3.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] font-mono text-sm focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
                />
              </div>
            )}

            {forgotMsg && !isSignUp && (
              <div className="p-3 bg-[#f3f3f3] border border-[#e5e5e5] text-xs text-[#5f5e5e] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0891b2] shrink-0" />
                <span>Default demo password is <strong>password123</strong>. Or contact supervisor at <strong>+237 233 42 00 00</strong>.</span>
              </div>
            )}

            {/* Keep Logged In Checkbox (Login Mode) */}
            {!isSignUp && (
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
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white text-sm font-bold tracking-wider uppercase transition-all active:scale-[0.99] cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isLoading 
                  ? (isSignUp ? 'Registering Account...' : 'Authenticating...') 
                  : (isSignUp ? 'Complete Registration & Sign In' : 'Sign In Securely')}
              </button>
            </div>
          </form>

          {/* Toggle between Login and Quick Sign Up */}
          <div className="pt-4 border-t border-[#e5e5e5] text-center">
            {isSignUp ? (
              <p className="text-xs text-[#5f5e5e]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
                  className="font-bold text-[#0891b2] hover:underline"
                >
                  Log In Here
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#5f5e5e]">
                Don't have a collector account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
                  className="font-bold text-[#0891b2] hover:underline"
                >
                  Create Account (Sign Up)
                </button>
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-widest text-[#64748b] uppercase mt-4">
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
