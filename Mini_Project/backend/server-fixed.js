const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({limit:'10mb'}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive:true});
}

app.use('/uploads', express.static(uploadsDir));
app.use('/images', express.static(uploadsDir));

app.get('/', (req, res) => res.json({status: 'Academic Exchange Backend OK'}));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
});
