import express from 'express';
import multer from 'multer';
import { uploadFile, listFiles, deleteFile, downloadFile, getJobStatus } from '../controllers/fileController.js';
import firebaseAuth from '../middlewares/firebaseAuth.js';

const router = express.Router();

// Using multer to parse multipart/form-data. We will store in memory and pass to bull queue, 
// or for very large files, store on disk temporarily. Let's use diskStorage for temporary processing.
const upload = multer({ dest: 'tmp/' });

router.post('/upload', firebaseAuth, upload.single('file'), uploadFile);
router.get('/', firebaseAuth, listFiles);
router.delete('/:fileId', firebaseAuth, deleteFile);
router.post('/download/:fileId', firebaseAuth, downloadFile);
router.get('/status/:jobId', firebaseAuth, getJobStatus);

export default router;
