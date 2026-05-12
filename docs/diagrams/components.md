## Arquitectura de Componentes

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Web/Mobile App]
    end

    subgraph Edge["Edge Layer"]
        CDN[CDN/Edge Cache]
        LB[Load Balancer]
    end

    subgraph App["Application Layer"]
        API[Autocomplete API<br/>Express + Zod]
        Coalesce[Request Coalescer]
        RateLimit[Adaptive Rate Limiter]
        CacheSvc[Cache Service<br/>Redis + TTL/Jitter]
        IndexSvc[Index Service<br/>In-Memory Trie]
        RankSvc[Ranking Service<br/>Exponential Decay]
        Metrics[Prometheus Metrics]
    end

    subgraph Data["Data Layer"]
        Redis[(Redis<br/>Prefix Cache)]
        Postgres[(PostgreSQL<br/>query_counts_daily)]
    end

    subgraph Background["Background Jobs"]
        Agg[Aggregation Job<br/>Cron/Streaming]
        Rebuild[Index Rebuild Worker]
    end

    Browser -->|GET /v1/suggest| CDN
    CDN -->|Cache Hit| Browser
    CDN -->|Cache Miss| LB
    LB --> API
    
    API --> Coalesce
    Coalesce --> RateLimit
    RateLimit --> CacheSvc
    
    CacheSvc -->|HIT| API
    CacheSvc -->|MISS| IndexSvc
    
    IndexSvc -->|Fallback| Postgres
    Postgres --> RankSvc
    RankSvc --> IndexSvc
    
    API -->|Async Track| Postgres
    API -->|Metrics| Metrics
    
    Agg -->|Daily Rebuild| Postgres
    Postgres -->|Score Update| RankSvc
    Rebuild -->|Atomic Swap| IndexSvc

    style API fill:#4CAF50,stroke:#333,color:white
    style CacheSvc fill:#2196F3,stroke:#333,color:white
    style IndexSvc fill:#FF9800,stroke:#333,color:white
    style Postgres fill:#9C27B0,stroke:#333,color:white
    style Redis fill:#F44336,stroke:#333,color:white
```

### Key Decisions

1. **Cache-aside**: Redis serves as the first line of defense for "hot" prefixes.
2. **In-memory Trie**: O(k) lookup with no DB queries for the majority of requests.
3. **Atomic Rebuild**: New index is built in the background and swapped in without downtime.
4. **Adaptive Rate Limiting**: Stricter limits for Zipf-distributed prefixes.
5. **Request Coalescing**: Prevents the "thundering herd" problem for ultra-hot prefixes.
