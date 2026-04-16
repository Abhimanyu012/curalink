import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import researchRouter from './routes/research.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────
app.use('/api/research', researchRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🧬 Curalink server running → http://localhost:${PORT}`);
    console.log(`   Model: ${process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'}\n`);
  });
}).catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
