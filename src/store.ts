import create, { UseStore } from 'zustand';

import { Storage } from './storage';
import { buildQuerystring, HttpError, stripTokenFromUrl } from './utils';
import { isSSR } from './utils/isSSR';

export interface Params {
  [key: string]: string;
}

export interface ClaimsBase {
  iat: number;
  exp: number;
}

interface AccessTokenInfo<T extends ClaimsBase> {
  token: string | null;
  claims: T | null;
}

interface AccessTokenCache<T extends ClaimsBase> {
  value: AccessTokenInfo<T>;
  validUntil: number | null;
  isError: boolean;
}

export interface InitializedData<Claims extends ClaimsBase, User> {
  isLoading: boolean;
  claims: Claims | undefined;
  user: User | undefined;
}

interface StoreMethods {
  resetStorage: () => void;
  logout: (params?: Params) => void;
  authorize: (params?: Params) => void;

  setIsLoggedIn(loggedIn: boolean): void;
  setInitialized(isInitialized: boolean): void;

  /**
   * Receive session token and return user info
   * @param redirect If true (the default), redirect to the same page without the token.
   * @returns Promise<void>
   */
  loadInitialData(redirect?: boolean): Promise<void>;

  /**
   * Try to remove token from url
   */
  removeTokenFromUrl(): void;

  /**
   * Read the session token from the URL. Remove it from the URL if possible.
   * @returns Whether a redirect is taking place.
   */
  getCsrfToken(): { csrfToken: string | null; hasTokenFromUrl: boolean};

  /**
   * Get the access token promise.
   * @returns Promise of access token info
   */
  getAccessTokenPromise<T extends ClaimsBase>(fetchedAt: number): Promise<AccessTokenInfo<T>>;

  /**
   * Get a valid access token. If we already have one that's valid, we will not fetch a new one.
   * @returns Promise of access token info, or null.
   */
  getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null>;

  /**
   * Get user info success handle
   * @returns user info or null.
   */
  getUserInfoSuccess<T>(data: T): T | null;

  /**
   * Get user info. If we already have user info, we will not fetch new info.
   * @returns Promise of user info.
   */
  getUserInfo<T>(): Promise<T | null>;

  /**
   * Set user info.
   * @returns void
   */
  setUserInfo<T>(userInfo: T): void;

  /**
   * Gets user info cache promise
   * @returns A promise of the user info cache
   */
  getUserInfoPromise<T>(): Promise<T | null>;

  /**
   * Fetch fresh user info.
   * @returns A promise of the user info.
   */
  fetchUserInfo<T>(): Promise<T | null>;

  /**
   * Monitor our access token and keep it up-to-date, so getAccessToken() is always fast.
   */
  monitorAccessToken(): void;

  /**
   * Stop monitoring for new access token.
   */
  stopMonitoringAccessToken(): void;

  /**
   * Validate the AccessTokenCache. If cache is valid return value otherwise clean cache
   * @returns null, AccessTokenInfo or Promise of AccessTokenInfo
   */
  // eslint-disable-next-line max-len
  validateAccessTokenCache<T extends ClaimsBase>(cache: AccessTokenCache<T>, currentAccessTokenCache: Promise<AccessTokenCache<T>>): null | AccessTokenInfo<T> | Promise<AccessTokenInfo<T> | null>;

  /**
   * Set our session token.
   * @param {string} token
   */
  setSessionToken(token: string): void;

  /**
   * Fetch a fresh access token.
   * @returns A promise of the access token info.
   */
  fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>>;

  fetchAccessTokenSuccess<T extends ClaimsBase>(value: AccessTokenInfo<T>, fetchedAt: number): AccessTokenCache<T>;

  fetchAccessTokenError(error: HttpError): AccessTokenCache<any>;

  /**
   * Fetch wrapper
   */
  fetchJsonWithAuth<T>(url: string): Promise<T>;
}

export type UseOidcJwtClientStore = {
  baseUrl: string;
  defaultAuthConfig: Params;
  removeTokenFromUrlFunction: (url: string) => void;

  monitorAccessTokenTimeout: ReturnType<typeof setTimeout> | null;
  accessTokenCache?: Promise<AccessTokenCache<any>> | null;
  userInfoCache?: any;
  userInfo: any;
  csrfToken: string | null;

  isLoggedIn: boolean;
  isInitialized: boolean;

  methods: StoreMethods;
};

export interface OidcJwtClientOptions {
  url: string;
  defaultAuthConfig?: Params;
}

export const CSRF_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_token';
const LOGGED_IN_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_logged_in';
const USER_INFO_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_user_info';

