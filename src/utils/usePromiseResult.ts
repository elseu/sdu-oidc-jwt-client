import { useEffect, useState } from 'react';

import { State } from './useAuthReducer';

function usePromiseResult<T>(
  f: () => Promise<T> | null,
  deps: unknown[],
): State<T | null> {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    f()?.then((result) => {
      setData(result);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { isLoading, data };
}

export { usePromiseResult };
