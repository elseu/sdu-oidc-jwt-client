import { useAsync } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { useOidcJwtContext } from './OidcJwtProvider';
import { ClaimsBase, Params } from './store';
interface OidcAuthControls {
  authorize(params?: Params): void;
  logout(params?: Params): void;
}

interface OidcAuthSessionInfo {
  hasSession: boolean;
  hasValidSession: boolean;
}

function useAuthControls(): OidcAuthControls {
  const { useStore } = useOidcJwtContext();
  const authorize = useStore(state => state.methods.authorize);
  const logout = useStore(state => state.methods.logout);
  return { authorize, logout };
}

function useAuthUserInfo<T>(): AsyncState<T | null> {
  const { useStore } = useOidcJwtContext();
  const getUserInfo = useStore(state => state.methods.getUserInfo);
  const { hasValidSession } = useAuthSessionInfo();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!hasValidSession) {
      return Promise.resolve(null);
    }
    return getUserInfo<T>();
  }, [hasValidSession]);
}

function useAuthAccessClaims<T extends ClaimsBase>(): AsyncState<T | null> {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  const { hasValidSession } = useAuthSessionInfo();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!hasValidSession) {
      return Promise.resolve(null);
    }
    return getAccessToken<T>().then(info => info?.claims ?? null);
  }, [hasValidSession]);
}

function useAuthSessionInfo(): OidcAuthSessionInfo {
  const { useStore } = useOidcJwtContext();
  const hasSession = useStore(state => state.hasSessionToken());
  const hasValidSession = useStore(state => state.hasValidSession());

  return {
    hasSession,
    hasValidSession,
  };
}

function useAuthAccessToken(): { (): Promise<string | null> } {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  return () => getAccessToken().then(result => result?.token ?? null);
}

export {
  useAuthControls,
  useAuthUserInfo,
  useAuthAccessClaims,
  useAuthSessionInfo,
  useAuthAccessToken,
};
