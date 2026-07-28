const checkVersionMismatch = (spotifyOriginalTitle, ytTitle) => {
    let penalty = 0;

    const lowerYt = ytTitle.toLowerCase();
    
    // Define the modifiers and their penalties
    const modifiers = {
        "live": -25,
        "remix": -20,
        "cover": -20,
        "karaoke": -20,
        "instrumental": -20
    };

    for (const [mod, pen] of Object.entries(modifiers)) {
        // If YT has it but Spotify doesn't, penalize
        if (lowerYt.includes(mod) && !spotifyOriginalTitle.includes(mod)) {
            penalty += pen;
        }
    }

    return penalty;
};

module.exports = {
    checkVersionMismatch
};
