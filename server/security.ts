import { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

export const csrfTokenEndpoint: RequestHandler = (req: Request, res: Response) => {
  const token = ensureCsrfToken(req);
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
};

const CSRF_EXEMPT_PATHS = [
  "/api/uploads/upload",
  "/api/tesla-connector/vitals",
];

export const validateCsrf: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (safeMethod) {
    return next();
  }

  const fullPath = req.originalUrl.split('?')[0];
  if (CSRF_EXEMPT_PATHS.some(path => fullPath === path || fullPath.startsWith(path))) {
    console.log(`[CSRF] Exempt path: ${fullPath}`);
    return next();
  }

  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER] as string | undefined;
  const tokenFromSession = req.session?.csrfToken;

  if (!tokenFromHeader || !tokenFromSession) {
    console.warn(`[CSRF] Missing token - header: ${!!tokenFromHeader}, session: ${!!tokenFromSession}, path: ${req.path}`);
    return res.status(403).json({ 
      message: "CSRF token missing",
      messageAr: "رمز الأمان مفقود - يرجى تسجيل الخروج والدخول مجدداً"
    });
  }

  try {
    if (!crypto.timingSafeEqual(Buffer.from(tokenFromHeader), Buffer.from(tokenFromSession))) {
      console.warn(`[CSRF] Token mismatch on ${req.path}`);
      return res.status(403).json({ 
        message: "CSRF token invalid",
        messageAr: "رمز الأمان غير صالح - يرجى تحديث الصفحة"
      });
    }
  } catch (err) {
    console.error(`[CSRF] Token comparison error:`, err);
    return res.status(403).json({ message: "CSRF validation error" });
  }

  next();
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many registration attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many verification attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export function productionErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction) {
    console.error(`[Error ${status}]`, err.message);
    if (status >= 500) {
      return res.status(status).json({ message: "Internal server error" });
    }
    return res.status(status).json({ message: err.message || "An error occurred" });
  }
  
  console.error("Server error:", err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  return res.status(status).json({ 
    message: err.message || "Internal Server Error",
    ...(isProduction ? {} : { stack: err.stack })
  });
}
