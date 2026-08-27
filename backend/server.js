import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

   app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
