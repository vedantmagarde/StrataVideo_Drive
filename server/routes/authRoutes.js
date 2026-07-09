import express from 'express';
import { syncUser, getMe } from '../controllers/authController.js';
import firebaseAuth from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.post('/sync', firebaseAuth, syncUser);
router.get('/me', firebaseAuth, getMe);

export default router;
