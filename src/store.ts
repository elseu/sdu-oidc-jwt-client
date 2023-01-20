import { create, StoreApi } from 'zustand';
import createContext from 'zustand/context';

import {
  CSRF_TOKEN_STORAGE_KEY,
  LOGGED_IN_TOKEN_STORAGE_KEY,
  RETRY_LOGIN_STORAGE_KEY,
  USER_INFO_TOKEN_STORAGE_KEY,
} from './constants';
import { Storage } from './storage';
import { OidcJwtClientOptions, UseOidcJwtClientStore } from './types';
import { AuthService } from './utils/AuthService';

function createOidcJwtClientStore(
  client: OidcJwtClientOptions | false,
  removeTokenFromUrlFunction?: (url: string) => void
) {
  return create<UseOidcJwtClientStore>(set => {
    const initialState = {
      userInfo: Storage.get(USER_INFO_TOKEN_STORAGE_KEY),
      csrfToken: Storage.get(CSRF_TOKEN_STORAGE_KEY),
      isLoggedIn: !!Storage.get(LOGGED_IN_TOKEN_STORAGE_KEY),
      isInitialized: !client,
      didRetryLogin: Storage.get(RETRY_LOGIN_STORAGE_KEY) === 1,
    };

    const service = client
      ? new AuthService({
        client,
        removeTokenFromUrlFunction,
        state: initialState,
      })
      : null;

    return {
      service,
      authState: initialState,
      setState: newState => set({ authState: newState }),
    };
  });
}

const { Provider, useStore } = createContext<StoreApi<UseOidcJwtClientStore>>();
export { createOidcJwtClientStore, Provider, useStore };
