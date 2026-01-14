const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Register & Login
router.post('/register', authController.register);
router.post('/login', authController.login);

// 2. GET ALL USERS (For Admin Dashboard)
router.get('/users', authMiddleware, authController.getAllUsers);

// 3. DELETE USER (For Admin Dashboard)
router.delete('/users/:id', authMiddleware, authController.deleteUser);

module.exports = router;
