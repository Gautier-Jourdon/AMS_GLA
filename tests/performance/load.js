
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // Ramp up to 20 users
        { duration: '1m', target: 20 },  // Stay at 20 users
        { duration: '30s', target: 0 },  // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    },
};

const BASE_URL = 'http://localhost:3000'; // Adjust if running in Docker/K8s

export default function () {
    // Test Health Endpoint
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'status was 200': (r) => r.status == 200 });

    // Test Asset Fetch
    const assetsRes = http.get(`${BASE_URL}/api/assets`);
    check(assetsRes, { 'assets loaded': (r) => r.status === 200 });

    sleep(1);
}
