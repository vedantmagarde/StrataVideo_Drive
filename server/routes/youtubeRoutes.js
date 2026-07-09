import express from 'express';
import { authRedirect, oauthCallback, disconnect } from '../controllers/youtubeController.js';
import verifyFirebaseToken from '../middlewares/verifyFirebaseToken.js';

const router = express.Router();

router.get('/auth', verifyFirebaseToken, authRedirect);
router.post('/callback', verifyFirebaseToken, oauthCallback);
router.post('/disconnect', verifyFirebaseToken, disconnect);

export default router;
