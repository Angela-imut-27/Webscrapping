const axios = require('axios');

async function publicai(question) {
    try {
        if (!question) throw new Error('Question is required.');
        
        const generateId = (length = 16) => Array.from({ length }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
        const { data } = await axios.post('https://publicai.co/api/chat', {
            tools: {},
            id: generateId(),
            messages: [{
                id: generateId(),
                role: 'user',
                parts: [{
                    type: 'text',
                    text: question
                }]
            }],
            trigger: 'submit-message'
        }, {
            headers: {
                origin: 'https://publicai.co',
                referer: 'https://publicai.co/chat',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            }
        });
        
        const result = data.split('\n\n').filter(line => line && !line.includes('[DONE]')).map(line => JSON.parse(line.substring(6))).filter(line => line.type === 'text-delta').map(line => line.delta).join('');
        if (!result) throw new Error('No result found.');
        
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Usage:
publicai('hi! how are you?').then(console.log);
