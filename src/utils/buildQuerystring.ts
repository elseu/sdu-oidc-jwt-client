import { Params } from '../store';

function buildQuerystring(params: Params): string {
  return Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
}

export { buildQuerystring };
