const express = require("express");

const router = express.Router();

const googleController = require("../controllers/googleController");
const googlePlaylistController = require("../controllers/googlePlaylistController");
const googleManualController = require("../controllers/googleManualController");

router.get("/login", googleController.login);

router.get("/callback", googleController.callback);

router.get(
    "/create-playlist/:playlistId",
    googlePlaylistController.createPlaylist
);

router.post(
    "/prepare-migration/:playlistId",
    googlePlaylistController.prepareMigration
);

router.get("/search", googleManualController.searchYouTube);

router.post("/playlist/:playlistId/add-video", googleManualController.addVideoToPlaylist);

module.exports = router;