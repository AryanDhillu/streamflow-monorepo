import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "my-super-secret-password-123";
// const JWT_SECRET = "my-super-secret-password-123";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // 2. Check Password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    // 3. Generate Token (Contains User ID and Role)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 4. Return Token & User Info
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

// Quick helper to create the first admin manually via API (dev only)
export const registerAdmin = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name, role: 'ADMIN' }
        });
        res.json(user);
    } catch(e) {
        res.status(400).json({ error: 'User already exists' });
    }
}