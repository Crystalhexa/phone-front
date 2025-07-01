// // /lib/middleware/rate-limit.ts
// import { NextRequest } from 'next/server';

// interface RateLimitEntry {
//   count: number;
//   resetTime: number;
// }

// class RateLimiter {
//   private store: Map<string, RateLimitEntry> = new Map();
//   private readonly maxRequests: number;
//   private readonly windowMs: number;
//   private cleanupInterval: NodeJS.Timeout;

//   constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
//     this.maxRequests = maxRequests;
//     this.windowMs = windowMs;

//     // Cleanup expired entries every 5 minutes
//     this.cleanupInterval = setInterval(() => {
//       this.cleanup();
//     }, 5 * 60 * 1000);
//   }

//   async rateLimit(request: NextRequest): Promise<{ success: boolean; remaining?: number }> {
//     const identifier = this.getIdentifier(request);
//     const now = Date.now();
    
//     let entry = this.store.get(identifier);
    
//     if (!entry || now > entry.resetTime) {
//       // Create new entry or reset expired one
//       entry = {
//         count: 1,
//         resetTime: now + this.windowMs,
//       };
//       this.store.set(identifier, entry);
      
//       return {
//         success: true,
//         remaining: this.maxRequests - 1,
//       };
//     }
    
//     if (entry.count >= this.maxRequests) {
//       return {
//         success: false,
//         remaining: 0,
//       };
//     }
    
//     entry.count++;
//     this.store.set(identifier, entry);
    
//     return {
//       success: true,
//       remaining: this.maxRequests - entry.count,
//     };
//   }

//   private getIdentifier(request: NextRequest): string {
//     // Try to get real IP from headers (for production behind proxy)
//     const forwarded = request.headers.get('x-forwarded-for');
//     const realIp = request.headers.get('x-real-ip');
    
//     if (forwarded) {
//       return forwarded.split(',')[0].trim();
//     }
    
//     if (realIp) {
//       return realIp;
//     }
    
//     // Fallback to unknown if no IP headers are present
//     return 'unknown';
//   }

//   private cleanup(): void {
//     const now = Date.now();
//     for (const [key, entry] of this.store.entries()) {
//       if (now > entry.resetTime) {
//         this.store.delete(key);
//       }
//     }
//   }

//   getStats() {
//     return {
//       totalEntries: this.store.size,
//       maxRequests: this.maxRequests,
//       windowMs: this.windowMs,
//     };
//   }

//   destroy(): void {
//     if (this.cleanupInterval) {
//       clearInterval(this.cleanupInterval);
//     }
//     this.store.clear();
//   }
// }

// // Export singleton instance
// const rateLimiter = new RateLimiter(
//   parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
//   parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
// );

// export const rateLimit = rateLimiter.rateLimit.bind(rateLimiter);

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   rateLimiter.destroy();
// });

// process.on('SIGINT', () => {
//   rateLimiter.destroy();
// });
import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  resetTime?: number;
}

// Simple in-memory rate limiter - in production, use Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function withRateLimit(
  request: NextRequest,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // Extract client IP from headers (x-forwarded-for or x-real-ip)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let clientIP = 'unknown';
    if (forwarded) {
      clientIP = forwarded.split(',')[0].trim();
    } else if (realIp) {
      clientIP = realIp;
    }
    const rateLimitKey = `${clientIP}:${key}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    const current = rateLimitStore.get(rateLimitKey);
    
    if (!current || now > current.resetTime) {
      // New window
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      return {
        success: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }
    
    if (current.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }
    
    // Increment count
    current.count++;
    rateLimitStore.set(rateLimitKey, current);
    
    return {
      success: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  } catch (error) {
    // If rate limiting fails, allow the request
    return { success: true };
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);