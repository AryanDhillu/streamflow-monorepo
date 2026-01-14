// apps/api/src/index.ts

import 'dotenv/config'; // <--- NEW: This loads the .env file
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from '@repo/database';

import authRoutes from './routes/auth.routes';
import programRoutes from './routes/program.routes';
import termRoutes from './routes/term.routes';
import lessonRoutes from './routes/lesson.routes';
import userRoutes from "./routes/user.routes";
import catalogRoutes from "./routes/catalog.routes";

console.log("🛠️ DEBUG: DATABASE_URL is:", process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

app.use(cors({
  origin: "http://localhost:3000", // Allow your Next.js app
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow these actions
  allowedHeaders: ["Content-Type", "Authorization"] // Allow the Token Header
}));

app.use(morgan('dev'));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', db: 'connected' });
  } catch (error) {
    console.error('Database Health Check Failed:', error);
    res.status(500).json({ status: 'ERROR', db: 'disconnected' });
  }
});

app.use('/auth', authRoutes);
app.use('/programs', programRoutes);
app.use('/terms', termRoutes);
app.use('/lessons', lessonRoutes);
app.use("/users", userRoutes);

app.use("/catalog", catalogRoutes);

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});