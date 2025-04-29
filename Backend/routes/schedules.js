const { checkAdminOrStaff } = require('./auth');

module.exports = (pool) => {
  const router = require('express').Router();

  // GET /schedules - Get all schedules
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM schedules ORDER BY created_at, title');
      res.json({ schedules: result.rows });
    } catch (err) {
      console.error('Error fetching schedules:', err);
      res.status(500).json({ message: 'Server error fetching schedules', error: err.message });
    }
  });

  // GET /schedules/with-students - Get all schedules with student counts
  router.get('/with-students', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.id, s.title, s.description, s.time, s.event_date, COUNT(st.id) as student_count
        FROM schedules s
        LEFT JOIN students st ON s.id = st.shift_id
        GROUP BY s.id, s.title, s.description, s.time, s.event_date
        ORDER BY s.event_date, s.time
      `);
      res.json({ schedules: result.rows });
    } catch (err) {
      console.error('Error fetching schedules with students:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET /schedules/:id - Get schedule by id
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM schedules WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
      }
      res.json({ schedule: result.rows[0] });
    } catch (err) {
      console.error(`Error fetching schedule ${req.params.id}:`, err);
      res.status(500).json({ message: 'Server error fetching schedule', error: err.message });
    }
  });

  // POST /schedules - Add new schedule
  router.post('/', async (req, res) => {
    try {
      const { title, description, time, event_date } = req.body;

      if (!title || !time || !event_date) {
        return res.status(400).json({ message: 'Title, time (HH:MM), and event_date (YYYY-MM-DD) are required' });
      }

      if (!/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ message: 'Invalid time format, use HH:MM (24-hour)' });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return res.status(400).json({ message: 'Invalid event_date format, use YYYY-MM-DD' });
      }

      const result = await pool.query(
        `INSERT INTO schedules (title, description, time, event_date, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
        [title, description || null, time, event_date]
      );

      res.status(201).json({
        message: 'Schedule added successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error('Error adding schedule:', err);
      res.status(500).json({ message: 'Server error adding schedule', error: err.message });
    }
  });

  // PUT /schedules/:id - Update schedule
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, time, event_date } = req.body;

      let finalTime = time;
      if (time && !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ message: 'Invalid time format, use HH:MM' });
      }

      let finalEventDate = event_date;
      if (event_date && !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return res.status(400).json({ message: 'Invalid event_date format, use YYYY-MM-DD' });
      }

      const result = await pool.query(
        `UPDATE schedules SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          time = COALESCE($3, time),
          event_date = COALESCE($4, event_date)
         WHERE id = $5 RETURNING *`,
        [title, description, finalTime, finalEventDate, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found for update' });
      }

      res.json({
        message: 'Schedule updated successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error(`Error updating schedule ${req.params.id}:`, err);
      res.status(500).json({ message: 'Server error updating schedule', error: err.message });
    }
  });

  // DELETE /schedules/:id - Delete schedule
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found for deletion' });
      }
      res.json({
        message: 'Schedule deleted successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error(`Error deleting schedule ${req.params.id}:`, err);
      res.status(500).json({ message: 'Server error deleting schedule', error: err.message });
    }
  });

  return router;
};