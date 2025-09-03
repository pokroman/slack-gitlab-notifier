require('dotenv').config();
const Database = require('./database');

async function setupDatabase() {
  console.log('🗄️  Инициализация базы данных...');
  
  try {
    const database = new Database();
    await database.init();
    
    console.log('✅ База данных успешно инициализирована!');
    console.log('📍 Путь к базе данных:', database.dbPath);
    
    // Создаем несколько тестовых записей для демонстрации
    console.log('\n📊 Статистика таблиц:');
    
    const users = await database.getAllUsers();
    console.log(`👥 Пользователи: ${users.length}`);
    
    database.close();
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации базы данных:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
