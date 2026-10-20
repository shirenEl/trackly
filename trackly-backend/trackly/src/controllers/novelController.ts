
import type { Response, NextFunction } from "express";
import { database } from "../config/database.js";
import type { AuthRequest } from "../middleware/authmiddleware.js";

export async function getNovels(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const [rows] = await database.execute(
      `SELECT *
       FROM library_items
       WHERE user_id = ? AND type = 'novel'
       ORDER BY id DESC`,
      [req.user!.id]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function createNovel(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { title, description, cover_url, total_pages } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Judul novel wajib diisi."
      });
    }

    const pages = total_pages == null ? null : Number(total_pages);

    if (pages !== null && (!Number.isInteger(pages) || pages <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Jumlah halaman harus positif."
      });
    }

    const [result] = await database.execute(
      `INSERT INTO library_items
       (user_id, title, type, description, cover_url, total_pages)
       VALUES (?, ?, 'novel', ?, ?, ?)`,
      [
        req.user!.id,
        title.trim(),
        description ?? null,
        cover_url ?? null,
        pages
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Novel berhasil ditambahkan.",
      id: (result as { insertId: number }).insertId
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateNovel(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { title, description, cover_url, total_pages } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Judul novel wajib diisi."
      });
    }

    const pages = total_pages == null ? null : Number(total_pages);

    if (pages !== null && (!Number.isInteger(pages) || pages <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Jumlah halaman harus positif."
      });
    }

    const [result] = await database.execute(
      `UPDATE library_items
       SET title = ?, description = ?, cover_url = ?, total_pages = ?
       WHERE id = ? AND user_id = ? AND type = 'novel'`,
      [
        title.trim(),
        description ?? null,
        cover_url ?? null,
        pages,
        req.params.id,
        req.user!.id
      ]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Novel tidak ditemukan."
      });
    }

    return res.json({
      success: true,
      message: "Novel berhasil diperbarui."
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteNovel(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const [result] = await database.execute(
      `DELETE FROM library_items
       WHERE id = ? AND user_id = ? AND type = 'novel'`,
      [req.params.id, req.user!.id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Novel tidak ditemukan."
      });
    }

    return res.json({
      success: true,
      message: "Novel berhasil dihapus."
    });
  } catch (error) {
    return next(error);
  }
}
