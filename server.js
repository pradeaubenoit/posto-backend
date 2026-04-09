const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Posto server is running!' });
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;

  const prompt = `Tu es l'assistant créatif de BDLIM, blanchisserie fondée en 1916.
Titre : "${title}"
Mise en avant : "${highlight}"
CTA : ${cta}

Réponds EXACTEMENT dans ce format :
CAPTION_1: [première caption avec emojis]
CAPTION_2: [deuxième caption différente avec emojis]
CAPTION_3: [troisième caption poétique avec emojis]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    
    // Return full response for debugging
    if (!data.content || !data.content[0]) {
      return res.json({ error: 'API error', fullResponse: data });
    }
    
    const text = data.content[0].text;
    const captions = [];
    
    const lines = text.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('CAPTION_1:')) captions[0] = t.replace('CAPTION_1:', '').trim();
      else if (t.startsWith('CAPTION_2:')) captions[1] = t.replace('CAPTION_2:', '').trim();
      else if (t.startsWith('CAPTION_3:')) captions[2] = t.replace('CAPTION_3:', '').trim();
    }

    res.json({ captions: captions.filter(Boolean), rawText: text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur demarré sur le port ${PORT}`));
