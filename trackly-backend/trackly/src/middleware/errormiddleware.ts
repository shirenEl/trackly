import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[TRACKLY ERROR]", req.method, req.path);
  console.error(error.stack || error.message);

  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
  });
}
