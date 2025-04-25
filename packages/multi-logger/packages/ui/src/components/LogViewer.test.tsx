import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LogLevel } from '@ai-agent/multi-logger/types';
import type { ILogger } from '@ai-agent/multi-logger/types';
import { LogViewer } from './LogViewer';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('LogViewer', () => {
  const mockLogger: ILogger = {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockResolvedValue([]),
    clear: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<LogViewer logger={mockLogger} />);
    });
    expect(screen.getByText('No logs available')).toBeInTheDocument();
  });

  it('handles time range changes', async () => {
    await act(async () => {
      render(<LogViewer logger={mockLogger} />);
    });
    
    const timeRangeSelect = screen.getByLabelText('Time Range');
    expect(timeRangeSelect).toBeInTheDocument();
  });

  it('handles log level filter changes', async () => {
    await act(async () => {
      render(<LogViewer logger={mockLogger} />);
    });
    
    const logLevelSelect = screen.getByLabelText('Log Level');
    expect(logLevelSelect).toBeInTheDocument();
  });

  it('handles download button click', async () => {
    await act(async () => {
      render(<LogViewer logger={mockLogger} />);
    });
    
    const downloadButton = screen.getByLabelText('Download Logs');
    expect(downloadButton).toBeInTheDocument();
  });

  it('handles clear button click', async () => {
    await act(async () => {
      render(<LogViewer logger={mockLogger} />);
    });
    
    const clearButton = screen.getByLabelText('Clear Logs');
    expect(clearButton).toBeInTheDocument();
  });
}); 