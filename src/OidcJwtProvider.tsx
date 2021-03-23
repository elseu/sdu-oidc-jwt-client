import React, { useContext, useEffect, useRef } from 'react';
import { UseStore } from 'zustand';

import {
  createOidcJwtClientStore,
  OidcJwtClientOptions,
  UseOidcJwtClientStore,
} from './store';
import { isSSR } from './utils/isSSR';

export interface OidcJwtProviderProps {
  client: OidcJwtClientOptions;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
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
    children,
  } = props;

  const contextRef = useRef<OidcJwtContextData>();
  if (!contextRef.current) {
    contextRef.current = {
      useStore: createOidcJwtClientStore(options),
    };
  }

  const { useStore } = contextRef.current;

  const {
    getSessionToken,
    authorize,
    loadInitialData,
    monitorAccessToken,
    stopMonitoringAccessToken,
  } = useStore(state => state.methods);

  const isLoggedIn = useStore(state => state.isLoggedIn);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!isLoggedIn || !shouldMonitorAccessTokens) return;

    monitorAccessToken();

    return () => stopMonitoringAccessToken();
  }, [isLoggedIn, monitorAccessToken, shouldMonitorAccessTokens, stopMonitoringAccessToken]);

  useEffect(() => {
    const hasCsrfToken = !!getSessionToken();

    if (isSSR || isLoggedIn || !shouldAttemptLogin || hasCsrfToken) return;

    authorize({ prompt: 'none' });
  }, [authorize, getSessionToken, isLoggedIn, shouldAttemptLogin]);

  return <OidcJwtContext.Provider value={contextRef.current}>{children}</OidcJwtContext.Provider>;
};

export { OidcJwtProvider, useOidcJwtContext };
