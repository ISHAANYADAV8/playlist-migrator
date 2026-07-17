const { google } = require("googleapis");
const oauth2Client = require("../utils/googleOAuth");

const spotifyService = require("../services/spotifyService");
const youtubeService = require("../services/youtubeService");

const login = (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/youtube.force-ssl",
        ],
    });

    res.redirect(url);
};

const callback = async (req, res) => {
    try {
        const code = req.query.code;

        const { tokens } = await oauth2Client.getToken(code);

        req.session.googleTokens = tokens;

        console.log("Google Login Successful");

        // FIXED: Redirects seamlessly back to the uniform frontend IP zone
        res.redirect("http://127.0.0.1:5173?youtube=success");

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Google authentication failed",
        });
    }
};

const createPlaylist = async (req, res) => {
    try {
        if (!req.session.googleTokens) {
            return res.status(401).json({
                error: "Google not authenticated"
            });
        }

        if (!req.session.accessToken) {
            return res.status(401).json({
                error: "Spotify not authenticated"
            });
        }

        oauth2Client.setCredentials(req.session.googleTokens);

        const youtube = google.youtube({
            version: "v3",
            auth: oauth2Client
        });

        const playlistId = req.params.playlistId;

        console.log("Fetching Spotify playlist...");

        const spotifyTracks = await spotifyService.getPlaylistTracks(
            req.session.accessToken,
            playlistId
        );

        console.log("Tracks:", spotifyTracks.length);

        const playlist = await youtube.playlists.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title: "Imported from Spotify",
                    description: "Created using Playlist Migrator"
                },
                status: {
                    privacyStatus: "private"
                }
            }
        });

        const youtubePlaylistId = playlist.data.id;
        console.log("Created Playlist:", youtubePlaylistId);

        for (const track of spotifyTracks) {
            const title = track.item?.name;
            const artist = track.item?.artists?.map(a => a.name).join(" ");

            console.log("Searching:", title);

            const yt = await youtubeService.searchSong(title, artist);

            if (!yt?.videoId) {
                console.log("Skipped:", title);
                continue;
            }

            console.log("Adding:", yt.videoId);

            await youtube.playlistItems.insert({
                part: ["snippet"],
                requestBody: {
                    snippet: {
                        playlistId: youtubePlaylistId,
                        resourceId: {
                            kind: "youtube#video",
                            videoId: yt.videoId
                        }
                    }
                }
            });
        }

        res.json({
            success: true,
            playlistId: youtubePlaylistId,
            url: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Failed creating playlist"
        });
    }
};

module.exports = {
    login,
    callback,
    createPlaylist
};