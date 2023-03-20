import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StoreApi, UseBoundStore, useStore } from 'zustand';

import {
  CSRF_TOKEN_STORAGE_KEY,
  LOGGED_IN_TOKEN_STORAGE_KEY,
  RETRY_LOGIN_STORAGE_KEY,
  USER_INFO_TOKEN_STORAGE_KEY,
} from './constants';
import { Storage } from './storage';
import { createOidcJwtClientStore } from './store';
import { AuthState, OidcJwtClientStore, OidcJwtProviderProps } from './types';
import { removeTokenFromUrl } from './utils';

const OidcJwtContext = createContext<UseBoundStore<StoreApi<OidcJwtClientStore>> | undefined>(
  undefined,
);

/**
 * @see https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#bounded-usestore-hook-for-vanilla-stores
 */
function useOidcJwtStore(): OidcJwtClientStore;
function useOidcJwtStore<T>(
  selector: (state: OidcJwtClientStore) => T,
  equals?: (a: T, b: T) => boolean,
): T;
function useOidcJwtStore<T>(
  selector?: (state: OidcJwtClientStore) => T,
  equals?: (a: T, b: T) => boolean,
) {
  const context = useContext(OidcJwtContext);
  if (context === undefined) {
    throw new Error('useOidcJwtStore must be used within a OidcJwtProvider');
  }

  return useStore(context, selector!, equals);
}

const OidcJwtInitializer: React.FC<React.PropsWithChildren<OidcJwtProviderProps>> = ({
  shouldAttemptLogin = false,
  shouldMonitorAccessTokens = true,
  children,
}) => {
  const authService = useOidcJwtStore((state) => state.service);
  const isLoggedIn = useOidcJwtStore((state) => state.authState.isLoggedIn);
  const setState = useOidcJwtStore((state) => state.setState);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    authService?.loadInitialData().then(() => setState(authService.state));
  }, [authService, setState]);

  useEffect(() => {
    if (!isLoggedIn || !shouldMonitorAccessTokens) return;

    authService?.monitorAccessToken(() => setState(authService.state));

    return () => authService?.stopMonitoringAccessToken();
  }, [isLoggedIn, authService, shouldMonitorAccessTokens, setState]);

  useEffect(() => {
    if (!authService) return;

    const { csrfToken } = authService.getCsrfToken();
    if (typeof window === 'undefined' || isLoggedIn || !shouldAttemptLogin || !!csrfToken) return;

    authService.authorize({ prompt: 'none' });
  }, [authService, isLoggedIn, shouldAttemptLogin]);

  useEffect(() => {
    const isInitializing =
      !authService?.getCsrfToken().csrfToken && shouldAttemptLogin && !isLoggedIn;

    setIsInitializing(isInitializing);
  }, [authService, isLoggedIn, shouldAttemptLogin]);

  if (isInitializing) {
    return null;
  }

  return <>{children}</>;
};

const OidcJwtProvider: React.FC<React.PropsWithChildren<OidcJwtProviderProps>> = (props) => {
  const { client, removeTokenFromUrlFunction = removeTokenFromUrl, children } = props;
  const store = useRef(createOidcJwtClientStore(client, removeTokenFromUrlFunction)).current;

  useEffect(() => {
    const initialState: AuthState = {
      userInfo: Storage.get(USER_INFO_TOKEN_STORAGE_KEY),
      csrfToken: Storage.get(CSRF_TOKEN_STORAGE_KEY),
      isLoggedIn: !!Storage.get(LOGGED_IN_TOKEN_STORAGE_KEY),
      isInitialized: !client,
      didRetryLogin: Storage.get(RETRY_LOGIN_STORAGE_KEY) === 1,
    };

    store.setState({ authState: initialState });
  }, [client, store]);

  return (
    <OidcJwtContext.Provider value={store}>
      <OidcJwtInitializer {...props}>{children}</OidcJwtInitializer>
    </OidcJwtContext.Provider>
  );
};

export { OidcJwtProvider, useOidcJwtStore };
