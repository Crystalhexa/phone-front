import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth';

export class JWTService {
  private static readonly SECRET = process.env.JWT_SECRET ?? 'your-secret-key';
  private static readonly EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
  private static readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret';
  private static readonly REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'];

  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
      issuer: 'your-app-name',
      audience: 'your-app-users'
    });
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN
    });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.SECRET) as JWTPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, this.REFRESH_SECRET) as { userId: string };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}
