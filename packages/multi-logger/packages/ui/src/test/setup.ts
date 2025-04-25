import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  cleanup(); // Clean up any rendered components
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
  
  // Clear any intervals or timeouts
  const interval = setInterval(() => {}, 0);
  clearInterval(interval);
  for (let i = 1; i < Number(interval); i++) {
    clearInterval(i);
  }
  
  // Clear any pending promises
  return new Promise(resolve => setImmediate(resolve));
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL and URL.revokeObjectURL
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

// Mock setInterval and clearInterval
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

global.setInterval = vi.fn((handler: TimerHandler, timeout?: number) => {
  return originalSetInterval(handler, timeout) as unknown as NodeJS.Timeout;
}) as typeof global.setInterval;

global.clearInterval = vi.fn((id: NodeJS.Timeout) => {
  return originalClearInterval(id);
}) as typeof global.clearInterval; 