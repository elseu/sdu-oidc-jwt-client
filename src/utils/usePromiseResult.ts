import { useEffect, useReducer } from 'react';

interface ActionBase {
  type: string
}
interface ActionIsLoading extends ActionBase {
  type: 'SET_LOADING'
  payload: boolean
}
interface ActionData<T> extends ActionBase {
  type: 'SET_DATA'
  payload: T
}

type Action<T> = ActionIsLoading | ActionData<T>
export interface State<T> {
  data?: T
  isLoading: boolean
}

const createReducer = <T>() => (state: State<T>, action: Action<T>) => {
  switch (action.type) {
    case 'SET_DATA': {
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: true,
      };
    default:
      return state;
  }
};

const getInitialState = <T>(): State<T> => ({
  isLoading: true,
  data: undefined,
});

function usePromiseResult<T>(
  f: () => Promise<T> | null,
  deps: unknown[],
): State<T> {
  const reducer = createReducer<T>();
  const initialState = getInitialState<T>();
  const [state, dispatch] = useReducer(reducer, initialState);

  // const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    f()?.then((result) => {
      // setValue(result);
      dispatch({ type: 'SET_DATA', payload: result });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export { usePromiseResult };
