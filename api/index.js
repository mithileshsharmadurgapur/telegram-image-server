export default async function handler(req, res) {
  // 1. CORS Setup (वेबसाइट को सर्वर से बात करने की इजाज़त)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2. पार्सल (Payload) में से Data और Name निकालना
  const { fileBase64, fileName } = req.body;

  if (!fileBase64) {
    return res.status(400).json({ error: "No fileBase64 provided in request body." });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: "Telegram keys missing in Vercel." });
  }

  try {
    // 3. Base64 को खोलना और चेक करना कि यह क्या है (Image या PDF/Excel)
    const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid Base64 format." });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const isImage = mimeType.startsWith('image/');
    
    // अगर कोई नाम नहीं आया, तो डिफ़ॉल्ट नाम रखें
    const finalFileName = fileName || (isImage ? 'upload.jpg' : 'document.pdf');

    // 4. टेलीग्राम को भेजने के लिए पार्सल तैयार करना
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    
    const blob = new Blob([buffer], { type: mimeType });
    let telegramApiUrl = "";
    
    if (isImage) {
        // फोटो के लिए sendPhoto
        formData.append('photo', blob, finalFileName);
        telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    } else {
        // PDF, Excel आदि के लिए sendDocument
        formData.append('document', blob, finalFileName);
        telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    }

    // 5. टेलीग्राम को पार्सल भेजना
    const response = await fetch(telegramApiUrl, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (!data.ok) {
        return res.status(400).json({ error: "Failed to upload to Telegram", details: data });
    }

    // 6. रसीद (file_id) निकालकर वापस ऐप को देना
    let file_id = "";
    if (isImage && data.result.photo) {
        file_id = data.result.photo[data.result.photo.length - 1].file_id;
    } else if (data.result.document) {
        file_id = data.result.document.file_id;
    }

    return res.status(200).json({ success: true, file_id: file_id });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
