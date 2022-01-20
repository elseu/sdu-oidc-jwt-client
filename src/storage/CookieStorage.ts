/* eslint-disable max-len */
import Cookies from 'js-cookie';

import { parseJson } from '../utils/parseJson';

export class CookieStorage {
  static get(key: string): string | undefined {
    const value = Cookies.get(key);
    return value && parseJson(value);
  }

  static set<T>(key: string, value: T): void {
    Cookies.set(key, JSON.stringify(value));
  }

  static unset(key: string): void {
    if (this.isset(key)) {
      Cookies.remove(key);
    }
  }

  static isset(key: string): boolean {
    return this.get(key) !== null;
  }
}
