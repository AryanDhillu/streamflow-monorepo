import { Request, Response } from 'express';
import { prisma } from '@repo/database';

// Helper: Frontend JSON -> Prisma Asset Creates
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

// 1. GET SINGLE LESSON
export const getLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { assets: true } 
    });

    if (!lesson) return res.status(404).json({ message: 'Not found' });

    // Transform Assets back to JSON for Frontend
    const images: any = {};
    if (lesson.assets) {
        lesson.assets.forEach((asset: any) => {
            if (!images[asset.language]) images[asset.language] = {};
            const key = asset.variant === 'LANDSCAPE' ? 'thumbnail' : 'portrait'; 
            images[asset.language][key] = asset.url;
        });
    }

    res.json({ ...lesson, images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch' });
  }
};

// 2. CREATE LESSON (Updated for Strict Schema)
export const createLesson = async (req: Request, res: Response) => {
  try {
    const { title, termId, type } = req.body;

    if (!title || !termId) return res.status(400).json({ message: 'Required fields missing' });

    // 1. Calculate Lesson Number
    const lastLesson = await prisma.lesson.findFirst({
      where: { term_id: termId },
      orderBy: { lesson_number: 'desc' },
    });
    const nextLessonNumber = (lastLesson?.lesson_number || 0) + 1;

    // 2. Create with NEW required fields
    const lesson = await prisma.lesson.create({
      data: {
        title,
        term_id: termId,
        content_type: type || 'article',
        lesson_number: nextLessonNumber,
        status: 'DRAFT',
        
        // --- NEW REQUIRED FIELDS ---
        content_language_primary: 'en',
        content_languages_available: ['en'],
        content_urls_by_language: {}, 
        // ---------------------------
      },
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ message: 'Failed to create' });
  }
};

// 3. UPDATE LESSON
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, video_url, status, images } = req.body;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    const payload = video_url || content;
    
    const updateData: any = {
        title,
        status,
        content_urls_by_language: payload ? { en: payload } : undefined,
    };

    if (images) {
        updateData.assets = {
            deleteMany: {},
            create: mapImagesToAssets(images)
        };
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
      include: { assets: true }
    });

    // Map assets back to JSON
    const responseImages: any = {};
    if (lesson.assets) {
        lesson.assets.forEach((asset: any) => {
            if (!responseImages[asset.language]) responseImages[asset.language] = {};
            const key = asset.variant === 'LANDSCAPE' ? 'thumbnail' : 'portrait'; 
            responseImages[asset.language][key] = asset.url;
        });
    }

    res.json({ ...lesson, images: responseImages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update' });
  }
};

// 4. DELETE LESSON
export const deleteLesson = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
  
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid ID' });
      }
  
      await prisma.lesson.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete' });
    }
  };