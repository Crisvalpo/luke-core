import { app } from './app.js';
import { env } from './config/env.js';
import { query } from './config/database.js';

async function bootstrap() {
  try {
    // Probar conexión a la base de datos
    const dbTest = await query('SELECT NOW() as server_time, current_database() as db_name;');
    console.log(`🔌 [DATABASE] Conectado exitosamente a PostgreSQL: ${dbTest.rows[0].db_name} (${dbTest.rows[0].server_time})`);

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 [LUKE CORE] Servidor iniciado y escuchando en el puerto ${env.PORT}`);
      console.log(`📡 [HEALTH] Health check disponible en http://localhost:${env.PORT}/health`);
      console.log(`⚡ [API] Endpoints base en http://localhost:${env.PORT}/api/v1/`);
    });

    const shutdown = (signal: string) => {
      console.log(`\n🛑 [SHUTDOWN] Señal ${signal} recibida. Cerrando servidor de forma segura...`);
      server.close(() => {
        console.log('✅ [SHUTDOWN] Servidor cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ [FATAL] Error al inicializar Luke Core:', error);
    process.exit(1);
  }
}

bootstrap();
