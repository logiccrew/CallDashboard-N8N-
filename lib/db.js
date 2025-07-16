// lib/db.js
import mongoose from 'mongoose';
import { Pool } from 'pg';

const MONGODB_URI = process.env.MongoDBURI;

if (!MONGODB_URI) {
  throw new Error('Missing MongoDB URI');
}

let cachedMongoose = global.mongoose;

if (!cachedMongoose) {
  cachedMongoose = global.mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cachedMongoose.conn) return cachedMongoose.conn;
  if (!cachedMongoose.promise) {
    cachedMongoose.promise = mongoose.connect(MONGODB_URI).then(mongoose => mongoose);
  }
  cachedMongoose.conn = await cachedMongoose.promise;
  return cachedMongoose.conn;
}

const pgPool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: process.env.port,
  ssl: { rejectUnauthorized: false },
});

export { pgPool };
