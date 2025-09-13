import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppleMusicTheme } from '../styles/AppleMusicTheme';

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

  // Debug logging
  console.log('🚀 OnboardingScreen loaded');
  console.log('🚀 STAN_SUGGESTIONS count:', STAN_SUGGESTIONS.length);

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
      
      // Map category IDs to suggestions
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
        const newSelection = prev.filter(stan => stan.id !== suggestion.id);
        console.log('🔄 Deselected stan, count:', newSelection.length);
        return newSelection;
      } else {
        const newSelection = [...prev, suggestion];
        console.log('🔄 Selected stan, count:', newSelection.length);
        return newSelection;
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
      // Add all selected stans to database
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
          const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-peach.vercel.app';
          
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

      // Mark onboarding as complete
      markOnboardingComplete();
      
      // Navigate directly to MainTabs
      navigation.navigate('MainTabs');
      
      // Show success message
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

  const renderSuggestion = ({ item }: { item: StanSuggestion }) => {
    const selected = isSelected(item);
    
    return (
      <TouchableOpacity
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
  };

  const groupedSuggestions = STAN_SUGGESTIONS.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as Record<string, StanSuggestion[]>);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
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
        </View>

        <FlatList
          style={styles.flatList}
          contentContainerStyle={styles.flatListContent}
          data={STAN_SUGGESTIONS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={true}
          renderItem={({ item }) => {
            const selected = isSelected(item);
            return (
              <TouchableOpacity
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
                    <Text style={styles.categoryIcon}>{item.categoryIcon || '⭐'}</Text>
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
          }}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'AddStan' })}
              >
                <Text style={styles.skipText}>Add something else</Text>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Fixed Bottom Button */}
        <View style={styles.bottomBar}>
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
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppleMusicTheme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: AppleMusicTheme.spacing.screenPadding,
    paddingTop: AppleMusicTheme.spacing.screenPadding,
    borderBottomWidth: 0.33,
    borderBottomColor: AppleMusicTheme.colors.separator,
    backgroundColor: AppleMusicTheme.colors.background,
    flexShrink: 0,
  },
  title: {
    ...AppleMusicTheme.typography.title1,
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...AppleMusicTheme.typography.body,
    color: AppleMusicTheme.colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  selectionBadge: {
    backgroundColor: AppleMusicTheme.colors.accent,
    borderRadius: 20,
    paddingHorizontal: AppleMusicTheme.spacing.md,
    paddingVertical: AppleMusicTheme.spacing.sm,
    alignSelf: 'center',
  },
  selectionText: {
    ...AppleMusicTheme.typography.footnote,
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 140,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    paddingTop: AppleMusicTheme.spacing.sm,
    paddingBottom: 120,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  suggestionCard: {
    backgroundColor: AppleMusicTheme.colors.surface,
    borderRadius: AppleMusicTheme.borderRadius.card,
    padding: AppleMusicTheme.spacing.cardPadding,
    marginBottom: AppleMusicTheme.spacing.sm,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: AppleMusicTheme.spacing.md,
    lineHeight: 32,
    textAlign: 'center',
    minWidth: 32,
  },
  cardText: {
    flex: 1,
  },
  stanName: {
    ...AppleMusicTheme.typography.headline,
    color: AppleMusicTheme.colors.primary,
    marginBottom: 2,
  },
  stanCategory: {
    ...AppleMusicTheme.typography.footnote,
    color: AppleMusicTheme.colors.secondary,
  },
  selectButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppleMusicTheme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppleMusicTheme.colors.separator,
  },
  selectButtonText: {
    ...AppleMusicTheme.typography.callout,
    fontWeight: 'bold',
    color: AppleMusicTheme.colors.secondary,
  },
  stanDescription: {
    ...AppleMusicTheme.typography.footnote,
    color: AppleMusicTheme.colors.secondary,
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
    ...AppleMusicTheme.typography.callout,
    color: AppleMusicTheme.colors.secondary,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppleMusicTheme.colors.background,
    borderTopWidth: 0.33,
    borderTopColor: AppleMusicTheme.colors.separator,
    padding: AppleMusicTheme.spacing.screenPadding,
    paddingBottom: 40,
    zIndex: 1000,
    flexShrink: 0,
  },
  continueButton: {
    backgroundColor: AppleMusicTheme.colors.accent,
    borderRadius: AppleMusicTheme.borderRadius.button,
    padding: 18,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: AppleMusicTheme.colors.surfaceSecondary,
  },
  continueButtonText: {
    ...AppleMusicTheme.typography.headline,
    color: '#ffffff',
    fontWeight: '600',
  },
});