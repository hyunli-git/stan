'use client';

import { useState } from 'react';

export default function Home() {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);

  const testBriefing = async () => {
    setLoading(true);
    setBriefing('');
    
    try {
      const response = await fetch('/api/generate-briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stan: {
            id: 'test-1',
            name: 'Tyler, the Creator',
            categories: {
              name: 'Music',
              icon: '🎸',
              color: '#C34A36'
            },
            description: 'Creative visionary pushing boundaries in music and fashion'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBriefing(data.content);
    } catch (error) {
      console.error('Error:', error);
      setBriefing('Error generating briefing: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/stan-logo.png" alt="STAN Logo" className="mx-auto mb-4 h-16 w-auto" />
            <h1 className="text-3xl font-bold text-gray-800">STAN Backend API Test</h1>
          </div>
          
          <div className="text-center mb-6">
            <button
              onClick={testBriefing}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg"
            >
              {loading ? '⏳ Generating...' : '🤖 Generate Tyler, the Creator Briefing'}
            </button>
          </div>

          {briefing && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h2 className="font-semibold mb-2 text-gray-800">📰 Generated Briefing:</h2>
              <div className="whitespace-pre-wrap text-sm text-gray-900 leading-relaxed">{briefing}</div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-800">🔌 API Endpoints:</h2>
          <ul className="text-sm text-gray-600">
            <li>• <code>GET /api/health</code> - Health check</li>
            <li>• <code>POST /api/generate-briefing</code> - Generate AI briefing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}