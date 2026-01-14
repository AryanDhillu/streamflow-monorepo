import { Request, Response } from 'express';
import { prisma } from '@repo/database';

// --- HELPERS ---

const transformAssets = (assets: any[]) => {
  const result: any = {};
  if (!assets) return result;
  assets.forEach((asset) => {
    const typeKey = (asset.asset_type || 'unknown').toLowerCase() + 's'; 
    const lang = asset.language || 'en';
    const variant = (asset.variant || 'default').toLowerCase(); 
    if (!result[typeKey]) result[typeKey] = {};
    if (!result[typeKey][lang]) result[typeKey][lang] = {};
    result[typeKey][lang][variant] = asset.url;
  });
  return result;
};

// Safe JSON parser for video URLs
const safeParseUrls = (urls: any) => {
    if (typeof urls === 'object' && urls !== null) return urls;
    try { return JSON.parse(urls); } catch { return {}; }
};

const transformLesson = (lesson: any, language: string = 'en') => {
  const urls = safeParseUrls(lesson.content_urls_by_language);
  const videoUrl = urls[language] || urls['en'] || Object.values(urls)[0] || null;
  
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    duration: lesson.duration_ms ? Math.floor(lesson.duration_ms / 1000) : null,
    video_url: videoUrl 
  };
};

// Standard Error Helper
const sendError = (res: Response, code: string, message: string, status = 500) => {
    res.status(status).json({ code, message });
};

// --- CONTROLLERS ---

// 1. GET /catalog/programs
export const getCatalogPrograms = async (req: Request, res: Response) => {
  try {
    const language = req.query.language ? String(req.query.language) : undefined;
    const topic = req.query.topic ? String(req.query.topic) : undefined;
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const whereClause: any = {
      status: 'PUBLISHED',
      language_primary: language,
      // REQUIREMENT: Only programs with ≥1 published lesson
      terms: {
        some: {
          lessons: {
            some: { status: 'PUBLISHED' }
          }
        }
      }
    };

    // REQUIREMENT: Filter by Topic
    if (topic) {
        whereClause.topics = {
            some: { name: topic }
        };
    }

    const programs = await prisma.program.findMany({
      where: whereClause,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { updated_at: 'desc' }, // Sort by most recently updated/published
      include: { assets: true }
    });

    const response = programs.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      language_primary: p.language_primary,
      assets: transformAssets((p as any).assets || []) 
    }));

    res.set('Cache-Control', 'public, max-age=300');
    res.json(response);
  } catch (error) {
    console.error("Catalog Error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to load catalog");
  }
};

// 2. GET /catalog/programs/:id
export const getCatalogProgramDetail = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id); 

    const program = await prisma.program.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        assets: true,
        terms: {
          include: {
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { created_at: 'asc' }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!program) return sendError(res, "NOT_FOUND", "Program not found", 404);

    const response = {
      ...program,
      assets: transformAssets((program as any).assets || []),
      terms: (program as any).terms.map((t: any) => ({
          ...t,
          lessons: t.lessons.map((l: any) => transformLesson(l, program.language_primary))
      }))
    };

    res.set('Cache-Control', 'public, max-age=60'); 
    res.json(response);
  } catch (error) {
    console.error("Detail Error:", error);
    sendError(res, "INTERNAL_ERROR", "Error loading program");
  }
};

// 3. GET /catalog/lessons/:id (NEW REQUIREMENT)
export const getCatalogLessonDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const lesson = await prisma.lesson.findFirst({
            where: { id, status: 'PUBLISHED' },
            include: {
                // Optionally include assets if lessons have their own posters
            }
        });

        if (!lesson) return sendError(res, "NOT_FOUND", "Lesson not found", 404);

        const response = transformLesson(lesson);

        res.set('Cache-Control', 'public, max-age=60');
        res.json(response);
    } catch (error) {
        console.error("Lesson Error:", error);
        sendError(res, "INTERNAL_ERROR", "Error loading lesson");
    }
};