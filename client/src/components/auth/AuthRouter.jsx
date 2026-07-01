import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import LoadingScreen from './LoadingScreen';

/**
 * AuthRouter wraps the entire app.
 * - While session is restoring → LoadingScreen
 * - If authenticated          → renders children (the main app)
 * - If not authenticated      → auth page determined by authView state
 *
 * On mount, checks window.location.search for ?reset_token=
 * If found, opens the ResetPasswordPage directly so email links work.
 */
export default function AuthRouter({ children }) {
    const { authStatus } = useAuth();

    // If the URL contains a reset token, open the reset page immediately
    const [authView, setAuthView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('reset_token') ? 'reset' : 'login';
    });

    // Session restore in progress
    if (authStatus === null) {
        return <LoadingScreen />;
    }

    // Not authenticated → show auth pages
    if (authStatus === false) {
        if (authView === 'register') return <RegisterPage onNavigate={setAuthView} />;
        if (authView === 'forgot') return <ForgotPasswordPage onNavigate={setAuthView} />;
        if (authView === 'reset') return <ResetPasswordPage onNavigate={setAuthView} />;
        return <LoginPage onNavigate={setAuthView} />;
    }

    // Authenticated → render the app
    return children;
}
