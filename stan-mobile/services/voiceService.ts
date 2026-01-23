/**
 * Voice service for text-to-speech and speech-to-text
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export interface VoiceSettings {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
}

class VoiceService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;

  /**
   * Read briefing content aloud using TTS
   */
  async speakBriefing(
    text: string,
    settings?: VoiceSettings,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isPlaying = true;

        // Clean text for better TTS
        const cleanText = this.cleanTextForSpeech(text);

        Speech.speak(cleanText, {
          language: settings?.language || 'en-US',
          pitch: settings?.pitch || 1.0,
          rate: settings?.rate || 0.9,
          voice: settings?.voice,
          onStart: () => {
            console.log('Started speaking');
            if (onProgress) onProgress(0);
          },
          onDone: () => {
            console.log('Finished speaking');
            this.isPlaying = false;
            if (onProgress) onProgress(100);
            resolve();
          },
          onStopped: () => {
            console.log('Speech stopped');
            this.isPlaying = false;
            resolve();
          },
          onError: (error) => {
            console.error('Speech error:', error);
            this.isPlaying = false;
            reject(error);
          },
        });
      } catch (error) {
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isPlaying;
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }

  /**
   * Clean text for better TTS output
   */
  private cleanTextForSpeech(text: string): string {
    return text
      // Remove emojis
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '')
      // Remove markdown
      .replace(/[#*_~`]/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak individual topic
   */
  async speakTopic(
    title: string,
    content: string,
    settings?: VoiceSettings
  ): Promise<void> {
    const text = `${title}. ${content}`;
    return this.speakBriefing(text, settings);
  }

  /**
   * Speak summary only
   */
  async speakSummary(summary: string, settings?: VoiceSettings): Promise<void> {
    const text = `Here's your briefing summary: ${summary}`;
    return this.speakBriefing(text, settings);
  }
}

export const voiceService = new VoiceService();
