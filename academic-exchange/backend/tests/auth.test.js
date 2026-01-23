const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock the DB module BEFORE importing routes
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../config/db');
const authRoutes = require('../routes/auth_routes');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock user check (no existing user)
      db.query.mockResolvedValueOnce({ rows: [] });
      // Mock insert success
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'TestUser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      // Verify db.query was called with correct SQL
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should return 400 if user already exists', async () => {
      // Mock user check (user exists)
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com' }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'TestUser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const bcrypt = require('bcrypt');
      // Mock finding user
      const mockUser = {
          id: 1,
          username: 'TestUser',
          email: 'test@example.com',
          password_hash: await bcrypt.hash('password123', 10),
          role: 'user'
      };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for non-existent user', async () => {
      // Mock finding user (empty)
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('User not found');
    });
  });
});
