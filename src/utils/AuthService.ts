import queryString from 'query-string';

import {
  CSRF_TOKEN_STORAGE_KEY,
  CsrfTokenMethod,
  LOGGED_IN_TOKEN_STORAGE_KEY,
  RETRY_LOGIN_STORAGE_KEY,
  USER_INFO_TOKEN_STORAGE_KEY,
} from '../constants';
import { Storage } from '../storage';
import {
  AccessTokenCache,
  AccessTokenInfo,
  AuthorizeConfig,
  AuthServiceOptions,
  AuthState,
  ClaimsBase,
  OidcJwtClientOptions,
  Params,
  RemoveTokenFromUrlFunction,
} from '../types';
import { HttpError } from './errors';
import { stripTokenFromUrl } from './stripTokenFromUrl';

type Cache = {
  userInfoCache: any;
  accessTokenCache: any;
};

export class AuthService {
  client: OidcJwtClientOptions;
  state: AuthState;
  removeTokenFromUrlFunction?: RemoveTokenFromUrlFunction;
  csrfTokenMethod: CsrfTokenMethod = CsrfTokenMethod.HEADER;
  monitorAccessTokenTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  cache: Cache = {
    userInfoCache: undefined,
    accessTokenCache: undefined,
  };

  constructor(options: AuthServiceOptions) {
    this.client = options.client;
    this.state = options.state;
    this.removeTokenFromUrlFunction = options.removeTokenFromUrlFunction;

    if (this.client.csrfTokenMethod) {
      this.csrfTokenMethod = this.client.csrfTokenMethod;
    }
  }

  setInitialized(isInitialized: boolean) {
    this.state.isInitialized = isInitialized;
  }

  setIsLoggedIn(isLoggedIn: boolean) {
    Storage.set(LOGGED_IN_TOKEN_STORAGE_KEY, isLoggedIn);

    this.state.isLoggedIn = isLoggedIn;

    if (!isLoggedIn) {
      this.cache.userInfoCache = undefined;
    }
  }

  getFetchRequest(url: string): { config?: RequestInit; input: RequestInfo } {
    const defaultConfig: RequestInit = {
      credentials: 'include' as RequestCredentials,
    };

    switch (this.csrfTokenMethod) {
      case CsrfTokenMethod.QUERYSTRING:
        return {
          input: queryString.stringifyUrl({
            url: `${this.client.url}${url}`,
            query: { token: this.state.csrfToken ?? '' },
          }),
          config: defaultConfig,
        };
      default: // HEADER
        return {
          input: `${this.client.url}${url}`,
          config: {
            ...defaultConfig,
            headers: {
              Authorization: `Bearer ${this.state.csrfToken}`,
            },
          },
        };
    }
  }

  fetchJsonWithAuth<T>(url: string): Promise<T> {
    const { config, input } = this.getFetchRequest(url);

    return fetch(input, config).then<T>((response) => {
      if (!response.ok) {
        throw new HttpError({ statusCode: response.status, message: 'Error fetching JSON' });
      }
      return response.json();
    });
  }

  authorize(params: Params = {}, { isRetrying }: AuthorizeConfig = {}) {
    const query = { ...(this.client.defaultAuthConfig || {}), ...params };
    if (!query.redirect_uri) {
      query.redirect_uri = stripTokenFromUrl(window.location.href);
    }

    this.resetStorage();

    if (isRetrying) {
      this.setRetryLogin();
    }

    window.location.href = queryString.stringifyUrl({ url: `${this.client.url}/authorize`, query });
  }

  logout(params: Params = {}) {
    const post_logout_redirect_uri = params.post_logout_redirect_uri || window.location.href;
    const query = {
      ...params,
      post_logout_redirect_uri,
    };

    this.resetStorage();
    window.location.href = queryString.stringifyUrl({ url: `${this.client.url}/logout`, query });
  }

  resetStorage(resetCsrfToken = false) {
    Storage.unset(LOGGED_IN_TOKEN_STORAGE_KEY);
    Storage.unset(USER_INFO_TOKEN_STORAGE_KEY);
    if (resetCsrfToken) Storage.unset(CSRF_TOKEN_STORAGE_KEY);
  }

  setRetryLogin() {
    Storage.set(RETRY_LOGIN_STORAGE_KEY, 1);
  }

  unsetRetryLogin() {
    Storage.unset(RETRY_LOGIN_STORAGE_KEY);
  }

  async loadInitialData<Claims extends ClaimsBase, User>() {
    const { csrfToken, hasTokenFromUrl } = this.getCsrfToken();

    if (!csrfToken) {
      this.setInitialized(true);
      return;
    }

    const user = await this.getUserInfo<User>();

    if (hasTokenFromUrl) {
      this.removeTokenFromUrl();
    }

    if (!user || !Object.keys(user).length) {
      this.setInitialized(true);
      return;
    }

    await this.getAccessToken<Claims>();
    this.setInitialized(true);
  }

  removeTokenFromUrl(): void {
    if (typeof window === 'undefined') return;
    this.removeTokenFromUrlFunction?.(window.location.href);
  }

  getCsrfToken(): { csrfToken: string | null; hasTokenFromUrl: boolean } {
    const [, token] =
      (typeof window !== 'undefined' && window.location.search.match(/[?&]token=([^&]+)/)) || [];

    const receivedToken = token || this.state.csrfToken || null;

    if (receivedToken) this.setSessionToken(receivedToken);

    return { csrfToken: receivedToken, hasTokenFromUrl: !!token };
  }

