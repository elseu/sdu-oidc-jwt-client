import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { UseStore } from 'zustand';

import { createOidcJwtClientStore, OidcJwtClientOptions, UseOidcJwtClientStore } from './store';

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

  const useStoreRef = useRef<UseStore<UseOidcJwtClientStore>>();
  if (!useStoreRef.current) {
    useStoreRef.current = createOidcJwtClientStore(options);
  }
  const useStore = useStoreRef.current;

  const {
    authorize,
    receiveSessionToken,
    monitorAccessToken,
    stopMonitoringAccessToken,
  } = useStore(state => state.methods);

  const hasSessionToken = useStore(state => state.hasSessionToken);
  const hasSession = hasSessionToken();

  useEffect(() => {
    receiveSessionToken();
  }, [receiveSessionToken]);

  useEffect(() => {
    if (!hasSession || !shouldMonitorAccessTokens) return;

    monitorAccessToken();

    return () => stopMonitoringAccessToken();
  }, [hasSession, monitorAccessToken, shouldMonitorAccessTokens, stopMonitoringAccessToken]);

  useEffect(() => {
    if (hasSession || !shouldAttemptLogin) return;
    console.log('authorize');
    authorize({ prompt: 'none' });
  }, [authorize, hasSession, shouldAttemptLogin]);

  const context: OidcJwtContextData = useMemo(() => ({ useStore }), [useStore]);

  return <OidcJwtContext.Provider value={context}>{children}</OidcJwtContext.Provider>;
};

export { useOidcJwtContext, OidcJwtProvider };
