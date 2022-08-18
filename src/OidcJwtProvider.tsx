import React, { useCallback, useEffect } from 'react';

import {
  createOidcJwtClientStore,
  OidcJwtClientOptions,
  Provider,
  useStore,
} from './store';
import { removeTokenFromUrl } from './utils';

export interface OidcJwtProviderProps {
  client: OidcJwtClientOptions;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
  removeTokenFromUrlFunction?: (url: string) => void;
}

const OidcJwtInitializer: React.FC<OidcJwtProviderProps> = ({
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
    loadInitialData();
  }, [shouldAttemptLogin, loadInitialData]);

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

  if (!getCsrfToken().csrfToken && shouldAttemptLogin && !isLoggedIn && typeof window !== 'undefined') {
    return null;
  }

  return <>{children}</>;
};

const OidcJwtProvider: React.FC<OidcJwtProviderProps> = (props) => {
  const {
    client: options,
    removeTokenFromUrlFunction = removeTokenFromUrl,
    children,
  } = props;

  const createStore = useCallback(() => {
    return createOidcJwtClientStore(options, removeTokenFromUrlFunction);
  }, [options, removeTokenFromUrlFunction]);

  return (
    <Provider createStore={createStore}>
      <OidcJwtInitializer {...props}>{children}</OidcJwtInitializer>
    </Provider>
  );
};

export { OidcJwtProvider };
