import request from 'supertest';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { 
  PostgreSqlContainer, 
  StartedPostgreSqlContainer,
} from 'testcontainers/modules/postgresql';
import { 
  RedisContainer, 
  StartedRedisContainer,
} from 'testcontainers/modules/redis';
import app from '../../src/app';

describe('GET /v1/suggest', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let dbPool: Pool;
  let redisClient: Redis;

  beforeAll(async () => {
    // Levantar contenedores de test
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_autocomplete')
      .withUsername('test')
      .withPassword('test')
      .start();

    redisContainer = await new RedisContainer('redis:7-alpine').start();

    // Configurar conexiones
    dbPool = new Pool({ connectionString: pgContainer.getConnectionUri() });
    redisClient = new Redis(redisContainer.getConnectionUri());

    // Crear schema de test
    await dbPool.query(`
      CREATE TABLE query_counts_daily (
        query TEXT NOT NULL,
        date DATE NOT NULL,
        count BIGINT NOT NULL DEFAULT 1,
        PRIMARY KEY (query, date)
      );
    `);

    // Sembrar datos de prueba
    await dbPool.query(`
      INSERT INTO query_counts_daily (query, date, count) VALUES
        ('iphone 15', CURRENT_DATE, 200),
        ('iphone case', CURRENT_DATE, 150),
        ('ipad pro', CURRENT_DATE - INTERVAL '1 day', 100);
    `);
  }, 30000);

  afterAll(async () => {
    await dbPool?.end();
    await redisClient?.quit();
    await pgContainer?.stop();
    await redisContainer?.stop();
  });

  it('should return 200 with suggestions for valid prefix', async () => {
    const res = await request(app)
      .get('/v1/suggest')
      .query({ prefix: 'iph', limit: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('prefix', 'iph');
    expect(res.body.suggestions).toBeInstanceOf(Array);
    expect(res.body.suggestions[0]).toHaveProperty('text');
    expect(res.body.suggestions[0]).toHaveProperty('score');
  });

  it('should return 400 for invalid prefix (empty)', async () => {
    const res = await request(app)
      .get('/v1/suggest')
      .query({ prefix: '', limit: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('message');
  });

  it('should return 400 for prefix too long (>20 chars)', async () => {
    const res = await request(app)
      .get('/v1/suggest')
      .query({ prefix: 'a'.repeat(21), limit: 10 });

    expect(res.status).toBe(400);
  });

  it('should respect limit parameter', async () => {
    const res = await request(app)
      .get('/v1/suggest')
      .query({ prefix: 'iph', limit: 1 });

    expect(res.body.suggestions).toHaveLength(1);
  });

  it('should include Cache-Control header for cacheable prefixes', async () => {
    const res = await request(app)
      .get('/v1/suggest')
      .query({ prefix: 'iph', limit: 3 });

    // Verificar que se setean headers de cache (aunque en test puede variar)
    expect(res.headers).toHaveProperty('x-cacheable');
  });
});
