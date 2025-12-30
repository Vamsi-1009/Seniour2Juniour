const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

const uploads = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploads)) fs.mkdirSync(uploads);

app.use('/uploads', express.static(uploads));
app.use('/images', express.static(uploads));

app.get('/api/health', (req, res) => res.json({status: 'OK'}));

app.listen(5000, () => console.log('🚀 http://localhost:5000'));
