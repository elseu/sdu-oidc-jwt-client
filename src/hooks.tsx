import { useCallback, useEffect, useState } from 'react';
import { useAsync, usePrevious } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { ClaimsBase, Params, useStore } from './store';

interface IUseAuthControls {
  logout: (params?: Params) => void;
  authorize: (params?: Params) => void;
}

function useAuthControls(): IUseAuthControls {
  const authorize = useStore((state) => state.methods.authorize);
  const logout = useStore((state) => state.methods.logout);
  return { authorize, logout };
}

function useAuthInitialized(): boolean {
  return useStore((state) => state.isInitialized);
}

function useAuthUserInfo<T>(): AsyncState<T | null> {
  const getUserInfo = useStore((state) => state.methods.getUserInfo);

  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn) {
      return Promise.resolve(null);
    }
    return getUserInfo<T>();
  }, [isLoggedIn]);
}

function useAuthAccessClaims<T extends ClaimsBase>(): AsyncState<T | null> {
  const getAccessToken = useStore((state) => state.methods.getAccessToken);
  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn) {
      return Promise.resolve(null);
    }
    return getAccessToken<T>().then((info) => info?.claims ?? null);
  }, [isLoggedIn]);
}

function useAuthIsLoggedIn(): boolean {
  return useStore((state) => state.isLoggedIn);
}

function useAuthSessionExpired(): boolean {
  const resetStorage = useStore((state) => state.methods.resetStorage);
  const authorize = useStore((state) => state.methods.authorize);
  const unsetRetryLogin = useStore((state) => state.methods.unsetRetryLogin);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const didRetryLogin = useStore((state) => state.didRetryLogin);
  const isPrevLoggedIn = usePrevious<boolean>(isLoggedIn);
  const [isSessionExpired, setSessionExpired] = useState<boolean>(false);

  const checkSessionExpired = useCallback(() => {
    // Remove retry login state
    unsetRetryLogin();

    // Set session expired
    setSessionExpired(!isLoggedIn);

    // Clear storage when session is expired
    if (!isLoggedIn) {
      resetStorage();
    }
  }, [isLoggedIn, resetStorage, unsetRetryLogin]);

  useEffect(() => {
    /**
     * When the user comes back in with the retry item in localStorage
     * and they are still not logged in with Ping: sesssion expired
     * and remove the retry item from localStorage
     */
    if (didRetryLogin) {
      checkSessionExpired();
    }
  }, [checkSessionExpired, didRetryLogin]);

  useEffect(() => {
    const isFirstSessionExpired = Boolean(!isLoggedIn && isPrevLoggedIn);

    /**
     * When the login changes from logged in to not logged in:
     * store in localStorage that we are going to retry the login
     * and then retry the login silently
     */
    if (!isSessionExpired && !didRetryLogin && isFirstSessionExpired) {
      authorize({ prompt: 'none' }, { isRetrying: true });
    }
  }, [checkSessionExpired, isLoggedIn, didRetryLogin, isPrevLoggedIn, isSessionExpired, authorize]);

  return isSessionExpired;
}

function useAuthAccessToken(): { (): Promise<string | null> } {
  const getAccessToken = useStore((state) => state.methods.getAccessToken);
  return useCallback(() => {
    return getAccessToken().then((result) => result?.token ?? null);
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
