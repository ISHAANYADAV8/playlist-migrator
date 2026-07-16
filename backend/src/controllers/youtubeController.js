const spotifyService = require("../services/spotifyService");
const youtubeService = require("../services/youtubeService");

const searchSong = async (req, res) => {
    try {
        const { title, artist } = req.query;

        const song = await youtubeService.searchSong(title, artist);

        res.json(song);
    } catch (err) {
        console.log(err);

        res.status(500).json({
            error: "Search failed",
        });
    }
};

const convertPlaylist = async (req, res) => {
    try {
        const accessToken = req.session.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        const { playlistId } = req.params;

        console.log("Fetching Spotify tracks...");

        const tracks = await spotifyService.getPlaylistTracks(
            accessToken,
            playlistId
        );

        console.log("Tracks received:", tracks.length);

        const results = [];

        for (const song of tracks) {
            console.log("----------------------------");
            console.log(song);

            const title = song.item?.name;
            const artist = song.item?.artists
                ?.map(a => a.name)
                .join(" ");

            console.log("Searching:", title, "-", artist);

            const yt = await youtubeService.searchSong(
                title,
                artist
            );

            console.log("Youtube Result:");
            console.log(yt);

            results.push({
                spotify: title,
                youtube: yt?.name || null,
                videoId: yt?.videoId || null,
            });
        }

        res.json(results);

    } catch (err) {

        console.log("========== CONVERT ERROR ==========");
        console.log(err);

        if (err.response) {
            console.log("Status:", err.response.status);
            console.log(err.response.data);
        }

        res.status(500).json({
            error: "Playlist conversion failed"
        });
    }
};

module.exports = {
    searchSong,
    convertPlaylist,
};