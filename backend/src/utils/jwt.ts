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

export interface QuestionShareTokenPayload {
  type: 'question_share';
  questionId: string;
  exp?: number;
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

export const signQuestionShareToken = (questionId: string) => {
  const options: SignOptions = {
    expiresIn: '1h'
  };
  return jwt.sign(
    { type: 'question_share', questionId },
    env.JWT_SECRET,
    options
  );
};

export const verifyQuestionShareToken = (
  token: string
): QuestionShareTokenPayload => {
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
    type?: string;
    questionId?: string;
  };

  if (payload.type !== 'question_share' || !payload.questionId) {
    throw new Error('INVALID_SHARE_TOKEN');
  }

  return {
    type: 'question_share',
    questionId: String(payload.questionId),
    exp: typeof payload.exp === 'number' ? payload.exp : undefined
  };
};
