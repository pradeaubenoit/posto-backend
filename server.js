const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;

  const prompt = `Tu es l'assistant créatif d'un commerçant. Type de post : Fierté d'entreprise.
Titre : "${title}"
Mise en avant : "${highlight}"
CTA : ${cta}

Génère :
${aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [titre amélioré, max 8 mots]\n' : ''}CAPTION_1: [caption Instagram authentique, 2-3 phrases, avec 3-5 hashtags pertinents à la fin]
CAPTION_2: [caption différente, 2-3 phrases, avec 3-5 hashtags pertinents à la fin]
CAPTION_3: [caption plus poétique, 2-3 phrases, avec 3-5 hashtags pertinents à la fin]

Réponds UNIQUEMENT dans ce format.`;

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
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.content && data.content[0]) {
  res.json({ text: data.content[0].text });
} else {
  res.json({ error: "API error", details: JSON.stringify(data) });
};
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
