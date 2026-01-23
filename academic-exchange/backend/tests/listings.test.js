const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Mock the DB module
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../config/db');
const listingRoutes = require('../routes/listingroutes');

const app = express();
app.use(bodyParser.json());
// Mock auth middleware to populate req.user
app.use((req, res, next) => {
    // If we want to simulate logged in user
    if (req.headers['authorization']) {
        req.user = { id: 1, role: 'user' };
    }
    next();
});
app.use('/api/listings', listingRoutes);


describe('Listing Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/listings', () => {
    it('should return all listings', async () => {
      const mockListings = [
          { id: 1, title: 'Book 1', price: 10 },
          { id: 2, title: 'Book 2', price: 20 }
      ];
      db.query.mockResolvedValueOnce({ rows: mockListings });

      const res = await request(app).get('/api/listings');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockListings);
    });
  });

  // Note: Testing POST/PUT with image upload via supertest is tricky because of multer.
  // We can test the logic by mocking the controller if we wanted unit tests,
  // or use supertest .attach() but that requires a real file or buffer.
  // For now, we will test the failure case (no token) which is easy.

  describe('POST /api/listings', () => {
    it('should return 401 if not authorized', async () => {
       const res = await request(app)
        .post('/api/listings')
        .send({ title: 'New Book' });

       expect(res.statusCode).toEqual(401);
    });
  });
});
