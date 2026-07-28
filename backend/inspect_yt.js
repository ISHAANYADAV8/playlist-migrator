const YTMusic = require("ytmusic-api");

async function run() {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    
    const results = await ytmusic.searchVideos("Shararat Ranveer, Aditya Dhar, Shashwat");
    console.log(JSON.stringify(results[0], null, 2));
}

run().catch(console.error);
