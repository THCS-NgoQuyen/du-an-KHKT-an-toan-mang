const db = require('./db.js');

// Delete all submissions
db.db.exec('DELETE FROM survey_submissions;');
try {
  db.db.exec("DELETE FROM sqlite_sequence WHERE name = 'survey_submissions';");
} catch(e) {}

console.log('✅ SQLite Database cleared to 0 rows. Real student data ready.');
console.log('Current stats:', db.getStats());
