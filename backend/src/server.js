require("dotenv").config();

const express = require("express");
const session = require("express-session");

const indexRoutes = require("./routes");
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");

const app = express();

app.use(express.json());

app.use(
    session({
        secret: "playlist-converter-secret",
        resave: false,
        saveUninitialized: false,
    })
);

app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});