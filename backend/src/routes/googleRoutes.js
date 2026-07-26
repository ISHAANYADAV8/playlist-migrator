const express = require("express");

const router = express.Router();

const googleController = require("../controllers/googleController");
const googlePlaylistController = require("../controllers/googlePlaylistController");

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

module.exports = router;