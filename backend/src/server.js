const express = require("express");

// Create an Express application
const app = express();

// Port number on which the server will run
const PORT = 3000;

// Home route
app.get("/", (req, res) => {
    res.send("🎵 Playlist Converter API is running!");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});