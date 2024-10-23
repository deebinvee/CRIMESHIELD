const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const output = document.getElementById('output');

// Infura project ID and secret (replace with your own)
const INFURA_PROJECT_ID = '<YOUR_INFURA_PROJECT_ID>';
const INFURA_PROJECT_SECRET = '<YOUR_INFURA_PROJECT_SECRET>';
const INFURA_URL = `https://ipfs.infura.io:5001/api/v0/`;

uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(INFURA_URL + 'add', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + btoa(INFURA_PROJECT_ID + ':' + INFURA_PROJECT_SECRET)
            },
            body: formData
        });

        const data = await response.json();
        const cid = data.Hash;

        output.innerHTML = `
            <p>File uploaded successfully!</p>
            <p>Access your file <a href="https://ipfs.io/ipfs/${cid}" target="_blank">here</a></p>
        `;
    } catch (error) {
        console.error('Error uploading file:', error);
        output.innerHTML = '<p>Error uploading file. Please try again.</p>';
    }
});
