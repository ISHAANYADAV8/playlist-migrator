const axios = require("axios");

const getAccessToken = async (code) => {
    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
            grant_type: "authorization_code",
            code,
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

    return response.data;
};

const getCurrentUser = async (accessToken) => {
    const response = await axios.get(
        "https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data;
};

const getPlaylists = async (accessToken) => {
    const response = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data?.items || [];
};

const getPlaylistTracks = async (accessToken, playlistId) => {
    console.log("Calling Spotify API...");
    // Migrated from /tracks to /items due to Spotify's updated API enforcement
    console.log(`https://api.spotify.com/v1/playlists/${playlistId}/items`);

    const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/items`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                limit: 100,
            },
        }
    );

    console.log("Spotify Status:", response.status);
    console.log("Returned type:", typeof response.data);
    
    return response.data?.items || [];
};

module.exports = {
    getAccessToken,
    getCurrentUser,
    getPlaylists,
    getPlaylistTracks,
};