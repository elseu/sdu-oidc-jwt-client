import React, { useCallback, useEffect } from 'react';

import { createOidcJwtClientStore, Provider, useStore } from './store';
import { OidcJwtProviderProps } from './types';
import { removeTokenFromUrl } from './utils';

const OidcJwtInitializer: React.FC<OidcJwtProviderProps> = ({
  shouldAttemptLogin = false,
  shouldMonitorAccessTokens = true,
  children,
}) => {
  const authService = useStore(state => state.service);
  const isLoggedIn = useStore(state => state.authState.isLoggedIn);
  const setState = useStore(state => state.setState);

  useEffect(() => {
    authService?.loadInitialData().then(() => setState(authService.state));
  }, [authService, setState]);

  useEffect(() => {
    if (!isLoggedIn || !shouldMonitorAccessTokens) return;

    authService?.monitorAccessToken(state => setState(state));

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

const OidcJwtProvider: React.FC<OidcJwtProviderProps> = props => {
  const { client, removeTokenFromUrlFunction = removeTokenFromUrl, children } = props;

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
