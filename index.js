import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

const upload = multer({ dest: 'uploads/' });

const port = 3000;
app.listen(port, () => {
    console.log(`Gemini API Server is running at http://localhost:${port}`)
});

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const imageGenerativePart = (filePath) => ({
    inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
    },
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Desc Image';
    const image = imageGenerativePart(req.file.path);
    try {
        const result = await model.generateContent(prompt, image);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimeType;

    try {
        const documentPart = {
            inlineData : { data: base64Data, mimeType}
        }
        const result = await model.generateContent('Analyse', documentPart);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(filePath);
    }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64audio,
            mimeType: req.file.mimetype,
        }
    }

    try {
        const result = await model.generateContent('Transcribe the following audio', audioPart);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});
