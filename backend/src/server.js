const express = require("express");

const app = express();
const PORT = 3000;

const indexRoutes = require("./routes");

app.use("/", indexRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});