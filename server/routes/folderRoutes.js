import express from "express";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { createFolder, getFolders, renameFolder, deleteFolder } from "../controllers/folderController.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.post("/", createFolder);
router.get("/", getFolders);
router.put("/:id", renameFolder);
router.delete("/:id", deleteFolder);

export default router;
