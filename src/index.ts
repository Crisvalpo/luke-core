import { app } from './app.js';
import { env } from './config/env.js';
import { query } from './config/database.js';

async function bootstrap() {
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 [LUKE CORE] Servidor iniciado y escuchando en el puerto ${env.PORT}`);
    console.log(`🌐 [PANEL ADMIN] Disponible en http://localhost:${env.PORT}/admin`);
    console.log(`📡 [HEALTH] Health check en http://localhost:${env.PORT}/health`);
    console.log(`⚡ [API] Endpoints base en http://localhost:${env.PORT}/api/v1/`);
  });

  // Probar conexión a la base de datos de forma no bloqueante
  query('SELECT NOW() as server_time, current_database() as db_name;')
    .then((dbTest) => {
      console.log(`🔌 [DATABASE] Conectado exitosamente a PostgreSQL: ${dbTest.rows[0].db_name} (${dbTest.rows[0].server_time})`);
    })
    .catch((err) => {
      console.warn(`⚠️ [DATABASE] No se pudo conectar a PostgreSQL (${err.message}).`);
      console.warn(`💡 [TIP] Verifica tu DATABASE_URL en el archivo .env`);
    });

  const shutdown = (signal: string) => {
    console.log(`\n🛑 [SHUTDOWN] Señal ${signal} recibida. Cerrando servidor...`);
    server.close(() => {
      console.log('✅ [SHUTDOWN] Servidor cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
