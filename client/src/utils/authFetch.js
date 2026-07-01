import { API_BASE } from '../config';

// Module-level token store (avoids circular imports)
let _token = null;

export function setMemoryToken(t) { _token = t; }
export function getMemoryToken() { return _token; }
export function clearMemoryToken() { _token = null; }

/**
 * Drop-in replacement for fetch() that:
 *  1. Injects the Authorization: Bearer <token> header automatically.
 *  2. On 401 TOKEN_EXPIRED, silently refreshes once and retries.
 *  3. On any other 401, clears the token (caller handles redirect via auth state).
 */
export async function authFetch(input, init = {}) {
    const makeHeaders = (tok) => ({
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        ...(tok ? { Authorization: `Bearer ${tok}` } : {})
    });

    let res = await fetch(input, {
        ...init,
        headers: makeHeaders(_token),
        credentials: 'include'
    });

    if (res.status === 401) {
        let body = {};
        try { body = await res.clone().json(); } catch { /* ignore */ }

        if (body.code === 'TOKEN_EXPIRED') {
            // Attempt silent token refresh
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setMemoryToken(data.accessToken);

                // Retry original request with new token
                res = await fetch(input, {
                    ...init,
                    headers: makeHeaders(data.accessToken),
                    credentials: 'include'
                });
            } else {
                clearMemoryToken();
            }
        } else {
            clearMemoryToken();
        }
    }

    return res;
}
