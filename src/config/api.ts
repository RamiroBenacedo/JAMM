// API Configuration - Centralized endpoint management

export const API_CONFIG = {
  // Supabase URLs
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    functionsUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  },
  
  // External APIs
  endpoints: {
    swiftTask: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swift-task`,
    // Otras APIs pueden agregarse aquí
  },
  
  // External services
  external: {
    googleMaps: 'https://maps.google.com/maps',
    appleMaps: 'https://maps.apple.com',
    whatsapp: 'https://wa.me'
  }
};

// Validation: Ensure required environment variables are present
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

export default API_CONFIG;