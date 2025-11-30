const axios = require('axios');

async function gptimage(prompt, buffer) {
    try {
        if (!prompt) throw new Error('Prompt is required.');
        if (!Buffer.isBuffer(buffer)) throw new Error('Image must be a buffer.');
        
        const { data } = await axios.post('https://ghibli-proxy.netlify.app/.netlify/functions/ghibli-proxy', {
            image: 'data:image/png;base64,' + buffer.toString('base64'),
            prompt: prompt,
            model: 'gpt-image-1',
            n: 1,
            size: 'auto',
            quality: 'low'
        }, {
            headers: {
                origin: 'https://overchat.ai',
                referer: 'https://overchat.ai/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            }
        });
        
        const result = data?.data?.[0]?.b64_json;
        if (!result) throw new Error('No result found.');
        
        return Buffer.from(result, 'base64');
    } catch (error) {
        throw new Error(error.message);
    }
}

// Usage:
const fs = require('fs');
gptimage('change skin color to black', fs.readFileSync('./ex/image2.jpg')).then(res => fs.writeFileSync('./ovc.jpg', res));
