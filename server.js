const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const emailjs = require('@emailjs/nodejs');
const { Pool } = require('pg');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        sector VARCHAR(255),
        color VARCHAR(20) DEFAULT '#3d8ce0',
        color_light VARCHAR(20) DEFAULT '#0e3270',
        email VARCHAR(255),
        phone VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS demandes (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        type VARCHAR(100),
        message TEXT,
        style VARCHAR(100),
        video_url TEXT,
        status VARCHAR(50) DEFAULT 'nouveau',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    const res = await pool.query('SELECT COUNT(*) FROM clients');
    if (res.rows[0].count === '0') {
      await pool.query(`INSERT INTO clients (name, slug, sector, color, color_light, email) VALUES ('BDLIM', 'bdlim', 'Blanchisserie', '#1a5276', '#2471a3', 'contact@bdlim.fr')`);
    }
    console.log('DB OK');
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}

initDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'app.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/admin.html', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', async (req, res) => {
  const { name, slug, sector, color, color_light, email, phone, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, slug, sector, color, color_light, email, phone, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, slug, sector, color||'#3d8ce0', color_light||'#0e3270', email, phone, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/demandes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM demandes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/demandes/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE demandes SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/demandes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM demandes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/:client', async (req, res) => {
  const clientId = req.params.client.toLowerCase();
  try {
    const result = await pool.query('SELECT * FROM clients WHERE slug = $1', [clientId]);
    if (result.rows.length === 0) return res.sendFile(path.join(__dirname, 'app.html'));
    const client = result.rows[0];
    let html = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
    html = html.replace(/Posto Studio/g, client.name);
    html = html.replace(/<title>Posto Studio<\/title>/, '<title>' + client.name + '</title>');
    html = html.replace(/#3d8ce0/g, client.color);
    html = html.replace(/#0e3270/g, client.color_light);
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(__dirname, 'app.html'));
  }
});

app.post('/send-email', async (req, res) => {
  const { name, email, type, message, style, videoUrl } = req.body;
  try {
    await pool.query(
      'INSERT INTO demandes (client_name, client_email, type, message, style, video_url) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, email, type, message, style, videoUrl||null]
    );
    await emailjs.send('service_qjbwtf8', 'template_j6vpg4b', {
      name: name||'Inconnu', email: email||'',
      type: type||'Demande',
      message: (message||'') + (videoUrl ? '\n\nLIEN VIDEO : ' + videoUrl : '\n\nPas de video jointe.'),
      style: style||'N/A'
    }, { publicKey: 'Gg1Wl2WLrhqbfxyxO', privateKey: 'EnL1sdzNyW0aSuGlZRVM8' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message||JSON.stringify(error) });
  }
});

app.post('/upload-video', express.raw({ type: '*/*', limit: '200mb' }), async (req, res) => {
  try {
    if (!req.body||req.body.length===0) return res.status(400).json({ error: 'Pas de fichier' });
    const base64 = req.body.toString('base64');
    const result = await cloudinary.uploader.upload('data:video/mp4;base64,'+base64, {
      resource_type: 'video', folder: 'posto-videos', public_id: 'video_'+Date.now()
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;
  const prompt = 'Tu es un expert en reseaux sociaux pour un commercant. Adapte ton contenu au contexte fourni.\nTitre : "'+title+'"\nMise en avant : "'+highlight+'"\nCTA : '+(cta==='Oui'?'Oui':'Non')+'\n\nREPONDS UNIQUEMENT :\n'+(aiTitle==='Oui'?'NOUVEAU_TITRE: [max 8 mots]\n':'')+'CAPTION_1: [2-3 phrases emojis]\nCAPTION_2: [different 2-3 phrases emojis]\nCAPTION_3: [poetique 2-3 phrases emojis]';
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    if (!data.content||!data.content[0]) return res.status(500).json({ error: 'API error' });
    res.json({ text: data.content[0].text });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Serveur demarre sur le port ' + PORT));
