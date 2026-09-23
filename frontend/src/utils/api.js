/**
 * Hybrid Cloud-First with Local Offline Fallback API Client
 * 
 * Behavior:
 * 1. Cloud-First: Directs API requests to Cloud Server (Render / Supabase).
 * 2. Instant Local Fallback: If device has no internet (navigator.onLine === false)
 *    or the Cloud Server is down / unreachable, automatically reroutes requests
 *    to the local embedded server (http://localhost:3001) without crashing or hanging.
 * 3. Auto-Reconnection: Probes cloud health when network is restored and resumes Cloud Mode.
 */

export const LOCAL_API_URL = 'http://localhost:3001';

export const getCloudUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('verity_cloud_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  }
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
};

// Tracking state
let isCloudDown = false;
const statusListeners = new Set();

export const getConnectionStatus = () => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cloudUrl = getCloudUrl();
  const hasCloud = Boolean(cloudUrl && cloudUrl !== LOCAL_API_URL);
  const activeMode = (hasCloud && isOnline && !isCloudDown) ? 'cloud' : 'local';

  return {
    isOnline,
    isCloudDown,
    activeMode, // 'cloud' | 'local'
    cloudUrl,
    localUrl: LOCAL_API_URL
  };
};

export const subscribeConnectionStatus = (callback) => {
  statusListeners.add(callback);
  callback(getConnectionStatus());
  return () => statusListeners.delete(callback);
};

const notifyListeners = () => {
  const status = getConnectionStatus();
  statusListeners.forEach((fn) => {
    try { fn(status); } catch (_) {}
  });
};

// Probe Cloud Server health
export const checkCloudHealth = async () => {
  const cloudUrl = getCloudUrl();
  if (!cloudUrl || cloudUrl === LOCAL_API_URL || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    isCloudDown = true;
    notifyListeners();
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${cloudUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      if (isCloudDown) {
        console.log('🟢 [Network] Cloud server is online and operational. Switched to Cloud Mode.');
      }
      isCloudDown = false;
      notifyListeners();
      return true;
    }
  } catch (_) {
    // Cloud remains unreachable
  }

  isCloudDown = true;
  notifyListeners();
  return false;
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Network connectivity restored. Probing cloud server...');
    checkCloudHealth();
  });

  window.addEventListener('offline', () => {
    console.warn('[Network] Network is offline. Switched to local offline fallback.');
    isCloudDown = true;
    notifyListeners();
  });
}

/**
 * Universal apiFetch with automatic Cloud-to-Local fallback.
 */
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cloudUrl = getCloudUrl();
  let targetUrl = url;

  // Resolve relative URLs to current active base
  if (targetUrl.startsWith('/')) {
    targetUrl = `${cloudUrl || LOCAL_API_URL}${targetUrl}`;
  }

  // Cache busting for GET requests to prevent stale data
  if (!options.method || options.method.toUpperCase() === 'GET') {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}_t=${Date.now()}`;
  }

  const isTargetingCloud = cloudUrl && targetUrl.startsWith(cloudUrl) && cloudUrl !== LOCAL_API_URL;
  const localFallbackUrl = isTargetingCloud ? targetUrl.replace(cloudUrl, LOCAL_API_URL) : targetUrl;

  // 1. If we already know the device is offline or cloud is down, go straight to local
  if (isTargetingCloud && (!navigator.onLine || isCloudDown)) {
    try {
      return await fetch(localFallbackUrl, { ...options, headers });
    } catch (localErr) {
      console.warn('[apiFetch] Local offline server failed:', localErr.message);
      throw localErr;
    }
  }

  // 2. Attempt Cloud Request
  try {
    const response = await fetch(targetUrl, { ...options, headers });
    // Valid response from cloud
    if (isCloudDown) {
      isCloudDown = false;
      notifyListeners();
    }
    return response;
  } catch (err) {
    // 3. Fallback to Local Server on Network / Unreachable error
    if (isTargetingCloud) {
      console.warn(`⚠️ [apiFetch] Cloud server unreachable (${err.message}). Seamlessly falling back to local server: ${localFallbackUrl}`);
      isCloudDown = true;
      notifyListeners();

      try {
        const localRes = await fetch(localFallbackUrl, { ...options, headers });
        return localRes;
      } catch (localErr) {
        console.error('❌ [apiFetch] Both cloud and local server failed:', localErr.message);
        throw err;
      }
    }
    throw err;
  }
};

export default apiFetch;
