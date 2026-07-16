const googleService = require("../services/googleService");
const spotifyService = require("../services/spotifyService");
const youtubeService = require("../services/youtubeService");

const createPlaylist = async (req, res) => {
    try {
        if (!req.session.googleTokens) {
            return res.status(401).json({
                error: "Google not authenticated",
            });
        }

        if (!req.session.accessToken) {
            return res.status(401).json({
                error: "Spotify not authenticated",
            });
        }

        const playlistId = req.params.playlistId;

        console.log("========== PLAYLIST IMPORT ==========");

        console.log("Fetching Spotify playlist...");

        const spotifyTracks = await spotifyService.getPlaylistTracks(
            req.session.accessToken,
            playlistId
        );

        console.log(`Spotify Tracks Found: ${spotifyTracks.length}`);

        console.log("Creating YouTube Playlist...");

        const playlist = await googleService.createPlaylist(
            req.session.googleTokens,
            "Spotify Imported Playlist",
            "Created using Playlist Migrator"
        );

        console.log("YouTube Playlist ID:", playlist.id);

        let added = 0;
        let skipped = 0;
        let failed = 0;

        for (const track of spotifyTracks) {
            try {
                const title = track.item?.name;

                const artist = track.item?.artists
                    ?.map((a) => a.name)
                    .join(" ");

                console.log("--------------------------------");
                console.log(`Searching: ${title}`);

                const yt = await youtubeService.searchSong(
                    title,
                    artist
                );

                if (!yt || !yt.videoId) {
                    console.log("No YouTube match.");

                    skipped++;

                    continue;
                }

                console.log(`Matched: ${yt.name}`);
                console.log(`Adding Video: ${yt.videoId}`);

                await googleService.addVideoToPlaylist(
                    req.session.googleTokens,
                    playlist.id,
                    yt.videoId
                );

                added++;

                console.log("Added Successfully.");

                // Prevent YouTube API from rejecting rapid requests
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (songError) {

                failed++;

                console.log("FAILED SONG:");

                console.dir(songError.response?.data || songError.message, {
                    depth: null,
                });

                // wait before continuing
                await new Promise(resolve => setTimeout(resolve, 1000));

                continue;
            }
        }

        console.log("========== IMPORT COMPLETE ==========");
        console.log("Added:", added);
        console.log("Skipped:", skipped);
        console.log("Failed:", failed);

        res.json({
            success: true,
            added,
            skipped,
            failed,
            playlistId: playlist.id,
            url: `https://www.youtube.com/playlist?list=${playlist.id}`,
        });

    } catch (err) {

        console.log("========== PLAYLIST IMPORT ERROR ==========");

        console.dir(err.response?.data || err, {
            depth: null,
        });

        res.status(500).json({
            error: "Playlist import failed",
        });

    }
};

module.exports = {
    createPlaylist,
};