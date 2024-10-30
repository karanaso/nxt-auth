import { createClient } from "redis";

var client: any = null;
const connect = async () => {
  if (client) {
    return client;
  }

  client =  await createClient({
    url: process.env.REDIS_URL,
  })
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

  return client;
}

export const redisTotalConnections = async () => {
  try {
    const client = await connect();
    const info = await client.info('clients');
    const connectedClients = info.match(/connected_clients:(\d+)/);
    return connectedClients ? parseInt(connectedClients[1]) : 0;
  } catch (error) {
    console.error('Redis Total Connections Error:', error);
    return 0;
  }
};

export const redisHealth = async () => {
  try {
    const client = await connect();
    const ping = await client.ping();
    return ping === 'PONG';
  } catch (error) {
    console.error('Redis Health Check Error:', error);
    return false;
  }
};

export const redisSet = async (k: string, v: string) => {
  const client = await connect();
  return client.set(k,v);
};

export const redisGet = async (k: string) => {
  const client = await connect();
  return client.get(k);
};



