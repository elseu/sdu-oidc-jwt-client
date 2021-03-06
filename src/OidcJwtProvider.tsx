import React, { useContext, useEffect, useRef } from 'react';
import { UseStore } from 'zustand';

import {
  createOidcJwtClientStore,
  OidcJwtClientOptions,
  UseOidcJwtClientStore,
} from './store';
import { removeTokenFromUrl } from './utils';
import { isSSR } from './utils/isSSR';

export interface OidcJwtProviderProps {
  client: OidcJwtClientOptions;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
  removeTokenFromUrlFunction?: (url: string) => void;
}

interface OidcJwtContextData {
  useStore: UseStore<UseOidcJwtClientStore>;
}

const OidcJwtContext = React.createContext<OidcJwtContextData | null>(null);

function useOidcJwtContext(): OidcJwtContextData {
  const context = useContext(OidcJwtContext);
  if (!context) {
    throw new Error('Can only use useAuth...() inside OidcJwtProvider');
  }
  return context;
}

const OidcJwtProvider: React.FC<OidcJwtProviderProps> = (props) => {
  const {
    client: options,
    shouldAttemptLogin = false,
    shouldMonitorAccessTokens = true,
    removeTokenFromUrlFunction = removeTokenFromUrl,
    children,
  } = props;

  const contextRef = useRef<OidcJwtContextData>();
  if (!contextRef.current) {
    contextRef.current = {
      useStore: createOidcJwtClientStore(options, removeTokenFromUrlFunction),
    };
  }

  const { useStore } = contextRef.current;
  const {
    getCsrfToken,
    authorize,
    loadInitialData,
    monitorAccessToken,
    stopMonitoringAccessToken,
  } = useStore(state => state.methods);
  const isLoggedIn = useStore(state => state.isLoggedIn);

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
    if (isSSR || isLoggedIn || !shouldAttemptLogin || !!csrfToken) return;

    authorize({ prompt: 'none' });
  }, [authorize, getCsrfToken, isLoggedIn, shouldAttemptLogin]);

  if (!getCsrfToken().csrfToken && shouldAttemptLogin && !isLoggedIn && !isSSR) {
    return null;
  }

  return <OidcJwtContext.Provider value={contextRef.current}>{children}</OidcJwtContext.Provider>;
};

export { OidcJwtProvider, useOidcJwtContext };
