import express from 'express';
import { getAuthUrl, handleCallback, disconnect } from '../controllers/youtubeController.js';
import firebaseAuth from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.get('/auth', firebaseAuth, getAuthUrl);
router.post('/callback', firebaseAuth, handleCallback);
router.post('/disconnect', firebaseAuth, disconnect);

export default router;
