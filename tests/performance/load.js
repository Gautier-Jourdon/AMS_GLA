
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Test de santé du Endpoint
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'status was 200': (r) => r.status == 200 });

    // Test d'asset pour pouvoir Fetch
    const assetsRes = http.get(`${BASE_URL}/api/assets`);
    check(assetsRes, { 'assets loaded': (r) => r.status === 200 });

    sleep(1);
}
