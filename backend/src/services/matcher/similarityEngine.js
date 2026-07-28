const stringSimilarity = require("string-similarity");

const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    // Dice's Coefficient returns a fraction between 0 and 1
    return stringSimilarity.compareTwoStrings(str1, str2);
};

module.exports = {
    calculateSimilarity
};
