// /lib/middleware/rate-limit.ts
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async rateLimit(request: NextRequest): Promise<{ success: boolean; remaining?: number }> {
    const identifier = this.getIdentifier(request);
    const now = Date.now();
    
    let entry = this.store.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.store.set(identifier, entry);
      
      return {
        success: true,
        remaining: this.maxRequests - 1,
      };
    }
    
    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        remaining: 0,
      };
    }
    
    entry.count++;
    this.store.set(identifier, entry);
    
    return {
      success: true,
      remaining: this.maxRequests - entry.count,
    };
  }

  private getIdentifier(request: NextRequest): string {
    // Try to get real IP from headers (for production behind proxy)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    // Fallback to unknown if no IP headers are present
    return 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalEntries: this.store.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
);

export const rateLimit = rateLimiter.rateLimit.bind(rateLimiter);

// Graceful shutdown
process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

process.on('SIGINT', () => {
  rateLimiter.destroy();
});