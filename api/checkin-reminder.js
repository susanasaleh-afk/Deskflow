const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_URL = 'https://gig-deskflow.vercel.app';

async function slackLookupByEmail(email) {
  const r = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${SLACK_TOKEN}` }
  });
  const d = await r.json();
  return d.ok ? d.user.id : null;
}

async function slackDM(userId, text) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: userId, text })
  });
}

module.exports = async function handler(req, res) {
  // Only allow Vercel cron or internal calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Get all bookings for today
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('type', 'desk');

  if (error) return res.status(500).json({ error: error.message });
  if (!bookings.length) return res.status(200).json({ sent: 0 });

  // Get emails from users table
  const userIds = [...new Set(bookings.map(b => b.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);
  const emailMap = Object.fromEntries((users || []).map(u => [u.id, u.email]));

  // Get existing check-ins for today
  const { data: checkins } = await supabase
    .from('checkins')
    .select('user_id, office')
    .eq('date', today);

  const checkedIn = new Set((checkins || []).map(c => `${c.user_id}|${c.office}`));

  // Send DM to each person who hasn't checked in yet
  let sent = 0;
  for (const b of bookings) {
    if (checkedIn.has(`${b.user_id}|${b.office}`)) continue;

    const email = emailMap[b.user_id];
    if (!email) continue;
    const slackId = await slackLookupByEmail(email);
    if (!slackId) continue;

    const url = `${APP_URL}/?checkin=${encodeURIComponent(b.office)}`;
    await slackDM(slackId, `👋 Don't forget to check in to your desk at *${b.office}* today!\n<${url}|Check in now →>`);
    sent++;
  }

  return res.status(200).json({ sent, total: bookings.length });
};
