import express from 'express';
import multer from 'multer';
import { uploadFile, listFiles, deleteFile, downloadFile, getJobStatus, serveFile, searchFiles } from '../controllers/fileController.js';
import verifyFirebaseToken from '../middlewares/verifyFirebaseToken.js';

const router = express.Router();

const upload = multer({
    dest: './tmp',
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB limit
});

router.post('/upload', verifyFirebaseToken, upload.single('file'), uploadFile);
router.get('/', verifyFirebaseToken, listFiles);
router.get('/search', verifyFirebaseToken, searchFiles);
router.delete('/:fileId', verifyFirebaseToken, deleteFile);
router.post('/download/:fileId', verifyFirebaseToken, downloadFile);
router.get('/status/:jobId', verifyFirebaseToken, getJobStatus);
router.get('/serve/:jobId', verifyFirebaseToken, serveFile);

export default router;
