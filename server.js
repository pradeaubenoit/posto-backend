const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'posto.html'));
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;

  const prompt = `Tu es un expert en réseaux sociaux pour BDLIM, blanchisserie industrielle fondée en 1916.

Génère IMMÉDIATEMENT 3 captions Instagram différentes pour ce post :
- Titre : "${title}"
- Mise en avant : "${highlight}"
- CTA : ${cta === 'Oui' ? 'Inclure un appel à l\'action' : 'Pas de CTA'}

RÉPONDS UNIQUEMENT avec ce format exact, sans introduction ni question :
${aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [titre accrocheur max 8 mots]\n' : ''}CAPTION_1: [caption authentique 2-3 phrases avec emojis]
CAPTION_2: [caption différente 2-3 phrases avec emojis]
CAPTION_3: [caption poétique 2-3 phrases avec emojis]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    
    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'API error', fullResponse: data });
    }
    
    const text = data.content[0].text;
    
    let newTitle = null;
    const captions = [];
    
    const lines = text.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('NOUVEAU_TITRE:')) newTitle = t.replace('NOUVEAU_TITRE:', '').trim();
      else if (t.startsWith('CAPTION_1:')) captions[0] = t.replace('CAPTION_1:', '').trim();
      else if (t.startsWith('CAPTION_2:')) captions[1] = t.replace('CAPTION_2:', '').trim();
      else if (t.startsWith('CAPTION_3:')) captions[2] = t.replace('CAPTION_3:', '').trim();
    }

    res.json({ newTitle, captions: captions.filter(Boolean), rawText: text });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur demarré sur le port ${PORT}`));
