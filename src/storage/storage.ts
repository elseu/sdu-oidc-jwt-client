import { CookieStorage } from './CookieStorage';
import { LocalStorage } from './LocalStorage';

export type IStorage = {
  localStorage: typeof LocalStorage;
  cookies: typeof CookieStorage;
}

export const storage: IStorage = {
  localStorage: LocalStorage,
  cookies: CookieStorage,
};
