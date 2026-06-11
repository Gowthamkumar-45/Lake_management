import axios from "axios";

export const API_ROOT = "http://localhost:8000";

const client = axios.create({
  baseURL: `${API_ROOT}/api`,
});

// Attach the JWT access token to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try a single refresh; if that fails, clear session.
let refreshing = null;
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        forceLogout();
        return Promise.reject(error);
      }
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_ROOT}/api/auth/refresh/`, { refresh });
        const { data } = await refreshing;
        refreshing = null;
        localStorage.setItem("access", data.access);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch (e) {
        refreshing = null;
        forceLogout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

function forceLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export default client;
