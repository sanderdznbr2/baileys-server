import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import instanceRoutes from "./routes/instance";
import messageRoutes from "./routes/message";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/instance", instanceRoutes);
app.use("/message", messageRoutes);

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
