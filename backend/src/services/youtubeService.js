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

    const cleanStr = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanTitle = cleanStr(title);
    const cleanArtist = cleanStr(artist);

    let exact = results.find(song => {
        const songTitle = cleanStr(song.name);
        const songArtist = cleanStr(song.artist?.name);
        return songTitle.includes(cleanTitle) && songArtist.includes(cleanArtist);
    });

    if (!exact) {
        exact = results.find(song => cleanStr(song.artist?.name).includes(cleanArtist));
    }

    if (!exact) {
        exact = results.find(song => cleanStr(song.name).includes(cleanTitle));
    }

    return exact || results[0];
};

module.exports = {
    initialize,
    searchSong,
};