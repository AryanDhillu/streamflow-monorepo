import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Interface for the User object inside the Request
export interface AuthRequest extends Request {
  user?: { 
    userId: string; 
    role: string; 
    email: string;
  };
}

// 2. Secret Key (Best Practice: Use .env, fallback to hardcoded for dev)
// IMPORTANT: This must match what is in your auth.controller.ts
const JWT_SECRET = process.env.JWT_SECRET || "my-super-secret-password-123";

// 3. Authentication Middleware
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded; // Attach user data to the request
    next(); // Pass control to the next handler
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// 4. Role Authorization Middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};