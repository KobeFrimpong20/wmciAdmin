const BASE_URL = 'http://localhost:8080';

export const apiClient = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || 'API Request Failed');
  }

  return response.json();
};
