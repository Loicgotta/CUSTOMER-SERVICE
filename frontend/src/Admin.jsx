import { useState, useEffect } from 'react';
import axios from 'axios';

function Admin({ onBack }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          axios.get('/api/admin/users'),
          axios.get('/api/admin/stats')
        ]);
        setUsers(usersRes.data.users);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Erreur chargement admin:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const truncatePrompt = (prompt, maxLength = 100) => {
    if (!prompt) return '—';
    return prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>🛡️ Interface Administrateur</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#666' }}>Vue globale de tous les utilisateurs et agents</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Retour au Dashboard
        </button>
      </div>

      {/* Statistiques globales */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Utilisateurs', value: stats.users, icon: '👤' },
            { label: 'Agents', value: stats.agents, icon: '🤖' },
            { label: 'Conversations', value: stats.conversations, icon: '💬' },
            { label: 'Documents indexés', value: stats.embeddings, icon: '📚' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>{stat.value}</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0 }}>👥 Utilisateurs ({users.filter(u => !u.is_admin).length})</h3>
        </div>

        {users.filter(u => !u.is_admin).length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>Aucun utilisateur inscrit pour le moment</p>
          </div>
        ) : (
          users.filter(u => !u.is_admin).map(user => (
            <div key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>

              {/* Ligne utilisateur */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  background: expandedUser === user.id ? '#f7f7ff' : 'white'
                }}
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: '700', fontSize: '1.1rem'
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#2d3748' }}>{user.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#667eea', fontSize: '1.2rem' }}>{user.agent_count}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>agent{user.agent_count > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Inscrit le</div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>{formatDate(user.created_at)}</div>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#667eea' }}>
                    {expandedUser === user.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Agents de l'utilisateur */}
              {expandedUser === user.id && (
                <div style={{ padding: '0 1.5rem 1.5rem', background: '#f7f7ff' }}>
                  {user.agents.length === 0 ? (
                    <p style={{ color: '#888', fontStyle: 'italic', padding: '1rem 0' }}>Aucun agent créé</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {user.agents.map(agent => (
                        <div key={agent.id} style={{
                          background: 'white',
                          borderRadius: '8px',
                          padding: '1rem 1.25rem',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <span style={{
                              display: 'inline-block',
                              width: '14px', height: '14px',
                              borderRadius: '50%',
                              background: agent.widget_color || '#667eea',
                              flexShrink: 0
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '0.25rem' }}>
                                Agent #{agent.id}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#888', fontWeight: '400' }}>
                                  {agent.email}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {truncatePrompt(agent.prompt)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0, textAlign: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: '#667eea' }}>{agent.conversation_count}</div>
                              <div style={{ fontSize: '0.72rem', color: '#888' }}>conversations</div>
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: '#48bb78' }}>{agent.embedding_count}</div>
                              <div style={{ fontSize: '0.72rem', color: '#888' }}>chunks doc.</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.78rem', color: '#888' }}>{formatDate(agent.created_at)}</div>
                              <div style={{ fontSize: '0.72rem', color: '#aaa' }}>créé le</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Admin;