  validateAccessTokenCache<T extends ClaimsBase>(
    cache: AccessTokenCache<T>,
    currentAccessTokenCache: Promise<AccessTokenCache<T>>,
  ): null | AccessTokenInfo<T> | Promise<AccessTokenInfo<T> | null> {
    const now = new Date().getTime();

    if (cache.isError) {
      return null;
    }

    if (cache.validUntil && cache.validUntil > now) {
      return cache.value;
    }

    // Cache is no longer valid; go again (on logout)
    if (this.cache.accessTokenCache === currentAccessTokenCache) {
      // Remove the cache, but only if it hasn't already been removed and recreated by someone else.
      this.cache.accessTokenCache = null;
    }
    return this.getAccessToken();
  }

  getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null> {
    if (!this.cache.accessTokenCache) {
      return this.fetchAccessToken<T>();
    }

    return this.cache.accessTokenCache.then((cache: any) =>
      this.validateAccessTokenCache<T>(cache, this.cache.accessTokenCache),
    );
  }

  setUserInfo<T>(userInfo: T) {
    Storage.set(USER_INFO_TOKEN_STORAGE_KEY, userInfo);
    this.state.userInfo = userInfo;
  }

  getUserInfo<T>(): Promise<T | null> {
    if (this.state.isLoggedIn && this.state.userInfo) {
      return Promise.resolve(this.state.userInfo);
    }

    if (this.cache.userInfoCache) {
      return this.cache.userInfoCache;
    }

    return this.fetchUserInfo<T>();
  }

  setSessionToken(token: string): void {
    Storage.set(CSRF_TOKEN_STORAGE_KEY, token);
    this.state.csrfToken = token;
  }

  getUserInfoPromise<T>(): Promise<T | null> {
    const userInfoCache = this.fetchJsonWithAuth<T>('/userinfo').then(
      (result) => result,
      () => null,
    );

    this.cache.userInfoCache = userInfoCache;

    return userInfoCache;
  }

  fetchUserInfo<T>(): Promise<T | null> {
    const { csrfToken } = this.getCsrfToken();

    if (!csrfToken) {
      return Promise.resolve(null);
    }

    return this.getUserInfoPromise<T>();
  }

  getAccessTokenPromise<T extends ClaimsBase>(fetchedAt: number): Promise<AccessTokenInfo<T>> {
    const accessTokenCache = this.fetchJsonWithAuth<AccessTokenInfo<T>>('/token').then(
      (result) => this.fetchAccessTokenSuccess<T>(result, fetchedAt),
      (err) => this.fetchAccessTokenError(err),
    );

    this.cache.accessTokenCache = accessTokenCache;

    return this.cache.accessTokenCache.then((result: any) => result.value);
  }

  fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>> {
    const { csrfToken } = this.getCsrfToken();
    const fetchedAt = new Date().getTime();

    if (!csrfToken) {
      return Promise.resolve({ token: null, claims: null });
    }

    return this.getAccessTokenPromise<T>(fetchedAt);
  }

  fetchAccessTokenSuccess<T extends ClaimsBase>(value: AccessTokenInfo<T>, fetchedAt: number) {
    const { claims, token } = value;

    if (token && claims && typeof claims.iat === 'number' && typeof claims.exp === 'number') {
      const validUntil = fetchedAt + 1000 * (claims.exp - claims.iat);
      this.setIsLoggedIn(true);
      return { value, validUntil, isError: false };
    }

    this.setIsLoggedIn(false);
    return { value, validUntil: null, isError: false };
  }

  fetchAccessTokenError(_error: HttpError): AccessTokenCache<any> {
    const response = { value: { token: null, claims: null }, validUntil: null, isError: true };
    this.setIsLoggedIn(false);
    return response;
  }

  monitorAccessToken(callback: () => void): void {
    // so, accessTokenCache, holds the OLD promise at this point (if first is false)
    // at the end of the token life-cycle.
    const updateToken = (first = false) => {
      if ((first && !this.cache.accessTokenCache) || !first) {
        // But... fetchAccessToken updates the accessTokenCache immediately with a new promise
        this.fetchAccessToken().then(() => callback());
      }
      // let's get the new accessTokenCache promise here
      // and when that promise is solved, we can schedule a timer using the accessTokenCacheHandler,
      // to do a token update when the new token expires
      const accessTokenCacheNew = this.cache.accessTokenCache;
      accessTokenCacheNew?.then(accessTokenCacheHandler);
    };

    const accessTokenCacheHandler = (cache: AccessTokenCache<any>) => {
      if (!cache.validUntil) return;

      // Update the token some 10 seconds before it expires.
      const now = new Date().getTime();
      // that'll be uhh, 10000 ms
      const tokenUpdateTimestamp = cache.validUntil - 10000;
      // Let's do sanity 10 secs as minimum to not bombard the server if
      // there is a mistake in the token expiration.
      const timeoutMs = Math.max(10000, tokenUpdateTimestamp - now);
      // Set a timeout to fetch a new token in X seconds.
      this.monitorAccessTokenTimeout = setTimeout(() => updateToken(false), timeoutMs);
    };

    updateToken(true);
  }

  stopMonitoringAccessToken(): void {
    if (!this.monitorAccessTokenTimeout) return;
    clearTimeout(this.monitorAccessTokenTimeout);
  }
}
