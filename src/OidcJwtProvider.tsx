import React, { createContext, useContext, useEffect, useRef } from 'react';
import { StoreApi, UseBoundStore, useStore } from 'zustand';

import { createOidcJwtClientStore } from './store';
import { OidcJwtClientStore, OidcJwtProviderProps } from './types';
import { removeTokenFromUrl } from './utils';

const OidcJwtContext = createContext<UseBoundStore<StoreApi<OidcJwtClientStore>> | undefined>(undefined);

/**
 * @see https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#bounded-usestore-hook-for-vanilla-stores
 */
function useOidcJwtStore(): OidcJwtClientStore;
function useOidcJwtStore<T>(
  selector: (state: OidcJwtClientStore) => T,
  equals?: (a: T, b: T) => boolean,
): T;
function useOidcJwtStore<T>(selector?: (state: OidcJwtClientStore) => T, equals?: (a: T, b: T) => boolean) {
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
  const authService = useOidcJwtStore(state => state.service);
  const isLoggedIn = useOidcJwtStore(state => state.authState.isLoggedIn);
  const setState = useOidcJwtStore(state => state.setState);

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

  const isInitializing =
    !authService?.getCsrfToken().csrfToken &&
    shouldAttemptLogin &&
    !isLoggedIn &&
    typeof window !== 'undefined';

  if (isInitializing) {
    return null;
  }

  return <>{children}</>;
};

const OidcJwtProvider: React.FC<React.PropsWithChildren<OidcJwtProviderProps>> = props => {
  const { client, removeTokenFromUrlFunction = removeTokenFromUrl, children } = props;
  const store = useRef(createOidcJwtClientStore(client, removeTokenFromUrlFunction)).current;

  return (
    <OidcJwtContext.Provider value={store}>
      <OidcJwtInitializer {...props}>{children}</OidcJwtInitializer>
    </OidcJwtContext.Provider>
  );
};

export { OidcJwtProvider, useOidcJwtStore };
