import express from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import { extractKeywordsAndKaggleApiHit, genResponse, getHistory } from '../controllers/geminiController.js';

const router = express.Router();

// Route for getting dataset recommendations
router.get("/getRecommendation", extractKeywordsAndKaggleApiHit)

// Route for generating response
router.post('/prompt', ensureAuth, genResponse)
router.get("/history/:userId", ensureAuth, getHistory)
export default router;