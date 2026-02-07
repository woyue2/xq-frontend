
const axios = require('axios');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 4000;
const SECRET = 'change-this-in-production-secret';
const UPLOAD_URL = `http://localhost:${PORT}/api/upload/audio`;

const token = jwt.sign({ sub: 'test-teacher-id', role: 'teacher' }, SECRET, { expiresIn: '1h' });

const dummyFilePath = path.join(__dirname, 'dummy.webm');
fs.writeFileSync(dummyFilePath, 'dummy audio content');

async function testCase(name, options) {
    const form = new FormData();
    form.append('file', fs.createReadStream(dummyFilePath), {
        filename: options.filename || 'test.webm',
        contentType: options.contentType || 'audio/webm'
    });

    try {
        await axios.post(UPLOAD_URL, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`[${name}] Success (200)`);
    } catch (error) {
        if (error.response) {
            console.log(`[${name}] Failed (${error.response.status}):`, JSON.stringify(error.response.data));
        } else {
            console.log(`[${name}] Error:`, error.message);
        }
    }
}

async function runTests() {
    await testCase('Video/WebM', { contentType: 'video/webm' });
    fs.unlinkSync(dummyFilePath);
}

runTests();
