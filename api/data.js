import { connectMongo, pgPool } from '../lib/db';

export default async function handler(req, res) {
  await connectMongo(); // ensure MongoDB connected if needed

  try {
    const result = await pgPool.query('SELECT * FROM "call summary"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
