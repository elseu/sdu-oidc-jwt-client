import { create } from 'zustand';

import { AuthState, OidcJwtClientOptions, OidcJwtClientStore } from './types';
import { AuthService } from './utils/AuthService';

function createOidcJwtClientStore(
  client: OidcJwtClientOptions | false,
  removeTokenFromUrlFunction?: (url: string) => void,
) {
  return create<OidcJwtClientStore>((set) => {
    const initialState: AuthState = {
      userInfo: undefined,
      csrfToken: null,
      isLoggedIn: false,
      isInitialized: false,
      didRetryLogin: false,
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
      setState: (newState) => set({ authState: newState }),
    };
  });
}
export { createOidcJwtClientStore };
