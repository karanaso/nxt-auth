import * as mongoDB from 'mongodb';

let uri;
if (process.env.MONGO_USER) {
  uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_SRV}:${process.env.MONGO_PORT}`; // Replace with your connection URI
} else {
  uri = `mongodb://localhost:27017`; // Replace with your connection URI
}
const client = new mongoDB.MongoClient(uri);
let connections: any = {};

export async function connect({ db }: { db: string }): Promise<mongoDB.Db> {
  return new Promise(async (resolve, reject) => {
    if ((db) && (connections[db])) {
      return resolve(connections[db]);
    }

    try {
      await client.connect();
      // Use the client object to interact with MongoDB here
      const database = client.db(db);
      connections[db] = database;
      console.log('connected');
      resolve(database);

    } catch (error) {
      console.error(error);
      reject(error)
    }
  })
}