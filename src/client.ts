export interface OidcJwtClientOptions {
  url: string;
  authorizationDefaults?: Record<string, string>;
}

interface AccessTokenCache {
  value: AccessTokenInfo;
  validUntil: number | null;
}

interface AccessTokenInfo {
  token: string | null;
  claims: Record<string, unknown> | null;
}

export interface UserInfo {
  cn: string
  email: string
  givenName: string
  login: string
  name:string
  sn: string
  sub: string
  updated_at: number
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
  fetchAccessToken(): Promise<AccessTokenInfo>;

  /**
   * Fetch fresh user info.
   * @returns A promise of the user info.
   */
  fetchUserInfo(): Promise<UserInfo | null>;

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
  getAccessToken(): Promise<AccessTokenInfo | null>;

  /**
   * Get user info. If we already have user info, we will not fetch new info.
   * @returns Promise of user info.
   */
  getUserInfo<T>(): Promise<T>;
}

function buildQuerystring(params: Record<string, string>): string {
  return Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
}

function stripTokenFromUrl(url: string): string {
  return url.replace(/([?&])token=([^&#]+)/, '$1');
}

class OidcJwtClientImpl implements OidcJwtClient {
  private accessTokenCache: Promise<AccessTokenCache> | undefined;
  private userInfoCache: any
  private baseUrl: string;
  private csrfToken: string | null;
  private csrfTokenStorageKey = 'oidc_jwt_provider_token';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private monitorAccessTokenTimeout: any;
  private authorizationDefaults: Record<string, string>;

  constructor(options: OidcJwtClientOptions) {
    this.baseUrl = options.url.replace(/\/$/, '');
    this.csrfToken = sessionStorage.getItem(this.csrfTokenStorageKey) ?? null;
    this.authorizationDefaults = options.authorizationDefaults ?? {};
  }

  private fetchJsonWithAuth(url: string) {
    return fetch(url, {
      headers: {
        Authorization: 'Bearer ' + this.csrfToken,
      },
      credentials: 'include',
    }).then((response) => {
      return response.json();
    });
  }

  receiveSessionToken(redirect = true): boolean {
    const match = window.location.search.match(/[?&]token=([^&]+)/);
    if (!match) return false;

    this.setSessionToken(match[1]);
    if (redirect || typeof redirect === 'undefined') {
      window.location.href = stripTokenFromUrl(window.location.href).replace(/\?$/, '');
      return true;
    }
    return false;
  }

  setSessionToken(token: string): void {
    this.csrfToken = token;
    sessionStorage.setItem(this.csrfTokenStorageKey, this.csrfToken);
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

  fetchAccessToken(): Promise<AccessTokenInfo> {
    const fetchedAt = new Date().getTime();
    this.accessTokenCache = ((this.fetchJsonWithAuth(
      this.baseUrl + '/token',
    ) as unknown) as Promise<AccessTokenInfo>).then((result) => {
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

  fetchUserInfo<T>(): Promise<T> {
    this.userInfoCache = this.fetchJsonWithAuth(
      this.baseUrl + '/userinfo',
    ).then((result) => {
      if (result.status && result.status === 'error') {
        throw new Error((result.message as string) ?? 'Unknown error fetching userinfo');
      }
      return result as UserInfo;
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

  getAccessToken(): Promise<AccessTokenInfo | null> {
    if (!this.accessTokenCache) {
      return this.fetchAccessToken();
    }
    return this.accessTokenCache.then((cache) => {
      const now = new Date().getTime();
      if (cache.validUntil && cache.validUntil > now) {
        return cache.value;
      }
      return this.fetchAccessToken();
    });
  }

  getUserInfo<T>(): Promise<T> {
    if (this.userInfoCache) {
      return this.userInfoCache;
    }
    return this.fetchUserInfo<T>();
  }
}

export function oidcJwtClient(options: OidcJwtClientOptions): OidcJwtClient {
  return new OidcJwtClientImpl(options);
}
