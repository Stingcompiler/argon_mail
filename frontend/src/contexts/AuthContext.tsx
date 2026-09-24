'use client';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, authCall, setRefreshHandler, tokenStore } from '@/lib/api/client';
import type { User } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';

/**
 * Auth state (JWT):
 * - access token: memory only (tokenStore), never localStorage/sessionStorage.
 * - refresh token: HttpOnly cookie managed by Django, invisible to JS.
 * - 'expired' means the user was signed in and the session ended; admin
 *   screens stay mounted under a re-login dialog so unsaved input survives.
 */
type Status = 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'expired';
type Session = { access: string; user: User };
type Auth = {
  status: Status;
  user: User | null;
  /** `login` is an e-mail or a username. */
  login: (login: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Restores a session from the refresh cookie. Called by admin screens only,
   * so public visitors never hit the auth endpoints. */
  bootstrap: () => void;
};

const AuthContext = createContext<Auth | null>(null);
const CHANNEL = 'arjoon-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const inflight = useRef<Promise<string | null> | null>(null);
  const statusRef = useRef<Status>('unknown');
  statusRef.current = status;

  const apply = useCallback((s: Session) => {
    tokenStore.set(s.access);
    setUser(s.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback((next: 'anonymous' | 'expired') => {
    tokenStore.set(null);
    setStatus(next);
    if (next === 'anonymous') {
      setUser(null);
      queryClient.removeQueries({ queryKey: qk.admin.all });
    }
  }, [queryClient]);

  // Refreshes are serialised across tabs with the Web Locks API, because the
  // server blacklists a refresh token as soon as it has been rotated once.
  const refresh = useCallback((): Promise<string | null> => {
    if (inflight.current) return inflight.current;
    const run = async () => {
      try {
        const s = await authCall<Session>('refresh');
        apply(s);
        return s.access;
      } catch (e) {
        const wasSignedIn = statusRef.current === 'authenticated';
        if (!(e instanceof ApiError) || e.status !== 0) endSession(wasSignedIn ? 'expired' : 'anonymous');
        return null;
      }
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const p: Promise<string | null> = (locks ? locks.request('arjoon-refresh', () => run()).then((v) => v) : run())
      .finally(() => { inflight.current = null; });
    inflight.current = p;
    return p;
  }, [apply, endSession]);

  useEffect(() => {
    setRefreshHandler(refresh);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
    if (channel) channel.onmessage = (e) => { if (e.data === 'logout') endSession('anonymous'); };
    return () => { setRefreshHandler(null); channel?.close(); };
  }, [refresh, endSession]);

  const bootstrap = useCallback(() => {
    if (statusRef.current !== 'unknown') return;
    statusRef.current = 'loading';
    setStatus('loading');
    refresh();
  }, [refresh]);

  const login = useCallback(async (ident: string, password: string) => {
    const s = await authCall<Session>('login', { login: ident, password });
    if (user && user.id !== s.user.id) queryClient.removeQueries({ queryKey: qk.admin.all });
    apply(s);
    queryClient.invalidateQueries({ queryKey: qk.admin.all });
    return s.user;
  }, [apply, queryClient, user]);

  const logout = useCallback(async () => {
    try { await authCall('logout'); } catch {}
    endSession('anonymous');
    if (typeof BroadcastChannel !== 'undefined') {
      const c = new BroadcastChannel(CHANNEL);
      c.postMessage('logout');
      c.close();
    }
  }, [endSession]);

  const value = useMemo(() => ({ status, user, login, logout, bootstrap }), [status, user, login, logout, bootstrap]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
