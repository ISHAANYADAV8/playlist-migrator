const axios = require("axios");
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
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        console.log(response.data);

        res.json(response.data);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to exchange authorization code."
        });
    }
};

module.exports = {
    login,
    callback,
};