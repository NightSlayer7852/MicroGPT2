const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const { protect } = require('../middleware/authMiddleware');

// Local Auth
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/me', protect, authController.getMe);

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  authController.googleCallback
);

// routes/authRoutes.js
router.post('/logout', protect, authController.logout); // 'protect' must be here!

module.exports = router;