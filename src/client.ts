import queryString from 'query-string';
export interface OidcJwtClientOptions {
  url: string;
  authorizationDefaults?: Record<string, string>;
}

interface AccessTokenCache<T extends ClaimsBase> {
  value: AccessTokenInfo<T>;
  validUntil: number | null;
}

interface AccessTokenInfo<T extends ClaimsBase> {
  token: string | null;
  claims: T | null;
}

export interface ClaimsBase {
  iat: number
  exp: number
}

export interface OidcJwtClient {
  /**
   * Read the session token from the URL. Remove it from the URL if possible.
   * @param redirect If true (the default), redirect to the same page without the token.
   * @returns Whether a redirect is taking place.
   */
  receiveSessionToken(redirect?: boolean): boolean;

  /**
   * Set our session token.
   * @param token
   */
  setSessionToken(token: string): void;

  /**
   * Send the user to the authorization endpoint to try to log them in.
   * @param params Extra query params for the endpoint.
   */
  authorize(params?: Record<string, string>): void;

  /**
   * Log the user out.
   * @param params Extra query params for the logout endpoint.
   */
  logout(params?: Record<string, string>): void;

  /**
   * Check if we have a session token.
   * @returns True if we have a session token, false otherwise.
   */
  hasSessionToken(): boolean;

  /**
   * Fetch a fresh access token.
   * @returns A promise of the access token info.
   */
  fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>>;

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
   * Get a valid access token. If we already have one that's valid, we will not fetch a new one.
   * @returns Promise of access token info, or null.
   */
  getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null>;

  /**
   * Get user info. If we already have user info, we will not fetch new info.
   * @returns Promise of user info.
   */
  getUserInfo<T>(): Promise<T | null>;
}

function buildQuerystring(params: Record<string, string>): string {
  return Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
}

function stripTokenFromUrl(href: string): string {
  //= > {url: 'https://foo.bar', query: {foo: 'bar'}}
  const parsedUrl = queryString.parseUrl(href, { parseFragmentIdentifier: true });
  const { url, query, fragmentIdentifier } = parsedUrl;
  const { token, ...params } = query;
  return queryString.stringifyUrl({ url, query: params, fragmentIdentifier });
}

class OidcJwtClientImpl implements OidcJwtClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private accessTokenCache: Promise<AccessTokenCache<any>> | undefined | null;
  private userInfoCache: any
  private baseUrl: string;
  private csrfToken: string | null;
  private csrfTokenStorageKey = 'oidc_jwt_provider_token';
  private monitorAccessTokenTimeout: ReturnType<typeof setTimeout> | null = null;
  private authorizationDefaults: Record<string, string>;

  constructor(options: OidcJwtClientOptions) {
    this.baseUrl = options.url.replace(/\/$/, '');
    this.csrfToken = localStorage.getItem(this.csrfTokenStorageKey) ?? null;
    this.authorizationDefaults = options.authorizationDefaults ?? {};
  }

  private fetchJsonWithAuth(url: string): Promise<Record<string, unknown>> {
    return fetch(url, {
      headers: {
        Authorization: 'Bearer ' + this.csrfToken,
      },
      credentials: 'include',
    }).then<Record<string, unknown>>((response) => {
      return response.json();
    });
  }

  receiveSessionToken(redirect = true): boolean {
    const match = window.location.search.match(/[?&]token=([^&]+)/);
    if (!match) return false;

    this.setSessionToken(match[1]);
    if (redirect || typeof redirect === 'undefined') {
      // TODO: Still need to figure out why #. is appearing in url
      window.location.href = stripTokenFromUrl(window.location.href).replace(/\?$/, '').replace(/#\.$/, '');
      return true;
    }
    return false;
  }

  setSessionToken(token: string): void {
    this.csrfToken = token;
    localStorage.setItem(this.csrfTokenStorageKey, this.csrfToken);
  }

  authorize(params: Record<string, string> = {}): void {
    const queryParams = { ...this.authorizationDefaults, ...params };
    if (!queryParams.redirect_uri) {
      queryParams.redirect_uri = stripTokenFromUrl(window.location.href);
    }
    window.location.href = this.baseUrl + '/authorize?' + buildQuerystring(queryParams);
  }

  logout(params: Record<string, string> = {}): void {
    if (!params.post_logout_redirect_uri) {
      params.post_logout_redirect_uri = window.location.href;
    }
    window.location.href = this.baseUrl + '/logout?' + buildQuerystring(params);
  }

  hasSessionToken(): boolean {
    return !!this.csrfToken;
  }

  fetchAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T>> {
    const fetchedAt = new Date().getTime();
    if (!this.csrfToken) {
      return Promise.resolve({ token: null, claims: null });
    }
    this.accessTokenCache = ((this.fetchJsonWithAuth(
      this.baseUrl + '/token',
    ) as unknown) as Promise<AccessTokenInfo<T>>).then((result) => {
      if (!result.token) {
        return { value: result, validUntil: null };
      }
      let validUntil = null;
      const claims = result.claims;
      if (
        claims &&
        typeof claims.iat === 'number' &&
        typeof claims.exp === 'number'
      ) {
        validUntil = fetchedAt + 1000 * (claims.exp - claims.iat);
      }
      return { value: result, validUntil: validUntil };
    });
    return this.accessTokenCache.then((result) => result.value);
  }

  fetchUserInfo<T>(): Promise<T | null> {
    if (!this.csrfToken) {
      return Promise.resolve(null);
    }
    this.userInfoCache = this.fetchJsonWithAuth(
      this.baseUrl + '/userinfo',
    ).then((result) => {
      if (result.status && result.status === 'error') {
        throw new Error((result.message as string) ?? 'Unknown error fetching userinfo');
      }
      return result as T;
    });
    return this.userInfoCache as Promise<T>;
  }

  monitorAccessToken(): void {
    const updateToken = () => {
      this.fetchAccessToken();
      this.accessTokenCache?.then((cache) => {
        if (cache.validUntil) {
          // Update the token some 10 seconds before it expires.
          const now = new Date().getTime();
          const tokenUpdateTimestamp = cache.validUntil - 1000;
          const timeoutMs = Math.max(
            10000,
            tokenUpdateTimestamp - now,
          );
          // Set a timeout to fetch a new token in X seconds.
          this.monitorAccessTokenTimeout = setTimeout(
            updateToken,
            timeoutMs,
          );
        }
      });
    };
    updateToken();
  }

  stopMonitoringAccessToken(): void {
    if (this.monitorAccessTokenTimeout) {
      clearTimeout(this.monitorAccessTokenTimeout);
    }
  }

  getAccessToken<T extends ClaimsBase>(): Promise<AccessTokenInfo<T> | null> {
    if (!this.accessTokenCache) {
      return this.fetchAccessToken<T>();
    }
    const currentAccessTokenCache = this.accessTokenCache;
    return this.accessTokenCache.then((cache) => {
      const now = new Date().getTime();
      if (cache.validUntil && cache.validUntil > now) {
        return cache.value;
      }
      // Cache is no longer valid; go again.
      if (this.accessTokenCache === currentAccessTokenCache) {
        // Remove the cache, but only if it hasn't already been removed and recreated by someone else.
        this.accessTokenCache = null;
      }
      return this.getAccessToken();
    });
  }

  getUserInfo<T>(): Promise<T | null> {
    if (this.userInfoCache) {
      return this.userInfoCache;
    }
    return this.fetchUserInfo<T>();
  }
}

export function oidcJwtClient(options: OidcJwtClientOptions): OidcJwtClient {
  return new OidcJwtClientImpl(options);
}
