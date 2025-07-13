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

    if (user) {
     
      return done(null, user);
    }

   
    let email = '';
    if (profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value;
    } else {
      try {
        const { data: emails, headers } = await axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        });

        console.log('GitHub API Rate Limit Remaining:', headers['x-ratelimit-remaining']);
        const primaryEmail = emails.find(email => email.primary && email.verified);
        email = primaryEmail ? primaryEmail.email : '';
      } catch (emailErr) {
        console.error('GitHub Email Fetch Error:', emailErr.message);
      }
    }

    const avatarUrl = profile.photos?.[0]?.value || '';

    user = await User.create({
      githubId: profile.id,
      username: profile.username,
      email,
      avatarUrl,
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
