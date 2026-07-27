require("dotenv").config();
const googleRoutes = require("./routes/googleRoutes");
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const youtubeService = require("./services/youtubeService");

const indexRoutes = require("./routes");
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");

const app = express();

app.use(express.json());

// CORS configuration for frontend
app.use(
    cors({
        origin: process.env.FRONTEND_URL 
            ? process.env.FRONTEND_URL.split(',') 
            : ['http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
    })
);

// Trust proxy is required for secure cookies behind Render/Heroku
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER || !!process.env.FRONTEND_URL;

// SESSION MUST COME BEFORE ANY ROUTES
app.use(
    session({
        secret: "playlist-converter-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax"
        }
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