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
    try {
        const code = req.query.code;

        const tokenData = await spotifyService.getAccessToken(code);

        req.session.accessToken = tokenData.access_token;
        req.session.refreshToken = tokenData.refresh_token;

        let frontendUrl = (process.env.FRONTEND_URL && process.env.FRONTEND_URL.split(',')[0]) || 'http://127.0.0.1:5173';
        frontendUrl = frontendUrl.replace(/['",]/g, '').trim();
        res.redirect(`${frontendUrl}?spotify=success`);
    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: "Failed to authenticate with Spotify",
        });
    }
};

module.exports = {
    login,
    callback,
};