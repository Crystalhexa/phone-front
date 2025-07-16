"use client";
import { useRef } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";
import globalReducer from "@/state";
import authReducer from "@/state/slices/authSlice"; // Add this import
import { api } from "@/state/api";
import { brandsApi } from "./brand";
import { rolesApi } from "./role";
import { employeeApi } from "./employee";
import { customersApi } from "./customer";
import { suppliersApi } from "./supplier";
import { branchesApi } from "./brnach";
import { authApi } from "./authApi";

/* REDUX STORE */
const rootReducer = combineReducers({
  global: globalReducer,
  auth: authReducer, // Add auth reducer
  [api.reducerPath]: api.reducer,
  [brandsApi.reducerPath]: brandsApi.reducer,
  [rolesApi.reducerPath]: rolesApi.reducer,
  [employeeApi.reducerPath]: employeeApi.reducer,
  [customersApi.reducerPath]: customersApi.reducer,
  [suppliersApi.reducerPath]: suppliersApi.reducer,
  [branchesApi.reducerPath]: branchesApi.reducer,
  [authApi.reducerPath]: authApi.reducer
});

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .concat(api.middleware)
        .concat(brandsApi.middleware)
        .concat(rolesApi.middleware)
        .concat(employeeApi.middleware)
        .concat(customersApi.middleware)
        .concat(suppliersApi.middleware)
        .concat(branchesApi.middleware)
        .concat(authApi.middleware)
  });
};

/* REDUX TYPES */
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* PROVIDER */
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}