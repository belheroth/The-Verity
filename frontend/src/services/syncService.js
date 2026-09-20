import localStore from './localStore';
import { apiFetch } from '../utils/api';

/**
 * Offline Sync Service
 * 
 * Replays queued mutations (submissions, drafts, updates) stored in the local
 * SQLite database whenever internet/server connectivity is re-established.
 */

let isSyncing = false;

export const syncService = {
    // Process all pending mutations in the local SQLite/storage queue
    async syncOfflineQueue(authToken) {
        if (isSyncing) return { synced: 0, status: 'already_running' };
        if (!navigator.onLine) return { synced: 0, status: 'offline' };

        const queue = await localStore.getSyncQueue();
        if (!queue || queue.length === 0) return { synced: 0, status: 'empty' };

        isSyncing = true;
        let syncedCount = 0;

        console.log(`[SyncService] Found ${queue.length} pending offline actions in local storage. Syncing...`);

        for (const item of queue) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }

                const res = await apiFetch(item.url, {
                    method: item.method || 'POST',
                    headers,
                    body: typeof item.body === 'object' ? JSON.stringify(item.body) : item.body
                });

                if (res.ok) {
                    await localStore.removeFromSyncQueue(item.id);
                    syncedCount++;
                } else if (res.status >= 400 && res.status < 500) {
                    // Client error (e.g. invalid format or duplicate), remove from queue so it doesn't block forever
                    console.warn(`[SyncService] Item ${item.id} returned HTTP ${res.status}. Dropping from queue.`);
                    await localStore.removeFromSyncQueue(item.id);
                } else {
                    // Server error (5xx or temporary network blip) — pause and retry next cycle
                    console.warn(`[SyncService] Server error HTTP ${res.status} on sync. Will retry later.`);
                    break;
                }
            } catch (err) {
                console.warn('[SyncService] Network error during sync item processing:', err.message);
                break;
            }
        }

        isSyncing = false;
        console.log(`[SyncService] Sync cycle complete. Synced ${syncedCount} items.`);
        return { synced: syncedCount, status: 'complete' };
    },

    // Setup automatic listener to flush queue on reconnect
    initAutoSync(getAuthToken) {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            console.log('[SyncService] Network connectivity restored. Triggering offline sync...');
            const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
            syncService.syncOfflineQueue(token);
        });
    }
};

export default syncService;
