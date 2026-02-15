import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL for file downloads
window.URL.createObjectURL = vi.fn(() => 'mock-url');
window.URL.revokeObjectURL = vi.fn();

// Mock crypto.randomUUID if not available
if (!window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: { randomUUID: () => 'test-uuid-' + Math.random() },
    writable: true,
  });
} else if (!window.crypto.randomUUID) {
  Object.defineProperty(window.crypto, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random(),
    writable: true,
  });
}

// Mock environment variables
process.env.API_KEY = 'test-api-key';

// Mock IntersectionObserver
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

// Canvas mock for PDF.js interactions in JSDOM
HTMLCanvasElement.prototype.getContext = vi.fn(() => {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Array(100),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
});

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock-image-data');