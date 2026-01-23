import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for local storage
const STORAGE_KEYS = {
  ANONYMOUS_STANS: 'anonymous_stans',
  ANONYMOUS_BRIEFINGS: 'anonymous_briefings',
  ANONYMOUS_PROMPTS: 'anonymous_prompts',
};

export interface LocalStan {
  id: string;
  name: string;
  description: string;
  category: string;
  category_id: string;
  image_url?: string;
  created_at: string;
  is_active: boolean;
}

export interface LocalBriefing {
  id: string;
  stan_id: string;
  stan_name: string;
  content: any;
  date: string;
  created_at: string;
}

class LocalStorageService {
  // Stans Management
  async getStans(): Promise<LocalStan[]> {
    try {
      const stansJson = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_STANS);
      return stansJson ? JSON.parse(stansJson) : [];
    } catch (error) {
      console.error('Error loading local stans:', error);
      return [];
    }
  }

  async addStan(stan: Omit<LocalStan, 'id' | 'created_at'>): Promise<LocalStan> {
    try {
      const stans = await this.getStans();
      
      // Check if stan already exists
      const existingStan = stans.find(s => s.name === stan.name);
      if (existingStan) {
        return existingStan;
      }
      
      const newStan: LocalStan = {
        ...stan,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      
      stans.push(newStan);
      await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_STANS, JSON.stringify(stans));
      
      return newStan;
    } catch (error) {
      console.error('Error adding local stan:', error);
      throw error;
    }
  }

  async removeStans(stanIds: string[]): Promise<void> {
    try {
      const stans = await this.getStans();
      const filteredStans = stans.filter(s => !stanIds.includes(s.id));
      await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_STANS, JSON.stringify(filteredStans));
    } catch (error) {
      console.error('Error removing local stans:', error);
      throw error;
    }
  }

  async updateStan(stanId: string, updates: Partial<LocalStan>): Promise<void> {
    try {
      const stans = await this.getStans();
      const stanIndex = stans.findIndex(s => s.id === stanId);
      
      if (stanIndex !== -1) {
        stans[stanIndex] = { ...stans[stanIndex], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_STANS, JSON.stringify(stans));
      }
    } catch (error) {
      console.error('Error updating local stan:', error);
      throw error;
    }
  }

  // Briefings Management
  async getBriefings(date?: string): Promise<LocalBriefing[]> {
    try {
      const briefingsJson = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_BRIEFINGS);
      const briefings: LocalBriefing[] = briefingsJson ? JSON.parse(briefingsJson) : [];
      
      if (date) {
        return briefings.filter(b => b.date === date);
      }
      
      return briefings;
    } catch (error) {
      console.error('Error loading local briefings:', error);
      return [];
    }
  }

  async saveBriefing(briefing: Omit<LocalBriefing, 'id' | 'created_at'>): Promise<LocalBriefing> {
    try {
      const briefings = await this.getBriefings();
      
      // Check if briefing already exists for this stan and date
      const existingIndex = briefings.findIndex(
        b => b.stan_id === briefing.stan_id && b.date === briefing.date
      );
      
      const newBriefing: LocalBriefing = {
        ...briefing,
        id: `briefing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      
      if (existingIndex !== -1) {
        briefings[existingIndex] = newBriefing;
      } else {
        briefings.push(newBriefing);
      }
      
      // Keep only last 30 days of briefings to save space
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredBriefings = briefings.filter(
        b => new Date(b.created_at) > thirtyDaysAgo
      );
      
      await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_BRIEFINGS, JSON.stringify(filteredBriefings));
      
      return newBriefing;
    } catch (error) {
      console.error('Error saving local briefing:', error);
      throw error;
    }
  }

  // Clear all anonymous data (useful when user signs in)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ANONYMOUS_STANS,
        STORAGE_KEYS.ANONYMOUS_BRIEFINGS,
        STORAGE_KEYS.ANONYMOUS_PROMPTS,
      ]);
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  // Migrate anonymous data to user account (when user signs up)
  async getDataForMigration() {
    const stans = await this.getStans();
    const briefings = await this.getBriefings();
    
    return {
      stans,
      briefings,
    };
  }
}

export default new LocalStorageService();