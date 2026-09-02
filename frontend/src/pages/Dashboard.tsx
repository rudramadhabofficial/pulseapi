import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Plus, Activity, LogOut, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const { logout } = useAuth();
  
  // New endpoint form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');

  const fetchEndpoints = async () => {
    try {
      const { data } = await api.get('/api/endpoints');
      setEndpoints(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAddEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/endpoints', { name, url, method });
      setShowAdd(false);
      setName('');
      setUrl('');
      fetchEndpoints();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'HEALTHY') return <CheckCircle size={20} color="var(--color-success)" />;
    if (status === 'DEGRADED') return <AlertTriangle size={20} color="var(--color-warning)" />;
    return <XCircle size={20} color="var(--color-danger)" />;
  };

  return (
    <div className="container animate-fade-in">
      <nav className="navbar" style={{ borderRadius: '16px', marginBottom: '32px' }}>
        <div className="navbar-brand">
          <Activity size={24} color="var(--color-primary)" />
          PulseAPI
        </div>
        <button onClick={logout} className="btn btn-secondary">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Your Endpoints</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> Add Endpoint
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel" style={{ marginBottom: '32px' }}>
          <h3>Add New Endpoint</h3>
          <form onSubmit={handleAddEndpoint} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr 100px auto', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="My API" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>URL</label>
              <input type="url" className="input" value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://api.example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Method</label>
              <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '45px' }}>Save</button>
          </form>
        </div>
      )}

      {endpoints.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Activity size={48} color="var(--color-text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--color-text-muted)' }}>No endpoints yet</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Add your first API endpoint to start monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {endpoints.map(ep => (
            <Link to={`/endpoint/${ep.id}`} key={ep.id} style={{ display: 'block' }}>
              <div className="glass-panel" style={{ transition: 'transform 0.2s', cursor: 'pointer' }} 
                   onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>{ep.name}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{ep.method} • {ep.url}</div>
                  </div>
                  <div className={`status-tag status-${ep.status.toLowerCase()}`}>
                    {getStatusIcon(ep.status)}
                    <span style={{ marginLeft: '6px' }}>{ep.status}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
