#!/usr/bin/env node

// Manual script to trigger daily briefing generation
// Run: node scripts/generate-briefings.js

async function generateBriefings() {
  console.log('🚀 Starting manual briefing generation...');
  
  const baseUrl = process.env.BACKEND_URL || 'https://stan-peach.vercel.app';
  
  try {
    const response = await fetch(`${baseUrl}/api/daily-briefings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        force: false // Set to true to regenerate even if already exists
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data);
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Failed to generate briefings:', error);
  }
}

// Run the script
generateBriefings();