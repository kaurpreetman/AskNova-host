import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

passport.use(new GitHubStrategy({
  clientID: `${process.env.GITHUB_CLIENT_ID}`,
  clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
  callbackURL: `${process.env.GITHUB_CALLBACK_URL}`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { data: emails } = await axios.get('https://api.github.com/user/emails', {
  headers: {
    Authorization: `token ${accessToken}`,
    Accept: 'application/vnd.github+json'
  }
});

const primaryEmail = emails.find(email => email.primary && email.verified);
const email = primaryEmail ? primaryEmail.email : '';
    const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '';

    let user = await User.findOne({ githubId: profile.id });
    console.log("email"+email);
    if (!user) {
      user = await User.create({
        githubId: profile.id,
        username: profile.username,
        email: email,
        avatarUrl: avatarUrl,
      });
    } else {
      if (user.email !== email || user.avatarUrl !== avatarUrl) {
        user.email = email;
        user.avatarUrl = avatarUrl;
        await user.save();
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));


passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
