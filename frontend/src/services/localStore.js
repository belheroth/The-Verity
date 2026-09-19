/**
 * Local Storage Service for The Verity Client
 * 
 * In Electron: Backed by SQLite (local-cache.sqlite) via IPC for robust,
 * high-capacity offline draft storage and sync queue.
 * 
 * In Web Browser: Seamlessly falls back to localStorage so developers and web clients
 * have 100% feature parity without errors.
 */

const hasElectronLocalDB = () => {
    return typeof window !== 'undefined' && 
           window.electronAPI && 
           typeof window.electronAPI.localDB === 'object';
};

export const localStore = {
    isElectron: () => hasElectronLocalDB(),

    // --- DRAFTS ---
    async saveDraft(assignmentId, studentId, code, history = []) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.saveDraft(assignmentId, studentId, code, history);
        }
        try {
            const key = `verity_draft_${assignmentId}_${studentId}`;
            const draft = { assignmentId, studentId, code, history, updated_at: new Date().toISOString() };
            localStorage.setItem(key, JSON.stringify(draft));
            return { success: true, updated_at: draft.updated_at };
        } catch (e) {
            console.warn('[LocalStore] localStorage draft save failed:', e);
            return { success: false, error: e.message };
        }
    },

    async getDraft(assignmentId, studentId) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.getDraft(assignmentId, studentId);
        }
        try {
            const key = `verity_draft_${assignmentId}_${studentId}`;
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('[LocalStore] localStorage draft read failed:', e);
            return null;
        }
    },

    // --- CLASSROOMS CACHE ---
    async cacheClassrooms(classrooms) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.cacheClassrooms(classrooms);
        }
        try {
            localStorage.setItem('verity_cached_classrooms', JSON.stringify(classrooms));
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    },

    async getCachedClassrooms() {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.getCachedClassrooms();
        }
        try {
            const item = localStorage.getItem('verity_cached_classrooms');
            return item ? JSON.parse(item) : [];
        } catch (e) {
            return [];
        }
    },

    // --- CLASSWORK CACHE ---
    async cacheClasswork(classroomId, classwork) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.cacheClasswork(classroomId, classwork);
        }
        try {
            localStorage.setItem(`verity_cached_classwork_${classroomId}`, JSON.stringify(classwork));
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    },

    async getCachedClasswork(classroomId) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.getCachedClasswork(classroomId);
        }
        try {
            const item = localStorage.getItem(`verity_cached_classwork_${classroomId}`);
            return item ? JSON.parse(item) : [];
        } catch (e) {
            return [];
        }
    },

    // --- OFFLINE SYNC QUEUE ---
    async addToSyncQueue(action, url, method = 'POST', body = null) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.addToSyncQueue(action, url, method, body);
        }
        try {
            const queueStr = localStorage.getItem('verity_sync_queue') || '[]';
            const queue = JSON.parse(queueStr);
            const item = { id: Date.now(), action, url, method, body, created_at: new Date().toISOString() };
            queue.push(item);
            localStorage.setItem('verity_sync_queue', JSON.stringify(queue));
            return item;
        } catch (e) {
            console.error('[LocalStore] Failed to enqueue sync item:', e);
            return null;
        }
    },

    async getSyncQueue() {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.getSyncQueue();
        }
        try {
            const queueStr = localStorage.getItem('verity_sync_queue') || '[]';
            return JSON.parse(queueStr);
        } catch (e) {
            return [];
        }
    },

    async removeFromSyncQueue(id) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.removeFromSyncQueue(id);
        }
        try {
            const queueStr = localStorage.getItem('verity_sync_queue') || '[]';
            const queue = JSON.parse(queueStr).filter(item => item.id !== id);
            localStorage.setItem('verity_sync_queue', JSON.stringify(queue));
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    },

    // --- GENERIC KEY/VALUE STORAGE ---
    async setLocal(key, value) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.setLocal(key, value);
        }
        try {
            localStorage.setItem(`verity_kv_${key}`, JSON.stringify(value));
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    },

    async getLocal(key) {
        if (hasElectronLocalDB()) {
            return await window.electronAPI.localDB.getLocal(key);
        }
        try {
            const item = localStorage.getItem(`verity_kv_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            return null;
        }
    }
};

export default localStore;