function createOidcJwtClientStore(
  options: OidcJwtClientOptions,
  removeTokenFromUrlFunction: (url: string) => void,
): UseStore<UseOidcJwtClientStore> {
  return create<UseOidcJwtClientStore>((set, get) => {
    return ({
      baseUrl: options.url.replace(/\/$/, ''),
      defaultAuthConfig: options.defaultAuthConfig || {},
      removeTokenFromUrlFunction,

      monitorAccessTokenTimeout: null,
      accessTokenCache: undefined,
      userInfoCache: undefined,
      userInfo: Storage.get(USER_INFO_TOKEN_STORAGE_KEY),
      csrfToken: Storage.get(CSRF_TOKEN_STORAGE_KEY),

      isLoggedIn: !!Storage.get(LOGGED_IN_TOKEN_STORAGE_KEY),

      isInitialized: false,

      methods: {
        setInitialized(isInitialized: boolean) {
          set({
            isInitialized,
          });
        },

        setIsLoggedIn(isLoggedIn: boolean) {
          Storage.set(LOGGED_IN_TOKEN_STORAGE_KEY, isLoggedIn);
          set({
            isLoggedIn,
            ...(!isLoggedIn ? { userInfoCache: undefined } : {}),
          });
        },

        fetchJsonWithAuth<T>(url: string): Promise<T> {
          const { baseUrl, csrfToken } = get();

          const config = {
            headers: {
              Authorization: `Bearer ${csrfToken}`,
            },
            credentials: 'include' as RequestCredentials,
          };

          return fetch(`${baseUrl}${url}`, config).then<T>(response => {
            if (!response.ok) {
              throw new HttpError({ statusCode: response.status, message: 'Error fetching JSON' });
            }
            return response.json();
          });
        },

        authorize(params: Params = {}) {
          const { defaultAuthConfig, baseUrl, methods: { resetStorage } } = get();

          const queryParams = { ...defaultAuthConfig, ...params };
          if (!queryParams.redirect_uri) {
            queryParams.redirect_uri = stripTokenFromUrl(window.location.href);
          }

          resetStorage();

          window.location.href = `${baseUrl}/authorize?${buildQuerystring(queryParams)}`;
        },

        resetStorage() {
          Storage.unset(LOGGED_IN_TOKEN_STORAGE_KEY);
          Storage.unset(USER_INFO_TOKEN_STORAGE_KEY);
        },

        logout(params: Params = {}) {
          const { baseUrl, methods: { resetStorage } } = get();

          const post_logout_redirect_uri = params.post_logout_redirect_uri || window.location.href;
          const queryParams = {
            ...params,
            post_logout_redirect_uri,
          };

          resetStorage();
          window.location.href = `${baseUrl}/logout?${buildQuerystring(queryParams)}`;
        },

        loadInitialData<Claims extends ClaimsBase, User>(): Promise<void> {
          const {
            methods: {
              getCsrfToken,
              getAccessToken,
              getUserInfo,
              removeTokenFromUrl,
              setInitialized,
            },
          } = get();

          const { csrfToken, hasTokenFromUrl } = getCsrfToken();

          if (!csrfToken) {
            setInitialized(true);
            return Promise.resolve();
          }

          return getUserInfo<User>().then((user) => {
            if (hasTokenFromUrl) {
              removeTokenFromUrl();
            }
            if (!user || !Object.keys(user).length) {
              setInitialized(true);
              return;
            }

            return getAccessToken<Claims>().then(() => setInitialized(true));
          });
        },

        removeTokenFromUrl(): void {
          const { removeTokenFromUrlFunction } = get();
          removeTokenFromUrlFunction(window.location.href);
        },

        getCsrfToken(): { csrfToken: string | null; hasTokenFromUrl: boolean} {
          const { csrfToken, methods: { setSessionToken } } = get();
          const [, token] = (!isSSR && window.location.search.match(/[?&]token=([^&]+)/)) || [];

          const receivedToken = token || csrfToken || null;

          if (receivedToken) setSessionToken(receivedToken);

          return { csrfToken: receivedToken, hasTokenFromUrl: !!token };
        },

        validateAccessTokenCache<T extends ClaimsBase>(
          cache: AccessTokenCache<T>,
          currentAccessTokenCache: Promise<AccessTokenCache<T>>,
        ): null | AccessTokenInfo<T> | Promise<AccessTokenInfo<T> | null> {
          const { accessTokenCache, methods: { getAccessToken } } = get();
          const now = new Date().getTime();

          if (cache.isError) {
            return null;
          }

          if (cache.validUntil && cache.validUntil > now) {
            return cache.value;
          }

          // Cache is no longer valid; go again (on logout)
          if (accessTokenCache === currentAccessTokenCache) {
            // Remove the cache, but only if it hasn't already been removed and recreated by someone else.
            set({ accessTokenCache: null });
          }
          return getAccessToken();
        },

        getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null> {
          const { accessTokenCache, methods: { fetchAccessToken, validateAccessTokenCache } } = get();

          if (!accessTokenCache) {
            return fetchAccessToken<T>();
          }

          // const currentCache = accessTokenCache;
          return accessTokenCache.then(cache => validateAccessTokenCache<T>(cache, accessTokenCache));
        },

        setUserInfo<T>(userInfo: T) {
          Storage.set(USER_INFO_TOKEN_STORAGE_KEY, userInfo);
          set({ userInfo });
        },

        getUserInfoSuccess<T>(data: T): T | null {
          const { methods: { setUserInfo, setIsLoggedIn } } = get();

          if (data && Object.keys(data).length) {
            setUserInfo<T>(data);
            setIsLoggedIn(true);
          }
          return data;
        },

        getUserInfo<T>(): Promise<T | null> {
          const { userInfoCache, userInfo, isLoggedIn, methods: { fetchUserInfo, getUserInfoSuccess } } = get();

          if (isLoggedIn && userInfo) {
            return Promise.resolve(userInfo);
          }

          if (userInfoCache) {
            return userInfoCache;
          }

          return fetchUserInfo<T>().then(getUserInfoSuccess);
        },

        monitorAccessToken(): void {
          const { accessTokenCache, methods: { fetchAccessToken } } = get();
          // so, accessTokenCache, holds the OLD promise at this point (if first is false)
          // at the end of the token life-cycle.
          const updateToken = (first = false) => {
            if ((first && !accessTokenCache) || !first) {
              // But... fetchAccessToken updates the accessTokenCache immediately with a new promise
              fetchAccessToken();
            }
            // let's get the new accessTokenCache promise here
            // and when that promise is solved, we can schedule a timer using the accessTokenCacheHandler,
            // to do a token update when the new token expires
            const accessTokenCacheNew = get().accessTokenCache;
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
            set({ monitorAccessTokenTimeout: setTimeout(() => updateToken(false), timeoutMs) });
          };

          updateToken(true);
        },

        stopMonitoringAccessToken(): void {
          const { monitorAccessTokenTimeout } = get();
          if (!monitorAccessTokenTimeout) return;
          clearTimeout(monitorAccessTokenTimeout);
        },

        setSessionToken(token: string): void {
          Storage.set(CSRF_TOKEN_STORAGE_KEY, token);
          set({ csrfToken: token });
        },

        getUserInfoPromise<T>(): Promise<T | null> {
          const { methods: { fetchJsonWithAuth } } = get();

          const userInfoCache = fetchJsonWithAuth<T>('/userinfo').then(result => result, () => null);

          set({ userInfoCache });

          return userInfoCache;
        },

        fetchUserInfo<T>(): Promise<T | null> {
          const { methods: { getCsrfToken, getUserInfoPromise } } = get();

          const { csrfToken } = getCsrfToken();

          if (!csrfToken) {
            return Promise.resolve(null);
          }

          return getUserInfoPromise<T>();
        },

        getAccessTokenPromise<T extends ClaimsBase>(fetchedAt: number): Promise<AccessTokenInfo<T>> {
          const { methods: { fetchJsonWithAuth, fetchAccessTokenSuccess, fetchAccessTokenError } } = get();
          const accessTokenCache = fetchJsonWithAuth<AccessTokenInfo<T>>('/token').then(
            result => fetchAccessTokenSuccess<T>(result, fetchedAt),
            fetchAccessTokenError,
          );

          set({ accessTokenCache });

          return accessTokenCache.then(result => result.value);
        },

        fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>> {
          const { methods: { getAccessTokenPromise, getCsrfToken } } = get();

          const { csrfToken } = getCsrfToken();
          const fetchedAt = new Date().getTime();

          if (!csrfToken) {
            return Promise.resolve({ token: null, claims: null });
          }

          return getAccessTokenPromise<T>(fetchedAt);
        },

        fetchAccessTokenSuccess<T extends ClaimsBase>(value: AccessTokenInfo<T>, fetchedAt: number) {
          const { claims, token } = value;
          const { methods: { setIsLoggedIn } } = get();

          if (token && claims && typeof claims.iat === 'number' && typeof claims.exp === 'number') {
            const validUntil = fetchedAt + 1000 * (claims.exp - claims.iat);
            setIsLoggedIn(true);
            return { value, validUntil, isError: false };
          }

          setIsLoggedIn(false);
          return { value, validUntil: null, isError: false };
        },

        fetchAccessTokenError(_error: HttpError): AccessTokenCache<any> {
          const response = { value: { token: null, claims: null }, validUntil: null, isError: true };
          const { methods: { setIsLoggedIn } } = get();

          setIsLoggedIn(false);

          return response;
        },
      },
    });
  });
}

export { createOidcJwtClientStore };
