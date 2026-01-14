import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import bcrypt from 'bcryptjs';

// GET /users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Return all users (exclude passwords for security)
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// POST /users
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // 1. Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "User already exists" });

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'VIEWER' // Default to Viewer if not specified
      },
      select: { id: true, email: true, role: true } // Don't return password
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user" });
  }
};

// ... imports

// apps/api/src/controllers/user.controller.ts

// DELETE /users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    // FIX: Cast 'id' as string so TypeScript doesn't think it's an array
    const id = req.params.id as string;

    // Optional: Prevent deleting yourself
    // if (req.user?.userId === id) {
    //   return res.status(400).json({ message: "You cannot delete your own account." });
    // }

    await prisma.user.delete({
      where: { id } // Now works because 'id' is guaranteed to be a string
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};