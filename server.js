import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import passport from 'passport';
import http from 'http';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import geminiRoutes from './routes/gen.js';
import { initSocketHandler } from './controllers/geminiController.js';
import './config/passport.js';

dotenv.config();
await connectDB();

const app = express();
const server = http.createServer(app);
initSocketHandler(server);

app.set('trust proxy', 1);

app.use(cors({
  origin: 'https://asknovanew.netlify.app',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: 'yourSecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/gen', geminiRoutes);

server.listen(process.env.PORT, () =>
  console.log(`Backend running on http://localhost:${process.env.PORT}`)
);
