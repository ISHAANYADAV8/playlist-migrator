const { initialize, searchSong } = require('./src/services/youtubeService');

const testCases = [
    // Standard songs
    { title: "Blinding Lights", artist: "The Weeknd", expected: "Blinding Lights" },
    { title: "Shape of You", artist: "Ed Sheeran", expected: "Shape of You" },
    
    // Remastered versions
    { title: "Bohemian Rhapsody - Remastered 2011", artist: "Queen", expected: "Bohemian Rhapsody" },
    { title: "Hotel California - 2013 Remaster", artist: "Eagles", expected: "Hotel California" },
    { title: "Smells Like Teen Spirit - Remastered 2021", artist: "Nirvana", expected: "Smells Like Teen Spirit" },
    
    // Featuring artists (Title format)
    { title: "Industry Baby (feat. Jack Harlow)", artist: "Lil Nas X", expected: "INDUSTRY BABY" },
    { title: "Uptown Funk (feat. Bruno Mars)", artist: "Mark Ronson", expected: "Uptown Funk" },
    
    // Featuring artists (Artist array joined format)
    { title: "Peaches", artist: "Justin Bieber Daniel Caesar Giveon", expected: "Peaches" },
    { title: "Stay", artist: "The Kid LAROI Justin Bieber", expected: "STAY" },
    
    // Common names (could match wrong artist if not careful)
    { title: "Hello", artist: "Adele", expected: "Hello" },
    { title: "Hello", artist: "Lionel Richie", expected: "Hello" },
    
    // Live versions
    { title: "No Woman, No Cry - Live At The Lyceum, London/1975", artist: "Bob Marley & The Wailers", expected: "No Woman, No Cry" },
    
    // Explicit/Radio edits
    { title: "Fuck Love (feat. Trippie Redd) - Explicit", artist: "XXXTENTACION", expected: "Fuck Love" },
    { title: "Creep - Radio Edit", artist: "Radiohead", expected: "Creep" },
    
    // Complex titles
    { title: "Meant to Be (feat. Florida Georgia Line)", artist: "Bebe Rexha", expected: "Meant to Be" },
    
    // Bollywood / Long metadata titles (Dhurandhar)
    { title: "Dhurandhar - Title Track", artist: "Shashwat Sachdev", expected: "Dhurandhar - Title Track" },
    { title: "Naal Nachna", artist: "Shashwat Sachdev, Asees Kaur", expected: "Naal Nachna" },
    { title: "Move - Yeh Ishq Ishq", artist: "Shashwat Sachdev, Lal Chand Yamla Jatt", expected: "Move - Yeh Ishq Ishq" },
    { title: "Run Down The City", artist: "Shashwat Sachdev, Monica Dogra", expected: "Run Down The City" },
    { title: "Ishq Jalakar - Karvaan", artist: "Shashwat Sachdev, Aditya Dhar", expected: "Ishq Jalakar", durationMs: 230000 },
    { title: "Ez-Ez", artist: "Shashwat Sachdev, Diljit Dosanjh, Hanumankind", expected: "Ez-Ez" },
    { title: "Lutt Le Gaya", artist: "Shashwat Sachdev, Simran Choudhary", expected: "Lutt Le Gaya" },
    { title: "Ramba Ho", artist: "Shashwat Sachdev", expected: "Ramba Ho" },
    { title: "Shararat", artist: "Ranveer, Aditya Dhar, Shashwat", expected: "Shararat" },
    { title: "Teri Ni Kararan", artist: "Shashwat Sachdev, Lal Chand Yamla Jatt", expected: "Teri Ni Kararan" }
];

const normalizeString = (str) => {
    return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
};

async function runTests() {
    await initialize();
    
    let correctCount = 0;
    
    console.log("Running YouTube Search Tests...\n");
    
    for (const test of testCases) {
        console.log(`[TEST] Searching for: "${test.title}" by "${test.artist}"`);
        const primaryArtist = test.artist.split(',')[0].trim();
        const result = await searchSong(test.title, test.artist, test.durationMs || null, primaryArtist);
        
        if (result) {
            console.log(`  -> Found: "${result.name}" by "${result.artist?.name || 'Unknown'}" (ID: ${result.videoId})`);
            console.log(`  -> Confidence: ${result.confidence} (Score: ${result.matchScore.toFixed(2)})`);
            
            const expNorm = normalizeString(test.expected).toLowerCase();
            const resNorm = normalizeString(result.name).toLowerCase();
            
            const isMatch = resNorm.includes(expNorm) || expNorm.includes(resNorm);
            
            if (isMatch) {
                console.log(`  -> STATUS: PASS`);
                correctCount++;
            } else {
                console.log(`  -> STATUS: FAIL (Expected: ~"${test.expected}")`);
                
                // Explain WHY it likely failed based on the algorithm
                const queryUsed = `${test.title} ${test.artist}`;
                console.log(`     Reason: The query used was "${queryUsed}".`);
            }
        } else {
             console.log(`  -> Found: No results`);
             console.log(`  -> STATUS: FAIL`);
        }
        console.log("--------------------------------------------------");
    }
    
    console.log(`\nAccuracy: ${correctCount}/${testCases.length} (${((correctCount/testCases.length)*100).toFixed(2)}%)`);
}

runTests().catch(console.error);
