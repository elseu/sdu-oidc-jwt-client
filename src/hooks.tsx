import { useEffect } from 'react';

import { useOidcJwtContext } from './OidcJwtProvider';
import { ClaimsBase, Params } from './store';
import { State, useAuthReducer } from './utils/useAuthReducer';
import { usePromiseResult } from './utils/usePromiseResult';

interface OidcAuthControls {
  authorize(params?: Params): void;
  logout(params?: Params): void;
}

interface OidcAuthSessionInfo {
  isLoggedIn: boolean
  hasSession: boolean;
  hasValidSession: boolean;
}

function useAuthControls(): OidcAuthControls {
  const { useStore } = useOidcJwtContext();
  const authorize = useStore(state => state.methods.authorize);
  const logout = useStore(state => state.methods.logout);
  return { authorize, logout };
}

function useAuthUserInfo<T>(): State<T | null> {
  const { useStore } = useOidcJwtContext();
  const getUserInfo = useStore(state => state.methods.getUserInfo);
  const { hasValidSession } = useAuthSessionInfo();
  const [state, dispatch] = useAuthReducer<T>();

  const value = usePromiseResult<T | null>(() => {
    if (!hasValidSession) {
      return Promise.resolve(null);
    }
    return getUserInfo<T>();
  }, []);

  useEffect(() => {
    dispatch({ type: 'SET_DATA', payload: value });
  }, [dispatch, value]);

  return state;
}

function useAuthAccessClaims<T extends ClaimsBase>(): State<T | null> {
  const { useStore } = useOidcJwtContext();
  const getAccessToken = useStore(state => state.methods.getAccessToken);
  const { hasValidSession } = useAuthSessionInfo();
  const [state, dispatch] = useAuthReducer<T>();

  const value = usePromiseResult<T | null>(() => {
    if (!hasValidSession) {
      return Promise.resolve(null);
    }
    return getAccessToken<T>().then(info => info?.claims ?? null);
  }, []);

  useEffect(() => {
    dispatch({ type: 'SET_DATA', payload: value });
  }, [dispatch, value]);

  return state;
}

function useAuthSessionInfo(): OidcAuthSessionInfo {
  const { useStore } = useOidcJwtContext();
  const isLoggedIn = useStore(state => state.isLoggedIn);
  const hasSession = useStore(state => state.hasSessionToken());
  const hasValidSession = useStore(state => state.hasValidSession());

  return {
    isLoggedIn,
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
