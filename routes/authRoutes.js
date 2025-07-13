import express from 'express';
import passport from 'passport';
import { getCurrentUser, logoutUser } from '../controllers/authController.js';


const router = express.Router();


router.get('/github',  passport.authenticate('github', { scope: ['user:email'] }));


router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    successRedirect: 'https://asknovanew.netlify.app/generate', 
  })
);


router.get('/me', getCurrentUser);


router.get('/logout', logoutUser);

export default router;
