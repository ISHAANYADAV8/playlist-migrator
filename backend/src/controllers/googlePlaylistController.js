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
        
        // CRITICAL FIX: YouTube Data API often takes 2-3 seconds to propagate a newly created playlist across its global servers.
        // If we try to add videos immediately, it will throw a 404 Playlist Not Found error, causing the migration to blacklist perfectly good videos!
        console.log("Waiting 3 seconds for YouTube servers to propagate the new playlist...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        let added = 0;
        let skipped = 0;
        let failed = 0;
        const total = spotifyTracks.length;
        const addedVideoIds = []; // Prevent duplicates in the same migration
        const failedTracks = []; // Track metadata for manual resolution

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

                let songAdded = false;
                let attempts = 0;

                while (!songAdded && attempts < 3) {
                    attempts++;
                    const yt = await youtubeService.searchSong(
                        title,
                        artist,
                        addedVideoIds
                    );

                    if (!yt || !yt.videoId) {
                        console.log("No YouTube match on attempt", attempts);
                        break;
                    }

                    console.log(`Matched: ${yt.name}`);
                    console.log(`Adding Video: ${yt.videoId}`);

                    try {
                        await googleService.addVideoToPlaylist(
                            req.session.googleTokens,
                            playlist.id,
                            yt.videoId
                        );
                        
                        addedVideoIds.push(yt.videoId);
                        added++;
                        console.log("Added Successfully.");
                        songAdded = true;
                    } catch (addError) {
                        console.log(`YouTube API rejected video ${yt.videoId}. Finding next best match...`);
                        addedVideoIds.push(yt.videoId); // Blacklist this videoId for the next search
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (!songAdded) {
                    failed++;
                    failedTracks.push({ title, artist });
                    console.log(`Completely failed to add: ${title}`);
                }

                // Prevent YouTube API from rejecting rapid requests
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (songError) {
                failed++;
                failedTracks.push({ title: track.item?.name, artist: track.item?.artists?.map((a) => a.name).join(" ") });
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
            failedTracks,
            playlistId: playlist.id,
            url: `https://www.youtube.com/playlist?list=${playlist.id}`,
        });
        res.end();

    } catch (err) {
        console.log("========== PLAYLIST IMPORT ERROR ==========");
        console.dir(err.response?.data || err, { depth: null });
        
        // Extract specific Google API error if it exists
        const errorMsg = err.response?.data?.error?.message || err.message || "Unknown error";
        
        sendEvent({
            status: "error",
            message: `Playlist import failed: ${errorMsg}`,
        });
        res.end();
    }
};

module.exports = {
    prepareMigration,
    createPlaylist,
};