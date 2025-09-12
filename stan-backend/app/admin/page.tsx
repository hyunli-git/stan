'use client';

import { useEffect, useState } from 'react';

interface DailyBriefing {
  id: string;
  stan_id: string;
  date: string;
  topics: Array<{
    title: string;
    content: string;
    sources?: string[];
  }>;
  search_sources: string[];
  created_at: string;
  stans?: {
    name: string;
    categories?: {
      name: string;
      icon: string;
    };
  };
}

export default function AdminPage() {
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBriefings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/briefings');
      const data = await response.json();
      setBriefings(data.briefings || []);
    } catch (error) {
      console.error('Error fetching briefings:', error);
      setMessage('Error fetching briefings');
    } finally {
      setLoading(false);
    }
  };

  const generateBriefings = async () => {
    setGenerating(true);
    setMessage('Generating daily briefings...');
    try {
      const response = await fetch('/api/daily-briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await response.json();
      setMessage(data.message || 'Generation complete!');
      await fetchBriefings();
    } catch (error) {
      console.error('Error generating briefings:', error);
      setMessage('Error generating briefings');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchBriefings();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>📰 Daily Briefings Admin Dashboard</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <button 
          onClick={generateBriefings}
          disabled={generating}
          style={{
            padding: '10px 20px',
            background: generating ? '#ccc' : '#000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: generating ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {generating ? 'Generating...' : '🚀 Generate Daily Briefings Now'}
        </button>
        
        <button 
          onClick={fetchBriefings}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
        
        {message && (
          <div style={{ marginTop: '10px', color: '#666' }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '10px', color: '#666' }}>
        Total Briefings: {briefings.length} | 
        Today: {new Date().toLocaleDateString()}
      </div>

      {loading ? (
        <div>Loading briefings...</div>
      ) : briefings.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3>No briefings generated yet</h3>
          <p>Click &quot;Generate Daily Briefings Now&quot; to create today&apos;s briefings</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {briefings.map((briefing) => (
            <div 
              key={briefing.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '15px',
                background: 'white'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>
                  {briefing.stans?.categories?.icon} {briefing.stans?.name || 'Unknown Stan'}
                </h3>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Date: {briefing.date} | 
                  Created: {new Date(briefing.created_at).toLocaleTimeString()}
                </div>
              </div>
              
              {briefing.topics.map((topic, index) => (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                    {topic.title}
                  </h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                    {topic.content}
                  </p>
                  {topic.sources && topic.sources.length > 0 && (
                    <div style={{ fontSize: '12px' }}>
                      Sources: {topic.sources.map((source, i) => (
                        <a 
                          key={i} 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ marginRight: '10px', color: '#0066cc' }}
                        >
                          [Link {i + 1}]
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {briefing.search_sources && briefing.search_sources.length > 0 && (
                <div style={{ 
                  marginTop: '10px', 
                  paddingTop: '10px', 
                  borderTop: '1px solid #e0e0e0',
                  fontSize: '12px',
                  color: '#999'
                }}>
                  All sources: {briefing.search_sources.length} links found
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}