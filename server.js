const express = require('express');
const app = express();
const PORT = 4004;

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Partner Service running on port ${PORT}`);
});