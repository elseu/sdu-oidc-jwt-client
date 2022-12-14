export const CSRF_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_token';
export const LOGGED_IN_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_logged_in';
export const USER_INFO_TOKEN_STORAGE_KEY = 'oidc_jwt_provider_user_info';
export const RETRY_LOGIN_STORAGE_KEY = 'oidc_jwt_provider_retry_login';

export enum CsrfTokenMethod {
  HEADER = 0,
  QUERYSTRING = 1
}