import { isQuotaExceeded } from './utils/isQuotaExceeded';
import { isSSR } from './utils/isSSR';
import { parseJson } from './utils/parseJson';

export class Storage {
  static get(key: string) {
    if (isSSR) return;

    const value = localStorage.getItem(key);
    return value === null ? null : parseJson(value);
  }

  static set<T>(key: string, value: T) {
    if (isSSR) return;
    try {
      return localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (isQuotaExceeded(error)) {
        throw new Error(`LocalStorage full for data: ${JSON.stringify(value)}, because: ${error}`);
      }
      throw new Error(`LocalStorage setItem failed for data: ${JSON.stringify(value)}, because: ${error}`);
    }
  }

  static unset(key: string) {
    if (isSSR) return;

    if (this.isset(key)) {
      return localStorage.removeItem(key);
    } else {
      return null;
    }
  }

  static clear() {
    if (isSSR) return;

    return localStorage.clear();
  }

  static isset(key: string) {
    if (isSSR) return;

    return this.get(key) !== null;
  }
}
