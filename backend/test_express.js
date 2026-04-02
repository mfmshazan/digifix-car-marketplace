import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const app = express();
const PORT = 3002;

// Minimal middleware
app.use(express.json());

// Simple test route
app.get('/health', (req, res) => {
  console.log('Health endpoint hit!');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server running on port ${PORT}`);
  
  // Self-test after 1 second
  setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`);
      const data = await response.json();
      console.log('Self-test result:', JSON.stringify(data));
    } catch (e) {
      console.error('Self-test failed:', e.message);
    }
  }, 1000);
});

server.on('error', (e) => {
  console.error('Server error:', e);
});
