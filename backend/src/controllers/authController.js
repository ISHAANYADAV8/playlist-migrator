const axios = require("axios");
const spotifyService = require("../services/spotifyService");
const login = (req, res) => {
    const scope =
        "user-read-email user-read-private playlist-read-private playlist-read-collaborative";

    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });

    res.redirect(
        `https://accounts.spotify.com/authorize?${params.toString()}`
    );
};

const callback = async (req, res) => {
    const code = req.query.code;

    try {
        const tokenData = await spotifyService.getAccessToken(code);

        res.json(tokenData);
    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: "Failed to exchange authorization code",
        });
    }
};

module.exports = {
    login,
    callback,
};