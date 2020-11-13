import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ClaimsBase, OidcJwtClient, oidcJwtClient, OidcJwtClientOptions } from './client';

interface OidcJwtContextData {
  client: OidcJwtClient;
}

const OidcJwtContext = createContext<OidcJwtContextData | null>(null);

export interface OidcJwtProviderProps {
  client: OidcJwtClient | OidcJwtClientOptions;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
}

export interface OidcAuthIdentity {
  accessClaims: Record<string, unknown>;
  userInfo: Record<string, unknown>;
}

export interface OidcAuthControls {
  authorize(params?: Record<string, string>): void;
  logout(params?: Record<string, string>): void;
}

export interface OidcAuthSessionInfo {
  hasSession: boolean;
  hasValidSession: boolean;
}

function isClientOptions(
  obj: OidcJwtClient | OidcJwtClientOptions,
): obj is OidcJwtClientOptions {
  return 'url' in obj;
}

export const OidcJwtProvider: React.FC<OidcJwtProviderProps> = (props) => {
  const {
    client: clientProp,
    shouldAttemptLogin = false,
    shouldMonitorAccessTokens = true,
    children,
  } = props;

  const client = useMemo(() => isClientOptions(clientProp) ? oidcJwtClient(clientProp) : clientProp, [clientProp]);

  useEffect(() => {
    client.receiveSessionToken();
  }, [client]);

  useEffect(() => {
    if (!client.hasSessionToken() && shouldAttemptLogin) {
      client.authorize({ prompt: 'none' });
    }

    if (client.hasSessionToken() && shouldMonitorAccessTokens) {
      client.monitorAccessToken();
    }
    return () => {
      client.stopMonitoringAccessToken();
    };
  }, [
    client,
    shouldMonitorAccessTokens,
    shouldAttemptLogin,
  ]);

  const context: OidcJwtContextData = useMemo(() => {
    return {
      client,
    };
  }, [client]);

  return <OidcJwtContext.Provider value={context}>{children}</OidcJwtContext.Provider>;
};

export function usePromiseResult<T>(
  f: () => Promise<T> | null,
  deps: unknown[],
): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    f()?.then((result) => {
      setValue(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

function useOidcJwtContext(): OidcJwtContextData {
  const context = useContext(OidcJwtContext);
  if (!context) {
    throw new Error('Can only use useAuth...() inside OidcJwtProvider');
  }
  return context;
}

function useAuthClient(): OidcJwtClient {
  return useOidcJwtContext().client;
}

export function useAuthControls(): OidcAuthControls {
  const client = useAuthClient();
  return useMemo(() => ({
    authorize(params: Record<string, string> = {}) {
      client?.authorize(params);
    },
    logout(params: Record<string, string> = {}) {
      client?.logout(params);
    },
  }), [client]);
}

export function useAuthUserInfo<T>(): T | null {
  const client = useAuthClient();
  const sessionInfo = useAuthSessionInfo();
  return usePromiseResult<T | null>(() => {
    if (!sessionInfo.hasValidSession) {
      return Promise.resolve(null);
    }
    return client.getUserInfo<T>();
  }, [client, sessionInfo]);
}

export function useAuthAccessClaims<T extends ClaimsBase>(): T | null {
  const client = useAuthClient();
  const sessionInfo = useAuthSessionInfo();
  return usePromiseResult<T | null>(() => {
    if (!sessionInfo.hasValidSession) {
      return Promise.resolve(null);
    }
    return client.getAccessToken<T>().then<T>((info) => info?.claims as T ?? null);
  }, [client, sessionInfo]);
}

export function useAuthSessionInfo(): OidcAuthSessionInfo {
  const client = useAuthClient();
  const [sessionInfo, setSessionInfo] = useState<OidcAuthSessionInfo>({
    hasSession: client.hasSessionToken(),
    hasValidSession: client.hasValidSession(),
  });

  const sessionListenerCallback = useCallback(() => {
    setSessionInfo((sessionInfo) => {
      const hasSession = client.hasSessionToken();
      const hasValidSession = client.hasValidSession();
      return sessionInfo.hasSession === hasSession && sessionInfo.hasValidSession === hasValidSession
        ? sessionInfo
        : { hasSession, hasValidSession };
    });
  }, [client, setSessionInfo]);

  useEffect(() => {
    client.addSessionListener(sessionListenerCallback);
    return () => {
      client.removeSessionListener(sessionListenerCallback);
    };
  }, [client, sessionListenerCallback]);

  return sessionInfo;
}

export function useAuthAccessToken(): { (): Promise<string | null> } {
  const client = useAuthClient();
  const getAccessToken = useCallback(() =>
    client
      .getAccessToken()
      .then((result) => result?.token ?? null), [client]);
  return getAccessToken;
}
