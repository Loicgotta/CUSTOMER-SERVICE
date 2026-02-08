import { useState, useEffect } from 'react';
import axios from 'axios';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('all'); // all, error, warning, success, info

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/logs');
      setLogs(response.data.logs || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error);
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir effacer tous les logs ?')) {
      return;
    }

    try {
      await axios.delete('/api/logs');
      setLogs([]);
    } catch (error) {
      console.error('Erreur lors de l\'effacement des logs:', error);
      alert('Erreur lors de l\'effacement des logs');
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Rafraîchir toutes les 2 secondes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.level === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📝 Logs du Système</h1>
              <p className="text-gray-600 mt-1">
                Surveillance en temps réel de toutes les opérations
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  autoRefresh
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                🔃 Rafraîchir
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                🗑️ Effacer les logs
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ Erreurs ({logs.filter(l => l.level === 'error').length})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'warning'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚠️ Warnings ({logs.filter(l => l.level === 'warning').length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Succès ({logs.filter(l => l.level === 'success').length})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ℹ️ Info ({logs.filter(l => l.level === 'info').length})
            </button>
          </div>
        </div>

        {/* Logs */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Chargement des logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun log à afficher</h3>
            <p className="text-gray-500">
              {filter !== 'all'
                ? `Aucun log de type "${filter}" trouvé.`
                : 'Effectuez des opérations pour voir les logs apparaître.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getLogColor(log.level)} transition hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <span className={`inline-block w-3 h-3 rounded-full mt-1.5 ${getLevelBadgeColor(log.level)}`}></span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-mono text-gray-500">
                          {new Date(log.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                        <span className={`ml-3 px-2 py-1 rounded text-xs font-semibold ${getLevelBadgeColor(log.level)} text-white`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono text-sm whitespace-pre-wrap break-words">
                      {log.fullLog}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Logs;
