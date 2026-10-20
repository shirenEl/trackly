
import { Router } from "express";
import {
  getNovels,
  createNovel,
  updateNovel,
  deleteNovel
} from "../controllers/novelController.js";
import { authenticateToken } from "../middleware/authmiddleware.ts";

const router = Router();

router.use(authenticateToken);
router.get("/", getNovels);
router.post("/", createNovel);
router.put("/:id", updateNovel);
router.delete("/:id", deleteNovel);

export default router;
