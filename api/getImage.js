module.exports = async (req, res) => {
  // 1. Explicitly set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { file_id } = req.query;

    if (!file_id) {
      return res.status(400).json({ error: 'Missing file_id parameter.' });
    }

    // 3. Retrieve secrets securely
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Server misconfiguration: missing token.' });
    }

    // 4. Step 1: Call getFile to get the file_path
    const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${file_id}`;
    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();

    if (!fileResponse.ok || !fileData.ok) {
      console.error('Telegram getFile Error:', fileData);
      return res.status(500).json({ error: 'Failed to retrieve file info', details: fileData });
    }

    const filePath = fileData.result.file_path;

    // 5. Step 2: Download the actual file binary
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const imageResponse = await fetch(downloadUrl);

    if (!imageResponse.ok) {
      return res.status(500).json({ error: 'Failed to download image from Telegram' });
    }

    // 6. Pipe the image back to the client with appropriate headers
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // Add cache control to prevent re-fetching the image constantly
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Convert the image data to a buffer and send it back natively
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return res.send(buffer);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
