import { Temporal } from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal;
import express from 'express';
import authRoutes from './routes/auth.routes'

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// TODO: Geliştirici tarafından route'lar eklenecek
// import authRoutes from './routes/auth.routes';
// app.use('/auth', authRoutes);

export default app;
