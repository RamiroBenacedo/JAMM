// Lista de dominios de email válidos y conocidos
const VALID_EMAIL_DOMAINS = [
  // Dominios principales de Google
  'gmail.com',
  'googlemail.com',
  
  // Dominios de Microsoft
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'hotmail.co.uk',
  'outlook.co.uk',
  'live.co.uk',
  'hotmail.fr',
  'outlook.fr',
  'live.fr',
  'hotmail.es',
  'outlook.es',
  'live.es',
  'hotmail.it',
  'outlook.it',
  'live.it',
  'hotmail.de',
  'outlook.de',
  'live.de',
  'hotmail.com.ar',
  'outlook.com.ar',
  'live.com.ar',
  'hotmail.com.br',
  'outlook.com.br',
  'live.com.br',
  
  // Yahoo dominios
  'yahoo.com',
  'yahoo.com.ar',
  'yahoo.com.br',
  'yahoo.com.mx',
  'yahoo.es',
  'yahoo.fr',
  'yahoo.it',
  'yahoo.de',
  'yahoo.co.uk',
  'yahoo.ca',
  'ymail.com',
  'rocketmail.com',
  
  // Dominios de Apple
  'icloud.com',
  'me.com',
  'mac.com',
  
  // Dominios de AOL
  'aol.com',
  'aim.com',
  
  // Dominios educativos internacionales
  'edu',
  'edu.ar',
  'edu.br',
  'edu.mx',
  'edu.co',
  'edu.pe',
  'edu.cl',
  'edu.uy',
  'ac.uk',
  'edu.au',
  
  // Dominios empresariales y organizacionales
  'org',
  'org.ar',
  'org.br',
  'org.mx',
  'org.co',
  'org.pe',
  'org.cl',
  'org.uy',
  'org.uk',
  
  // Dominios de gobierno
  'gov',
  'gov.ar',
  'gov.br',
  'gov.mx',
  'gov.co',
  'gov.pe',
  'gov.cl',
  'gov.uy',
  'gov.uk',
  
  // Dominios comerciales internacionales
  'com',
  'com.ar',
  'com.br',
  'com.mx',
  'com.co',
  'com.pe',
  'com.cl',
  'com.uy',
  'co.uk',
  'com.au',
  
  // Otros proveedores de email populares
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'mailfence.com',
  'fastmail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'web.de',
  't-online.de',
  'freenet.de',
  '163.com',
  '126.com',
  'qq.com',
  
  // Dominios temporales/desechables conocidos (para bloquear)
  // Nota: Estos se usarán para RECHAZAR emails
  
  // Dominios latinoamericanos comunes
  'terra.com.br',
  'terra.com.ar',
  'terra.com.mx',
  'bol.com.br',
  'uol.com.br',
  'ig.com.br',
  'globo.com',
  'globomail.com',
  'r7.com',
  'zipmail.com.br',
  
  // Dominios europeos comunes
  'libero.it',
  'virgilio.it',
  'alice.it',
  'tiscali.it',
  'orange.fr',
  'wanadoo.fr',
  'laposte.net',
  'sfr.fr',
  'free.fr',
  
  // Otros dominios internacionales
  'rediffmail.com',
  'inbox.com',
  'mail.ru',
  'rambler.ru',
  'list.ru',
  'bk.ru',
  'internet.ru'
];

