import { connectMongo } from '../lib/db';
import User from '../model/User.js';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'POST') {
    try {
      const user = new User(req.body);
      const saved = await user.save();
      return res.status(201).json(saved);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(405).end();
  }
}
