import { Flashcard } from "../types";

// Removed @google/genai dependency and direct API key usage for security

const API_BASE_URL = 'http://localhost:8000';

export const analyzeSlide = async (base64Image: string, pageNumber: number, retryCount = 0): Promise<{ front: string; back: string; skip?: boolean }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64_image: base64Image,
        page_number: pageNumber,
        retry_count: retryCount
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