import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'], // p95 latency < 50ms (SLO del diseño)
    http_req_failed: ['rate<0.01'],  // <1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const prefixes = ['iph', 'sam', 'pix', 'mac', 'a', 'i'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  
  const res = http.get(`${BASE_URL}/v1/suggest`, {
    query: { prefix, limit: 10 },
    headers: { 'Accept': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has suggestions': (r) => {
      const body = r.json();
      return body.suggestions && Array.isArray(body.suggestions);
    },
    'response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.1); // 10 requests/second per user
}
