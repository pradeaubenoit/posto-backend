const express = require('express');
const cors = require('cors');
const app = express();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.post('/generate', async (req, res) => {
  const { title, highlight, cta, aiTitle, clientName, tone, hashtags } = req.body;
  const prompt = `Tu es l'assistant créatif de ${clientName || 'un commerçant'}. Style : ${tone || 'professionnel et chaleureux'}.
Titre : "${title}"
Mise en avant : "${highlight}"
CTA : ${cta}
Améliorer titre : ${aiTitle}
Hashtags : ${hashtags || '#business'}
${aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [titre accrocheur max 8 mots]\n' : ''}CAPTION_1: [caption 2-3 phrases puis saut de ligne puis 3-5 hashtags]
CAPTION_2: [caption ton différent puis saut de ligne puis hashtags]
CAPTION_3: [caption poétique puis saut de ligne puis hashtags]
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
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (data.content && data.content[0]) {
      res.json({ text: data.content[0].text });
    } else {
      res.json({ error: 'API error', details: JSON.stringify(data) });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send-invitation', async (req, res) => {
  const { clientName, clientEmail, clientCode, appUrl } = req.body;
  try {
    await resend.emails.send({
      from: 'Posto <onboarding@resend.dev>',
      to: clientEmail,
      subject: `Bienvenue sur Posto, ${clientName} !`,
      html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;background:#07080f;color:#eeeae4;padding:40px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:40px;margin-bottom:12px;">✨</div>
          <h1 style="color:#3d8ce0;font-size:24px;margin:0;">Posto</h1>
          <p style="color:rgba(238,234,228,0.5);font-size:13px;margin:6px 0 0;">Ton assistant créatif IA</p>
        </div>
        <p style="font-size:15px;margin-bottom:8px;">Bonjour <strong>${clientName}</strong>,</p>
        <p style="font-size:14px;color:rgba(238,234,228,0.7);line-height:1.6;margin-bottom:24px;">Ton espace Posto est prêt ! Voici ton code d'accès :</p>
        <div style="background:rgba(61,140,224,0.1);border:2px solid rgba(61,140,224,0.3);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="font-size:11px;color:#3d8ce0;letter-spacing:3px;margin:0 0 8px;font-family:monospace;">TON CODE D'ACCÈS</p>
          <p style="font-size:28px;font-weight:bold;color:#3d8ce0;letter-spacing:6px;margin:0;font-family:monospace;">${clientCode}</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${appUrl || 'https://delicate-blancmange-08d30e.netlify.app'}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0e3270,#3d8ce0);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:bold;">Accéder à Posto →</a>
        </div>
        <p style="font-size:12px;color:rgba(238,234,228,0.4);text-align:center;line-height:1.6;">Une question ? Réponds directement à cet email.<br>Réponse garantie en 24h.</p>
      </div>`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
