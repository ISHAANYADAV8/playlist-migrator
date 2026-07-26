const axios = require("axios");
const fetch = global.fetch || require("node-fetch");
const spotify = require("spotify-url-info")(fetch);

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

    try {
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
    } catch (err) {
        if (err.response?.status === 403 || err.response?.status === 401) {
            console.log("Spotify API blocked access (403/401). Falling back to scraper for public playlist...");
            try {
                const url = `https://open.spotify.com/playlist/${playlistId}`;
                const data = await spotify.getTracks(url);
                console.log(`Scraper successfully retrieved ${data.length} tracks.`);
                
                // Format the scraped tracks to match the Spotify API output structure expected by the controllers
                return data.map(track => ({
                    item: {
                        name: track.name,
                        artists: [{ name: track.artist || "Unknown Artist" }],
                        album: { name: "" }
                    }
                }));
            } catch (scraperErr) {
                console.log("Scraper also failed:", scraperErr.message);
                throw err; // Throw the original error if fallback fails
            }
        }
        throw err;
    }
};

module.exports = {
    getAccessToken,
    getCurrentUser,
    getPlaylists,
    getPlaylistTracks,
};