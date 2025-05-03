const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const pgSession = require('connect-pg-simple')(session);
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();
const { setupCronJobs } = require('./utils/cronJobs');
const { sendExpirationReminder } = require('./utils/email');

const app = express();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8080',
      'https://easylibrary.onrender.com',
      'file://'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
  release();
});

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    ttl: 24 * 60 * 60,
  }),
  secret: process.env.SESSION_SECRET || 'your-secure-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Image upload route
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  console.log('Auth check:', req.session.user, req.path);
  if (req.path === '/api/auth/login' || (req.session && req.session.user)) {
    return next();
  } else {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Import routes
const auth = require('./routes/auth');
const authRoutes = auth.authRouter(pool, bcrypt);
const userRoutes = require('./routes/users')(pool, bcrypt);
const studentRoutes = require('./routes/students')(pool);
const scheduleRoutes = require('./routes/schedules')(pool);
const seatsRoutes = require('./routes/seats')(pool);
const settingsRoutes = require('./routes/settings')(pool);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/students', authenticateUser, studentRoutes);
app.use('/api/schedules', authenticateUser, scheduleRoutes);
app.use('/api/seats', authenticateUser, seatsRoutes);
app.use('/api/settings', authenticateUser, settingsRoutes);

// Temporary test endpoint for email sending
app.get('/api/test-email', async (req, res) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM settings');
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    const brevoTemplateId = settings.brevo_template_id;
    if (!brevoTemplateId) {
      return res.status(400).json({ message: 'Brevo template ID not set' });
    }

    const testStudent = {
      email: 'test@example.com', // Replace with a valid email for testing
      name: 'Test Student',
      membership_end: '2025-05-10',
    };

    await sendExpirationReminder(testStudent, brevoTemplateId);
    res.json({ message: 'Test email sent successfully' });
  } catch (err) {
    console.error('Error in test-email endpoint:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Student Management API' });
});

// Serve frontend
app.get('/*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index.html not found in dist folder');
  }
});

// Initialize session table
async function initializeSessionTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire)
    `);
    console.log('Session table initialized successfully');
  } catch (err) {
    console.error('Error initializing session table:', err.stack);
    throw err;
  }
}

// Create default admin user
async function createDefaultAdmin() {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('Default admin user created with username: admin, password: admin');
    } else {
      console.log('Admin user already exists, skipping default admin creation');
    }
  } catch (err) {
    console.error('Error creating default admin:', err.stack);
    throw err;
  }
}

// Start the server
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initializeSessionTable();
    await createDefaultAdmin();
    setupCronJobs(pool); // Set up cron jobs
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.stack);
    process.exit(1);
  }
})();