// Système de logging centralisé avec persistance DB + fallback mémoire

import pool from '../database/db.js';

class Logger {
  // Buffer mémoire (fallback si DB pas encore prête)
  static logs = [];
  static MAX_MEMORY_LOGS = 100;
  static dbReady = false;

  static async initTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          error_details JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.dbReady = true;
    } catch (e) {
      console.error('Logger: impossible de créer la table app_logs', e.message);
    }
  }

  static addToStorage(logEntry) {
    // Toujours garder en mémoire (buffer rapide)
    this.logs.unshift(logEntry);
    if (this.logs.length > this.MAX_MEMORY_LOGS) {
      this.logs.pop();
    }

    // Persister en DB (fire-and-forget, ne bloque pas l'app)
    if (this.dbReady) {
      pool.query(
        `INSERT INTO app_logs (timestamp, level, message, error_details) VALUES ($1, $2, $3, $4)`,
        [logEntry.timestamp, logEntry.level, logEntry.message, logEntry.error || null]
      ).catch(() => {
        // Silencieux : on ne veut pas de boucle infinie si le logger échoue
      });
    }
  }

  static async getLogs(limit = 200) {
    // Essayer de lire depuis la DB
    if (this.dbReady) {
      try {
        const result = await pool.query(
          `SELECT timestamp, level, message, error_details as error FROM app_logs ORDER BY id DESC LIMIT $1`,
          [limit]
        );
        return result.rows;
      } catch (e) {
        // Fallback mémoire
      }
    }
    return this.logs;
  }

  static clearLogs() {
    this.logs = [];
  }

  static log(level, message, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Construire l'entrée de log complète
    let logEntry = {
      timestamp,
      level,
      message,
      fullLog: `${prefix} ${message}`
    };

    console.log(`${prefix} ${message}`);

    if (error) {
      const errorDetails = {
        message: error.message,
        stack: error.stack
      };

      if (error.response) {
        errorDetails.httpResponse = {
          status: error.response.status,
          data: error.response.data
        };
      }

      if (error.config) {
        errorDetails.httpRequest = {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers
        };
      }

      logEntry.error = errorDetails;

      // Afficher dans la console
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

      // Construire le log complet pour l'affichage
      logEntry.fullLog += '\n\n--- DÉTAILS DE L\'ERREUR ---\n';
      logEntry.fullLog += `Message: ${error.message}\n`;
      logEntry.fullLog += `Stack trace:\n${error.stack}\n`;

      if (error.response) {
        logEntry.fullLog += `\nRéponse HTTP:\n`;
        logEntry.fullLog += `Status: ${error.response.status}\n`;
        logEntry.fullLog += `Data: ${JSON.stringify(error.response.data, null, 2)}\n`;
      }

      if (error.config) {
        logEntry.fullLog += `\nConfiguration de la requête:\n`;
        logEntry.fullLog += `URL: ${error.config.url}\n`;
        logEntry.fullLog += `Method: ${error.config.method}\n`;
        logEntry.fullLog += `Headers: ${JSON.stringify(error.config.headers, null, 2)}\n`;
      }

      logEntry.fullLog += '--- FIN DÉTAILS ERREUR ---';
    }

    // Stocker le log
    this.addToStorage(logEntry);
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
