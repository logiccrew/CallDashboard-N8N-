import Fastify from 'fastify';
import mongoose from 'mongoose';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import User from './model/User.js';
import bcrypt from 'bcrypt';

dotenv.config();
const fastify = Fastify({ logger: true });


// await fastify.register(fastifyCors, {
//   origin: 'http://localhost:8080',  // frontend origin
//   credentials: true
// });


const MongoDBURI=process.env.MongoDBURI

const users = process.env.user;
const hosts = process.env.host;
const databases = process.env.database;
const passwords = process.env.password;
const ports = process.env.port;



mongoose.connect(MongoDBURI).then(() => {
  fastify.log.info('MongoDB connected');
}).catch(err => {
  fastify.log.error(err);
});


const pool = new Pool({
  user: users,
  host: hosts,
  database: databases,
  password: passwords,
  port: ports ,
  ssl: { rejectUnauthorized: false }
});


fastify.get('/api/data', async (request, reply) => {
  try {
    const result = await pool.query('SELECT * FROM "call summary"');
    console.log(result)
    return result.rows;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: err.message });
  }
});




fastify.post('/api/login', async (request, reply) => {
  const { email, password } = request.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Success
    reply.send({ success: true, message: 'User authenticated', user: { email: user.email, firstname: user.firstname } });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});


fastify.post('/api/users', async (request, reply) => {
  try {
    const user = new User(request.body);
    const saved = await user.save();
    reply.code(201).send(saved);
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: err.message });
  }
});


// ✅ Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 5000 });
    fastify.log.info(`🚀 Server running at http://localhost:5000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();