'use client';

import React from 'react';

export default function Home() {
  React.useEffect(() => {
    // Redirect to the static mobile app
    window.location.href = '/index.html';
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ 
        width: '50px', 
        height: '50px', 
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite'
      }}></div>
      <h2>Loading STAN...</h2>
      <p>Redirecting to mobile app...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}