import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayloadBase {
  sub: string;
  role: string;
}

export interface AccessTokenPayload extends JwtPayloadBase {
  type?: 'access';
}

export interface RefreshTokenPayload extends JwtPayloadBase {
  type: 'refresh';
}

export const signAccessToken = (payload: JwtPayloadBase) => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any
  };
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, options);
};

export const signRefreshToken = (payload: JwtPayloadBase) => {
  const options: SignOptions = {
    expiresIn: '7d'
  };
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
