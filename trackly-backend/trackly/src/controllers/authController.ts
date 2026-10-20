import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { database } from "../config/database.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password minimal 8 karakter wajib diisi."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await database.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if ((existing as unknown[]).length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await database.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), normalizedEmail, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: "Register berhasil.",
      userId: (result as { insertId: number }).insertId
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi."
      });
    }

    const [rows] = await database.execute(
      "SELECT id, name, email, password FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    const users = rows as {
      id: number;
      name: string;
      email: string;
      password: string;
    }[];

    if (
      users.length === 0 ||
      !(await bcrypt.compare(password, users[0].password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah."
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET belum dikonfigurasi.");
    }

    const token = jwt.sign(
      { id: users[0].id, email: users[0].email },
      secret,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login berhasil.",
      token,
      user: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email
      }
    });
  } catch (error) {
    next(error);
  }
}