// Dominios temporales/desechables que debemos rechazar
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'maildrop.cc',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'tempail.com',
  'tempmailaddress.com',
  'tempemailaddress.com',
  '20minutemail.com',
  '33mail.com',
  'fakeinbox.com',
  'getnada.com',
  'harakirimail.com',
  'jetable.org',
  'mailcatch.com',
  'mailnesia.com',
  'mytrashmail.com',
  'no-spam.ws',
  'nospam.ze.tc',
  'nowmymail.com',
  'objectmail.com',
  'odaymail.com',
  'proxymail.eu',
  'rcpt.at',
  'spambox.us',
  'spamgourmet.com',
  'spaml.com',
  'spammotel.com',
  'superrito.com',
  'trashmail.at',
  'trashmail.com',
  'trashmail.io',
  'trashmail.me',
  'trashmail.net',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'youmailr.com',
  'zetmail.com',
  '0-mail.com',
  'e4ward.com',
  'emailias.com',
  'emailsensei.com',
  'emailtemporar.ro',
  'emailto.de',
  'emailzilla.com',
  'familea.com',
  'fansworldwide.de',
  'fantasymail.de',
  'fightmail.com',
  'filzmail.com',
  'fivemail.de',
  'fleckens.hu',
  'floppy.ro',
  'footard.com',
  'forgetmail.com',
  'freegmail.net',
  'freemails.cf',
  'freemails.ga',
  'freemails.ml',
  'getairmail.com',
  'getonemail.com',
  'ghosttemail.com'
];

/**
 * Valida si un email tiene un formato básico correcto
 */
export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Extrae el dominio de un email
 */
export const extractDomain = (email: string): string => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
};

/**
 * Verifica si el dominio del email está en la lista de dominios válidos
 */
export const isValidEmailDomain = (email: string): boolean => {
  const domain = extractDomain(email);
  
  if (!domain) return false;
  
  // Verificar si es un dominio desechable/temporal (rechazar)
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return false;
  }
  
  // Verificar si está en la lista de dominios válidos
  if (VALID_EMAIL_DOMAINS.includes(domain)) {
    return true;
  }
  
  // Verificar patrones de dominios educativos, gubernamentales, etc.
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  const sld = domainParts.length > 1 ? domainParts[domainParts.length - 2] : '';
  
  // Dominios educativos
  if (tld === 'edu' || 
      (sld === 'edu' && ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy', 'au', 'ca'].includes(tld)) ||
      (sld === 'ac' && ['uk', 'nz', 'za'].includes(tld))) {
    return true;
  }
  
  // Dominios gubernamentales
  if (tld === 'gov' || 
      (sld === 'gov' && ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy', 'uk', 'au', 'ca'].includes(tld))) {
    return true;
  }
  
  // Dominios organizacionales
  if (tld === 'org' || 
      (sld === 'org' && ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy', 'uk'].includes(tld))) {
    return true;
  }
  
  // Dominios comerciales conocidos
  if (tld === 'com' || 
      (sld === 'com' && ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy', 'au'].includes(tld)) ||
      (sld === 'co' && ['uk', 'nz', 'za'].includes(tld))) {
    return true;
  }
  
  // Dominios de red
  if (tld === 'net' || 
      (sld === 'net' && ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy'].includes(tld))) {
    return true;
  }
  
  // TLDs de países comunes sin subdominios específicos
  const commonTlds = ['ar', 'br', 'mx', 'co', 'pe', 'cl', 'uy', 'uk', 'fr', 'de', 'it', 'es', 'au', 'ca', 'nz', 'za'];
  if (commonTlds.includes(tld) && domainParts.length >= 2) {
    return true;
  }
  
  return false;
};

/**
 * Función principal de validación de email
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email.trim()) {
    return { isValid: false, error: 'El email es obligatorio' };
  }
  
  if (!isValidEmailFormat(email)) {
    return { isValid: false, error: 'Por favor ingresa un email con formato válido' };
  }
  
  const domain = extractDomain(email);
  
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      error: 'No se permiten emails temporales o desechables. Usa un email permanente como Gmail, Hotmail, Yahoo, etc.' 
    };
  }
  
  if (!isValidEmailDomain(email)) {
    return { 
      isValid: false, 
      error: 'Por favor usa un email de un proveedor conocido como Gmail, Hotmail, Yahoo, Outlook, etc.' 
    };
  }
  
  return { isValid: true };
};

/**
 * Función helper para obtener sugerencias de dominios válidos
 */
export const getPopularEmailDomains = (): string[] => {
  return [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'icloud.com',
    'live.com',
    'yahoo.com.ar',
    'hotmail.com.ar',
    'outlook.com.ar'
  ];
};