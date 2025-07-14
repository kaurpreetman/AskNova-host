import express from 'express';
import passport from 'passport';
import { getCurrentUser, logoutUser } from '../controllers/authController.js';
import rateLimit from 'express-rate-limit';

const githubLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many GitHub login attempts, please try again later.',
});

const router = express.Router();

router.get('/github', githubLimiter, (req, res, next) => {
  console.log('GitHub login initiated at:', new Date().toISOString());
  next();
}, passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    console.log('GitHub login successful for:', req.user.username);
    res.redirect('https://asknovanew.netlify.app/generate');
  }
);

router.get('/me', getCurrentUser);
router.get('/logout', logoutUser);

export default router;
