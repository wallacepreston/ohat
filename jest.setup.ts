// Add Node fetch polyfill
import 'openai/shims/node';

// Mock the process.env
process.env.EXA_API_KEY = 'test-key';
process.env.PERPLEXITY_API_KEY = 'test-key'; 