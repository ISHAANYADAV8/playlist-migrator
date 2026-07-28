const YTMusic = require("ytmusic-api");

const ytmusic = new YTMusic();

const initialize = async () => {
    await ytmusic.initialize();
};

const searchSong = async (title, artist) => {
    const query = `${title} ${artist}`;

    const results = await ytmusic.searchSongs(query);

    if (!results || results.length === 0) {
        return null;
    }

    const exact = results.find(song =>
        song.name.toLowerCase().includes(title.toLowerCase())
    );

    return exact || results[0];
};

const searchManual = async (query) => {
    const results = await ytmusic.searchSongs(query);
    return results ? results.slice(0, 5) : [];
};

module.exports = {
    initialize,
    searchSong,
    searchManual
};