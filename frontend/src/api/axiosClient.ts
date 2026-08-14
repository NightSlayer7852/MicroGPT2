// src/api/axiosClient.ts
import axios from 'axios';

// 👇 CORRECTED BASE_URL LOGIC 👇
let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (rawUrl && !rawUrl.endsWith('/api')) {
  rawUrl = rawUrl.replace(/\/+$/, '') + '/api';
}
const BASE_URL = rawUrl;  

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ------------------------------------------------------------------
// 1. REQUEST INTERCEPTOR: Attach Access Token to all outgoing requests
// ------------------------------------------------------------------
axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    // If a token exists, attach it to the Authorization header
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------------------------------------------------------
// 2. RESPONSE INTERCEPTOR: Handle 401s and Auto-Refresh Tokens
// ------------------------------------------------------------------
axiosClient.interceptors.response.use(
  (response) => {
    // If the request succeeds, just return the response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 (Unauthorized) AND that we haven't already retried this request
    // We also check that the original request wasn't the refresh route itself to prevent infinite loops
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      originalRequest.url !== '/auth/refresh'
    ) {
      originalRequest._retry = true; // Mark this request as retried

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        // If there's no refresh token in storage, we can't refresh. Throw them to login.
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/'; 
          return Promise.reject(error);
        }

        // Ask the backend for a new set of tokens
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        // Save the brand new tokens to local storage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the failed original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Resend the original request completely seamlessly
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // If the refresh token itself is expired or invalid, wipe storage and force logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/'; 
        return Promise.reject(refreshError);
      }
    }

    // If the error wasn't a 401, just reject it so the component can handle it normally
    return Promise.reject(error);
  }
);

export default axiosClient;