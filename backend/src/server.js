import express from 'express';
import cors from 'cors';
import './db.js'; // ensures schema exists before routes touch it
import catalogsRouter from './routes/catalogs.js';
import schedulesRouter from './routes/schedules.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/catalogs', catalogsRouter);
app.use('/api/schedules', schedulesRouter);

// Centralized error handler (catches multer file-type/size errors and anything thrown in routes)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || (err.message?.includes('file') ? 400 : 500);
  console.error(err);
  res.status(status).json({ error: err.message || 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`Class Scheduler API listening on port ${PORT}`);
});
