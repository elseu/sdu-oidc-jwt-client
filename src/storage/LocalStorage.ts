/* eslint-disable max-len */
import { getLocalStorageSize } from '../utils/getLocalStorageSize';
import { isQuotaExceeded } from '../utils/isQuotaExceeded';
import { parseJson } from '../utils/parseJson';

export class LocalStorage {
  static get(key: string): string | undefined {
    if (typeof window === 'undefined') return;

    const value = localStorage.getItem(key);
    return value === null ? undefined : parseJson(value);
  }

  static set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      return localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      const entries = Object.entries(localStorage).map(([key, value]) => `${key}:${value.length}`);
      const storageSize = getLocalStorageSize();
      if (isQuotaExceeded(error)) {
        throw new Error(`LocalStorage full for key: "${key}" and value: "${JSON.stringify(value)}" - entries: ${JSON.stringify(entries)} - error: ${error} - size: ${storageSize}`);
      }
      throw new Error(`LocalStorage failed for key: "${key}" and value: "${JSON.stringify(value)}" - entries: ${JSON.stringify(entries)} - error: ${error}`);
    }
  }

  static unset(key: string): void {
    if (typeof window === 'undefined') return;

    if (this.isset(key)) {
      localStorage.removeItem(key);
    }
  }

  static isset(key: string): boolean {
    if (typeof window === 'undefined') return false;

    return this.get(key) !== null;
  }
}
