import express from 'express';
import { createGroup, inviteToGroup, removeMember, getMembers } from '../controllers/groupController.js';
import firebaseAuth from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.post('/create', firebaseAuth, createGroup);
router.post('/invite', firebaseAuth, inviteToGroup);
router.delete('/remove', firebaseAuth, removeMember);
router.get('/members', firebaseAuth, getMembers);

export default router;
