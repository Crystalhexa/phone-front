import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth';

export class JWTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JWTError';
  }
}

export class JWTService {
  private static readonly SECRET = JWTService.getRequiredEnvVar('JWT_SECRET');
  private static readonly EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];
  private static readonly REFRESH_SECRET = JWTService.getRequiredEnvVar('JWT_REFRESH_SECRET');
  private static readonly REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
  private static readonly ISSUER = process.env.JWT_ISSUER ?? 'your-app-name';
  private static readonly AUDIENCE = process.env.JWT_AUDIENCE ?? 'your-app-users';

  private static getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is required but not set`);
    }
    return value;
  }

  private static validateSecretStrength(secret: string): void {
    if (secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }
  }

  static initialize(): void {
    JWTService.validateSecretStrength(JWTService.SECRET);
    JWTService.validateSecretStrength(JWTService.REFRESH_SECRET);
  }

  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    try {
      // Validate payload
      if (!payload || typeof payload !== 'object') {
        throw new JWTError('Invalid payload provided', 'INVALID_PAYLOAD');
      }

      // Remove any potentially dangerous fields
      const sanitizedPayload = JWTService.sanitizePayload(payload);

      return jwt.sign(sanitizedPayload, JWTService.SECRET, {
        expiresIn: JWTService.EXPIRES_IN,
        issuer: JWTService.ISSUER,
        audience: JWTService.AUDIENCE,
        algorithm: 'HS256', // Explicitly specify algorithm
        jwtid: JWTService.generateJwtId() // Add JWT ID for revocation support
      });
    } catch (error) {
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Failed to generate token', 'TOKEN_GENERATION_FAILED');
    }
  }

  static generateRefreshToken(userId?: string): string {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new JWTError('Valid userId is required', 'INVALID_USER_ID');
      }

      return jwt.sign(
        { 
          userId,
          type: 'refresh' // Add token type for additional security
        }, 
        JWTService.REFRESH_SECRET, 
        {
          expiresIn: JWTService.REFRESH_EXPIRES_IN,
          issuer: JWTService.ISSUER,
          audience: JWTService.AUDIENCE,
          algorithm: 'HS256',
          jwtid: JWTService.generateJwtId() // Add JWT ID for revocation support
        }
      );
    } catch (error) {
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Failed to generate refresh token', 'REFRESH_TOKEN_GENERATION_FAILED');
    }
  }

  static verifyToken(token: string): JWTPayload {
    try {
      if (!token || typeof token !== 'string') {
        throw new JWTError('Token is required', 'MISSING_TOKEN');
      }

      const decoded = jwt.verify(token, JWTService.SECRET, {
        issuer: JWTService.ISSUER,
        audience: JWTService.AUDIENCE,
        algorithms: ['HS256'] // Only allow specific algorithm
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new JWTError('Token has expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new JWTError('Invalid token', 'INVALID_TOKEN');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new JWTError('Token not active yet', 'TOKEN_NOT_ACTIVE');
      }
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Token verification failed', 'VERIFICATION_FAILED');
    }
  }

  static verifyRefreshToken(token: string): { userId: string; type: string } {
    try {
      if (!token || typeof token !== 'string') {
        throw new JWTError('Refresh token is required', 'MISSING_REFRESH_TOKEN');
      }

      const decoded = jwt.verify(token, JWTService.REFRESH_SECRET, {
        issuer: JWTService.ISSUER,
        audience: JWTService.AUDIENCE,
        algorithms: ['HS256']
      }) as { userId: string; type: string };

      // Verify it's actually a refresh token
      if (decoded.type !== 'refresh') {
        throw new JWTError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new JWTError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new JWTError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new JWTError('Refresh token not active yet', 'REFRESH_TOKEN_NOT_ACTIVE');
      }
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Refresh token verification failed', 'REFRESH_VERIFICATION_FAILED');
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }

      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      // Log error for debugging but don't throw
      console.error('Token decode failed:', error);
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = JWTService.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  static getTokenExpirationTime(token: string): Date | null {
    try {
      const decoded = JWTService.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  static refreshAccessToken(refreshToken: string, newPayload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    try {
      // Verify refresh token first
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      // Generate new access token
      return JWTService.generateToken(newPayload);
    } catch (error) {
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Failed to refresh access token', 'REFRESH_FAILED');
    }
  }

  private static sanitizePayload(payload: any): any {
    // Remove potentially dangerous fields
    const sanitized = { ...payload };
    
    // Remove JWT reserved claims that should not be manually set
    delete sanitized.iat;
    delete sanitized.exp;
    delete sanitized.iss;
    delete sanitized.aud;
    delete sanitized.nbf;
    delete sanitized.jti;
    
    return sanitized;
  }

  // Utility method for middleware
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Method to revoke tokens (requires implementation of token blacklist)
  static async revokeToken(token: string, blacklistService?: any): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.jti) {
        throw new JWTError('Invalid token for revocation', 'INVALID_REVOCATION_TOKEN');
      }

      // If blacklist service is provided, add token to blacklist
      if (blacklistService && typeof blacklistService.addToBlacklist === 'function') {
        await blacklistService.addToBlacklist(decoded.jti, decoded.exp);
      }
    } catch (error) {
      if (error instanceof JWTError) {
        throw error;
      }
      throw new JWTError('Failed to revoke token', 'REVOCATION_FAILED');
    }
  }

  // Generate unique JWT ID
  private static generateJwtId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}