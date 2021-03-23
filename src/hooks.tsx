import { useEffect, useState } from 'react';
import { useAsync, usePrevious } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { useOidcJwtContext } from './OidcJwtProvider';
import { ClaimsBase, Params } from './store';

interface IUseAuthControls {
  logout: (params?: Params) => void;
  authorize: (params?: Params) => void;
}

function useAuthControls(): IUseAuthControls {
  const { useStore } = useOidcJwtContext();
  const authorize = useStore(state => state.methods.authorize);
  const logout = useStore(state => state.methods.logout);
  return { authorize, logout };
}

function useAuthInitialized(): boolean {
  const { useStore } = useOidcJwtContext();
  return useStore(state => state.isInitialized);
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

function useAuthSessionExpired(): boolean {
  const { useStore } = useOidcJwtContext();

  const resetStorage = useStore(state => state.methods.resetStorage);
  const isLoggedIn = useStore(state => state.isLoggedIn);
  const isPrevLoggedIn = usePrevious<boolean>(isLoggedIn);
  const [isSessionExpired, setSessionExpired] = useState<boolean>(false);

  useEffect(() => {
    const isSessionExpired = Boolean(!isLoggedIn && isPrevLoggedIn);
    if (!isSessionExpired) return;

    setSessionExpired(isSessionExpired);
    resetStorage();
  }, [isLoggedIn, isPrevLoggedIn, resetStorage]);

  return isSessionExpired;
}

function useAuthAccessToken(): { (): Promise<string | null> } {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  return () => getAccessToken().then(result => result?.token ?? null);
}

export {
  useAuthAccessClaims,
  useAuthAccessToken,
  useAuthControls,
  useAuthInitialized,
  useAuthIsLoggedIn,
  useAuthSessionExpired,
  useAuthUserInfo,
};
