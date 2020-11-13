import { useAsync } from 'react-use';

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

function useAuthUserInfo<T>(): T | null | undefined {
  const { useStore } = useOidcJwtContext();
  const getUserInfo = useStore(state => state.methods.getUserInfo);
  const { hasValidSession } = useAuthSessionInfo();

  const { value } = useAsync<() => Promise<T | null>>(async () => getUserInfo<T>(), []);
  return hasValidSession ? value : null;
}

function useAuthAccessClaims<T extends ClaimsBase>(): T | null | undefined {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  const { hasValidSession } = useAuthSessionInfo();

  const { value } = useAsync<() => Promise<T | null>>(async () =>
    getAccessToken<T>().then(info => info?.claims ?? null), []);
  return hasValidSession ? value : null;
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
