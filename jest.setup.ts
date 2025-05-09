// Add Node fetch polyfill
import 'openai/shims/node';

// Mock the process.env
process.env.EXA_API_KEY = 'test-key';
process.env.PERPLEXITY_API_KEY = 'test-key';

// Add global File class for tests
if (typeof File === 'undefined') {
  global.File = class File {
    name: string;
    size: number;
    type: string;
    
    constructor(bits: any[], name: string, options: any = {}) {
      this.name = name;
      this.size = 0;
      this.type = options.type || '';
    }
    
    async arrayBuffer() {
      return new ArrayBuffer(0);
    }
  } as any;
} 