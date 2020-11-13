import { HttpError } from './errors';

class HttpClient {
  private fetchJsonWithAuth<T>(url: string, csrfToken: string): Promise<T> {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${csrfToken}`,
      },
      method: 'GET',
      credentials: 'include',
    }).then<T>((response) => {
      if (!response.ok) {
        throw new HttpError({ statusCode: response.status, message: 'Error fetching JSON' });
      }
      return response.json();
    });
  }

  get<T>(url: string, csrfToken: string) {
    return this.fetchJsonWithAuth<T>(url, csrfToken);
  }
}

const Http = new HttpClient();
export { Http };
