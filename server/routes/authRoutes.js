import express from 'express';
import { syncUser, getMe } from '../controllers/authController.js';
import verifyFirebaseToken from '../middlewares/verifyFirebaseToken.js';

const router = express.Router();

router.post('/sync', verifyFirebaseToken, syncUser);
router.get('/me', verifyFirebaseToken, getMe);

export default router;
