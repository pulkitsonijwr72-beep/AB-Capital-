import React, { useState } from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPasswordPage({ onNavigate }) {
    const { forgotPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const INPUT_BASE = 'w-full bg-brand-dark border border-brand-border rounded-lg py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-premium';

    return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Brand header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-accent rounded-xl mb-4 shadow-lg shadow-brand-accent/20">
                        <span className="text-brand-dark font-extrabold text-lg font-mono">AB</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-brand-text tracking-tight">AB Capital</h1>
                    <p className="text-brand-muted text-xs uppercase tracking-widest mt-1">Private Finance Console</p>
                </div>

                <div className="bg-brand-card border border-brand-border rounded-2xl p-8 shadow-2xl">
                    {sent ? (
                        /* ── Success state ── */
                        <div className="text-center py-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-emerald/15 border border-brand-emerald/30 rounded-full mb-5">
                                <CheckCircle className="h-8 w-8 text-brand-emerald" />
                            </div>
                            <h2 className="text-base font-bold text-brand-text mb-2">Check your inbox</h2>
                            <p className="text-brand-muted text-xs leading-relaxed">
                                If an account exists for{' '}
                                <span className="text-brand-text font-semibold">{email}</span>,
                                a password reset link has been sent.
                            </p>
                            <div className="mt-4 bg-brand-accent/8 border border-brand-accent/20 rounded-lg px-4 py-3 text-xs text-brand-muted/80 text-left space-y-1">
                                <p>⏱ The link expires in <span className="text-brand-text font-semibold">15 minutes</span>.</p>
                                <p>🔒 The link can only be used once.</p>
                                <p className="text-brand-muted/50 text-[10px] pt-1">
                                    Dev mode: if email sending fails, the token is printed to the server console.
                                </p>
                            </div>
                            <button
                                onClick={() => onNavigate('reset')}
                                className="mt-5 text-xs text-brand-accent hover:text-brand-accent/80 font-semibold transition-colors"
                            >
                                Enter reset token manually →
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-brand-text">Forgot your password?</h2>
                                <p className="text-brand-muted text-xs mt-1 leading-relaxed">
                                    Enter the email associated with your account and we'll send a secure reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-5 flex items-start gap-2.5 bg-brand-crimson/10 border border-brand-crimson/30 text-brand-crimson text-xs rounded-lg px-3.5 py-3">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setError(''); }}
                                            placeholder="you@company.com"
                                            autoComplete="email"
                                            className={`${INPUT_BASE} pl-10 pr-4`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/85 disabled:opacity-60 disabled:cursor-not-allowed text-brand-dark font-bold text-sm rounded-lg py-2.5 transition-premium shadow-lg shadow-brand-accent/20"
                                >
                                    {loading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending reset link...</>
                                        : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                    )}

                    <button
                        onClick={() => onNavigate('login')}
                        className="mt-6 flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors mx-auto"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                    </button>
                </div>

                <p className="text-center text-[10px] text-brand-muted/50 mt-6 uppercase tracking-widest">
                    Secured · Private Ledger System
                </p>
            </div>
        </div>
    );
}
