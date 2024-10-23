const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' folder

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve the HTML form at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle form submission
app.post('/submit-fir', upload.fields([{ name: 'written_complaint' }, { name: 'signature_file' }]), (req, res) => {
    const formData = {
        fir_no: req.body.fir_no,
        ipc_section: req.body.ipc_section,
        fir_date: req.body.fir_date,
        fir_time: req.body.fir_time,
        offence_date: req.body.offence_date,
        offence_time: req.body.offence_time,
        complainant_name: req.body.complainant_name,
        address: req.body.address,
        district: req.body.district,
        taluk: req.body.taluk,
        age: req.body.age,
        nationality: req.body.nationality,
        valuables_stolen: req.body.valuables_stolen
    };

    const dataPath = path.join(__dirname, 'fir_data.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        let jsonData = [];
        if (!err && data) {
            jsonData = JSON.parse(data);
        }
        jsonData.push(formData);
        fs.writeFile(dataPath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                console.error('Error saving data:', err);
                return res.status(500).json({ error: 'Failed to save data' });
            }
            res.json({ message: 'FIR submitted successfully', data: formData });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
