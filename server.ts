import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for file attachments & images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// System instruction for Clooney
const CLOONEY_SYSTEM_INSTRUCTION = `You are Clooney, a smart, friendly, all-in-one AI assistant — responsive, capable, and conversational. Similar in spirit to Claude.

Tone & Personality:
- Casual, warm, and interactive by default — like chatting with a knowledgeable friend.
- Flex tone based on the topic: light and fun for casual chat, focused and clear for technical, analytical, or serious requests.
- Handle casual chit-chat naturally (greetings, jokes, opinions, random questions) as smoothly as serious tasks without needing a mode switch.
- Express empathy, curiosity, and helpfulness.

Problem Solving & Math:
- Solve math problems, equations, logic puzzles, and scientific queries with clear step-by-step reasoning.
- ALWAYS format mathematical equations, formulas, fractions, exponents, and symbols with LaTeX syntax:
  - Use single dollar signs $...$ for inline math (e.g. $E = mc^2$, $\\frac{a}{b}$, $\\sqrt{x^2 + y^2}$, $x_1, x_2 = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$).
  - Use double dollar signs $$...$$ for standalone display equations.
  - This ensures all formulas render cleanly with KaTeX rather than raw plain text symbols.

Explaining & Depth:
- Explain concepts clearly with intuitive analogies and examples.
- Readily adjust explanation depth if the user asks to simplify (e.g., "explain like I'm 5") or go deeper (graduate-level analysis).
- Summarize long text concisely, compare different viewpoints fairly, and brainstorm creatively.

Coding:
- Write clean, robust, and well-commented code across languages (JavaScript/TypeScript, Python, Rust, Go, SQL, HTML/CSS, etc.).
- Always format code blocks with triple backticks and the specific language identifier (e.g. \`\`\`typescript ... \`\`\`).
- Offer debugging advice, edge-case analysis, and performance considerations when relevant.

Image Generation - CORE RULES & PROTOCOL:
When the user asks for an image, drawing, picture, illustration, or visual artwork:
1. Generate the image! When the user asks for a picture, create it. Don't reply with only a description or a text prompt unless they ask for that.
2. You MUST ALWAYS include an image generation prompt tag on its own line:
   [IMAGE_PROMPT: <detailed, literal prompt containing every subject, count, color, position, style, lighting, and setting specified by the user>]
   The Clooney frontend will immediately execute this tag and render the actual image inline into the conversation!
3. Follow the request literally:
   - Include every subject, object, color, number, setting, style, and mood the user mentions. Never swap, drop, or "improve" an element on your own.
   - Be accurate with specifics: match exact quantities (e.g., "three apples" means three), positions (left, right, behind), colors, text, clothing, and actions.
   - If the user names a real thing (a landmark, animal species, car model, food dish), depict it faithfully, with correct features and proportions.
   - Don't add unrequested elements: no extra people, logos, watermarks, text, or decorations unless asked.
   - Keep the style consistent: use the style the user requests (photorealistic, cartoon, watercolor, 3D render, anime, etc.). If none is given, default to a clean, realistic, high-quality look.
4. BEFORE GENERATING (mental checklist):
   - Break request into: subject, action, setting, style, lighting, colors, composition, and any text.
   - Fill small gaps with sensible, neutral defaults (natural lighting, balanced composition, sharp focus).
5. AFTER GENERATING (your text response MUST include):
   - Briefly state what you created, in one or two sentences.
   - Point out anything you couldn't match exactly and why.
   - Offer one or two quick tweaks (e.g., change colors, angle, or style).
6. REVISIONS:
   - When the user asks for a change, keep everything else in the image the same and change only what they asked for.
   - Output [IMAGE_PROMPT: <revised prompt keeping previous elements and modifying only what was requested>]
7. SAFETY:
   - Don't generate sexual content involving minors, graphic gore, real people in misleading or harmful situations, or content intended to harm or deceive. Decline politely and suggest a safe alternative.

Writing & Tone Adaptation:
- Help draft, edit, review, and polish writing (emails, essays, blog posts, stories, captions).
- Flexibly adapt tone on request (formal, executive, casual, humorous, persuasive, poetic, technical).

Files & Documents:
- When the user uploads documents, PDFs, data, or images, analyze them thoroughly, summarize key points, and answer any specific questions with accuracy.`;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    assistant: 'Clooney',
  });
});

// Audio transcription endpoint (transcribes voice input via Gemini 3.5 with high accuracy)
app.post('/api/transcribe', async (req, res) => {
  const { audioData, mimeType = 'audio/webm' } = req.body;

  if (!audioData || typeof audioData !== 'string') {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  try {
    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, '');
    
    // Clean MIME type (strip codecs parameters which cause API rejects)
    let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
    const validMimes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mpeg', 'audio/flac'];
    if (!validMimes.includes(cleanMime)) {
      cleanMime = 'audio/webm';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: `You are an expert speech recognition system.
Transcribe the speaker's voice with maximum clarity and fidelity:
- Capture every word, technical term, code identifier, mathematical phrase, and name accurately.
- Add proper punctuation, capitalization, and sentence structure.
- If the audio is silent or only ambient noise, return an empty string.
- Return ONLY the exact transcribed text, without quotation marks, conversational intros, or explanations.`,
            },
          ],
        },
      ],
    });

    const transcribedText = response.text ? response.text.trim() : '';
    return res.json({ text: transcribedText });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to transcribe audio.',
    });
  }
});

// Helper to determine mimeType and clean base64 data
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: 'application/octet-stream', base64: dataUrl };
}

