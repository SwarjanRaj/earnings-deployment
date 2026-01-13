import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';
import { adminApi } from '../services/adminApi';
import { authApi }  from '../services/authApi';
import { chatApi } from '../services/chatApi';

/* Root store – add both RTK-Query services */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [authApi.reducerPath]:  authApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(adminApi.middleware, authApi.middleware, chatApi.middleware),
});

/* Typed helpers */
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
