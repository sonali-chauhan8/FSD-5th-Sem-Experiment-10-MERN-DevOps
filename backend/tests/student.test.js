const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Student = require('../models/Student');
const { connectDB, disconnectDB } = require('../config/db');

// Strictly isolated test database URI
const ISOLATED_TEST_DB_URI =
  process.env.TEST_MONGODB_URI ||
  'mongodb://127.0.0.1:27017/student_mgmt_exp10_isolated_test';

let createdStudentId = null;

const sampleStudent = {
  name: 'Karan Malhotra',
  enrollmentNumber: '0101CS221555',
  email: 'karan.malhotra@college.edu',
  branch: 'Computer Science & Engineering',
  semester: 5,
  mobileNumber: '9876543210',
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB(ISOLATED_TEST_DB_URI);
  await Student.deleteMany({});
});

afterAll(async () => {
  await Student.deleteMany({});
  await disconnectDB();
});

describe('=== Backend Student CRUD API Test Suite (Experiment 10) ===', () => {
  // POST /api/students
  describe('POST /api/students', () => {
    it('should create a new student record (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/students')
        .send(sampleStudent);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe(sampleStudent.name);
      expect(res.body.data.enrollmentNumber).toBe(sampleStudent.enrollmentNumber);

      createdStudentId = res.body.data._id;
    });

    it('should reject creation when required fields are missing (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ name: 'Incomplete Entry' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should prevent duplicate enrollment numbers (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/students')
        .send(sampleStudent);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // GET /api/students
  describe('GET /api/students', () => {
    it('should retrieve list of all students (HTTP 200)', async () => {
      const res = await request(app).get('/api/students');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('should filter students by search term', async () => {
      const res = await request(app).get('/api/students?search=Karan');

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Karan Malhotra');
    });
  });

  // GET /api/students/stats
  describe('GET /api/students/stats', () => {
    it('should return aggregated dashboard statistics (HTTP 200)', async () => {
      const res = await request(app).get('/api/students/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalStudents');
      expect(res.body.data).toHaveProperty('branchDistribution');
    });
  });

  // GET /api/students/:id
  describe('GET /api/students/:id', () => {
    it('should retrieve specific student by ID (HTTP 200)', async () => {
      const res = await request(app).get(`/api/students/${createdStudentId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(String(createdStudentId));
    });

    it('should return 400 for malformed ObjectId string', async () => {
      const res = await request(app).get('/api/students/invalid-id-format');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent valid ObjectId', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/students/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // PUT /api/students/:id
  describe('PUT /api/students/:id', () => {
    it('should update student details successfully (HTTP 200)', async () => {
      const res = await request(app)
        .put(`/api/students/${createdStudentId}`)
        .send({ mobileNumber: '9988776655' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mobileNumber).toBe('9988776655');
    });
  });

  // DELETE /api/students/:id
  describe('DELETE /api/students/:id', () => {
    it('should delete student record (HTTP 200)', async () => {
      const res = await request(app).delete(`/api/students/${createdStudentId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(String(createdStudentId));
    });

    it('should return 404 when trying to delete already deleted student', async () => {
      const res = await request(app).delete(`/api/students/${createdStudentId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
