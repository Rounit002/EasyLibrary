module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkAdminOrStaff } = require('./auth');

  // GET all students
  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM students ORDER BY name');
      res.json({ students: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET active students
  router.get('/active', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM students WHERE status = 'active' ORDER BY name");
      res.json({ students: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET expired memberships
  router.get('/expired', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM students WHERE status = 'expired' ORDER BY name");
      res.json({ students: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET expiring soon students
  router.get('/expiring-soon', checkAdminOrStaff, async (req, res) => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const result = await pool.query(
        "SELECT * FROM students WHERE status = 'active' AND membership_end <= $1 ORDER BY membership_end",
        [thirtyDaysFromNow]
      );
      res.json({ students: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET student by ID
  router.get('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT s.*, sch.title AS shift_title, sch.description AS shift_description FROM students s LEFT JOIN schedules sch ON s.shift_id = sch.id WHERE s.id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET students by shift with filtering
  router.get('/shift/:shiftId', checkAdminOrStaff, async (req, res) => {
    try {
      const { shiftId } = req.params;
      const { search, status } = req.query;
      let query = 'SELECT * FROM students WHERE shift_id = $1';
      const params = [shiftId];
      if (search) {
        query += ' AND (name ILIKE $2 OR phone ILIKE $2)';
        params.push(`%${search}%`);
      }
      if (status && status !== 'all') { // Ignore status filter if 'all'
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }
      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      res.json({ students: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // POST add student
  router.post('/', checkAdminOrStaff, async (req, res) => {
    try {
      const { name, email, phone, membership_start, membership_end, shift_id } = req.body;
      if (!name || !email || !phone || !membership_start || !membership_end) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      if (typeof phone !== 'string' || phone.trim() === '') {
        return res.status(400).json({ message: 'Phone number must be a non-empty string' });
      }
      const emailCheck = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      if (shift_id) {
        const shiftCheck = await pool.query('SELECT * FROM schedules WHERE id = $1', [shift_id]);
        if (shiftCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid shift ID' });
        }
      }
      const result = await pool.query(
        'INSERT INTO students (name, email, phone, membership_start, membership_end, shift_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, email, phone, membership_start, membership_end, shift_id, 'active']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // PUT update student
  router.put('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, membership_start, membership_end, shift_id } = req.body;

      if (email) {
        const emailCheck = await pool.query('SELECT * FROM students WHERE email = $1 AND id != $2', [email, id]);
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another student' });
        }
      }

      if (phone !== undefined && (typeof phone !== 'string' || phone.trim() === '')) {
        return res.status(400).json({ message: 'Phone number must be a non-empty string if provided' });
      }

      if (shift_id) {
        const shiftCheck = await pool.query('SELECT * FROM schedules WHERE id = $1', [shift_id]);
        if (shiftCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid shift ID' });
        }
      }

      const result = await pool.query(
        `UPDATE students SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          membership_start = COALESCE($4, membership_start),
          membership_end = COALESCE($5, membership_end),
          shift_id = COALESCE($6, shift_id)
        WHERE id = $7 RETURNING *`,
        [name, email, phone, membership_start, membership_end, shift_id, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // DELETE delete student
  router.delete('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      res.json({ message: 'Student deleted successfully', student: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET dashboard stats
  router.get('/stats/dashboard', checkAdmin, async (req, res) => {
    try {
      const totalResult = await pool.query('SELECT COUNT(*) FROM students');
      const activeResult = await pool.query("SELECT COUNT(*) FROM students WHERE status = 'active'");
      const expiredResult = await pool.query("SELECT COUNT(*) FROM students WHERE status = 'expired'");
      res.json({
        totalStudents: parseInt(totalResult.rows[0].count),
        activeStudents: parseInt(activeResult.rows[0].count),
        expiredMemberships: parseInt(expiredResult.rows[0].count),
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // POST renew membership
  router.post('/:id/renew', checkAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { membership_start, membership_end } = req.body;
      if (!membership_start || !membership_end) {
        return res.status(400).json({ message: 'Membership start and end dates are required' });
      }
      const result = await pool.query(
        'UPDATE students SET membership_start = $1, membership_end = $2, status = $3 WHERE id = $4 RETURNING *',
        [membership_start, membership_end, 'active', id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      res.json({ message: 'Membership renewed successfully', student: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};