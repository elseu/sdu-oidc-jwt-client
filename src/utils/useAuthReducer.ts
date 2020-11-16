import { Dispatch, useReducer } from 'react';

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

export type Action<T> = ActionIsLoading | ActionData<T>
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

function useAuthReducer<T>(): [State<T | null>, Dispatch<Action<T | null>>] {
  const reducer = createReducer<T | null>();
  const initialState = getInitialState<T | null>();
  const state = useReducer(reducer, initialState);

  return state;
}

export { useAuthReducer };
