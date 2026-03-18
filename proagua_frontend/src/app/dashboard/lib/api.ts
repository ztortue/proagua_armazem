// =============================================================================
// proagua_frontend/src/app/dashboard/lib/api.ts — VERSION FINALE CORRIGÉE
//
// BUGS CORRIGÉS :
//  #1 — FormData : Content-Type: undefined kase Django (boundary manke)
//       → Intercepteur REQUEST retire Content-Type si data = FormData
//       → Axios mete bon multipart/form-data; boundary=... otomatikman
//  #2 — pilier_affectation manke nan JWTPayload interface
//  #3 — logout() ak intercepteur 401 te redirijye sou URL diferan
//  #4 — withCredentials te koze 403 sou POST/PUT/DELETE
//  #5 — 403 te deklanche refresh → boucle enfini
// =============================================================================

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // ✅ withCredentials RETIRE — JWT Bearer sèlman, pa de cookie CSRF
});

// ── Intercepteur REQUEST ─────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ FIX CRITIQUE — FormData : retire Content-Type pou kite axios
  // mete bon header "multipart/form-data; boundary=----..." otomatikman.
  //
  // Si ou mete { 'Content-Type': undefined } oswa { 'Content-Type': 'multipart/form-data' }
  // manyèlman, boundary a manke → Django pa ka parse champ yo (entrepot_principal_id,
  // categorie_id etc.) → materyal kreye men vid nan DB.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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

// ── Intercepteur RESPONSE ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ✅ 403 = pa gen dwa → PAS de refresh, rejte dirèkteman
    // (Anvan: 403 te deklanche refresh → boucle enfini si pa gen dwa)
    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    // ✅ 401 = token ekspire → eseye refresh
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
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        // ✅ axios natif (pa `api`) pou evite boucle enfini
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh: newRefresh } = res.data;
        localStorage.setItem('access_token', access);

        // ✅ ROTATE_REFRESH_TOKENS=True : sove nouvo refresh token
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);

        processQueue(access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(null, refreshError);
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Types JWT ─────────────────────────────────────────────────────────────────
export interface JWTPayload {
  user_id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
  // ✅ pilier_affectation te manke → filtraj pilar te echwe silansyozman
  pilier_affectation: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
  is_superuser?: boolean;
  exp: number;
}

function decodeJwtPayload(raw: string): JWTPayload | null {
  try {
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

  // Verifye ekspirrasyon
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export const isAuthenticated = () => getUserFromToken() !== null;
export const isAdmin = () => getUserFromToken()?.role === 'ADMIN';
export const isManager = () => getUserFromToken()?.role === 'MANAGER';
export const isManagerOrAdmin = () =>
  ['ADMIN', 'MANAGER'].includes(getUserFromToken()?.role ?? '');
export const isConsultation = () => getUserFromToken()?.role === 'CONSULTATION';

// ✅ logout toujou al sou '/' — konsistan ak intercepteur 401
export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/';
}