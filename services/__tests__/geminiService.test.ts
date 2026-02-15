import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSlide } from '../geminiService';

describe('geminiService (fetch-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends correct request to /analyze endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ front: 'Concept', back: 'Explanation' }),
    });

    const result = await analyzeSlide('data:image/jpeg;base64,abc', 1);

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64_image: 'data:image/jpeg;base64,abc',
        page_number: 1,
        retry_count: 0,
      }),
    });

    expect(result).toEqual({ front: 'Concept', back: 'Explanation' });
  });

  it('passes retry_count to the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ front: 'X', back: 'Y' }),
    });

    await analyzeSlide('data:image/jpeg;base64,abc', 3, 2);

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/analyze', expect.objectContaining({
      body: JSON.stringify({
        base64_image: 'data:image/jpeg;base64,abc',
        page_number: 3,
        retry_count: 2,
      }),
    }));
  });

  it('throws error when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ detail: 'Model overloaded' }),
    });

    await expect(analyzeSlide('data:image/jpeg;base64,abc', 1))
      .rejects.toThrow('Model overloaded');
  });

  it('throws error with statusText when response.json() fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(analyzeSlide('data:image/jpeg;base64,abc', 1))
      .rejects.toThrow('Bad Gateway');
  });

  it('throws on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(analyzeSlide('data:image/jpeg;base64,abc', 1))
      .rejects.toThrow('Failed to fetch');
  });

  it('returns correct data structure from API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        front: 'Machine Learning Basics',
        back: 'ML is a subset of AI that focuses on learning from data.',
      }),
    });

    const result = await analyzeSlide('data:image/jpeg;base64,img', 5);

    expect(result).toHaveProperty('front');
    expect(result).toHaveProperty('back');
    expect(typeof result.front).toBe('string');
    expect(typeof result.back).toBe('string');
  });
});