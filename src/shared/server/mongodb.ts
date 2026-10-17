import "server-only";

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not configured");

const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient; mongoPromise?: Promise<MongoClient> };
const client = globalForMongo.mongoClient ?? new MongoClient(uri, { maxPoolSize: 10 });
const promise = globalForMongo.mongoPromise ?? client.connect();
if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClient = client;
  globalForMongo.mongoPromise = promise;
}

export async function getDatabase(): Promise<Db> {
  const connected = await promise;
  return connected.db(process.env.MONGODB_DB || "promptswar");
}
