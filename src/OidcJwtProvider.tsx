import React, { useCallback, useEffect } from 'react';

import {
  createOidcJwtClientStore,
  OidcJwtClientOptions,
  Provider,
  useStore,
} from './store';
import { removeTokenFromUrl } from './utils';

export interface OidcJwtProviderProps {
  client?: OidcJwtClientOptions;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
  removeTokenFromUrlFunction?: (url: string) => void;
}

const OidcJwtInitializer: React.FC<OidcJwtProviderProps> = ({
  client,
  shouldAttemptLogin = false,
  shouldMonitorAccessTokens = true,
  children,
}) => {
  const {
    getCsrfToken,
    authorize,
    loadInitialData,
    monitorAccessToken,
    stopMonitoringAccessToken,
  } = useStore((state) => state.methods);
  const isLoggedIn = useStore((state) => state.isLoggedIn);

  useEffect(() => {
    if (!client) return
    loadInitialData();
  }, [client, loadInitialData]);

  useEffect(() => {
    if (!isLoggedIn || !shouldMonitorAccessTokens) return;

    monitorAccessToken();

    return () => stopMonitoringAccessToken();
  }, [isLoggedIn, monitorAccessToken, shouldMonitorAccessTokens, stopMonitoringAccessToken]);

  useEffect(() => {
    const { csrfToken } = getCsrfToken();
    if (typeof window === 'undefined' || isLoggedIn || !shouldAttemptLogin || !!csrfToken) return;

    authorize({ prompt: 'none' });
  }, [authorize, getCsrfToken, isLoggedIn, shouldAttemptLogin]);

  const isInitializing = !getCsrfToken().csrfToken
    && shouldAttemptLogin
    && !isLoggedIn
    && typeof window !== 'undefined';

  if (isInitializing) {
    return null;
  }

  return <>{children}</>;
};

const OidcJwtProvider: React.FC<OidcJwtProviderProps> = (props) => {
  const {
    client,
    removeTokenFromUrlFunction = removeTokenFromUrl,
    children,
  } = props;

  const createStore = useCallback(() => {
    return createOidcJwtClientStore(client, removeTokenFromUrlFunction);
  }, [client, removeTokenFromUrlFunction]);

  return (
    <Provider createStore={createStore}>
      <OidcJwtInitializer {...props}>{children}</OidcJwtInitializer>
    </Provider>
  );
};

export { OidcJwtProvider };
