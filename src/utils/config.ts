// Configuración de URLs para diferentes entornos

const getProductionURL = (): string => {
  // Puedes cambiar esta URL por tu dominio de producción
  return 'https://www.jammcmmnty.com';
};

export const getRedirectURL = (path: string = ''): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseURL = isProduction ? getProductionURL() : window.location.origin;
  
  return `${baseURL}${path}`;
};

export const config = {
  productionURL: getProductionURL(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};