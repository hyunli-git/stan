import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface StanSuggestion {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  categoryId?: string;
}

interface OnboardingScreenProps {
  navigation: any;
}

const STAN_SUGGESTIONS: StanSuggestion[] = [
  // K-Pop & Entertainment
  { id: '1', name: 'BTS', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Global superstars breaking barriers worldwide' },
  { id: '2', name: 'BLACKPINK', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Queens of K-Pop with killer fashion and music' },
  { id: '16', name: 'K-Pop Demon Hunters', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Netflix\'s biggest movie ever - K-Pop girl group fights demons!' },
  
  // Music
  { id: '3', name: 'Taylor Swift', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Storytelling genius breaking records with every era' },
  { id: '4', name: 'Bad Bunny', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Reggaeton king bringing Latin music to the world' },
  { id: '5', name: 'Tyler, the Creator', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Creative visionary pushing boundaries in music and fashion' },
  
  // Sports
  { id: '6', name: 'Los Angeles Lakers', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Purple and Gold legends with championship legacy' },
  { id: '7', name: 'Real Madrid', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Los Blancos - the most successful club in football' },
  { id: '8', name: 'Manchester United', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Red Devils with massive global fanbase' },
  { id: '9', name: 'Dallas Cowboys', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'America\'s Team with star power' },
  { id: '10', name: 'New York Yankees', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: '27-time World Series champions' },
  { id: '11', name: 'Toronto Blue Jays', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Canada\'s team with passionate fans and exciting young talent' },
  
  // Gaming
  { id: '12', name: 'League of Legends', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'The world\'s biggest esport with epic competitions' },
  { id: '13', name: 'Valorant', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Tactical shooter taking esports by storm' },
  { id: '14', name: 'Fortnite', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Battle royale phenomenon with constant updates' },
  { id: '15', name: 'Minecraft', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Infinite creativity in blocky worlds' },
];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [selectedStans, setSelectedStans] = useState<StanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { user, markOnboardingComplete } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (error) throw error;
      setCategories(data || []);
      
      if (data) {
        STAN_SUGGESTIONS.forEach(suggestion => {
          const category = data.find(cat => cat.name === suggestion.category);
          if (category) {
            suggestion.categoryId = category.id;
          }
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const toggleSelection = (suggestion: StanSuggestion) => {
    setSelectedStans(prev => {
      const isSelected = prev.some(stan => stan.id === suggestion.id);
      if (isSelected) {
        return prev.filter(stan => stan.id !== suggestion.id);
      } else {
        return [...prev, suggestion];
      }
    });
  };

  const isSelected = (suggestion: StanSuggestion) => {
    return selectedStans.some(stan => stan.id === suggestion.id);
  };

  const handleContinue = async () => {
    if (selectedStans.length === 0) {
      Alert.alert('Select some stans!', 'Choose at least one thing you want to follow to get started.');
      return;
    }

    setLoading(true);
    try {
      const stansToInsert = selectedStans.map(stan => ({
        user_id: user?.id,
        category_id: stan.categoryId,
        name: stan.name,
        description: stan.description,
        priority: 3,
        is_active: true,
      }));

      const { data: insertedStans, error } = await supabase
        .from('stans')
        .insert(stansToInsert)
        .select();

      if (error) throw error;

      // Generate initial briefings for the new stans
      if (insertedStans && insertedStans.length > 0) {
        try {
          console.log('🎯 Generating initial briefings for new stans...');
          const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-backend-7btyucqrz-haleys-projects-1932fed0.vercel.app';
          
          // Generate briefings for each new stan
          await Promise.all(insertedStans.map(async (stan) => {
            try {
              const response = await fetch(`${backendUrl}/api/generate-briefing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  stanId: stan.id,
                  stanName: stan.name,
                  userId: user?.id 
                })
              });
              
              if (response.ok) {
                console.log(`✅ Generated briefing for ${stan.name}`);
              }
            } catch (err) {
              console.error(`Failed to generate briefing for ${stan.name}:`, err);
            }
          }));
        } catch (error) {
          console.error('Error generating initial briefings:', error);
          // Don't block navigation if briefing generation fails
        }
      }

      markOnboardingComplete();
      navigation.navigate('MainTabs');
      
      Alert.alert(
        '🎉 Welcome to STAN!', 
        `You're now following ${selectedStans.length} things. Get ready for your daily briefings!`
      );
    } catch (error: any) {
      console.error('Error adding stans:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      backgroundColor: '#fff',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}>
        <Text style={styles.title}>🌟 Welcome to STAN!</Text>
        <Text style={styles.subtitle}>
          Pick the artists, teams, and creators you want to follow.
          We'll give you daily AI briefings about what they're up to.
        </Text>
        {selectedStans.length > 0 && (
          <View style={styles.selectionBadge}>
            <Text style={styles.selectionText}>
              {selectedStans.length} selected
            </Text>
          </View>
        )}
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        paddingBottom: '140px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {STAN_SUGGESTIONS.map((item) => {
          const selected = isSelected(item);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.suggestionCard,
                { borderLeftColor: item.categoryColor },
                selected && { 
                  backgroundColor: item.categoryColor + '20',
                  borderWidth: 2,
                  borderColor: item.categoryColor,
                }
              ]}
              onPress={() => toggleSelection(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.categoryIcon}>{item.categoryIcon}</Text>
                  <View style={styles.cardText}>
                    <Text style={[styles.stanName, selected && { fontWeight: '700' }]}>
                      {item.name}
                    </Text>
                    <Text style={styles.stanCategory}>{item.category}</Text>
                  </View>
                </View>
                <View style={[
                  styles.selectButton, 
                  selected && { backgroundColor: item.categoryColor }
                ]}>
                  <Text style={[
                    styles.selectButtonText,
                    selected && { color: '#fff' }
                  ]}>
                    {selected ? '✓' : '+'}
                  </Text>
                </View>
              </View>
              <Text style={styles.stanDescription}>{item.description}</Text>
            </TouchableOpacity>
          );
        })}
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'AddStan' })}
          >
            <Text style={styles.skipText}>Add something else</Text>
          </TouchableOpacity>
        </View>
      </div>

      {/* Fixed Bottom Button */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '20px',
        paddingBottom: '40px',
      }}>
        <TouchableOpacity
          style={[
            styles.continueButton, 
            (loading || selectedStans.length === 0) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={loading || selectedStans.length === 0}
        >
          <Text style={styles.continueButtonText}>
            {loading 
              ? 'Adding...' 
              : selectedStans.length > 0 
                ? `Continue with ${selectedStans.length} selected`
                : 'Select at least one stan to continue'
            }
          </Text>
        </TouchableOpacity>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  selectionBadge: {
    backgroundColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  selectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 16,
    lineHeight: 32,
    textAlign: 'center',
    minWidth: 32,
  },
  cardText: {
    flex: 1,
  },
  stanName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  stanCategory: {
    fontSize: 14,
    color: '#666',
  },
  selectButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  stanDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  skipButton: {
    padding: 15,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'underline',
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});