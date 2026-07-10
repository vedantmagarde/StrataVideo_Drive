import express from 'express';
import { createGroup, inviteMember, removeMember, getMembers, generateInvite } from '../controllers/groupController.js';
import verifyFirebaseToken from '../middlewares/verifyFirebaseToken.js';

const router = express.Router();

router.use(verifyFirebaseToken);

router.post('/create', createGroup);
router.post('/invite', inviteMember);
router.delete('/remove', removeMember);
router.get('/members', getMembers);
router.post('/generate-invite', generateInvite);

export default router;
