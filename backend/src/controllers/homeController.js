const home = (req, res) => {
    res.send("🎵 Playlist Converter API is running!");
};

const health = (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Playlist Converter API is healthy"
    });
};

module.exports = {
    home,
    health,
};