// Unified Chat API with Streaming (SSE)
app.post('/api/chat', async (req, res) => {
  const { messages, tone, stream = true } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please set it in your environment.',
    });
  }

  // Adjust system instruction if specific tone was selected
  let customInstruction = CLOONEY_SYSTEM_INSTRUCTION;
  if (tone && tone !== 'default') {
    customInstruction += `\n\nSpecific Tone Override for this session: Please adopt a predominantly ${tone} tone in your responses.`;
  }

  try {
    // Format messages for Gemini API
    const formattedContents = messages.map((msg: any) => {
      const parts: any[] = [];

      // Process attachments if present
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.dataUrl) {
            const { mimeType, base64 } = parseDataUrl(att.dataUrl);
            parts.push({
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64,
              },
            });
          } else if (att.content) {
            parts.push({
              text: `\n[Attached File: ${att.name}]\n${att.content}\n[End of File: ${att.name}]\n`,
            });
          }
        }
      }

      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      return {
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts,
      };
    });

    // Determine model to use (gemini-3.5-flash has active free tier quota and instant response)
    const modelCandidates = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let selectedModel = 'gemini-3.5-flash';

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let streamSuccess = false;
      let sentAnyChunk = false;
      let lastError: any = null;

      for (const modelName of modelCandidates) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: formattedContents,
            config: {
              systemInstruction: customInstruction,
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          });

          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              sentAnyChunk = true;
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          res.write('data: [DONE]\n\n');
          res.end();
          streamSuccess = true;
          break;
        } catch (err: any) {
          console.warn(`Model ${modelName} stream error:`, err?.message || err);
          lastError = err;

          // If "Incomplete JSON segment at the end" occurred after chunks were already sent,
          // the response was already delivered to the client; cleanly terminate stream with [DONE]
          if (sentAnyChunk && err?.message?.includes('Incomplete JSON segment at the end')) {
            res.write('data: [DONE]\n\n');
            res.end();
            streamSuccess = true;
            break;
          }

          // If no chunks were sent yet, try the next model candidate
          if (err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('not found') || err?.message?.includes('Incomplete JSON')) {
            continue;
          }
          break;
        }
      }

      // If streaming encountered an issue before sending content, fallback to robust non-streaming call
      if (!streamSuccess && !sentAnyChunk) {
        for (const fallbackModel of modelCandidates) {
          try {
            const fallbackResp = await ai.models.generateContent({
              model: fallbackModel,
              contents: formattedContents,
              config: {
                systemInstruction: customInstruction,
                temperature: 0.7,
                maxOutputTokens: 8192,
              },
            });
            if (fallbackResp.text) {
              res.write(`data: ${JSON.stringify({ text: fallbackResp.text })}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
              streamSuccess = true;
              break;
            }
          } catch (e: any) {
            lastError = e;
            continue;
          }
        }
      }

      if (!streamSuccess && !sentAnyChunk) {
        const errorMsg = lastError?.message || 'Failed to stream response from AI model';
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // Non-streaming response
      let result = null;
      let lastError: any = null;

      for (const modelName of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: formattedContents,
            config: {
              systemInstruction: customInstruction,
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          });
          result = response.text;
          break;
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }

      if (result !== null) {
        return res.json({ text: result });
      } else {
        return res.status(500).json({ error: lastError?.message || 'Failed to generate response' });
      }
    }
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error occurred' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Image Generation Endpoint
app.post('/api/generate-image', async (req, res) => {
  const { prompt, aspectRatio = '1:1', referencePrompt, isRevision } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  try {
    const revisionContext = (isRevision && referencePrompt)
      ? `\nIMPORTANT: This is a REVISION of a previously generated image.\nPrevious image prompt: "${referencePrompt}".\nKeep EVERYTHING else from the previous image EXACTLY the same, and modify ONLY the following requested change: "${prompt}".\n`
      : '';

    const precisionSvgPrompt = `You are a precision SVG graphic illustrator.
Generate a high-fidelity, complete, beautifully detailed vector image matching EXACTLY what the user asks for:
"${prompt}"
${revisionContext}
CORE RULES:
1. Follow the request literally. Include every subject, object, color, number, setting, style, and mood the user mentions. Never swap, drop, or "improve" an element on your own.
2. Be accurate with specifics:
   - Match exact quantities (e.g. "three apples" means exactly three apples; "two cats" means two).
   - Match exact positions (left, right, behind, in front, centered).
   - Match exact colors (if user specified red, use red; if blue, use blue; do NOT restrict to any single palette).
   - Depict real things faithfully with correct features and proportions (landmarks, animals, cars, food).
3. Don't add unrequested elements: no random extra people, logos, watermarks, text, or decorations unless explicitly asked.
4. Keep the style consistent: use the style requested (photorealistic with detailed gradients and shading, cartoon, watercolor, 3D render, anime, etc.). If none is given, produce a clean, realistic, high-quality look.
5. Anatomy & Quality: correct hands, fingers, faces, limbs, realistic lighting, and consistent perspective.

OUTPUT REQUIREMENTS:
Return ONLY the complete, self-contained, valid SVG markup starting with <svg viewBox="0 0 800 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>.
Do NOT include markdown backticks or explanations.`;

    const svgResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: precisionSvgPrompt }] }],
    });

    let rawSvg = svgResponse.text || '';
    // Strip markdown code fences if present
    rawSvg = rawSvg.replace(/^```(xml|svg)?/i, '').replace(/```$/i, '').trim();

    const svgMatch = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      const svgCode = svgMatch[0];
      const base64Svg = Buffer.from(svgCode).toString('base64');
      return res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
        prompt,
        source: 'clooney-precision-engine',
      });
    }

    return res.status(502).json({
      error: 'Could not generate vector image markup. Please try another prompt.',
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    return res.status(500).json({
      error: err.message || 'Image generation failed',
    });
  }
});

// Setup Vite or static serving
async function setupServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clooney assistant server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
