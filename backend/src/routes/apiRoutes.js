const express = require("express");
const router = express.Router();

const spotifyController = require("../controllers/spotifyController");

router.get("/me", spotifyController.getCurrentUser);

router.get("/playlists", spotifyController.getPlaylists);

router.get(
    "/playlists/:playlistId/tracks",
    spotifyController.getPlaylistTracks
);

router.get("/token", (req, res) => {
    res.json({
        token: req.session.accessToken,
    });
});

module.exports = router;