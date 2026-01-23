interface StanPrompt {
  id?: string;
  user_id: string;
  stan_id: string;
  custom_prompt?: string;
  focus_areas?: string[];
  tone?: string;
  length?: string;
  include_sources?: boolean;
  include_social_media?: boolean;
  include_fan_reactions?: boolean;
  include_upcoming_events?: boolean;
  exclude_topics?: string[];
}

interface PromptTemplate {
  id: string;
  category_id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  is_default: boolean;
  categories: {
    name: string;
    icon: string;
    color: string;
  };
}

import { API_URL } from '../config/api';

const BASE_URL = `${API_URL}/api`;

export const promptService = {
  // Get custom prompt for a stan
  async getPrompt(userId: string, stanId: string): Promise<StanPrompt | null> {
    try {
      const response = await fetch(`${BASE_URL}/prompts?user_id=${userId}&stan_id=${stanId}`);
      if (!response.ok) throw new Error('Failed to fetch prompt');
      const data = await response.json();
      return data.prompt;
    } catch (error) {
      console.error('Error fetching prompt:', error);
      return null;
    }
  },

  // Save custom prompt for a stan
  async savePrompt(prompt: StanPrompt): Promise<StanPrompt | null> {
    try {
      const response = await fetch(`${BASE_URL}/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });
      if (!response.ok) throw new Error('Failed to save prompt');
      const data = await response.json();
      return data.prompt;
    } catch (error) {
      console.error('Error saving prompt:', error);
      return null;
    }
  },

  // Delete custom prompt (revert to default)
  async deletePrompt(userId: string, stanId: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/prompts?user_id=${userId}&stan_id=${stanId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete prompt');
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
  },

  // Get prompt templates
  async getTemplates(categoryId?: string): Promise<PromptTemplate[]> {
    try {
      const url = categoryId 
        ? `${BASE_URL}/prompt-templates?category_id=${categoryId}`
        : `${BASE_URL}/prompt-templates`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }
};

export default promptService;