const { google } = require("googleapis");
const oauth2Client = require("../utils/googleOAuth");

const createPlaylist = async (tokens, title, description) => {
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
    });

    const response = await youtube.playlists.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title,
                description,
            },
            status: {
                privacyStatus: "private",
            },
        },
    });

    return response.data;
};

const addVideoToPlaylist = async (
    tokens,
    playlistId,
    videoId
) => {

    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
    });

    // Retry up to 3 times if YouTube temporarily fails
    for (let attempt = 1; attempt <= 3; attempt++) {

        try {

            await youtube.playlistItems.insert({
                part: ["snippet"],
                requestBody: {
                    snippet: {
                        playlistId,
                        resourceId: {
                            kind: "youtube#video",
                            videoId,
                        },
                    },
                },
            });

            return;

        } catch (err) {

            console.log(
                `Attempt ${attempt} failed for video ${videoId}`
            );

            console.dir(err.response?.data || err.message, {
                depth: null,
            });

            if (attempt === 3) {
                throw err;
            }

            // Wait 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

module.exports = {
    createPlaylist,
    addVideoToPlaylist,
};