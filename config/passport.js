import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import axios from 'axios';
import User from '../models/User.js';

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    if (user) return done(null, user);

    let email = profile.emails?.[0]?.value || '';

    if (!email) {
      try {
        const { data: emails, headers } = await axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github+json',
          }
        });

        console.log('GitHub Rate Limit Remaining:', headers['x-ratelimit-remaining']);
        const primary = emails.find(e => e.primary && e.verified);
        email = primary?.email || '';
      } catch (err) {
        console.error('Email fetch error:', err.message);
      }
    }

    user = await User.create({
      githubId: profile.id,
      username: profile.username,
      email,
      avatarUrl: profile.photos?.[0]?.value || '',
    });

    return done(null, user);
  } catch (err) {
    console.error('GitHub Auth Error:', err.message);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
