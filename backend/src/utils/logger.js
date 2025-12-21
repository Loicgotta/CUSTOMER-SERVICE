// Système de logging centralisé avec stack traces complètes

class Logger {
  static log(level, message, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    console.log(`${prefix} ${message}`);

    if (error) {
      console.log('\n--- DÉTAILS DE L\'ERREUR ---');
      console.log('Message:', error.message);
      console.log('Stack trace:');
      console.log(error.stack);

      if (error.response) {
        console.log('\nRéponse HTTP:');
        console.log('Status:', error.response.status);
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      }

      if (error.config) {
        console.log('\nConfiguration de la requête:');
        console.log('URL:', error.config.url);
        console.log('Method:', error.config.method);
        console.log('Headers:', JSON.stringify(error.config.headers, null, 2));
      }

      console.log('--- FIN DÉTAILS ERREUR ---\n');
    }
  }

  static info(message) {
    this.log('info', message);
  }

  static success(message) {
    this.log('success', `✅ ${message}`);
  }

  static warning(message, error = null) {
    this.log('warning', `⚠️ ${message}`, error);
  }

  static error(message, error = null) {
    this.log('error', `❌ ${message}`, error);
  }

  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      this.log('debug', message);
      if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
      }
    }
  }
}

export default Logger;
