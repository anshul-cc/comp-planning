/**
 * In-memory rate limiter for authentication endpoints
 * Implements sliding window rate limiting with account lockout
 *
 * Security features:
 * - Limits login attempts per IP/email combination
 * - Implements account lockout after consecutive failures
 * - Sliding window algorithm for fair rate limiting
 * - Automatic cleanup of expired entries
 */

interface RateLimitEntry {
  attempts: number
  firstAttempt: number
  lastAttempt: number
  lockedUntil: number | null
}

interface RateLimiterConfig {
  maxAttempts: number // Max attempts before rate limit
  windowMs: number // Time window in milliseconds
  lockoutDurationMs: number // Lockout duration after max attempts
  cleanupIntervalMs: number // How often to clean expired entries
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes lockout
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map()
  private config: RateLimiterConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanup()
  }

  private startCleanup(): void {
    // Cleanup expired entries periodically
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        this.cleanup()
      }, this.config.cleanupIntervalMs)

      // Ensure timer doesn't prevent Node.js from exiting
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref()
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.attempts.entries()) {
      // Remove if window expired and not locked
      const windowExpired = now - entry.firstAttempt > this.config.windowMs
      const lockoutExpired = !entry.lockedUntil || now > entry.lockedUntil

      if (windowExpired && lockoutExpired) {
        this.attempts.delete(key)
      }
    }
  }

  /**
   * Generate a key for rate limiting based on IP and email
   */
  private getKey(ip: string, email?: string): string {
    // Rate limit by IP primarily, with optional email for more granular control
    if (email) {
      return `${ip}:${email.toLowerCase()}`
    }
    return ip
  }

  /**
   * Check if a request should be rate limited
   * Returns { allowed: boolean, remainingAttempts: number, resetTime: number, lockedUntil: number | null }
   */
  check(
    ip: string,
    email?: string
  ): {
    allowed: boolean
    remainingAttempts: number
    resetTime: number
    lockedUntil: number | null
    message: string
  } {
    const key = this.getKey(ip, email)
    const now = Date.now()
    const entry = this.attempts.get(key)

    // Check if currently locked out
    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const remainingLockout = Math.ceil((entry.lockedUntil - now) / 1000 / 60)
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.lockedUntil,
        lockedUntil: entry.lockedUntil,
        message: `Account temporarily locked. Try again in ${remainingLockout} minutes.`,
      }
    }

    // Check if existing entry is within window
    if (entry) {
      const windowExpired = now - entry.firstAttempt > this.config.windowMs

      if (windowExpired) {
        // Window expired, reset the entry
        this.attempts.delete(key)
      } else if (entry.attempts >= this.config.maxAttempts) {
        // Too many attempts within window
        const resetTime = entry.firstAttempt + this.config.windowMs
        const remainingTime = Math.ceil((resetTime - now) / 1000 / 60)
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime,
          lockedUntil: null,
          message: `Too many login attempts. Try again in ${remainingTime} minutes.`,
        }
      }
    }

    // Get current state
    const currentEntry = this.attempts.get(key)
    const remainingAttempts = currentEntry
      ? this.config.maxAttempts - currentEntry.attempts
      : this.config.maxAttempts

    return {
      allowed: true,
      remainingAttempts,
      resetTime: currentEntry ? currentEntry.firstAttempt + this.config.windowMs : now + this.config.windowMs,
      lockedUntil: null,
      message: 'OK',
    }
  }

  /**
   * Record a failed login attempt
   */
  recordFailure(ip: string, email?: string): void {
    const key = this.getKey(ip, email)
    const now = Date.now()
    const entry = this.attempts.get(key)

    if (entry) {
      const windowExpired = now - entry.firstAttempt > this.config.windowMs

      if (windowExpired) {
        // Start new window
        this.attempts.set(key, {
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
          lockedUntil: null,
        })
      } else {
        // Increment within window
        entry.attempts++
        entry.lastAttempt = now

        // Check if should lock out
        if (entry.attempts >= this.config.maxAttempts) {
          entry.lockedUntil = now + this.config.lockoutDurationMs
        }

        this.attempts.set(key, entry)
      }
    } else {
      // First attempt
      this.attempts.set(key, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null,
      })
    }
  }

  /**
   * Record a successful login (resets the counter)
   */
  recordSuccess(ip: string, email?: string): void {
    const key = this.getKey(ip, email)
    this.attempts.delete(key)
  }

  /**
   * Get statistics (for monitoring/debugging in development only)
   */
  getStats(): { totalEntries: number; lockedEntries: number } {
    let lockedEntries = 0
    const now = Date.now()

    for (const entry of this.attempts.values()) {
      if (entry.lockedUntil && now < entry.lockedUntil) {
        lockedEntries++
      }
    }

    return {
      totalEntries: this.attempts.size,
      lockedEntries,
    }
  }

  /**
   * Stop the cleanup timer (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Create singleton instance with environment-configurable settings
const maxAttempts = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5', 10)
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 min default

export const authRateLimiter = new RateLimiter({
  maxAttempts,
  windowMs,
  lockoutDurationMs: windowMs * 2, // Lockout for 2x the window
})

export { RateLimiter }
export type { RateLimitEntry, RateLimiterConfig }
