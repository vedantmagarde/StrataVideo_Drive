import express from 'express';
import { createGroup, inviteMember, removeMember, getMembers } from '../controllers/groupController.js';
import verifyFirebaseToken from '../middlewares/verifyFirebaseToken.js';

const router = express.Router();

router.post('/create', verifyFirebaseToken, createGroup);
router.post('/invite', verifyFirebaseToken, inviteMember);
router.delete('/remove', verifyFirebaseToken, removeMember);
router.get('/members', verifyFirebaseToken, getMembers);

export default router;
