require('dotenv').config();
const Database = require('./database');

async function setupDatabase() {
  console.log('🗄️  Initializing database...');
  
  try {
    const database = new Database();
    await database.init();
    
    console.log('✅ Database successfully initialized!');
    console.log('📍 Database path:', database.dbPath);
    
    // Create several test records for demonstration
    console.log('\n📊 Table statistics:');
    
    const users = await database.getAllUsers();
    console.log(`👥 Users: ${users.length}`);
    
    database.close();
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
