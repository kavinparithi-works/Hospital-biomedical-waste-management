// Dev helper: boots a throwaway in-memory MongoDB, then starts the API against it.
// Data is lost when the process exits. Use a real MongoDB (see README) for persistence.
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const { start } = require('./server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('biowaste_db');
  console.log('In-memory MongoDB started (data will NOT persist across restarts)');
  await start(uri);
  const shutdown = async () => { await mongod.stop(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
