
import { Response, NextFunction } from "express";
import { database } from "../config/database.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export async function getMovies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [rows] = await database.execute(
      "SELECT * FROM media WHERE user_id = ? AND type = 'movie' ORDER BY id DESC",
      [req.user!.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createMovie(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, cover_url, total_duration } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Judul film wajib diisi." });
    }

    const duration = total_duration == null ? null : Number(total_duration);

    if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
      return res.status(400).json({ success: false, message: "Durasi harus berupa menit positif." });
    }

    const [result] = await database.execute(
      "INSERT INTO media (user_id, title, type, description, cover_url, total_duration) VALUES (?, ?, 'movie', ?, ?, ?)",
      [req.user!.id, title.trim(), description ?? null, cover_url ?? null, duration]
    );

    res.status(201).json({
      success: true,
      message: "Film berhasil ditambahkan.",
      id: (result as { insertId: number }).insertId
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMovie(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, cover_url, total_duration } = req.body;
    const duration = total_duration == null ? null : Number(total_duration);

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Judul film wajib diisi." });
    }

    if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
      return res.status(400).json({ success: false, message: "Durasi harus berupa menit positif." });
    }

    const [result] = await database.execute(
      "UPDATE media SET title = ?, description = ?, cover_url = ?, total_duration = ? WHERE id = ? AND user_id = ? AND type = 'movie'",
      [title.trim(), description ?? null, cover_url ?? null, duration, req.params.id, req.user!.id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Film tidak ditemukan." });
    }

    res.json({ success: true, message: "Film berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [result] = await database.execute(
      "DELETE FROM media WHERE id = ? AND user_id = ? AND type = 'movie'",
      [req.params.id, req.user!.id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Film tidak ditemukan." });
    }

    res.json({ success: true, message: "Film berhasil dihapus." });
  } catch (error) {
    next(error);
  }
}
