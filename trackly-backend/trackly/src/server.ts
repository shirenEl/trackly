
import dotenv from "dotenv";

// Muat .env sebelum mengimpor app dan database.
dotenv.config();

async function startServer() {
  // Import dilakukan setelah .env dimuat.
  const { default: app } = await import("./app.js");
  const { database } = await import("./config/database.js");

  const PORT = Number(process.env.PORT || 3000);

  try {
    const connection = await database.getConnection();

    console.log("Database berhasil terhubung.");
    connection.release();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Trackly API berjalan di port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log("JWT_SECRET tersedia:", Boolean(process.env.JWT_SECRET));
    });
  } catch (error) {
    console.error("Gagal menghubungkan database:", error);
    process.exit(1);
  }
}

startServer();
