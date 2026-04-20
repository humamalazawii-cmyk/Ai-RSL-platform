import React from 'react';

interface AuthBoxProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
}

/**
 * AuthBox — Shared layout for authentication pages
 * --------------------------------------------------
 * Used by: login, investor, forgot-password, reset-password
 * Provides: centered card with title, subtitle, optional back button
 * --------------------------------------------------
 */
export default function AuthBox({
  title,
  subtitle,
  children,
  onBack,
}: AuthBoxProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-teal-400 mb-4"
          >
            ← العودة
          </button>
        )}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="text-center text-xs text-slate-600 mt-8">© 2026 RSL-AI</p>
      </div>
    </div>
  );
}
