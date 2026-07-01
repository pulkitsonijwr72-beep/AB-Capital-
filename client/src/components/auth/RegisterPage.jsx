import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Loader2, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function PasswordRule({ met, label }) {
    return (
        <li className={`flex items-center gap-1.5 transition-colors ${met ? 'text-brand-emerald' : 'text-brand-muted'}`}>
            {met
                ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                : <XCircle className="h-3 w-3 shrink-0 opacity-50" />}
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

export default function RegisterPage({ onNavigate }) {
    const { register } = useAuth();

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedPw, setFocusedPw] = useState(false);

    const rules = passwordRules(form.password);
    const allRulesMet = Object.values(rules).every(Boolean);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.name.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }
        if (!allRulesMet) { setError('Password does not meet all requirements.'); return; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        setError('');
        try {
            await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, confirmPassword: form.confirmPassword });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

                {/* Card */}
                <div className="bg-brand-card border border-brand-border rounded-2xl p-8 shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-brand-text">Create your account</h2>
                        <p className="text-brand-muted text-xs mt-1">Register to access the AB Capital system</p>
                    </div>

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 bg-brand-crimson/10 border border-brand-crimson/30 text-brand-crimson text-xs rounded-lg px-3.5 py-3">
                            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                <input
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Your name"
                                    className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-premium"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-premium"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                    value={form.password}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedPw(true)}
                                    placeholder="Min. 8 characters"
                                    className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-premium"
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

                            {/* Password strength rules */}
                            {(focusedPw || form.password.length > 0) && (
                                <ul className="mt-2 space-y-0.5 text-[10px] pl-1">
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
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    required
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Repeat your password"
                                    className={`w-full bg-brand-dark border rounded-lg pl-10 pr-10 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none transition-premium ${form.confirmPassword.length > 0
                                        ? form.confirmPassword === form.password
                                            ? 'border-brand-emerald focus:border-brand-emerald'
                                            : 'border-brand-crimson focus:border-brand-crimson'
                                        : 'border-brand-border focus:border-brand-accent'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
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
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/85 disabled:opacity-60 disabled:cursor-not-allowed text-brand-dark font-bold text-sm rounded-lg py-2.5 transition-premium shadow-lg shadow-brand-accent/20 mt-2"
                        >
                            {loading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                                : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-brand-muted mt-6">
                        Already have an account?{' '}
                        <button
                            onClick={() => onNavigate('login')}
                            className="text-brand-accent hover:text-brand-accent/80 font-semibold transition-colors"
                        >
                            Sign in
                        </button>
                    </p>
                </div>

                <p className="text-center text-[10px] text-brand-muted/50 mt-6 uppercase tracking-widest">
                    Secured · Private Ledger System
                </p>
            </div>
        </div>
    );
}
