import { buildQuerystring } from './buildQuerystring';
import { CSRF_TOKEN_STORAGE_KEY } from './config';
import { HttpError } from './errors';

interface Params {
  [key:string]: string
}

type Token = string | null
type RequestFn = <T = any>(url: string, data?: Params, config?: RequestConfig) => Promise<T>
type RequestConfig = RequestInit & {
  baseUrl?: string
  params?: Params
}
export class HttpClient {
  private defaultConfig: RequestConfig = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  }

  private token: Token = localStorage.getItem(CSRF_TOKEN_STORAGE_KEY) || null
  private config: RequestConfig = {}

  constructor(config: RequestConfig = {}) {
    this.config = {
      ...this.defaultConfig,
      ...config,
    };
  }

  /**
   * Create a GET request (can be extended for multiple methods)
   * @private
   * @returns {RequestGetFn}
   * @memberof HttpClient
   */
  private createRequest(): RequestFn {
    return (url, data, config) => {
      let getUrl = url;
      if (data) {
        getUrl = url + '?' + buildQuerystring(data);
      }

      return this.request(getUrl, {
        ...config,
        method: 'GET',
      });
    };
  }

  public get = this.createRequest()
  public getBaseUrl = () => this.config.baseUrl || ''
  public setToken = (token: string | null) => (this.token = token)

  private setAuthenticationHeaders(config: RequestConfig) {
    // if authenticated set bearer token
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }
  }

  /**
   * Creates an async request
   * @template T
   * @param {(string | URL)} url
   * @param {RequestConfig} [requestConfig={}]
   * @returns {Promise<T>}
   * @memberof HttpClient
   */
  public async request<T>(url: string, requestConfig: RequestConfig = {}): Promise<T> {
    const config: RequestConfig = {
      ...this.config,
      ...requestConfig,
    };

    this.setAuthenticationHeaders(config);

    const { baseUrl = '' } = config;
    const requestFn = fetch(baseUrl + url, config)
      .then(this.handleError)
      .then(res => this.handleSuccess(res)) as Promise<T>;

    return requestFn;
  }

  /**
   * Success function of request
   * @private
   * @param {Response} res
   * @param {RequestConfig} config
   * @returns
   * @memberof HttpClient
   */
  private handleSuccess(res: Response) {
    if (res.status === 204 || res.status === 201) {
      return res;
    }

    return res.json();
  }

  /**
   * Handles the errors if the fetch request fails and throws a HttpError
   * @param response
   */
  private async handleError(response: Response) {
    if (response.ok) {
      return response;
    }

    throw new HttpError({ statusCode: response.status, message: 'Error fetching JSON' });
  }
}
