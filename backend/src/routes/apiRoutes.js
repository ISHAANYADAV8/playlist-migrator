const express = require("express");
const router = express.Router();

const spotifyController = require("../controllers/spotifyController");

router.get("/me", spotifyController.getCurrentUser);

router.get("/playlists", spotifyController.getPlaylists);

module.exports = router;