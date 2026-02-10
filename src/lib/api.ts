
import { useAuthStore } from '../store/authStore';

const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers, ...customConfig } = options;
  const token = useAuthStore.getState().token;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const responseData = await response.json();

  if (!response.ok) {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    throw new Error(responseData.error || 'Something went wrong');
  }

  return responseData;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data?: any, options?: RequestOptions) => request<T>(endpoint, { ...options, data, method: 'POST' }),
  put: <T>(endpoint: string, data?: any, options?: RequestOptions) => request<T>(endpoint, { ...options, data, method: 'PUT' }),
  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
