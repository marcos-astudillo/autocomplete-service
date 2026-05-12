# Autocomplete Service ⚡

[![Tests](https://github.com/marcos-astudillo/autocomplete-service/actions/workflows/ci.yml/badge.svg)](https://github.com/marcos-astudillo/autocomplete-service/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-red?logo=redis)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)](https://www.postgresql.org/)

> Production-ready **Search Autocomplete** backend implementing the architecture from [system-design-notes](https://github.com/marcos-astudillo/system-design-notes/blob/main/designs/search-autocomplete.md).

**SLOs**: p95 latency < 50ms | >90% cache hit rate for hot prefixes | 20k QPS peak support

This project demonstrates scalable backend patterns: cache-aside strategy, in-memory Trie indexing, exponential decay ranking, adaptive rate limiting, and graceful degradation. Built as a portfolio piece for senior backend engineering roles.

---

## 🏗️ Architecture

```mermaid
flowchart LR
  Client[Client] --> API[Autocomplete API]
  API --> Cache[(Redis Cache)]
  API --> Trie[Trie Index<br/>In-Memory]
  API --> DB[(PostgreSQL<br/>Popularity Store)]
  DB --> Agg[Aggregation Job]
  Agg -->|Rebuild| Trie
  
  subgraph "Request Flow"
    Client -->|GET /v1/suggest| API
    API -->|1. Cache Lookup| Cache
    Cache -->|MISS| API
    API -->|2. Trie Search| Trie
    Trie -->|3. Fallback| DB
    API -->|4. Return + Cache SET| Client
  end
  
  subgraph "Background"
    Agg -->|Daily| DB
    DB -->|Score Decay| Ranking[Ranking Service]
  end

```
| Service | Responsability | Tech | SLO |
|---------|----------------|------|-----|
| `API Gateway` | Validación, rate limiting, response shaping | Express + Zod | <10ms overhead |
| `Cache Service` | Cache-aside con TTL + jitter | ioredis | >90% hit rate |
| `Index Service` | In-memory trie with atomic rebuild| Custom TS | O(k) lookup |
|`Ranking Service`| Exponential decay: score = count × e^(-λ×days) | Pure functions | <5ms compute |
|`Popularity Repo`| Daily count + UPSERT | PostgreSQL + pg | Atomic increments |


---

## 📡 API Reference

### `GET /v1/suggest`

Returns top-K query suggestions for a given prefix, ranked by time-decayed popularity.

#### Query Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `prefix` | string | ✅ | Search prefix | 1–20 chars, trimmed |
| `limit` | number | ❌ | Max suggestions to return | 1–50, default: 10 |
| `locale` | string | ❌ | Language/region filter | ISO 639-1, optional |

#### Success Response (200)

```json
{
  "prefix": "iph",
  "suggestions": [
    { "text": "iphone 15", "score": 0.98 },
    { "text": "iphone case", "score": 0.85 },
    { "text": "iphone charger", "score": 0.72 }
  ]
}
```

## Error Responses

| Code | Meaning | When |
|------|---------|------|
| 400 | Invalid input | prefix empty, >20 chars, or limit out of range |
| 429 | Rate limited | Exceeded adaptive limits (hot: 20/10s, cold: 100/60s) |
| 500 | Internal error | DB/Redis unavailable, unhandled exception |

### Caching Behavior

- Responses include Cache-Control headers for CDN edge caching on stable prefixes
- Hot prefixes (a, e, i, o, u) use short TTL (60s) + jitter to prevent stampede
- Cache key: autocomplete:suggest:{prefix}:{locale?}

### `GET /metrics`
Prometheus-format metrics for observability.
    # HELP autocomplete_cache_hit_rate Cache hit rate percentage
    # TYPE autocomplete_cache_hit_rate gauge
    autocomplete_cache_hit_rate 94.20

    # HELP autocomplete_index_nodes Number of nodes in suggestion trie
    # TYPE autocomplete_index_nodes gauge
    autocomplete_index_nodes 142

### `GET /health`
Service health check with dependency status.

```json
{
  "status": "ok",
  "timestamp": "2026-05-12T17:24:30.503Z",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

## 🛠️ Tech Stack

| Layer | Tecnology |
|------|-----------|
| Runtime | Node.js 20.x |
| Lenguaje | TypeScript (strict mode) |
| Framework | Express.js |
| Base de Datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Testing | Jest + ts-jest |
| Infra | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 📂 Proyect Structure
```
autocomplete-service/
├── src/
│   ├── controllers/      # HTTP Handlers
│   ├── services/         # Business Logic (cache, index, ranking)
│   ├── repositories/     # Data Access (PostgreSQL)
│   ├── models/           # Interfaces and Zod Validation
│   ├── routes/           # Express Routers
│   ├── middlewares/      # Rate Limiting, Coalescing, Error Handling
│   ├── config/           # Environment Variables, DB Pool
│   ├── utils/            # Logger, Trie Implementation
│   └── app.ts            # Entry Point
├── tests/
│   ├── unit/             # Tests for Trie and RankingService
│   └── integration/      # Tests using Real Containers
├── docker/
│   ├── Dockerfile        # Multi-stage Production Image
│   └── Dockerfile.dev    # Development Image with Hot-reload
├── scripts/
│   ── init.sql          # DB Schema Migration
├── .github/workflows/    # CI Pipeline
├── docker-compose.yml    # Local Orchestration
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Local Development

1. Cloning and Dependencies
```bash
git clone https://github.com/marcos-astudillo/autocomplete-service.git
cd autocomplete-service
npm install
```
2. Environment Variables
Create a .env file based on .env.example:
```env 
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autocomplete
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
CACHE_JITTER_MS=5000
```
3. Build infrastructure
```bash
docker compose up -d postgres redis
```

4. Initialize database
```bash
docker exec -i autocomplete-service-postgres-1 psql -U postgres -d autocomplete < scripts/init.sql
```

5. Running in development mode
```bash
npm run dev
```

Note: The service will be available at `http://localhost:3000`.

## 🐳 Docker
Bring up the entire stack
```bash
npm run docker:compose
# or
docker compose up --build
```

### Useful Commands
| Command | Description |
|---------|-------------|
| npm run docker:compose:down | Stop and clean up volumes |
| npm run docker:build | Build production image |
| npm run docker:run | Run production image locally |

## 🧪 Testing

| Command | Description |
|---------|-------------|
| npm run test | Run unit tests |
| npm run test:coverage | Tests with coverage report |
| npm run test:watch | Watch mode |

## CI Pipeline
GitHub Actions runs automatically on every push/PR:
- Dependency installation
- Type checking with TypeScript
- Linting with ESLint
- Unit tests with Jest
- Coverage reporting

---

## Scalability Considerations
This project implements production-oriented patterns:
- Cache-aside: Reduces pressure on PostgreSQL for frequent prefixes
- In-memory Trie: O(k) lookup for prefix searches without heavy queries
- Atomic Rebuild: A new version of the index is built in the background and swapped in without downtime
- Adaptive Rate Limiting: Stricter limits for Zipf-distributed prefixes (a, i, el, etc.)
- Request Coalescing: Prevents the "thundering herd" problem for ultra-hot prefixes
- Graceful Shutdown: Clean termination of DB/Redis connections upon receiving SIGTERM
- Feature Flags: Configurable behavior without redeployments


---

### API Documentation

Interactive API documentation is available via Swagger UI:

[![Swagger UI](https://img.shields.io/badge/Swagger-UI-85EA2D?style=for-the-badge&logo=swagger)](http://localhost:3000/api-docs)
[![OpenAPI JSON](https://img.shields.io/badge/OpenAPI-JSON-blue?style=for-the-badge&logo=openapiinitiative)](http://localhost:3000/openapi.json)

**Endpoints documented:**
- `GET /v1/suggest` - Get query suggestions
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

---

## License

This project is licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.

---

## 📫 Connect With Me

<p align="center">

  <a href="https://www.marcosastudillo.com">
    <img src="https://img.shields.io/badge/Website-marcosastudillo.com-blueviolet?style=for-the-badge&logo=google-chrome" />
  </a>

  <a href="https://www.linkedin.com/in/marcos-astudillo-c/">
    <img src="https://img.shields.io/badge/LinkedIn-Marcos%20Astudillo-blue?style=for-the-badge&logo=linkedin" />
  </a>

  <a href="https://github.com/marcos-astudillo">
    <img src="https://img.shields.io/badge/GitHub-Marcos%20Astudillo-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>

  <a href="mailto:m.astudillo1986@gmail.com">
    <img src="https://img.shields.io/badge/Email-m.astudillo1986%40gmail.com-red?style=for-the-badge&logo=gmail" />
  </a>

</p>
