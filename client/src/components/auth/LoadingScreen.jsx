import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 bg-brand-accent rounded-2xl shadow-lg shadow-brand-accent/20">
                <span className="text-brand-dark font-extrabold text-xl font-mono">AB</span>
            </div>
            <Loader2 className="h-5 w-5 text-brand-muted animate-spin" />
            <p className="text-brand-muted text-[10px] uppercase tracking-widest">Restoring session…</p>
        </div>
    );
}
