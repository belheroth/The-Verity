export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('verity_token');
  const headers = {
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};
