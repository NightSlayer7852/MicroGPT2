const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_URL}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user already exists
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If user signed up locally but now uses Google, update their authProvider
        if (user.authProvider === 'local') {
          user.googleId = profile.id;
          user.authProvider = 'google';
          await user.save();
        }
        return done(null, user);
      }

      // 2. If not, create a new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        authProvider: 'google',
        googleId: profile.id
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;