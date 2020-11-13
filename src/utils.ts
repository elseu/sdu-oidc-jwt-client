import queryString from 'query-string';

import { Params } from './store';

function buildQuerystring(params: Params): string {
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

export {
  buildQuerystring,
  stripTokenFromUrl,
};
