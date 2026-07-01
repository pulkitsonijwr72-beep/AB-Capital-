import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Key, Loader2, ArrowLeft, CheckCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function PasswordRule({ met, label }) {
    return (
        <li className={`flex items-center gap-1.5 transition-premium ${met ? 'text-brand-emerald' : 'text-brand-muted'}`}>
            {met
                ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                : <XCircle className="h-3 w-3 shrink-0 opacity-40" />}
            <span>{label}</span>
        </li>
    );
}

function passwordRules(pw) {
    return {
        length: pw.length >= 8,
        lower: /[a-z]/.test(pw),
        upper: /[A-Z]/.test(pw),
        digit: /\d/.test(pw),
        special: /[\W_]/.test(pw)
    };
}

// Password strength score 0–5
function strengthScore(rules) {
    return Object.values(rules).filter(Boolean).length;
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', 'bg-brand-crimson', 'bg-brand-crimson', 'bg-brand-amber', 'bg-brand-emerald', 'bg-brand-emerald'];

export default function ResetPasswordPage({ onNavigate }) {
    const { resetPassword } = useAuth();

    // Auto-read ?reset_token= from URL — populated when user clicks the email link
    const [form, setForm] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('reset_token') || '';
        return { token: tokenFromUrl, password: '', confirmPassword: '' };
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tokenFromUrl, setTokenFromUrl] = useState(false);

    // Detect if token came from URL so we can hide the manual token field
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset_token')) setTokenFromUrl(true);
    }, []);

    const rules = passwordRules(form.password);
    const score = strengthScore(rules);
    const allMet = score === 5;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.token.trim()) { setError('Reset token is required.'); return; }
        if (!allMet) { setError('Password does not meet all requirements.'); return; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        setError('');
        try {
            const msg = await resetPassword({
                token: form.token.trim(),
                password: form.password,
                confirmPassword: form.confirmPassword
            });
            setSuccess(msg || 'Password reset successful!');
            // Clean the token from the URL without a page reload
            window.history.replaceState({}, '', window.location.pathname);
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
                    {success ? (
                        /* ── Success state ── */
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-emerald/15 border border-brand-emerald/30 rounded-full mb-5">
                                <CheckCircle className="h-8 w-8 text-brand-emerald" />
                            </div>
                            <h2 className="text-lg font-bold text-brand-text mb-2">Password updated</h2>
                            <p className="text-brand-muted text-xs leading-relaxed mb-6">{success}</p>
                            <button
                                onClick={() => onNavigate('login')}
                                className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/85 text-brand-dark font-bold text-sm rounded-lg py-2.5 transition-premium shadow-lg shadow-brand-accent/20"
                            >
                                Sign in with new password
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-brand-text">Set new password</h2>
                                <p className="text-brand-muted text-xs mt-1">
                                    {tokenFromUrl
                                        ? 'Your reset link is loaded. Choose a strong new password below.'
                                        : 'Paste the token from your reset email, then choose a new password.'}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-5 flex items-start gap-2.5 bg-brand-crimson/10 border border-brand-crimson/30 text-brand-crimson text-xs rounded-lg px-3.5 py-3">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} noValidate className="space-y-4">

                                {/* Token field — hidden when token came from URL */}
                                {!tokenFromUrl && (
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                                            Reset Token
                                        </label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                            <input
                                                type="text"
                                                name="token"
                                                required
                                                value={form.token}
                                                onChange={handleChange}
                                                placeholder="Paste reset token here"
                                                className={`${INPUT_BASE} pl-10 pr-4 font-mono`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Token loaded from URL — show a subtle confirmation badge */}
                                {tokenFromUrl && (
                                    <div className="flex items-center gap-2 bg-brand-emerald/10 border border-brand-emerald/25 rounded-lg px-3.5 py-2.5 text-xs text-brand-emerald">
                                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                        Reset link verified — enter your new password below
                                    </div>
                                )}

                                {/* New password */}
                                <div>
                                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            autoComplete="new-password"
                                            required
                                            value={form.password}
                                            onChange={handleChange}
                                            placeholder="Min. 8 characters"
                                            className={`${INPUT_BASE} pl-10 pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Password strength bar */}
                                    {form.password.length > 0 && (
                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <div
                                                        key={n}
                                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= score ? STRENGTH_COLORS[score] : 'bg-brand-border'}`}
                                                    />
                                                ))}
                                            </div>
                                            {score > 0 && (
                                                <p className={`text-[10px] font-medium ${STRENGTH_COLORS[score].replace('bg-', 'text-')}`}>
                                                    {STRENGTH_LABELS[score]}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Rules checklist */}
                                    {form.password.length > 0 && (
                                        <ul className="mt-2.5 space-y-0.5 text-[10px] pl-1">
                                            <PasswordRule met={rules.length} label="At least 8 characters" />
                                            <PasswordRule met={rules.upper} label="One uppercase letter" />
                                            <PasswordRule met={rules.lower} label="One lowercase letter" />
                                            <PasswordRule met={rules.digit} label="One number" />
                                            <PasswordRule met={rules.special} label="One special character" />
                                        </ul>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            name="confirmPassword"
                                            autoComplete="new-password"
                                            required
                                            value={form.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Repeat new password"
                                            className={`${INPUT_BASE} pl-10 pr-10 ${form.confirmPassword.length > 0
                                                    ? form.confirmPassword === form.password
                                                        ? 'border-brand-emerald focus:border-brand-emerald'
                                                        : 'border-brand-crimson focus:border-brand-crimson'
                                                    : 'focus:border-brand-accent'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                                            aria-label={showConfirm ? 'Hide' : 'Show'}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {form.confirmPassword.length > 0 && form.confirmPassword !== form.password && (
                                        <p className="text-[10px] text-brand-crimson mt-1 pl-1">Passwords do not match</p>
                                    )}
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading || !allMet || form.password !== form.confirmPassword}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/85 disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-bold text-sm rounded-lg py-2.5 transition-premium shadow-lg shadow-brand-accent/20 mt-2"
                                >
                                    {loading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</>
                                        : 'Set New Password'}
                                </button>
                            </form>
                        </>
                    )}

                    {!success && (
                        <button
                            onClick={() => onNavigate('login')}
                            className="mt-6 flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors mx-auto"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                        </button>
                    )}
                </div>

                <p className="text-center text-[10px] text-brand-muted/50 mt-6 uppercase tracking-widest">
                    Secured · Private Ledger System
                </p>
            </div>
        </div>
    );
}
