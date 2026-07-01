import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../config';
import { setMemoryToken, clearMemoryToken } from '../utils/authFetch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // null = loading, false = unauthenticated, object = authenticated
    const [authStatus, setAuthStatus] = useState(null);
    const refreshTimerRef = useRef(null);

    // Schedule a silent token refresh 1 minute before the 15-min access token expires
    const scheduleRefresh = useCallback((onRefresh) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(onRefresh, 14 * 60 * 1000);
    }, []);

    const silentRefresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setMemoryToken(data.accessToken);
                setUser(data.user);
                setAuthStatus(data.user);
                scheduleRefresh(silentRefresh);
            } else {
                clearMemoryToken();
                setUser(null);
                setAuthStatus(false);
            }
        } catch {
            clearMemoryToken();
            setUser(null);
            setAuthStatus(false);
        }
    }, [scheduleRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

    // Attempt silent session restore on mount
    useEffect(() => {
        silentRefresh();
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const register = useCallback(async ({ name, email, password, confirmPassword }) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');
        setMemoryToken(data.accessToken);
        setUser(data.user);
        setAuthStatus(data.user);
        scheduleRefresh(silentRefresh);
        return data.user;
    }, [scheduleRefresh, silentRefresh]);

    const login = useCallback(async ({ email, password, rememberMe }) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, rememberMe })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');
        setMemoryToken(data.accessToken);
        setUser(data.user);
        setAuthStatus(data.user);
        scheduleRefresh(silentRefresh);
        return data.user;
    }, [scheduleRefresh, silentRefresh]);

    const logout = useCallback(async () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } finally {
            clearMemoryToken();
            setUser(null);
            setAuthStatus(false);
        }
    }, []);

    const forgotPassword = useCallback(async (email) => {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed.');
        return data.message;
    }, []);

    const resetPassword = useCallback(async ({ token, password, confirmPassword }) => {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password, confirmPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed.');
        return data.message;
    }, []);

    return (
        <AuthContext.Provider value={{ user, authStatus, register, login, logout, forgotPassword, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
