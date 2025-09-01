// File Validation Utilities - Security-focused file handling

export interface FileValidationConfig {
  allowedTypes: string[];
  maxSizeBytes: number;
  allowedExtensions: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Default configuration for different file types
export const FILE_CONFIGS = {
  image: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp']
  },
  document: {
    allowedTypes: ['application/pdf', 'text/plain'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['pdf', 'txt']
  }
} as const;

/**
 * Validates a file against security criteria
 * @param file - The file to validate
 * @param config - Validation configuration
 * @returns Validation result with detailed feedback
 */
export const validateFile = async (
  file: File, 
  config: FileValidationConfig
): Promise<FileValidationResult> => {
  const warnings: string[] = [];

  // 1. Check file size
  if (file.size > config.maxSizeBytes) {
    return {
      isValid: false,
      error: `El archivo es demasiado grande. Máximo permitido: ${formatFileSize(config.maxSizeBytes)}`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'El archivo está vacío'
    };
  }

  // 2. Check file extension
  const extension = getFileExtension(file.name);
  if (!extension || !config.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Extensión de archivo no permitida. Permitidas: ${config.allowedExtensions.join(', ')}`
    };
  }

  // 3. Check MIME type (most important security check)
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${config.allowedTypes.join(', ')}`
    };
  }

  // 4. Verify MIME type matches file content (magic number check)
  const isValidMimeType = await verifyFileSignature(file);
  if (!isValidMimeType) {
    return {
      isValid: false,
      error: 'El archivo no coincide con su extensión declarada. Posible archivo malicioso.'
    };
  }

  // 5. Check for suspicious file names
  if (hasSuspiciousFileName(file.name)) {
    warnings.push('Nombre de archivo sospechoso detectado');
  }

  // 6. Additional security checks for images
  if (file.type.startsWith('image/')) {
    try {
      await validateImageFile(file);
    } catch (error) {
      return {
        isValid: false,
        error: 'El archivo de imagen parece estar corrupto o no es válido'
      };
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

/**
 * Generate a cryptographically secure filename
 */
export const generateSecureFileName = (originalFile: File): string => {
  const extension = getFileExtension(originalFile.name);
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomHex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
  
  return `${timestamp}_${randomHex}.${extension}`;
};

/**
 * Get file extension in lowercase
 */
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Format file size for user display
 */
const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check for suspicious file names that might indicate malicious intent
 */
const hasSuspiciousFileName = (filename: string): boolean => {
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com)$/i,
    /\.(php|jsp|asp)$/i,
    /[<>:"|?*]/,
    /\.\./, // Directory traversal
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i // Windows reserved names
  ];

  return suspiciousPatterns.some(pattern => pattern.test(filename));
};

/**
 * Verify file signature (magic numbers) matches declared MIME type
 */
const verifyFileSignature = async (file: File): Promise<boolean> => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Common file signatures
  const signatures = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF + WEBP
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]]
  };

  const expectedSignatures = signatures[file.type as keyof typeof signatures];
  if (!expectedSignatures) {
    // If we don't have a signature for this type, allow it but warn
    return true;
  }

  return expectedSignatures.some(signature => 
    signature.every((byte, index) => bytes[index] === byte)
  );
};

/**
 * Additional validation for image files
 */
const validateImageFile = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Check for reasonable image dimensions
      if (img.width > 10000 || img.height > 10000) {
        reject(new Error('Imagen demasiado grande en dimensiones'));
      } else if (img.width < 1 || img.height < 1) {
        reject(new Error('Dimensiones de imagen inválidas'));
      } else {
        resolve();
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;

    // Timeout after 5 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timeout validando imagen'));
    }, 5000);
  });
};