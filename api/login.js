import { connectMongo } from '../lib/db';
import User from '../model/User.js';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ success: true, message: 'User authenticated', user: { email: user.email, firstname: user.firstname } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
