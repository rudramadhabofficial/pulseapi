import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Trash2, Clock, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const EndpointDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState<any>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/api/endpoints/${id}`);
        setEndpoint(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
    const interval = setInterval(fetchDetails, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this endpoint?')) {
      try {
        await api.delete(`/api/endpoints/${id}`);
        navigate('/');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!endpoint) return <div className="container" style={{ textAlign: 'center', marginTop: '64px' }}>Loading...</div>;

  const chartData = [...(endpoint.healthChecks || [])].reverse().map((hc: any) => ({
    time: new Date(hc.createdAt).toLocaleTimeString(),
    responseTime: hc.responseTimeMs,
    success: hc.success
  }));

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" className="btn btn-secondary" style={{ display: 'inline-flex', marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: '8px' }}>{endpoint.name}</h1>
            <div style={{ color: 'var(--color-text-muted)' }}>
              {endpoint.method} • {endpoint.url}
            </div>
          </div>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--color-primary)" /> Response Time History
          </h3>
          <div style={{ height: '300px', marginTop: '24px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} tickMargin={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: 'var(--border-glass)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="responseTime" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorRt)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', paddingTop: '64px' }}>No data yet</div>
            )}
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="var(--color-warning)" /> Recent Incidents
          </h3>
          <div style={{ marginTop: '24px' }}>
            {endpoint.incidents && endpoint.incidents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {endpoint.incidents.map((inc: any) => (
                  <div key={inc.id} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: 'var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Status: {inc.status}</strong>
                      <span className={`status-tag ${inc.status === 'OPEN' ? 'status-down' : 'status-healthy'}`}>
                        {inc.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <div>Started: {new Date(inc.startedAt).toLocaleString()}</div>
                      {inc.resolvedAt && <div>Resolved: {new Date(inc.resolvedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', paddingTop: '64px' }}>No incidents recorded. API is stable!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
