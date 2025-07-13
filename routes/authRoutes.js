import express from 'express';
import passport from 'passport';
import { getCurrentUser, logoutUser } from '../controllers/authController.js';

const router = express.Router();

import rateLimit from 'express-rate-limit';

const githubLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many GitHub login attempts, please try again later.'
});

router.get('/github', githubLimiter, passport.authenticate('github', { scope: ['user:email'] }));


router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    successRedirect: 'https://asknovanew.netlify.app/generate',
  })
);

router.get('/me', getCurrentUser);
router.get('/logout', logoutUser);

export default router;
