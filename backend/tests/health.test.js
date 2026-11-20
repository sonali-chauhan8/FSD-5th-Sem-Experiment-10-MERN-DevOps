const request = require('supertest');
const app = require('../app');

describe('=== Backend Health & Monitoring Endpoints (Experiment 10) ===', () => {
  describe('GET /api/health', () => {
    it('should return 200 and healthy server monitoring payload', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('system');
      expect(res.body.system).toHaveProperty('memoryUsage');
      expect(res.body.system.memoryUsage).toHaveProperty('heapUsedMB');
    });
  });

  describe('GET / (Root API Discovery)', () => {
    it('should return 200 and available REST API endpoints list', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body.endpoints.health).toBe('GET /api/health');
      expect(res.body.endpoints.students).toBe('GET /api/students');
    });
  });

  describe('GET /api/undefined-endpoint (404 Handling)', () => {
    it('should return standardized 404 JSON for unknown routes', async () => {
      const res = await request(app).get('/api/undefined-endpoint');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Resource not found/i);
    });
  });
});
