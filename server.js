import Fastify from 'fastify';
import mongoose from 'mongoose';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import User from './model/User.js';
import bcrypt from 'bcrypt';
import fastifyCors from '@fastify/cors';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MongoDBURI', 'user', 'host', 'database', 'password', 'port'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const fastify = Fastify({ 
  logger: true,
  // Add serverless configuration for Vercel
  serverFactory: (handler, opts) => {
    return require('http').createServer((req, res) => {
      handler(req, res);
    });
  }
});

// Environment variables
const MongoDBURI = process.env.MongoDBURI;
const users = process.env.user;
const hosts = process.env.host;
const databases = process.env.database;
const passwords = process.env.password;
const ports = process.env.port;

// PostgreSQL connection
const pool = new Pool({
  user: users,
  host: hosts,
  database: databases,
  password: passwords,
  port: ports,
  ssl: { rejectUnauthorized: false }
});

// Async initialization function
async function initializeApp() {
  try {
    // Register CORS
    await fastify.register(fastifyCors, {
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:8080', 'https://your-frontend-domain.vercel.app'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });

    // MongoDB connection
    await mongoose.connect(MongoDBURI);
    fastify.log.info('✅ MongoDB connected successfully');

    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    fastify.log.info('✅ PostgreSQL connected successfully');

    // ✅ ROOT ROUTE - This fixes the "Route GET:/ not found" error
    fastify.get('/', async (request, reply) => {
      return {
        message: 'Call Dashboard API Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          'GET /': 'API information',
          'GET /health': 'Health check',
          'GET /api/data': 'Get call summary data',
          'POST /api/login': 'User authentication',
          'POST /api/users': 'User registration'
        }
      };
    });

    // ✅ HEALTH CHECK ROUTE
    fastify.get('/health', async (request, reply) => {
      try {
        // Test database connections
        await pool.query('SELECT 1');
        await mongoose.connection.db.admin().ping();
        
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          databases: {
            postgresql: 'connected',
            mongodb: 'connected'
          }
        };
      } catch (err) {
        reply.code(503).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: err.message
        });
      }
    });

    // API Routes
    fastify.get('/api/data', async (request, reply) => {
      try {
        const result = await pool.query('SELECT * FROM "call summary"');
        return result.rows;
      } catch (err) {
        fastify.log.error(err);
        reply.code(500).send({ error: 'Failed to fetch data' });
      }
    });

    fastify.post('/api/login', async (request, reply) => {
      const { email, password } = request.body;

      // Input validation
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      try {
        const user = await User.findOne({ email });
        if (!user) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        // Success - don't send password back
        reply.send({ 
          success: true, 
          message: 'User authenticated', 
          user: { 
            email: user.email, 
            firstname: user.firstname 
          } 
        });
      } catch (err) {
        fastify.log.error(err);
        reply.code(500).send({ error: 'Authentication failed' });
      }
    });

    fastify.post('/api/users', async (request, reply) => {
      const { email, password, firstname } = request.body;

      // Input validation
      if (!email || !password || !firstname) {
        return reply.code(400).send({ error: 'Email, password, and firstname are required' });
      }

      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return reply.code(409).send({ error: 'User with this email already exists' });
        }

        const user = new User(request.body);
        const saved = await user.save();
        
        // Don't return password in response
        const userResponse = { ...saved.toObject() };
        delete userResponse.password;
        
        reply.code(201).send(userResponse);
      } catch (err) {
        fastify.log.error(err);
        reply.code(500).send({ error: 'Failed to create user' });
      }
    });

  } catch (err) {
    fastify.log.error('❌ App initialization failed:', err);
    throw err;
  }
}

// Initialize the app
await initializeApp();

// Export for Vercel
export default async function handler(req, res) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
