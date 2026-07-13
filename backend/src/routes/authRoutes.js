const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.get("/spotify/login", authController.login);
router.get("/spotify/callback", authController.callback);

module.exports = router;