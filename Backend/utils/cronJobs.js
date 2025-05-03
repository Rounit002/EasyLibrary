const cron = require('node-cron');
const { sendExpirationReminder } = require('./email');

const setupCronJobs = (pool) => {
  // Schedule a daily task at midnight to send expiration reminders
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running expiration reminder cron job...');
      // Get settings
      const settingsResult = await pool.query('SELECT * FROM settings');
      const settings = {};
      settingsResult.rows.forEach(row => {
        settings[row.key] = row.value;
      });

      const daysBefore = parseInt(settings.days_before_expiration);
      if (!daysBefore || isNaN(daysBefore)) {
        console.log('Days before expiration not set or invalid');
        return;
      }

      const brevoTemplateId = settings.brevo_template_id;
      if (!brevoTemplateId) {
        console.log('Brevo template ID not set');
        return;
      }

      // Calculate the target date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      const targetDateString = targetDate.toISOString().split('T')[0];

      // Get students whose membership ends on the target date
      const studentsResult = await pool.query(
        "SELECT * FROM students WHERE membership_end = $1 AND status = 'active'",
        [targetDateString]
      );
      const students = studentsResult.rows;

      if (students.length === 0) {
        console.log('No students with memberships expiring on', targetDateString);
        return;
      }

      for (const student of students) {
        await sendExpirationReminder(student, brevoTemplateId);
      }
    } catch (err) {
      console.error('Error in expiration reminder cron job:', err);
    }
  });

  console.log('Cron jobs scheduled successfully');
};

module.exports = { setupCronJobs };