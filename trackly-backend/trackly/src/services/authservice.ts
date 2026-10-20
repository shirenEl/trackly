
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { database } from "../config/database.js";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum diatur di .env");
  return secret;
};

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  const [existing] = await database.execute(
    "SELECT id FROM users WHERE email = ?",
    [normalizedEmail]
  );

  if ((existing as unknown[]).length > 0) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await database.execute(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name.trim(), normalizedEmail, hashedPassword]
  );

  const userId = (result as { insertId: number }).insertId;

  return {
    id: userId,
    name: name.trim(),
    email: normalizedEmail
  };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await database.execute(
    "SELECT id, name, email, password FROM users WHERE email = ?",
    [normalizedEmail]
  );

  const users = rows as {
    id: number;
    name: string;
    email: string;
    password: string;
  }[];

  if (users.length === 0) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = users[0];
  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
}
