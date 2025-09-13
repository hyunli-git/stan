const DEV_API_URL = 'http://localhost:3000';
const PROD_API_URL = 'https://stan-peach.vercel.app';

// Auto-detect environment
const isProduction = !__DEV__;
export const API_URL = isProduction ? PROD_API_URL : DEV_API_URL;

export const endpoints = {
  health: `${API_URL}/api/health`,
  auth: {
    login: `${API_URL}/api/auth/login`,
    signup: `${API_URL}/api/auth/signup`,
    logout: `${API_URL}/api/auth/logout`,
  },
  stans: {
    list: `${API_URL}/api/stans`,
    create: `${API_URL}/api/stans/create`,
    update: `${API_URL}/api/stans/update`,
    delete: `${API_URL}/api/stans/delete`,
  },
  briefings: {
    today: `${API_URL}/api/briefings/today`,
    list: `${API_URL}/api/briefings`,
    generate: `${API_URL}/api/briefings/generate`,
  },
};