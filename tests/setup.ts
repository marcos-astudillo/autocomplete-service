// Global test setup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Silenciar logs en tests

// Mock de variables de entorno para tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_autocomplete';
process.env.REDIS_URL = 'redis://localhost:6379';
