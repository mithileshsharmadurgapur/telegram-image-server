module.exports = async (req, res) => {
  // 1. Explicitly set CORS headers at the very beginning of the request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle OPTIONS preflight request extremely early and return
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};

    // 3. Retrieve secrets securely from Vercel Environment Variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: 'Server misconfiguration: missing tokens.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No imageBase64 provided in request body.' });
    }

    // 4. Strip out any "data:image/jpeg;base64," prefix and decode Base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 5. Construct FormData using Native Node.js 18+ APIs (No Axios, No external form-data package)
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, 'image.jpg');

    // 6. Send to Telegram API using Native fetch()
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Telegram API Error:', data);
      return res.status(500).json({ error: 'Failed to upload to Telegram', details: data });
    }

    // 7. Extract the file_id for the original (highest resolution) image
    const fileSizes = data.result.photo;
    const fileId = fileSizes[fileSizes.length - 1].file_id;

    // 8. Return the file_id to the frontend
    return res.status(200).json({ success: true, file_id: fileId });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
