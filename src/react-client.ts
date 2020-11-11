import * as React from 'react';

import { ClaimsBase, OidcJwtClient, oidcJwtClient, OidcJwtClientOptions } from './client';

interface OidcJwtContextData {
  client: OidcJwtClient;
}

const OidcJwtContext = React.createContext<OidcJwtContextData | null>(null);

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
  const contextValue: OidcJwtContextData = React.useMemo(() => {
    return {
      client: isClientOptions(clientProp)
        ? oidcJwtClient(clientProp)
        : clientProp,
    };
  }, [clientProp]);

  const { client } = contextValue;

  React.useEffect(() => {
    client.receiveSessionToken();
  }, [client]);

  React.useEffect(() => {
    if (client.hasSessionToken()) {
      if (shouldMonitorAccessTokens) {
        client.monitorAccessToken();
      }
    } else {
      if (shouldAttemptLogin) {
        client.authorize({ prompt: 'none' });
      }
    }
    return () => {
      client.stopMonitoringAccessToken();
    };
  }, [
    client,
    shouldMonitorAccessTokens,
    shouldAttemptLogin,
  ]);

  return React.createElement(
    OidcJwtContext.Provider,
    { value: contextValue },
    children,
  );
};

export function usePromiseResult<T>(
  f: () => Promise<T> | null,
  deps: unknown[],
): T | null {
  const [value, setValue] = React.useState<T | null>(null);
  React.useEffect(() => {
    f()?.then((result) => {
      setValue(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

function useAuthClient(): OidcJwtClient | null {
  return React.useContext(OidcJwtContext)?.client ?? null;
}

export function useAuthControls(): OidcAuthControls {
  const client = useAuthClient();
  return React.useMemo(() => ({
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
  return usePromiseResult<T>(() => {
    if (!client) return null;
    return client.getUserInfo<T>();
  }, [client]);
}

export function useAuthAccessClaims<T extends ClaimsBase>(): T | null {
  const client = useAuthClient();
  return usePromiseResult<T>(() => {
    if (!client) return null;
    return client.getAccessToken<T>().then<T>((info) => info?.claims as T ?? null);
  }, [client]);
}

export function useAuthSessionInfo(): { hasSession: boolean } | null {
  const client = useAuthClient();
  if (!client) return null;
  return { hasSession: client.hasSessionToken() };
}

export function useAuthAccessToken(): { (): Promise<string | null> } {
  const client = useAuthClient();
  return React.useMemo(() => {
    return () => {
      if (!client) return Promise.resolve(null);
      return client
        .getAccessToken()
        .then((result) => result?.token ?? null);
    };
  }, [client]);
}
