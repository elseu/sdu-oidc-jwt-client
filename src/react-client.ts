import * as React from "react";
import { OidcJwtClient, OidcJwtClientOptions, oidcJwtClient } from "./client";

interface OidcJwtContextData {
    client: OidcJwtClient;
}

const OidcJwtContext = React.createContext<OidcJwtContextData | null>(null);

interface OidcJwtProviderProps {
    client: OidcJwtClient | OidcJwtClientOptions;
    shouldRequireLogin?: boolean;
    shouldPerformLogin?: boolean;
    shouldMonitorAccessTokens?: boolean;
}

function isClientOptions(
    obj: OidcJwtClient | OidcJwtClientOptions
): obj is OidcJwtClientOptions {
    return "url" in obj;
}

export const OidcJwtProvider: React.FC<OidcJwtProviderProps> = (props) => {
    const {
        client: clientProp,
        shouldRequireLogin = false,
        shouldPerformLogin = false,
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
            return;
        }
    }, [client]);
    React.useEffect(() => {
        if (client.haveSessionToken()) {
            if (shouldMonitorAccessTokens) {
                client.monitorAccessToken();
            }
        } else {
            if (shouldPerformLogin) {
                const params: Record<string, string> = {};
                if (!shouldRequireLogin) {
                    params.prompt = "none";
                }
                client.authorize(params);
            }
        }
        return () => {
            if (shouldMonitorAccessTokens) {
                client.stopMonitoringAccessToken();
            }
        };
    }, [
        client,
        shouldMonitorAccessTokens,
        shouldPerformLogin,
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
        children
    );
};

export function usePromiseResult<T>(
    f: () => Promise<T> | null | undefined,
    deps: unknown[]
): T | null {
    const [value, setValue] = React.useState<T | null>(null);
    React.useEffect(() => {
        f()?.then((result) => {
            setValue(result);
        });
    }, deps);
    return value;
}

export function useOidcJwtClient(): OidcJwtClient | null {
    return React.useContext(OidcJwtContext)?.client ?? null;
}

export function useAccessTokenClaims(): Record<string, unknown> | null {
    const client = useOidcJwtClient();
    return (
        usePromiseResult(() => client?.getAccessToken(), [client])?.claims ??
        null
    );
}

export function useUserInfo(): Record<string, unknown> | null {
    const client = useOidcJwtClient();
    return usePromiseResult(() => client?.getUserInfo(), [client]) ?? null;
}

export function useAccessTokenProvider(): { get(): Promise<string | null> } {
    const client = useOidcJwtClient();
    return React.useMemo(() => {
        return {
            get() {
                if (client) {
                    return client
                        .getAccessToken()
                        .then((result) => result?.token ?? null);
                } else {
                    return Promise.resolve(null);
                }
            },
        };
    }, [client]);
}
