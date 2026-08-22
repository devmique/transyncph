import { MongoClient, Db } from 'mongodb';
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]);
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db('transync_ph');
  //  ensure indexes once on first connection.
  //  Every dashboard query filters by operatorId, so without these each one is
  //  a full collection scan.
  await Promise.all([
    db.collection('operators').createIndex({ email: 1 }, { unique: true }),
    db.collection('routes').createIndex({ operatorId: 1 }),
    db.collection('terminals').createIndex({ operatorId: 1 }),
    db.collection('schedules').createIndex({ operatorId: 1 }),
    db.collection('schedules').createIndex({ routeId: 1 }),
    db.collection('announcements').createIndex({ operatorId: 1, createdAt: -1 }),
  ]);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}
