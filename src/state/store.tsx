import { TypedUseSelectorHook, useSelector } from 'react-redux';
import { RootState } from '../state/redux'; // your store type

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
