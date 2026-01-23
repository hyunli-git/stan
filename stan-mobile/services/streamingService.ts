/**
 * Streaming service for real-time briefing generation
 */

import { API_BASE_URL } from '../config/api';

export interface StreamChunk {
  event: 'start' | 'chunk' | 'complete' | 'error';
  data: any;
}

export class StreamingService {
  private eventSource: any = null;

  /**
   * Generate a briefing with real-time streaming
   */
  async *generateBriefingStream(
    stan: any,
    userId?: string,
    onProgress?: (progress: number) => void
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-briefing-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stan,
          userId,
          use_multi_agent: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let progress = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              progress += 10;
              if (onProgress) {
                onProgress(Math.min(progress, 90));
              }
              yield data as StreamChunk;
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      if (onProgress) {
        onProgress(100);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      yield {
        event: 'error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Cancel ongoing stream
   */
  cancelStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const streamingService = new StreamingService();
