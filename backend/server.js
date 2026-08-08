// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const app = express();

require('./config/passport'); // Loads passport strategies

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes'); // <-- NEW: Import chat routes
const settingsRoutes = require('./routes/settingsRoutes');
const faqRoutes = require('./routes/faqRoutes');


// Define the "VIP list" of allowed URLs
const allowedOrigins = [
  'http://localhost:5173', // Your local development React app
  'https://micro-gpt-frontend.vercel.app' // Your live deployed React app
];

// --- Middleware ---
// Allows cross-origin requests from your frontend
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    // OR allow if the origin is in our allowedOrigins array
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Crucial for allowing Authorization headers and tokens to pass through
}));
// Parses incoming JSON payloads
app.use(express.json()); 
// Parses URL-encoded data
app.use(express.urlencoded({ extended: true })); 

app.use(passport.initialize());

// --- Mount Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes); // <-- NEW: Mount chat routes
app.use('/api/settings', settingsRoutes);
app.use('/api/faqs', faqRoutes);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// --- Basic Test Route ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'MicroGPT Backend is running!' });
});

// --- Start Server ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});