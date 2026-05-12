## Request flow: GET /v1/suggest

```mermaid
sequenceDiagram 
participant C as Client 
participant A as API Gateway 
participant R as Redis Cache 
participant T as Trie Index 
participant P as PostgreSQL 
participant More Metrics 

C->>A: GET /v1/suggest?prefix=iph 
A->>R: GET autocomplete:suggest:iph 
alt Cache HIT 
R-->>A: Return cached suggestions 
A-->>C: 200 + suggestions (p95 <10ms) 
else Cache MISS 
R-->>A: MISS 
A->>T: search(prefix="iph", limit=10) 
alt Trie HIT 
T-->>A: Return ranked suggestions 
A->>A: SETEX autocomplete:suggest:iph 300s+jitter 
A-->>C: 200 + suggestions (p95 <30ms) 
else Trie MISS / Cold Start 
T-->>A: Empty or partial 
A->>P: SELECT ... WHERE query ILIKE 'iph%' 
P-->>A: Return popularity records 
A->>T: bulkInsert(entries) [async] 
A->>A: SETEX autocomplete:suggest:iph 60s [hot prefix] 
A-->>C: 200 + suggestions (p95 <50ms) 
end 
end 
A->>M: increment(cache_hit|miss, latency_ms) 
A->>P: INSERT ... ON CONFLICT UPDATE [async tracking]


Latency Notes
| Scenario | p95 Latency | Expected Frequency |
| HIT Cache | <10ms | >90% for hot prefixes |
| Trie HIT | <30ms | ~8% for cold prefixes |
| DB Fallback | <50ms | <2% (cold start / rebuild) |
```