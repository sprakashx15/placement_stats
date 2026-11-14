const app = require('../server/index');
const { initDb } = require('../server/db');

let isDbInitialized = false;

module.exports = async (req, res) => {
  if (!isDbInitialized) {
    try {
      await initDb();
      isDbInitialized = true;
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
  return app(req, res);
};
