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

    return localStorage.setItem(key, JSON.stringify(value));
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
