import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // AI Vault Analysis Endpoint
  app.post('/api/vault/ai-analyze', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured. Please add it to your environment secrets.',
        });
      }

      const { prompt, vaultSummary, selectedNote } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert Obsidian Knowledge Management and Second Brain Consultant. 
Analyze the provided Obsidian Vault structure, notes, tags, and link relationships to deliver structured, actionable insights.

${vaultSummary ? `VAULT CONTEXT:\n${JSON.stringify(vaultSummary, null, 2)}` : ''}
${selectedNote ? `CURRENT NOTE:\n${JSON.stringify(selectedNote, null, 2)}` : ''}

USER INSTRUCTION:
${prompt || 'Provide a holistic critique of this Obsidian vault structure, suggesting Maps of Content (MOCs), missing knowledge bridges, and organization improvements.'}

Respond in clean markdown with clear headings, bullet points, and actionable advice. Include suggested [[WikiLinks]] where applicable.`,
              },
            ],
          },
        ],
      });

      return res.json({
        analysis: response.text || 'No response generated.',
      });
    } catch (err: any) {
      console.error('Error in /api/vault/ai-analyze:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process AI analysis',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Obsidian Vault Checker running at http://localhost:${PORT}`);
  });
}

startServer();
