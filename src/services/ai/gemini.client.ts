import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GEMINI_API_KEY || '';

export const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

export const ai = new GoogleGenAI({apiKey: geminiApiKey});