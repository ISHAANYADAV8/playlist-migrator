const YTMusic = require("ytmusic-api");

async function run() {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    
    console.log("--- SONGS ---");
    const songs = await ytmusic.searchSongs("Run Down The City Shashwat Sachdev");
    console.log(JSON.stringify(songs[0], null, 2));
}

run().catch(console.error);
