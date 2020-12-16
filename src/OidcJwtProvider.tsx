import React, { useContext, useEffect, useRef } from 'react';
import { UseStore } from 'zustand';

import { createOidcJwtClientStore, OidcJwtClientOptions, UseOidcJwtClientStore } from './store';
import { isSSR } from './utils/isSSR';

interface OidcJwtProviderProps {
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
    authorize,
    receiveSessionToken,
    monitorAccessToken,
    stopMonitoringAccessToken,
  } = useStore(state => state.methods);

  const isLoggedIn = useStore(state => state.isLoggedIn);
  const isCSRFTokenPresent = !!useStore(state => state.csrfToken);
  useEffect(() => {
    receiveSessionToken();
  }, [receiveSessionToken]);

  useEffect(() => {
    if (!isLoggedIn) return;

    monitorAccessToken();

    return () => stopMonitoringAccessToken();
  }, [isLoggedIn, monitorAccessToken, shouldMonitorAccessTokens, stopMonitoringAccessToken]);

  useEffect(() => {
    if (isSSR || isLoggedIn || !shouldAttemptLogin || isCSRFTokenPresent) return;
    authorize({ prompt: 'none' });
  }, [authorize, isLoggedIn, shouldAttemptLogin, isCSRFTokenPresent]);

  return <OidcJwtContext.Provider value={contextRef.current}>{children}</OidcJwtContext.Provider>;
};

export { useOidcJwtContext, OidcJwtProvider };
