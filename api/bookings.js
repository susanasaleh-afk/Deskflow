const { createClient } = require('@supabase/supabase-js');
const { verifyToken, isAdmin } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-User-Email, X-User-Name, X-Tenant-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try {
    caller = await verifyToken(req.headers);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: ' + e.message });
  }

  try {
    if (req.method === 'GET') {
      const { office, date, user_id } = req.query;
      let query = supabase.from('bookings').select('*');
      if (office && date) query = query.eq('office', office).eq('date', date);
      else if (user_id) {
        const callerIsAdmin = await isAdmin(supabase, caller.id);
        if (!callerIsAdmin && user_id !== caller.id) return res.status(403).json({ error: 'Forbidden' });
        query = query.eq('user_id', user_id).gte('date', new Date().toISOString().slice(0, 10)).order('date');
      } else {
        const callerIsAdmin = await isAdmin(supabase, caller.id);
        if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
        query = query.order('date');
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { office, date, type, resource_id, room_slot, room_title } = req.body;
      if (!office || !date || !type || !resource_id) return res.status(400).json({ error: 'Missing required fields' });

      let conflictQuery = supabase.from('bookings').select('id')
        .eq('office', office).eq('date', date).eq('resource_id', resource_id).eq('type', type);
      if (type === 'room') conflictQuery = conflictQuery.eq('room_slot', room_slot || null);
      const { data: existing } = await conflictQuery;
      if (existing && existing.length > 0) return res.status(409).json({ error: 'Already booked' });

      const id = 'b' + Date.now() + Math.random().toString(36).slice(2);
      const { data, error } = await supabase.from('bookings').insert({
        id, office, date, type, resource_id,
        room_slot: room_slot || null,
        room_title: room_title || null,
        user_id: caller.id,
        user_name: caller.name,
        user_initials: caller.name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase(),
      });
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data: booking } = await supabase.from('bookings').select('user_id').eq('id', id).single();
      if (!booking) return res.status(404).json({ error: 'Not found' });
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      if (booking.user_id !== caller.id && !callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
