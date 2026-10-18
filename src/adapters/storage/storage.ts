import type {StorageAdapter} from '../../hooks/stored-state/index.js';

/** Explicit browser adapter; neither import nor construction touches browser globals. */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    read: async (key) => window.localStorage.getItem(key),
    write: async (key, value) => {window.localStorage.setItem(key, value);},
    remove: async (key) => {window.localStorage.removeItem(key);},
  };
}
