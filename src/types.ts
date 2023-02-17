import { CsrfTokenMethod } from './constants';
import { AuthService } from './utils/AuthService';

export interface Params {
  [key: string]: string;
}

export interface ClaimsBase {
  iat: number;
  exp: number;
}

export interface AccessTokenInfo<T extends ClaimsBase> {
  token: string | null;
  claims: T | null;
}

export interface AccessTokenCache<T extends ClaimsBase> {
  value: AccessTokenInfo<T>;
  validUntil: number | null;
  isError: boolean;
}

export interface InitializedData<Claims extends ClaimsBase, User> {
  isLoading: boolean;
  claims: Claims | undefined;
  user: User | undefined;
}

export interface AuthorizeConfig {
  isRetrying?: boolean;
}

export type OidcClient = OidcJwtClientOptions | false;
export type RemoveTokenFromUrlFunction = (url: string) => void;

export interface OidcJwtProviderProps {
  client: OidcClient;
  shouldAttemptLogin?: boolean;
  shouldMonitorAccessTokens?: boolean;
  removeTokenFromUrlFunction?: RemoveTokenFromUrlFunction;
}

export interface AuthState {
  didRetryLogin: boolean;
  isLoggedIn: boolean;
  isInitialized: boolean;
  userInfo: any;
  csrfToken: string | null;
}

export interface AuthServiceOptions {
  client: OidcJwtClientOptions;
  state: AuthState;
  removeTokenFromUrlFunction?: RemoveTokenFromUrlFunction;
}

export type OidcJwtClientStore = {
  service: AuthService | null;
  authState: AuthState;
  setState: (state: AuthState) => void;
};

export interface OidcJwtClientOptions {
  url: string;
  csrfTokenMethod?: CsrfTokenMethod;
  defaultAuthConfig?: Params;
}
