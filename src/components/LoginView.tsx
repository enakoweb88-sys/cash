import React, { useState } from 'react';
import { ShieldCheck, CheckSquare, Square, AlertCircle, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { CollectorUser } from '../types';

interface LoginViewProps {
  onLogin: (credentials: { email: string; password?: string; remember: boolean }) => void;
  onSignUp: (userData: { firstName: string; lastName: string; email: string; password?: string }) => void;
  currentUser: CollectorUser;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, currentUser }) => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('collector@enako.cm');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (isSignUp) {
        onSignUp({
          firstName: firstName.trim() || 'Collector',
          lastName: lastName.trim() || 'User',
          email: email.trim(),
          password,
        });
      } else {
        onLogin({
          email: email.trim() || 'collector@enako.cm',
          password,
          remember: rememberMe,
        });
      }
    }, 400);
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
              {isSignUp ? 'Quick Sign Up' : 'Collector Portal'}
            </h1>
            <p className="text-xs text-[#5f5e5e]">
              {isSignUp 
                ? 'Create your collector account to access the field portal.' 
                : 'Enter your email and password to access the system securely.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sign Up Fields: First Name & Last Name */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label 
                    htmlFor="first-name"
                    className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                  >
                    First Name *
                  </label>
                  <div className="relative">
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
                </div>

                <div className="space-y-1.5">
                  <label 
                    htmlFor="last-name"
                    className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
                  >
                    Last Name *
                  </label>
                  <div className="relative">
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
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email"
                className="block text-[11px] font-bold tracking-wider text-[#4a4a4a] uppercase"
              >
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collector@enako.cm"
                className="block w-full h-12 px-3.5 border border-[#0891b2] bg-[#ffffff] text-[#1a1c1c] font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#0891b2] transition-colors"
              />
            </div>

            {/* Password with View Password Toggle */}
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {forgotMsg && !isSignUp && (
              <div className="p-3 bg-[#f3f3f3] border border-[#e5e5e5] text-xs text-[#5f5e5e] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0891b2] shrink-0" />
                <span>Contact Central Security Supervisor at <strong>+237 233 42 00 00</strong> for password resets.</span>
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
                className="w-full flex justify-center items-center h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white text-sm font-bold tracking-wider uppercase transition-all active:scale-[0.99] cursor-pointer shadow-sm"
              >
                {isLoading 
                  ? (isSignUp ? 'Creating Account...' : 'Authenticating...') 
                  : (isSignUp ? 'Create Account & Sign In' : 'Sign In Securely')}
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
                  onClick={() => setIsSignUp(false)}
                  className="font-bold text-[#0891b2] hover:underline"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#5f5e5e]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="font-bold text-[#0891b2] hover:underline"
                >
                  Quick Sign Up
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

