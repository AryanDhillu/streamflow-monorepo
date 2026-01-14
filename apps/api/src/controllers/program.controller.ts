import { Request, Response } from 'express';
import { prisma } from '@repo/database';

// Helper to convert Frontend Image JSON -> Prisma Asset Creates
// apps/api/src/controllers/program.controller.ts

// --- DEDUPLICATING HELPER ---
const mapImagesToAssets = (images: any) => {
  // We use a Map to ensure each (Language + Variant) pair is unique
  const uniqueAssets = new Map<string, any>(); 

  if (!images) return [];

  Object.keys(images).forEach((lang) => {
    const variants = images[lang];
    Object.keys(variants).forEach((variantKey) => {
      
      // 1. Map Frontend Key -> Database Enum
      let dbVariant = 'PORTRAIT'; 
      if (variantKey === 'landscape') dbVariant = 'LANDSCAPE';
      if (variantKey === 'portrait') dbVariant = 'PORTRAIT';
      if (variantKey === 'thumbnail') dbVariant = 'LANDSCAPE'; // Map thumbnail to Landscape

      // 2. Create a Unique Key (e.g. "en_LANDSCAPE")
      const uniqueKey = `${lang}_${dbVariant}`;

      // 3. Store in Map (Last one wins, effectively removing duplicates)
      uniqueAssets.set(uniqueKey, {
        language: lang,
        variant: dbVariant,
        asset_type: "POSTER",
        url: variants[variantKey]
      });
    });
  });

  // Convert the Map back to an Array for Prisma
  return Array.from(uniqueAssets.values());
};
// ----------------------------

// 1. GET ALL
export const getPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { created_at: 'desc' },
      include: { assets: true, topics: true } // Include relations
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch programs' });
  }
};

// 2. GET SINGLE
export const getProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // --- FIX: Type Guard ---
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        assets: true,
        topics: true,
        terms: {
          orderBy: { term_number: 'asc' },
          include: {
            lessons: { orderBy: { lesson_number: 'asc' } }
          }
        }
      }
    });

    if (!program) return res.status(404).json({ message: 'Program not found' });

    // Transform Assets back to JSON for Frontend (Compatibility)
    const images: any = {};
    program.assets.forEach((asset: any) => {
        if (!images[asset.language]) images[asset.language] = {};
        images[asset.language][asset.variant.toLowerCase()] = asset.url;
    });

    res.json({ ...program, images }); // Send back as 'images' property
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

// 3. CREATE
// apps/api/src/controllers/program.controller.ts

export const createProgram = async (req: Request, res: Response) => {
  try {
    const { title, description, language_primary, status } = req.body;

    // Validate input
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const program = await prisma.program.create({
      data: {
        title,
        description,
        language_primary: language_primary || 'en',
        status: status || 'DRAFT',
        languages_available: [language_primary || 'en'] // Start with primary
      }
    });

    res.status(201).json(program);
  } catch (error) {
    console.error("Create Program Error:", error);
    res.status(500).json({ message: "Failed to create program" });
  }
};

// 4. UPDATE
export const updateProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, images, topics } = req.body;

    // --- FIX: Type Guard ---
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    // Prepare Update Data
    const updateData: any = {
        title,
        description,
        status
    };

    // Handle Images (Delete old, Insert new)
    if (images) {
        updateData.assets = {
            deleteMany: {}, // Clear old assets
            create: mapImagesToAssets(images) // Add new ones
        };
    }

    // Handle Topics (ConnectOrCreate)
    if (topics && Array.isArray(topics)) {
        updateData.topics = {
            set: [], // Clear existing connections
            connectOrCreate: topics.map((t: string) => ({
                where: { name: t },
                create: { name: t }
            }))
        };
    }

    const program = await prisma.program.update({
      where: { id },
      data: updateData,
      include: { assets: true }
    });

    res.json(program);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update' });
  }
};

// 5. DELETE
export const deleteProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // --- FIX: Type Guard ---
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    await prisma.program.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete' });
  }
};