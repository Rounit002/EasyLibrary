module.exports = (pool) => {
  const express = require('express');
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const { shiftId } = req.query;
      let queryText = '';
      const params = [];

      if (shiftId) {
        queryText = `
          SELECT s.id, s.seat_number, 
                 CASE WHEN st.id IS NOT NULL AND st.shift_id = $1 THEN true ELSE false END as is_assigned
          FROM seats s
          LEFT JOIN students st ON s.id = st.seat_id AND st.shift_id = $1
          ORDER BY s.seat_number ASC
        `;
        params.push(shiftId);
      } else {
        queryText = `
          SELECT s.id, s.seat_number, 
                 CASE WHEN st.id IS NOT NULL THEN true ELSE false END as is_assigned
          FROM seats s
          LEFT JOIN students st ON s.id = st.seat_id
          ORDER BY s.seat_number ASC
        `;
      }

      const result = await pool.query(queryText, params);
      const seatsData = result.rows.map(row => ({
        id: row.id,
        seatNumber: row.seat_number,
        isAssigned: row.is_assigned
      }));
      res.json({ seats: seatsData });
    } catch (err) {
      console.error('Error in seats route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { seat_numbers } = req.body; // Changed from seatNumbers to seat_numbers
      if (!seat_numbers || typeof seat_numbers !== 'string') {
        return res.status(400).json({ message: 'seat_numbers must be a comma-separated string' });
      }
      const seatArray = seat_numbers.split(',').map(s => s.trim()).filter(s => s);
      if (seatArray.length === 0) {
        return res.status(400).json({ message: 'No seat numbers provided' });
      }
      const uniqueSeats = new Set(seatArray);
      if (uniqueSeats.size < seatArray.length) {
        return res.status(400).json({ message: 'Duplicate seat numbers in input' });
      }
      const existingSeats = await pool.query('SELECT seat_number FROM seats WHERE seat_number = ANY($1)', [seatArray]);
      if (existingSeats.rows.length > 0) {
        const existingNumbers = existingSeats.rows.map(row => row.seat_number);
        return res.status(400).json({ message: `Seat numbers already exist: ${existingNumbers.join(', ')}` });
      }
      const insertQuery = 'INSERT INTO seats (seat_number) VALUES ' + seatArray.map((_, i) => `($${i + 1})`).join(', ');
      await pool.query(insertQuery, seatArray);
      res.status(201).json({ message: 'Seats added successfully' });
    } catch (err) {
      console.error('Error in seats post route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM seats WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Seat not found' });
      }
      res.json({ message: 'Seat deleted successfully' });
    } catch (err) {
      console.error('Error in seats delete route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};