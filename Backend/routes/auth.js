const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.session.user.role === 'admin') {
      return next();
    }
    const userPermissions = req.session.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

const checkAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

const checkAdminOrStaff = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.session.user.role === 'admin' || req.session.user.role === 'staff') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admin or Staff access required' });
};

const authRouter = (pool, bcrypt) => {
  const router = require('express').Router();

  // Login route
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      const result = await pool.query('SELECT id, username, password, role FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      return res.json({ 
        message: 'Login successful', 
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Logout route
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Server error during logout' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // Check auth status route
  router.get('/status', (req, res) => {
    if (req.session && req.session.user) {
      return res.json({ 
        isAuthenticated: true, 
        user: {
          id: req.session.user.id,
          username: req.session.user.username,
          role: req.session.user.role
        }
      });
    }
    return res.json({ isAuthenticated: false });
  });

  return router;
};

module.exports = {
  checkPermission,
  checkAdmin,
  checkAdminOrStaff,
  authRouter
};