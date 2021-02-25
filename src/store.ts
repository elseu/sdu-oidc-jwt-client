import create, { UseStore } from 'zustand';

import { buildQuerystring, HttpError, stripTokenFromUrl } from './utils';
import { isSSR } from './utils/isSSR';
import { parseJson } from './utils/parseJson';

export interface Params {
  [key: string]: string
}

export interface ClaimsBase {
  iat: number
  exp: number
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

interface StoreMethods {
  reset: () => void;
  logout: (params?: Params) => void;
  authorize: (params?: Params) => void;

  setIsLoggedIn(loggedIn: boolean): void;
  setInitializedData<Claims>(initializedData: Claims | null): void

  /**
   * Receive session token and return user info
   * @param redirect If true (the default), redirect to the same page without the token.
   * @returns Promise<void>
   */
  loadInitialData<Claims extends ClaimsBase, User>(redirect?: boolean): Promise<void>

  /**
   * Try to remove token from url
   */
  removeTokenFromUrl(): void

  /**
   * Read the session token from the URL. Remove it from the URL if possible.
   * @returns Whether a redirect is taking place.
   */
  receiveSessionToken(): string | null

  /**
   * Get a valid access token. If we already have one that's valid, we will not fetch a new one.
   * @returns Promise of access token info, or null.
   */
  getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null>;

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
  validateAccessTokenCache<T extends ClaimsBase>(cache: AccessTokenCache<T>, currentAccessTokenCache: Promise<AccessTokenCache<T>>): null | AccessTokenInfo<T> | Promise<AccessTokenInfo<T> | null>

  /**
   * Set our session token.
   * @param {string} token
   */
  setSessionToken(token: string): void;

