import { Flashcard } from "../types";

// Removed @google/genai dependency and direct API key usage for security

const API_BASE_URL = 'http://localhost:8000';

export interface GeminiModel {
  id: string;
  name: string;
}

export const fetchModels = async (): Promise<{ models: GeminiModel[]; default: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching models:', error);
    // Return fallback defaults if backend is unreachable
    return {
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
      ],
      default: 'gemini-2.5-flash',
    };
  }
};

export const analyzeSlide = async (base64Image: string, pageNumber: number, retryCount = 0, model?: string): Promise<{ front: string; back: string; skip?: boolean }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64_image: base64Image,
        page_number: pageNumber,
        retry_count: retryCount,
        model: model || undefined,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Analysis failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error(`Error analyzing slide ${pageNumber}:`, error);
    throw error;
  }
};