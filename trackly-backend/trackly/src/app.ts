
import express from "express";
import cors from "cors";
import botroutes from "./routes/botroutes.js";
import authRoutes from "./routes/authRoutes.js";
import movieroutes from "./routes/movieroutes.js";
import seriesroutes from "./routes/seriesroutes.js";
import novelroutes from "./routes/novelroutes.js";
import { errorHandler } from "./middleware/errormiddleware.js";

const app = express();
app.use("/api/series", seriesroutes);
app.use("/api/bot", botroutes);
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to Trackly API!",
    version: "1.0.0"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Trackly API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieroutes);
app.use("/api/series", seriesroutes);
app.use("/api/novels", novelroutes);

app.use(errorHandler);

export default app;
