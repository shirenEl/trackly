
import { Router } from "express";

import {
  getLibrary,
  addToLibrary,
  updateLibrary,
  deleteFromLibrary,
} from "../controllers/libraryController.js";

import { authenticateToken } from "../middleware/authMiddleware.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", getLibrary);
router.post("/", addToLibrary);
router.put("/:id", updateLibrary);
router.delete("/:id", deleteFromLibrary);

export default router;
