import { useAsync } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { useOidcJwtContext } from './OidcJwtProvider';
import { ClaimsBase, Params } from './store';

interface OidcAuthControls {
  authorize(params?: Params): void;

  logout(params?: Params): void;
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

  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn) {
      return Promise.resolve(null);
    }
    return getUserInfo<T>();
  }, [isLoggedIn]);
}

function useAuthAccessClaims<T extends ClaimsBase>(): AsyncState<T | null> {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn) {
      return Promise.resolve(null);
    }
    return getAccessToken<T>().then(info => info?.claims ?? null);
  }, [isLoggedIn]);
}

function useAuthIsLoggedIn(): boolean {
  const { useStore } = useOidcJwtContext();
  return useStore(state => state.isLoggedIn);
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
  useAuthIsLoggedIn,
  useAuthAccessToken,
};
