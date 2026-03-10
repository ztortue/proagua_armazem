// src/lib/api.ts — VERSION CORRIGÉE (JWT ONLY)
//
// PROBLÈME RÉSOLU:
//   ❌ withCredentials: true  → envoie cookie CSRF inutile, cause 403 sur POST/PUT/DELETE
//   ❌ Refresh déclenché sur 403 → boucle infinie si pas les droits
//   ❌ processQueue ne passait pas l'erreur correctement
//   ❌ ROTATE_REFRESH_TOKENS=True ignoré (nouveau refresh token pas sauvegardé)

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // ✅ withCredentials SUPPRIMÉ — JWT Bearer uniquement, pas de cookie
});

// ── Intercepteur REQUEST : Bearer token automatique ──────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── File d'attente pendant le refresh ────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (token: string | null, error: unknown = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
};

// ── Intercepteur RESPONSE : Refresh sur 401 uniquement ───────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ✅ 403 = pas les droits → PAS de refresh, rejeter directement
    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    // ✅ 401 = token expiré → tenter le refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }

      try {
        // ✅ axios natif (pas `api`) pour éviter boucle infinie
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh: newRefresh } = res.data;
        localStorage.setItem('access_token', access);

        // ✅ ROTATE_REFRESH_TOKENS=True : sauvegarder le nouveau refresh token
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);

        processQueue(access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(null, refreshError);
        localStorage.clear();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Types et helpers ──────────────────────────────────────────────────────────
export interface JWTPayload {
  user_id: number;
  username: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
  pilier_affectation: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
  exp: number;
}

function decodeJwtPayload(raw: string): JWTPayload | null {
  try {
    // JWT uses base64url; convert to standard base64 and pad before atob.
    let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    return JSON.parse(atob(base64)) as JWTPayload;
  } catch {
    return null;
  }
}

export function getUserFromToken(): JWTPayload | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payload = decodeJwtPayload(parts[1]);
  if (!payload) return null;

  // Verifier expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export const isAuthenticated = () => getUserFromToken() !== null;

// ✅ Chak rôle separe
export const isAdmin = () => getUserFromToken()?.role === 'ADMIN';
export const isManager = () => getUserFromToken()?.role === 'MANAGER';
export const isManagerOrAdmin = () => ['ADMIN', 'MANAGER'].includes(getUserFromToken()?.role ?? '');
export const isConsultation = () => getUserFromToken()?.role === 'CONSULTATION';

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/'; // Rout = page login ou homepage selon besoin
}
