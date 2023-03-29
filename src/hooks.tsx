import { useCallback, useEffect, useState } from 'react';
import { useAsync, usePrevious } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsync';

import { useOidcJwtStore } from './OidcJwtProvider';
import { ClaimsBase, Params } from './types';

interface IUseAuthControls {
  logout: (params?: Params) => void;
  authorize: (params?: Params) => void;
}

function useAuthControls(): IUseAuthControls {
  const authService = useOidcJwtStore((state) => state.service);

  return {
    authorize: (params) => authService?.authorize(params),
    logout: (params) => authService?.logout(params),
  };
}

function useAuthInitialized(): boolean {
  return useOidcJwtStore((state) => state.authState.isInitialized);
}

function useAuthUserInfo<T>(): AsyncState<T | null> {
  const authService = useOidcJwtStore((state) => state.service);
  const setState = useOidcJwtStore((state) => state.setState);

  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn || !authService) {
      return Promise.resolve(null);
    }
    return authService.getUserInfo<T>().then((userInfo) => {
      setState(authService.state);
      return userInfo;
    });
  }, [isLoggedIn]);
}

function useAuthAccessClaims<T extends ClaimsBase>(): AsyncState<T | null> {
  const authService = useOidcJwtStore((state) => state.service);
  const setState = useOidcJwtStore((state) => state.setState);
  const isLoggedIn = useAuthIsLoggedIn();

  return useAsync<() => Promise<T | null>>(async () => {
    if (!isLoggedIn || !authService) {
      return Promise.resolve(null);
    }
    return authService.getAccessToken<T>().then((info) => {
      setState(authService.state);
      return info?.claims ?? null;
    });
  }, [isLoggedIn]);
}

function useAuthIsLoggedIn(): boolean {
  return useOidcJwtStore((state) => state.authState.isLoggedIn);
}

function useAuthSessionExpired(): boolean {
  const authService = useOidcJwtStore((state) => state.service);

  const isLoggedIn = useOidcJwtStore((state) => state.authState.isLoggedIn);
  const didRetryLogin = useOidcJwtStore((state) => state.authState.didRetryLogin);
  const isInitialized = useOidcJwtStore((state) => state.authState.isInitialized);

  const isPrevLoggedIn = usePrevious<boolean>(isLoggedIn);
  const [isSessionExpired, setSessionExpired] = useState<boolean>(false);

  const checkSessionExpired = useCallback(() => {
    // Remove retry login state
    authService?.unsetRetryLogin();

    // Set session expired
    setSessionExpired(!isLoggedIn);

    // Clear storage when session is expired
    if (!isLoggedIn) {
      authService?.resetStorage();
    }
  }, [authService, isLoggedIn]);

  useEffect(() => {
    /**
     * When the user comes back in with the retry item in localStorage
     * and they are still not logged in with Ping: sesssion expired
     * and remove the retry item from localStorage
     */
    if (didRetryLogin && isInitialized) {
      checkSessionExpired();
    }
  }, [checkSessionExpired, didRetryLogin, isInitialized]);

  useEffect(() => {
    const isFirstSessionExpired = Boolean(!isLoggedIn && isPrevLoggedIn);

    /**
     * When the login changes from logged in to not logged in:
     * store in localStorage that we are going to retry the login
     * and then retry the login silently
     */
    if (!isSessionExpired && !didRetryLogin && isFirstSessionExpired && isInitialized) {
      authService?.authorize({ prompt: 'none' }, { isRetrying: true });
    }
  }, [
    checkSessionExpired,
    isLoggedIn,
    didRetryLogin,
    isPrevLoggedIn,
    isSessionExpired,
    authService,
    isInitialized,
  ]);

  return isSessionExpired;
}

function useAuthAccessToken(): { (): Promise<string | null> } {
  const authService = useOidcJwtStore((state) => state.service);
  const setState = useOidcJwtStore((state) => state.setState);

  return useCallback(() => {
    if (!authService) {
      return Promise.resolve(null);
    }

    return authService.getAccessToken().then((result) => {
      setState(authService.state);
      return result?.token ?? null;
    });
  }, [authService, setState]);
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
