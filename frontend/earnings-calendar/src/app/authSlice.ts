import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** All roles recognised by the UI */
export type UserRole = 'user' | 'admin' | 'superAdmin';

interface AuthState {
  user: { id: string; email: string; username: string; role: UserRole } | null;
  accessToken: string | null;
}

const initial: AuthState = { user: null, accessToken: null };

const slice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    setCredentials: (
      state,
      { payload }: PayloadAction<{ user: AuthState['user']; token: string }>
    ) => {
      state.user = payload.user;
      state.accessToken = payload.token;
    },
    logout: () => initial,
  },
});

export const { setCredentials, logout } = slice.actions;
export const authReducer = slice.reducer;
