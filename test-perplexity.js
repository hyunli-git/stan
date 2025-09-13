// Quick test to see the exact Perplexity API error
const fetch = require('node-fetch');

async function testPerplexity() {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: 'Hello, test message' }],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response body:', text);

  } catch (error) {
    console.error('Error:', error);
  }
}

testPerplexity();