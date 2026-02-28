const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (req.method === 'POST') {
        try {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('photo', Buffer.from(req.body.image, 'base64'), { filename: 'upload.jpg' });

            const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
                headers: formData.getHeaders()
            });

            const fileId = response.data.result.photo.pop().file_id;
            return res.status(200).json({ success: true, file_id: fileId });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'GET') {
        const { file_id } = req.query;
        if (!file_id) return res.status(400).send("File ID missing");
        try {
            const fileResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
            const filePath = fileResponse.data.result.file_path;
            const finalUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            
            const imageResponse = await axios.get(finalUrl, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', 'image/jpeg');
            return res.send(imageResponse.data);
        } catch (error) {
            return res.status(500).send("Error loading image");
        }
    }
}
