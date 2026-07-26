const googleService = require("../services/googleService");
const spotifyService = require("../services/spotifyService");
const youtubeService = require("../services/youtubeService");

const prepareMigration = (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        const { customName, selectedTrackIndices } = req.body;
        
        if (!req.session.migrationConfigs) {
            req.session.migrationConfigs = {};
        }
        
        req.session.migrationConfigs[playlistId] = {
            customName: customName || "Spotify Imported Playlist",
            selectedTrackIndices: selectedTrackIndices || null
        };
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to prepare migration" });
    }
};

const createPlaylist = async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        if (!req.session.googleTokens) {
            sendEvent({ status: "error", message: "Google not authenticated" });
            return res.end();
        }

        if (!req.session.accessToken) {
            sendEvent({ status: "error", message: "Spotify not authenticated" });
            return res.end();
        }

        const playlistId = req.params.playlistId;

        console.log("========== PLAYLIST IMPORT ==========");
        console.log("Fetching Spotify playlist...");

        sendEvent({ status: "init", message: "Fetching Spotify playlist tracks..." });

        const config = (req.session.migrationConfigs && req.session.migrationConfigs[playlistId]) || {};
        const playlistName = config.customName || "Spotify Imported Playlist";
        
        let spotifyTracks = await spotifyService.getPlaylistTracks(
            req.session.accessToken,
            playlistId
        );

        if (config.selectedTrackIndices && Array.isArray(config.selectedTrackIndices)) {
            const selectedSet = new Set(config.selectedTrackIndices);
            spotifyTracks = spotifyTracks.filter((_, index) => selectedSet.has(index));
        }

        console.log(`Spotify Tracks to transfer: ${spotifyTracks.length}`);
        
        sendEvent({ status: "init", message: `Found ${spotifyTracks.length} tracks to transfer. Creating YouTube Playlist...` });
        console.log("Creating YouTube Playlist...");

        const playlist = await googleService.createPlaylist(
            req.session.googleTokens,
            playlistName,
            "Created using Playlist Migrator"
        );

        console.log("YouTube Playlist ID:", playlist.id);

        let added = 0;
        let skipped = 0;
        let failed = 0;
        const total = spotifyTracks.length;

        for (const track of spotifyTracks) {
            try {
                const title = track.item?.name;
                const artist = track.item?.artists
                    ?.map((a) => a.name)
                    .join(" ");

                console.log("--------------------------------");
                console.log(`Searching: ${title}`);

                sendEvent({
                    status: "progress",
                    added,
                    skipped,
                    failed,
                    total,
                    currentTrack: title,
                    currentArtist: artist
                });

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
                console.dir(songError.response?.data || songError.message, { depth: null });
                // wait before continuing
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }

        console.log("========== IMPORT COMPLETE ==========");
        console.log("Added:", added);
        console.log("Skipped:", skipped);
        console.log("Failed:", failed);

        sendEvent({
            status: "complete",
            success: true,
            added,
            skipped,
            failed,
            playlistId: playlist.id,
            url: `https://www.youtube.com/playlist?list=${playlist.id}`,
        });
        res.end();

    } catch (err) {
        console.log("========== PLAYLIST IMPORT ERROR ==========");
        console.dir(err.response?.data || err, { depth: null });
        sendEvent({
            status: "error",
            message: "Playlist import failed",
        });
        res.end();
    }
};

module.exports = {
    prepareMigration,
    createPlaylist,
};