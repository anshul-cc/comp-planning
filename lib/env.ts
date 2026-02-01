/**
 * Environment variable validation and security checks
 * This module validates required environment variables at startup
 * and provides type-safe access to configuration values.
 */

// Required environment variables
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const

// Insecure secret patterns that should not be used
const INSECURE_SECRET_PATTERNS = [
  'change',
  'your-secret',
  'secret-key',
  'placeholder',
  'example',
  'test',
  'development',
  'CHANGE_ME',
]

interface EnvConfig {
  DATABASE_URL: string
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  NODE_ENV: 'development' | 'production' | 'test'
  // Rate limiting
  RATE_LIMIT_MAX_ATTEMPTS: number
  RATE_LIMIT_WINDOW_MS: number
  // Optional
  SEED_PASSWORD?: string
  SECURITY_ALERT_EMAIL?: string
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentError'
  }
}

/**
 * Validates that all required environment variables are set
 * and meet security requirements.
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = []

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`)
    }
  }

  // Validate NEXTAUTH_SECRET strength in production
  const secret = process.env.NEXTAUTH_SECRET || ''
  if (process.env.NODE_ENV === 'production') {
    // Check minimum length (32 characters recommended)
    if (secret.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters in production')
    }

    // Check for insecure patterns
    const lowerSecret = secret.toLowerCase()
    for (const pattern of INSECURE_SECRET_PATTERNS) {
      if (lowerSecret.includes(pattern.toLowerCase())) {
        errors.push(
          `NEXTAUTH_SECRET contains insecure pattern "${pattern}". Generate a secure secret with: openssl rand -base64 32`
        )
        break
      }
    }
  }

  // If there are errors, fail fast
  if (errors.length > 0) {
    const errorMessage = [
      'Environment validation failed:',
      ...errors.map((e) => `  - ${e}`),
      '',
      'See .env.example for required configuration.',
    ].join('\n')

    // In production, this should prevent startup
    if (process.env.NODE_ENV === 'production') {
      throw new EnvironmentError(errorMessage)
    } else {
      // In development, log warnings but don't crash
      console.warn('\n⚠️  ' + errorMessage + '\n')
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: secret,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    RATE_LIMIT_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    SEED_PASSWORD: process.env.SEED_PASSWORD,
    SECURITY_ALERT_EMAIL: process.env.SECURITY_ALERT_EMAIL,
  }
}

// Export validated config (will validate on first import)
let _config: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (!_config) {
    _config = validateEnv()
  }
  return _config
}

// For convenience, export individual values
export const env = {
  get DATABASE_URL() {
    return getEnvConfig().DATABASE_URL
  },
  get NEXTAUTH_SECRET() {
    return getEnvConfig().NEXTAUTH_SECRET
  },
  get NODE_ENV() {
    return getEnvConfig().NODE_ENV
  },
  get isProduction() {
    return getEnvConfig().NODE_ENV === 'production'
  },
  get isDevelopment() {
    return getEnvConfig().NODE_ENV === 'development'
  },
  get rateLimitMaxAttempts() {
    return getEnvConfig().RATE_LIMIT_MAX_ATTEMPTS
  },
  get rateLimitWindowMs() {
    return getEnvConfig().RATE_LIMIT_WINDOW_MS
  },
}