  /**
   * Remove our session token.
   */
  removeSessionToken(): void;

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
  fetchJsonWithAuth<T>(url: string): Promise<T>
}

export type UseOidcJwtClientStore = {
  baseUrl: string
  csrfToken: string | null
  defaultAuthConfig: Params
  monitorAccessTokenTimeout: ReturnType<typeof setTimeout> | null

  accessTokenCache?: Promise<AccessTokenCache<any>> | null;
  userInfoCache: any
  userInfo: any

  initializedData?: any | null

  isLoggedIn: boolean

  methods: StoreMethods
};

export interface OidcJwtClientOptions {
  url: string;
  defaultAuthConfig?: Params;
}

export const CSRF_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_token';
const LOGGED_IN_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_logged_in';
const USER_INFO_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_user_info';

function createOidcJwtClientStore(options: OidcJwtClientOptions): UseStore<UseOidcJwtClientStore> {
  return create<UseOidcJwtClientStore>((set, get) => {
    const isLoggedInPersistentValue = !isSSR ? localStorage.getItem(LOGGED_IN_TOKEN_STORAGE_KEY) : undefined;
    const userInfoPersistentValue = !isSSR ? localStorage.getItem(USER_INFO_TOKEN_STORAGE_KEY) : undefined;
    return ({
      baseUrl: options.url.replace(/\/$/, ''),
      csrfToken: (!isSSR && localStorage.getItem(CSRF_TOKEN_STORAGE_KEY)) || null,
      defaultAuthConfig: options.defaultAuthConfig || {},
      monitorAccessTokenTimeout: null,
      accessTokenCache: undefined,
      userInfoCache: undefined,
      userInfo: userInfoPersistentValue ? parseJson(userInfoPersistentValue) : undefined,

      isLastAccessTokenInvalid: false,
      isLoggedIn: isLoggedInPersistentValue ? parseJson(isLoggedInPersistentValue) : false,

      initializedData: undefined,

      methods: {
        setInitializedData<Claims>(initializedData: Claims | null) {
          set({
            initializedData,
          });
        },

        setIsLoggedIn(isLoggedIn: boolean) {
          if (!isSSR) localStorage.setItem(LOGGED_IN_TOKEN_STORAGE_KEY, JSON.stringify(isLoggedIn));
          set({
            isLoggedIn,
            ...(!isLoggedIn ? { userInfoCache: undefined } : {}),
          });
        },

        fetchJsonWithAuth<T>(url: string): Promise<T> {
          const { baseUrl, csrfToken } = get();

          return fetch(baseUrl + url, {
            headers: {
              Authorization: 'Bearer ' + csrfToken,
            },
            credentials: 'include',
          }).then<T>((response) => {
            if (!response.ok) {
              throw new HttpError({ statusCode: response.status, message: 'Error fetching JSON' });
            }
            return response.json();
          });
        },

        authorize(params: Params = {}) {
          const { defaultAuthConfig, baseUrl, methods: { reset } } = get();

          const queryParams = { ...defaultAuthConfig, ...params };
          if (!queryParams.redirect_uri) {
            queryParams.redirect_uri = stripTokenFromUrl(window.location.href);
          }

          reset();
          window.location.href = baseUrl + '/authorize?' + buildQuerystring(queryParams);
        },

        reset: () => {
          localStorage.removeItem(LOGGED_IN_TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_INFO_TOKEN_STORAGE_KEY);
        },

        logout: (params: Params = {}) => {
          const { baseUrl, methods: { reset } } = get();

          const post_logout_redirect_uri = params.post_logout_redirect_uri || window.location.href;
          const queryParams = {
            ...params,
            post_logout_redirect_uri,
          };

          if (isSSR) return;

          reset();
          window.location.href = baseUrl + '/logout?' + buildQuerystring(queryParams);
        },

        loadInitialData<Claims extends ClaimsBase, User>(redirect = true): Promise<void> {
          const {
            methods: {
              receiveSessionToken,
              getAccessToken,
              getUserInfo,
              removeTokenFromUrl,
              setInitializedData,
            },
          } = get();

          const token = receiveSessionToken();

          if (!token) {
            setInitializedData(null);
            return Promise.resolve();
          }

          return getUserInfo<User>().then((data) => {
            if (redirect) {
              removeTokenFromUrl();
            }

            if (!data) {
              setInitializedData(null);
              return;
            }

            return getAccessToken<Claims>().then(info => {
              setInitializedData<Claims>(info?.claims ?? null);
            });
          });
        },

        removeTokenFromUrl(): void {
          const urlWithoutToken = stripTokenFromUrl(window.location.href).replace(/\?$/, '').replace(/#\.$/, '');
          window.history.replaceState({}, '', urlWithoutToken);
        },

        receiveSessionToken(): string | null{
          const { csrfToken, methods: { setSessionToken } } = get();
          const [, token] = (!isSSR && window.location.search.match(/[?&]token=([^&]+)/)) || [];

          const returnedToken = token || csrfToken;
          if (!returnedToken) return null;

          setSessionToken(returnedToken);
          return returnedToken;
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

          // Cache is no longer valid; go again.
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

          const currentAccessTokenCache = accessTokenCache;

          return accessTokenCache.then((cache) => validateAccessTokenCache<T>(cache, currentAccessTokenCache));
        },

        setUserInfo<T>(userInfo: T) {
          if (!isSSR) localStorage.setItem(USER_INFO_TOKEN_STORAGE_KEY, JSON.stringify(userInfo));
          set({ userInfo });
        },

        getUserInfo<T>(): Promise<T | null> {
          const { userInfoCache, userInfo, isLoggedIn, methods: { fetchUserInfo, setUserInfo, setIsLoggedIn } } = get();

          if (isLoggedIn && userInfo) {
            return Promise.resolve(userInfo);
          }

          if (userInfoCache) {
            return userInfoCache;
          }

          return fetchUserInfo<T>().then((data) => {
            if (data && Object.keys(data).length) {
              setUserInfo<T>(data);
              setIsLoggedIn(true);
            }
            return Promise.resolve(data);
          });
        },

        monitorAccessToken(): void {
          const { accessTokenCache, methods: { fetchAccessToken } } = get();

          const updateToken = (first = false) => {
            if ((first && !accessTokenCache) || !first) {
              fetchAccessToken();
            }
            accessTokenCache?.then(cache => {
              if (!cache.validUntil) return;
              // Update the token some 10 seconds before it expires.
              const now = new Date().getTime();
              const tokenUpdateTimestamp = cache.validUntil - 1000;
              const timeoutMs = Math.max(10000, tokenUpdateTimestamp - now);

              // Set a timeout to fetch a new token in X seconds.
              set({ monitorAccessTokenTimeout: setTimeout(() => updateToken(false), timeoutMs) });
            });
          };

          updateToken(true);
        },

        stopMonitoringAccessToken(): void {
          const { monitorAccessTokenTimeout } = get();
          if (!monitorAccessTokenTimeout) return;
          clearTimeout(monitorAccessTokenTimeout);
        },

        setSessionToken(token: string): void {
          set({ csrfToken: token });
          if (!isSSR) localStorage.setItem(CSRF_TOKEN_STORAGE_KEY, token);
        },

        removeSessionToken(): void {
          // Save token to store, HttpClient and localStorage
          set({ csrfToken: null });
          if (!isSSR) localStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
        },

        fetchUserInfo<T>(): Promise<T | null> {
          const { csrfToken, methods: { fetchJsonWithAuth } } = get();

          if (!csrfToken) {
            return Promise.resolve(null);
          }

          const userInfoCacheError = (_error: HttpError) => {
            return null;
          };

          const userInfoCache = fetchJsonWithAuth<T>('/userinfo').then(result => result, userInfoCacheError);

          set({ userInfoCache });

          return userInfoCache;
        },

        fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>> {
          const { csrfToken, methods, methods: { fetchJsonWithAuth } } = get();
          const { fetchAccessTokenSuccess, fetchAccessTokenError } = methods;

          const fetchedAt = new Date().getTime();
          if (!csrfToken) {
            return Promise.resolve({ token: null, claims: null });
          }

          const accessTokenCache = fetchJsonWithAuth<AccessTokenInfo<T>>('/token').then(
            result => fetchAccessTokenSuccess<T>(result, fetchedAt),
            fetchAccessTokenError,
          );

          set({ accessTokenCache });

          return accessTokenCache.then((result) => result.value);
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
