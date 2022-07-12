import { useCallback, useEffect, useState } from 'react';
import { useAsync, usePrevious } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { useOidcJwtContext } from './OidcJwtProvider';
import { Storage } from './storage';
import { ClaimsBase, Params, RETRY_LOGIN_STORAGE_KEY } from './store';

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
  const authorize = useStore(state => state.methods.authorize);
  const isLoggedIn = useStore(state => state.isLoggedIn);
  const isPrevLoggedIn = usePrevious<boolean>(isLoggedIn);
  const [isSessionExpired, setSessionExpired] = useState<boolean>(false);

  const checkSessionExpired = useCallback(() => {
    Storage.unset(RETRY_LOGIN_STORAGE_KEY);
    if (!isLoggedIn) setSessionExpired(true);
  }, [isLoggedIn]);

  const retryLogin = useCallback(() => {
    resetStorage();
    Storage.set(RETRY_LOGIN_STORAGE_KEY, 1);
    authorize({ prompt: 'none' });
  }, [authorize, resetStorage]);

  useEffect(() => {
    const isFirstSessionExpired = Boolean(!isLoggedIn && isPrevLoggedIn);
    const shouldRetryLogin = Storage.get(RETRY_LOGIN_STORAGE_KEY) === 1;

    /**
     * When the user comes back in with the retry item in localStorage
     * and they are still not logged in with Ping: sesssion expired
     * and remove the retry item from localStorage
     */
    if (shouldRetryLogin) {
      checkSessionExpired();
      return;
    }

    /**
     * When the login changes from logged in to not logged in:
     * store in localStorage that we are going to retry the login
     * and then retry the login silently
     */
    if (isFirstSessionExpired) {
      retryLogin();
    }
  }, [authorize, checkSessionExpired, isLoggedIn, isPrevLoggedIn, resetStorage, retryLogin]);

  return isSessionExpired;
}

function useAuthAccessToken(): { (): Promise<string | null> } {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  return useCallback(() => {
    return getAccessToken().then(result => result?.token ?? null);
  }, [getAccessToken]);
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
