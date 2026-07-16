require("dotenv").config();
const googleRoutes = require("./routes/googleRoutes");
const express = require("express");
const session = require("express-session");

const youtubeService = require("./services/youtubeService");

const indexRoutes = require("./routes");
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");

const app = express();

app.use(express.json());

// SESSION MUST COME BEFORE ANY ROUTES
app.use(
    session({
        secret: "playlist-converter-secret",
        resave: false,
        saveUninitialized: false,
    })
);

// Routes
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/youtube", youtubeRoutes);
app.use("/google", googleRoutes);

const PORT = process.env.PORT;

youtubeService
    .initialize()
    .then(() => console.log("YouTube Music initialized"))
    .catch(console.error);

app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});