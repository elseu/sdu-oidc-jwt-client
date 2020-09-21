import * as React from 'react';

import { OidcJwtClient, oidcJwtClient, OidcJwtClientOptions } from './client';

interface OidcJwtContextData {
  client: OidcJwtClient;
}

const OidcJwtContext = React.createContext<OidcJwtContextData | null>(null);

export interface OidcJwtProviderProps {
  client: OidcJwtClient | OidcJwtClientOptions;
  shouldRequireLogin?: boolean;
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
    shouldRequireLogin = false,
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
    if (client.receiveSessionToken()) {

    }
  }, [client]);

  React.useEffect(() => {
    if (client.haveSessionToken()) {
      if (shouldMonitorAccessTokens) {
        client.monitorAccessToken();
      }
    } else {
      if (shouldAttemptLogin) {
        const params: Record<string, string> = {};
        if (!shouldRequireLogin) {
          params.prompt = 'none';
        }
        client.authorize(params);
      }
    }
    return () => {
      client.stopMonitoringAccessToken();
    };
  }, [
    client,
    shouldMonitorAccessTokens,
    shouldAttemptLogin,
    shouldRequireLogin,
  ]);

  React.useEffect(() => {
    if (shouldRequireLogin) {
      client.getAccessToken().then((result) => {
        if (!result?.token) {
          client.authorize();
        }
      });
    }
  }, [client, shouldRequireLogin]);

  return React.createElement(
    OidcJwtContext.Provider,
    { value: contextValue },
    children,
  );
};

export function usePromiseResult<T>(
  f: () => Promise<T> | null | undefined,
  deps: unknown[],
): T | null {
  const [value, setValue] = React.useState<T | null>(null);
  React.useEffect(() => {
    f()?.then((result) => {
      setValue(result);
    });
  }, deps);
  return value;
}

function useAuthClient(): OidcJwtClient | null {
  return React.useContext(OidcJwtContext)?.client ?? null;
}

export function useAuthControls(): OidcAuthControls {
  const client = useAuthClient();
  return React.useMemo(() => {
    return {
      authorize(params: Record<string, string> = {}) {
        client?.authorize(params);
      },
      logout(params: Record<string, string> = {}) {
        client?.logout(params);
      },
    };
  }, [client]);
}

export function useAuthUserInfo(): Record<string, unknown> | null {
  const client = useAuthClient();
  return usePromiseResult(() => {
    if (!client) {
      return null;
    }
    return client.getUserInfo();
  }, [client]);
}

export function useAuthAccessClaims(): Record<string, unknown> | null {
  const client = useAuthClient();
  return usePromiseResult(() => {
    if (!client) {
      return null;
    }
    return client.getAccessToken().then((info) => info?.claims ?? null);
  }, [client]);
}

export function useAuthAccessToken(): { (): Promise<string | null> } {
  const client = useAuthClient();
  return React.useMemo(() => {
    return () => {
      if (client) {
        return client
          .getAccessToken()
          .then((result) => result?.token ?? null);
      } else {
        return Promise.resolve(null);
      }
    };
  }, [client]);
}
