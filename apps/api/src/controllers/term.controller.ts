import { Request, Response } from 'express';
import { prisma } from '@repo/database';

export const createTerm = async (req: Request, res: Response) => {
  try {
    const { title, programId } = req.body;

    if (!title || !programId) {
      return res.status(400).json({ message: 'Title and Program ID are required' });
    }

    // 1. Find the highest term number for this program so far
    const lastTerm = await prisma.term.findFirst({
      where: { program_id: programId },
      orderBy: { term_number: 'desc' },
    });

    const nextTermNumber = (lastTerm?.term_number || 0) + 1;

    // 2. Create the new term
    const term = await prisma.term.create({
      data: {
        title,
        program_id: programId,
        term_number: nextTermNumber,
      },
    });

    res.status(201).json(term);
  } catch (error) {
    console.error("Create Term Error:", error);
    res.status(500).json({ message: 'Failed to create term' });
  }
};