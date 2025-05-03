module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkAdminOrStaff } = require('./auth');

  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query('SELECT s.*, seats.seat_number FROM students s LEFT JOIN seats ON s.seat_id = seats.id ORDER BY name');
      const students = result.rows.map(student => ({
        ...student,
        fee: student.fee ? parseFloat(student.fee) : null,
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students route (GET /):', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/active', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query("SELECT s.*, seats.seat_number FROM students s LEFT JOIN seats ON s.seat_id = seats.id WHERE status = 'active' ORDER BY name");
      const students = result.rows.map(student => ({
        ...student,
        fee: student.fee ? parseFloat(student.fee) : null,
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/active route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/expired', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query("SELECT s.*, seats.seat_number FROM students s LEFT JOIN seats ON s.seat_id = seats.id WHERE status = 'expired' ORDER BY name");
      const students = result.rows.map(student => ({
        ...student,
        fee: student.fee ? parseFloat(student.fee) : null,
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/expired route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/expiring-soon', checkAdminOrStaff, async (req, res) => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const result = await pool.query(
        "SELECT s.*, seats.seat_number FROM students s LEFT JOIN seats ON s.seat_id = seats.id WHERE status = 'active' AND membership_end <= $1 ORDER BY membership_end",
        [thirtyDaysFromNow]
      );
      const students = result.rows.map(student => ({
        ...student,
        fee: student.fee ? parseFloat(student.fee) : null,
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/expiring-soon route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const queryText = `
        SELECT s.*, sch.title AS shift_title, sch.description AS shift_description, seats.seat_number 
        FROM students s 
        LEFT JOIN schedules sch ON s.shift_id = sch.id 
        LEFT JOIN seats ON s.seat_id = seats.id 
        WHERE s.id = $1
      `;
      const result = await pool.query(queryText, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      const studentData = result.rows[0];
      const student = {
        id: studentData.id,
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        address: studentData.address,
        membership_start: studentData.membership_start,
        membership_end: studentData.membership_end,
        shift_id: studentData.shift_id,
        seat_id: studentData.seat_id,
        status: studentData.status,
        fee: studentData.fee ? parseFloat(studentData.fee) : null,
        shift_title: studentData.shift_title,
        shift_description: studentData.shift_description,
        seat_number: studentData.seat_number,
        profile_image_url: studentData.profile_image_url,
      };
      res.json(student);
    } catch (err) {
      console.error('Error in students/:id route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/shift/:shiftId', checkAdminOrStaff, async (req, res) => {
    try {
      const { shiftId } = req.params;
      const { search, status } = req.query;
      let query = 'SELECT s.*, seats.seat_number FROM students s LEFT JOIN seats ON s.seat_id = seats.id WHERE shift_id = $1';
      const params = [shiftId];
      if (search) {
        query += ' AND (name ILIKE $2 OR phone ILIKE $2)';
        params.push(`%${search}%`);
      }
      if (status && status !== 'all') {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }
      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      const students = result.rows.map(student => ({
        ...student,
        fee: student.fee ? parseFloat(student.fee) : null,
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/shift/:shiftId route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', checkAdminOrStaff, async (req, res) => {
    try {
      const { name, email, phone, address, membership_start, membership_end, shift_id, seat_id, fee, profile_image_url } = req.body;
      if (!name || !email || !phone || !membership_start || !membership_end) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      if (typeof phone !== 'string' || phone.trim() === '') {
        return res.status(400).json({ message: 'Phone number must be a non-empty string' });
      }
      if (seat_id && !shift_id) {
        return res.status(400).json({ message: 'Shift must be selected when assigning a seat' });
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
      if (seat_id) {
        const seatCheck = await pool.query('SELECT * FROM seats WHERE id = $1', [seat_id]);
        if (seatCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid seat ID' });
        }
      }
      const result = await pool.query(
        'INSERT INTO students (name, email, phone, address, membership_start, membership_end, shift_id, status, seat_id, fee, profile_image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [name, email, phone, address || null, membership_start, membership_end, shift_id, 'active', seat_id || null, fee || null, profile_image_url || null]
      );
      const newStudent = {
        ...result.rows[0],
        fee: result.rows[0].fee ? parseFloat(result.rows[0].fee) : null,
      };
      res.status(201).json(newStudent);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'unique_seat_per_shift') {
        return res.status(400).json({ message: 'Selected seat is already assigned to another student in the same shift' });
      }
      console.error('Error in students POST route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, address, membership_start, membership_end, shift_id, seat_id, fee } = req.body;
      if (seat_id && !shift_id) {
        return res.status(400).json({ message: 'Shift must be selected when assigning a seat' });
      }
      if (email) {
        const emailCheck = await pool.query('SELECT * FROM students WHERE email = $1 AND id != $2', [email, id]);
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another student' });
        }
      }
      if (phone && (typeof phone !== 'string' || phone.trim() === '')) {
        return res.status(400).json({ message: 'Phone number must be a non-empty string if provided' });
      }
      if (shift_id) {
        const shiftCheck = await pool.query('SELECT * FROM schedules WHERE id = $1', [shift_id]);
        if (shiftCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid shift ID' });
        }
      }
      if (seat_id) {
        const seatCheck = await pool.query('SELECT * FROM seats WHERE id = $1', [seat_id]);
        if (seatCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid seat ID' });
        }
      }
      const result = await pool.query(
        `UPDATE students SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          membership_start = COALESCE($5, membership_start),
          membership_end = COALESCE($6, membership_end),
          shift_id = $7,
          seat_id = $8,
          fee = $9
        WHERE id = $10 RETURNING *`,
        [name, email, phone, address, membership_start, membership_end, shift_id || null, seat_id || null, fee || null, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      const updatedStudent = {
        ...result.rows[0],
        fee: result.rows[0].fee ? parseFloat(result.rows[0].fee) : null,
      };
      res.json(updatedStudent);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'unique_seat_per_shift') {
        return res.status(400).json({ message: 'Selected seat is already assigned to another student in the same shift' });
      }
      console.error('Error in students PUT route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      res.json({ message: 'Student deleted successfully', student: result.rows[0] });
    } catch (err) {
      console.error('Error in students DELETE route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

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
      console.error('Error in students/stats/dashboard route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

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
      const renewedStudent = {
        ...result.rows[0],
        fee: result.rows[0].fee ? parseFloat(result.rows[0].fee) : null,
      };
      res.json({ message: 'Membership renewed successfully', student: renewedStudent });
    } catch (err) {
      console.error('Error in students/:id/renew route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};