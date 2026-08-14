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


const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://microgpt-vert.vercel.app',
  'https://micro-gpt-frontend.vercel.app'
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// --- Middleware ---
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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