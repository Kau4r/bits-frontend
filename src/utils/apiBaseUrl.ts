export const getAppBaseUrl = () => {
  const configuredBase = import.meta.env.VITE_API_URL;
  if (typeof configuredBase === 'string' && configuredBase.trim()) {
    return configuredBase.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};

export const getApiBaseUrl = () => {
  const appBaseUrl = getAppBaseUrl();
  return appBaseUrl ? `${appBaseUrl}/api` : '/api';
};
