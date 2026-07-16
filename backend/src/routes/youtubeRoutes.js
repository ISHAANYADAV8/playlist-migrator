const express = require("express");

const router = express.Router();

const youtubeController = require("../controllers/youtubeController");

router.get("/search", youtubeController.searchSong);

router.get(
    "/convert/:playlistId",
    youtubeController.convertPlaylist
);

module.exports = router;