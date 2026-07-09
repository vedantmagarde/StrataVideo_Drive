import express from "express";
import dotenv from "dotenv";
import  connectDb  from "./config/connectDb.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
    res.send("Hello from server");
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDb();
});