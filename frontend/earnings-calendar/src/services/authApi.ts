import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials } from '../app/authSlice';

/* ─── DTOs & response shapes ───────────────── */

export interface LoginDto { email: string; password: string; }
export interface SignupDto { email: string; username: string; password: string; confirmPassword: string; dob: string; }
export interface VerifyDto { email: string; code: string; }
export interface ForgotDto { email: string; }
export interface ResetDto { email: string; code: string; newPassword: string; confirmPassword: string; }

// What your gateway returns on login/verify/reset/refresh:
export interface TokenResponse {
  accessToken: string;
  refreshId: string;
  refreshExpires: string;
  csrf: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isVerified: boolean;
  };
}

export interface SignupResponse { message: string; devCode?: string; }
export interface ForgotResponse { message: string; devCode?: string; }

const mapRole = (role: string): import('../app/authSlice').UserRole =>
  role === 'SUPERADMIN' || role === 'SUPER_ADMIN' ? 'superAdmin' :
    role === 'ADMIN' ? 'admin' :
      'user';

// Custom base query that handles 401 errors silently for refresh endpoint
const customBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: '/api/auth',
    credentials: 'include',    // cookies in/out
    prepareHeaders: (headers) => {
      // no Bearer header; we use cookies + CSRF
      return headers;
    },
  })(args, api, extraOptions);

  // If it's a 401 error and we're calling the refresh endpoint, don't treat it as an error
  if (result.error && result.error.status === 401 && args.url?.includes('refresh')) {
    // Return a successful result with no data instead of an error
    // This prevents the error from being logged to console
    return { data: null, meta: { silent: true } };
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: customBaseQuery,
  endpoints: (build) => ({

    // 1) Silent refresh at startup
    refresh: build.mutation<TokenResponse, void>({
      query: () => ({
        url: 'refresh',
        method: 'POST',
        body: { refreshToken: localStorage.getItem('refreshToken') }
      }),
      // Suppress all errors for refresh endpoint
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Only set credentials if we have data (user is logged in)
          if (data) {
            dispatch(setCredentials({
              user: data.user ? { ...data.user, role: mapRole(data.user.role) } : null,
              token: data.accessToken,
            }));
            // Store new refresh token
            if (data.refreshId) {
              localStorage.setItem('refreshToken', data.refreshId);
            }
          }
        } catch (error) {
          // Suppress all errors for refresh endpoint - this is expected behavior
          // when user is not logged in
        }
      },
    }),

    // 2) Login
    login: build.mutation<TokenResponse, LoginDto>({
      query: (body) => ({ url: 'login', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({
          user: data.user ? { ...data.user, role: mapRole(data.user.role) } : null,
          token: data.accessToken,
        }));
        // Store refresh token
        if (data.refreshId) {
          localStorage.setItem('refreshToken', data.refreshId);
        }
      },
    }),

    // 3) Signup (no tokens yet)
    signup: build.mutation<SignupResponse, SignupDto>({
      query: (body) => ({ url: 'signup', method: 'POST', body }),
    }),

    // 4) Verify code
    verifyCode: build.mutation<TokenResponse, VerifyDto>({
      query: (body) => ({ url: 'verify', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({
          user: data.user ? { ...data.user, role: mapRole(data.user.role) } : null,
          token: data.accessToken,
        }));
        // Store refresh token
        if (data.refreshId) {
          localStorage.setItem('refreshToken', data.refreshId);
        }
      },
    }),

    // 5) Forgot password
    forgot: build.mutation<ForgotResponse, ForgotDto>({
      query: (body) => ({ url: 'forgot', method: 'POST', body }),
    }),

    // 6) Reset password
    resetPassword: build.mutation<TokenResponse, ResetDto>({
      query: (body) => ({ url: 'reset', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({
          user: data.user ? { ...data.user, role: mapRole(data.user.role) } : null,
          token: data.accessToken,
        }));
        // Store refresh token
        if (data.refreshId) {
          localStorage.setItem('refreshToken', data.refreshId);
        }
      },
    }),

    // 7) Logout
    logout: build.mutation<void, void>({
      query: () => ({ url: 'logout', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Clear credentials from Redux store
          dispatch(setCredentials({ user: null, token: '' }));
          // Clear refresh token from localStorage
          localStorage.removeItem('refreshToken');
        } catch (error) {
          // Even if logout fails, clear local state
          dispatch(setCredentials({ user: null, token: '' }));
          localStorage.removeItem('refreshToken');
        }
      },
    }),

    // 7) Google OAuth
    oauthUrl: build.query<string, void>({
      query: () => 'oauth/google',
      transformResponse: (response: any) => {
        // The backend returns the full OAuth URL as { url }
        return response.url;
      }
    }),
  }),
});

export const {
  useRefreshMutation,
  useLoginMutation,
  useSignupMutation,
  useVerifyCodeMutation,
  useForgotMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useOauthUrlQuery,
} = authApi;
