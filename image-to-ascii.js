const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

async function img2ascii(buffer, { width = '100' } = {}) {
    try {
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
        const { mime } = await fromBuffer(buffer);
        if (!/image/.test(mime)) throw new Error('Buffer must be a image');
        
        const form = new FormData();
        form.append('art_type', 'mono');
        form.append('userfile', buffer, `${Date.now()}_rynn.jpg`);
        form.append('width', width.toString());
        const { data: rynn } = await axios.post('https://www.ascii-art-generator.org/', form, {
            headers: form.getHeaders()
        });
        const { data } = await axios.get('https://www.ascii-art-generator.org' + rynn.match(/\/FW\/result\.php\?name=[a-f0-9]{32}/g)[0]);
        const $ = cheerio.load(data);
        
        return $('#result-preview-wrap').text().trim();
    } catch (error) {
        throw new Error(error.message);
    }
}

// Usage:
const fs = require('fs');
const resp = await img2ascii(fs.readFileSync('./image.jpg'));
console.log(resp);
