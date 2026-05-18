const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { office, date, user_id } = req.query;
      let query = supabase.from('bookings').select('*');
      if (office && date) query = query.eq('office', office).eq('date', date);
      else if (user_id) query = query.eq('user_id', user_id).gte('date', new Date().toISOString().slice(0, 10)).order('date');
      else query = query.order('date');
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('bookings').insert(req.body);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
