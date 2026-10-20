
import { Router } from "express";
import {
  getMovies,
  createMovie,
  updateMovie,
  deleteMovie
} from "../controllers/moviecontroller.js";
import { authenticateToken } from "../middleware/authmiddleware.js";

const router = Router();

router.use(authenticateToken);
router.get("/", getMovies);
router.post("/", createMovie);
router.put("/:id", updateMovie);
router.delete("/:id", deleteMovie);

export default router;
