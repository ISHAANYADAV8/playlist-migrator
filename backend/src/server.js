require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT;

const indexRoutes = require("./routes");
const authRoutes = require("./routes/authRoutes");

app.use("/", indexRoutes);
app.use("/auth", authRoutes);



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});