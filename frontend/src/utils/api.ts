export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

let activeAccessToken: string | null = localStorage.getItem('taskflow_access_token');
let activeRefreshToken: string | null = localStorage.getItem('taskflow_refresh_token');
let activeUser: any | null = localStorage.getItem('taskflow_user') 
  ? JSON.parse(localStorage.getItem('taskflow_user')!) 
  : null;

export function getAccessToken() {
  return activeAccessToken;
}

export function getRefreshToken() {
  return activeRefreshToken;
}

export function getUser() {
  return activeUser;
}

export function setTokens(accessToken: string, refreshToken: string, user?: any) {
  activeAccessToken = accessToken;
  activeRefreshToken = refreshToken;
  localStorage.setItem('taskflow_access_token', accessToken);
  localStorage.setItem('taskflow_refresh_token', refreshToken);
  
  if (user) {
    activeUser = user;
    localStorage.setItem('taskflow_user', JSON.stringify(user));
  }
}

export function clearTokens() {
  activeAccessToken = null;
  activeRefreshToken = null;
  activeUser = null;
  localStorage.removeItem('taskflow_access_token');
  localStorage.removeItem('taskflow_refresh_token');
  localStorage.removeItem('taskflow_user');
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiRequest<T = any>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (activeAccessToken) {
    headers.set('Authorization', `Bearer ${activeAccessToken}`);
  }

  const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? '' : 'https://taskflow-j39g.onrender.com');
  const url = path.startsWith('/api') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && activeRefreshToken && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          headers.set('Authorization', `Bearer ${token}`);
          fetch(url, { ...options, headers })
            .then(res => res.json())
            .then(json => {
              if (json.error) reject(json.error);
              else resolve(json.data as T);
            })
            .catch(reject);
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: activeRefreshToken }),
      });

      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        const { access_token, refresh_token } = refreshJson.data;
        setTokens(access_token, refresh_token);
        isRefreshing = false;
        onRefreshed(access_token);
        
        // Retry original request
        headers.set('Authorization', `Bearer ${access_token}`);
        const retryRes = await fetch(url, { ...options, headers });
        const retryJson = await retryRes.json();
        if (!retryRes.ok) {
          throw retryJson.error || new Error('Request failed after refresh');
        }
        return retryJson.data as T;
      } else {
        isRefreshing = false;
        clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } catch (err) {
      isRefreshing = false;
      clearTokens();
      window.location.href = '/login';
      throw err;
    }
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw json.error || { message: response.statusText, code: 'HTTP_ERROR' };
  }

  return json.data as T;
}
