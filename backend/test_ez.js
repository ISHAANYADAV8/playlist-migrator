const YTMusic = require("ytmusic-api");

async function run() {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    
    // Check what the search query actually returns for Ez-Ez
    const query = "Ez-Ez Shashwat Sachdev, Diljit Dosanjh, Hanumankind Official Audio";
    const results = await ytmusic.searchSongs(query);
    console.log("PRIMARY QUERY RESULTS:", JSON.stringify(results.slice(0,2), null, 2));

    const fbQuery = "Ez-Ez Shashwat Sachdev, Diljit Dosanjh, Hanumankind";
    const fbResults = await ytmusic.searchSongs(fbQuery);
    console.log("FALLBACK QUERY RESULTS:", JSON.stringify(fbResults.slice(0,2), null, 2));
}

run().catch(console.error);
