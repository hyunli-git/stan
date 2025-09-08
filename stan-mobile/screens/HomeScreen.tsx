import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  TextInput,
  SafeAreaView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateAIBriefingWithWebSearch } from '../services/openaiService';

interface Stan {
  id: string;
  name: string;
  description: string;
  priority: number;
  created_at: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  };
}

interface BriefingTopic {
  title: string;
  content: string;
  sources?: string[];
}

interface BriefingContent {
  content: string;
  summary: string;
  sources: string[];
  topics?: BriefingTopic[];
  searchSources?: string[];
}

interface BriefingCard {
  id: string;
  stan: Stan;
  briefing: BriefingContent | null;
  loading: boolean;
  error: string | null;
}

interface StanSuggestion {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  categoryId?: string;
}

interface HomeScreenProps {
  navigation: any;
}

// Popular stans database
const POPULAR_STANS: StanSuggestion[] = [
  // K-Pop & Entertainment
  { id: '1', name: 'BTS', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Global superstars breaking barriers worldwide' },
  { id: '2', name: 'BLACKPINK', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Queens of K-Pop with killer fashion and music' },
  { id: '16', name: 'K-Pop Demon Hunters', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Netflix\'s biggest movie ever - K-Pop girl group fights demons!' },
  { id: '17', name: 'aespa', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Next-generation K-Pop with virtual avatars' },
  { id: '18', name: 'TWICE', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Feel-good K-Pop with infectious energy' },
  
  // Music - Western
  { id: '3', name: 'Taylor Swift', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Storytelling genius breaking records with every era' },
  { id: '4', name: 'Bad Bunny', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Reggaeton king bringing Latin music to the world' },
  { id: '5', name: 'Tyler, the Creator', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Creative visionary pushing boundaries in music and fashion' },
  { id: '22', name: 'Drake', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Hip-hop icon dominating charts for over a decade' },
  { id: '23', name: 'Billie Eilish', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Genre-defying artist with haunting melodies' },
  
  // Sports
  { id: '6', name: 'Los Angeles Lakers', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Purple and Gold legends with championship legacy' },
  { id: '7', name: 'Real Madrid', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Los Blancos - the most successful club in football' },
  { id: '8', name: 'Manchester United', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Red Devils with massive global fanbase' },
  { id: '11', name: 'Toronto Blue Jays', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Canada\'s team with passionate fans and exciting young talent' },
  { id: '28', name: 'Golden State Warriors', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Dynasty team revolutionizing basketball' },
  
  // Gaming
  { id: '12', name: 'League of Legends', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'The world\'s biggest esport with epic competitions' },
  { id: '13', name: 'Valorant', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Tactical shooter taking esports by storm' },
  { id: '14', name: 'Fortnite', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Battle royale phenomenon with constant updates' },
  { id: '15', name: 'Minecraft', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Infinite creativity in blocky worlds' },
  
  // Movies & TV
  { id: '36', name: 'Marvel Cinematic Universe', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Superhero franchise connecting movies and shows' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, signOut } = useAuth();
  const [briefingCards, setBriefingCards] = useState<BriefingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stans, setStans] = useState<Stan[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStansAndGenerateBriefings();
    }, [])
  );

  const loadStansAndGenerateBriefings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stans')
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const stansData = data || [];
      setStans(stansData);
      
      // Initialize briefing cards with loading state
      const initialCards: BriefingCard[] = stansData.map(stan => ({
        id: stan.id,
        stan: stan,
        briefing: null,
        loading: true,
        error: null,
      }));
      
      setBriefingCards(initialCards);
      
      // Generate briefings for each stan
      for (const stan of stansData) {
        generateBriefingForStan(stan);
      }
      
    } catch (error) {
      console.error('Error loading stans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateBriefingForStan = async (stan: Stan) => {
    try {
      console.log('🤖 Generating briefing for:', stan.name);
      
      const briefingContent = await generateAIBriefingWithWebSearch({
        id: stan.id,
        name: stan.name,
        categories: stan.categories,
        description: stan.description
      });
      
      setBriefingCards(prev => prev.map(card => 
        card.id === stan.id 
          ? { ...card, briefing: briefingContent, loading: false, error: null }
          : card
      ));
      
    } catch (error: any) {
      console.error('Error generating briefing for', stan.name, ':', error);
      setBriefingCards(prev => prev.map(card => 
        card.id === stan.id 
          ? { ...card, briefing: null, loading: false, error: error.message || 'Failed to generate briefing' }
          : card
      ));
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    loadStansAndGenerateBriefings();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Sign Out Failed', error.message);
    }
  };

  const renderBriefingCard = ({ item }: { item: BriefingCard }) => {
    // Dynamic gradient colors based on category
    const getCategoryGradient = (categoryName: string) => {
      const gradients: Record<string, [string, string]> = {
        'K-Pop': ['#667eea', '#764ba2'],
        'Music': ['#f093fb', '#f5576c'], 
        'Sports': ['#4facfe', '#00f2fe'],
        'Gaming': ['#43e97b', '#38f9d7'],
        'Movies & TV': ['#fa709a', '#fee140'],
      };
      return gradients[categoryName] || ['#667eea', '#764ba2'];
    };

    const gradient = getCategoryGradient(item.stan.categories.name);
    
    if (item.loading) {
      return (
        <View style={styles.briefingCard}>
          <LinearGradient
            colors={[gradient[0], gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardMeta}>
              <Text style={styles.sourceCount}>GENERATING...</Text>
              <Text style={styles.timeAgo}>⏳</Text>
            </View>
            <Text style={styles.topicTitle}>{item.stan.name}</Text>
            <Text style={styles.topicContent}>Generating your daily briefing...</Text>
          </LinearGradient>
        </View>
      );
    }

    if (item.error) {
      return (
        <View style={styles.briefingCard}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a6f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardMeta}>
              <Text style={styles.sourceCount}>ERROR</Text>
              <Text style={styles.timeAgo}>❌</Text>
            </View>
            <Text style={styles.topicTitle}>{item.stan.name}</Text>
            <Text style={styles.topicContent}>{item.error}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => generateBriefingForStan(item.stan)}
              >
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      );
    }

    // Show topics as separate cards
    if (item.briefing?.topics && item.briefing.topics.length > 0) {
      return (
        <>
          {item.briefing.topics.map((topic, topicIndex) => (
            <View key={`${item.id}-${topicIndex}`} style={styles.briefingCard}>
              <LinearGradient
                colors={[gradient[0], gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardMeta}>
                  <Text style={styles.sourceCount}>
                    {topic.sources?.length || 0} SOURCES • {item.stan.name}
                  </Text>
                  <Text style={styles.timeAgo}>Now</Text>
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicContent}>{topic.content}</Text>
                
                <View style={styles.cardActions}>
                  {topic.sources && topic.sources.length > 0 && (
                    <TouchableOpacity 
                      style={styles.viewSourcesButton}
                      onPress={() => {
                        Alert.alert(
                          'Sources',
                          topic.sources?.map((source, i) => `${i + 1}. ${source}`).join('\n\n') || 'No sources available',
                          [
                            { text: 'Cancel' },
                            { text: 'Open First Source', onPress: () => topic.sources?.[0] && Linking.openURL(topic.sources[0]) }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.actionButtonText}>View Sources</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => navigation.navigate('Briefing', { stan: item.stan, briefing: item.briefing })}
                  >
                    <Text style={styles.moreButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))}
        </>
      );
    }

    // Fallback to single card
    return (
      <View style={styles.briefingCard}>
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardMeta}>
            <Text style={styles.sourceCount}>{item.stan.name}</Text>
            <Text style={styles.timeAgo}>Now</Text>
          </View>
          <Text style={styles.topicTitle}>Daily Briefing</Text>
          <Text style={styles.topicContent}>{item.briefing?.summary || item.briefing?.content || 'No content available'}</Text>
        </LinearGradient>
      </View>
    );
  };



  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>🌟 Your Daily STAN Briefings</Text>
        <Text style={styles.welcome}>
          {briefingCards.length > 0 
            ? `${briefingCards.length} briefings generated` 
            : 'Loading your personalized briefings...'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🌟</Text>
      <Text style={styles.emptyStateTitle}>No Stans Yet!</Text>
      <Text style={styles.emptyStateText}>
        Add your first stan to start getting daily AI briefings about the things you love.
      </Text>
      <TouchableOpacity
        style={styles.addFirstStanButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'AddStan' })}
      >
        <Text style={styles.addFirstStanButtonText}>➕ Add Your First Stan</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && briefingCards.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.title}>🌟 STAN</Text>
        <Text style={styles.loadingText}>Loading your briefings...</Text>
      </SafeAreaView>
    );
  }

  if (briefingCards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  // Flatten briefing cards for topics
  const flattenedCards: any[] = [];
  briefingCards.forEach(card => {
    if (card.briefing?.topics && card.briefing.topics.length > 0) {
      card.briefing.topics.forEach((topic: any, index: number) => {
        flattenedCards.push({
          ...card,
          topicIndex: index,
          topic: topic
        });
      });
    } else {
      flattenedCards.push(card);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={flattenedCards}
        renderItem={({ item }) => {
          if (item.topic) {
            // Render individual topic card
            const gradient = getCategoryGradient(item.stan.categories.name);
            return (
              <View style={styles.briefingCard}>
                <LinearGradient
                  colors={[gradient[0], gradient[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardMeta}>
                    <Text style={styles.sourceCount}>
                      {item.topic.sources?.length || 0} SOURCES • {item.stan.name}
                    </Text>
                    <Text style={styles.timeAgo}>Now</Text>
                  </View>
                  <Text style={styles.topicTitle}>{item.topic.title}</Text>
                  <Text style={styles.topicContent}>{item.topic.content}</Text>
                  
                  <View style={styles.cardActions}>
                    {item.topic.sources && item.topic.sources.length > 0 && (
                      <TouchableOpacity 
                        style={styles.viewSourcesButton}
                        onPress={() => {
                          Alert.alert(
                            'Sources',
                            item.topic.sources?.map((source: string, i: number) => `${i + 1}. ${source}`).join('\n\n') || 'No sources available',
                            [
                              { text: 'Cancel' },
                              { text: 'Open First Source', onPress: () => item.topic.sources?.[0] && Linking.openURL(item.topic.sources[0]) }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.actionButtonText}>View Sources</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.moreButton}
                      onPress={() => navigation.navigate('Briefing', { stan: item.stan, briefing: item.briefing })}
                    >
                      <Text style={styles.moreButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            );
          }
          return renderBriefingCard({ item });
        }}
        keyExtractor={(item, index) => `${item.id}-${item.topicIndex || 0}-${index}`}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.briefingListContent}
      />
    </SafeAreaView>
  );

  // Helper function for gradients
  function getCategoryGradient(categoryName: string) {
    const gradients: Record<string, [string, string]> = {
      'K-Pop': ['#667eea', '#764ba2'],
      'Music': ['#f093fb', '#f5576c'], 
      'Sports': ['#4facfe', '#00f2fe'],
      'Gaming': ['#43e97b', '#38f9d7'],
      'Movies & TV': ['#fa709a', '#fee140'],
    };
    return gradients[categoryName] || ['#667eea', '#764ba2'];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcome: {
    fontSize: 16,
    color: '#666',
  },
  signOutButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  myStansSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  horizontalList: {
    paddingLeft: 24,
  },
  suggestionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    color: '#333',
  },
  suggestionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  suggestionsListContent: {
    paddingBottom: 24,
  },
  mainListContent: {
    paddingBottom: 24,
  },
  briefingListContent: {
    paddingBottom: 24,
  },
  briefingCard: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceCount: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topicContent: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewSourcesButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  moreButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  moreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionsSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stanCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginRight: 16,
    borderLeftWidth: 4,
    width: 200,
  },
  stanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stanIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stanText: {
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
  priorityContainer: {
    alignItems: 'flex-end',
  },
  priorityText: {
    fontSize: 12,
  },
  stanDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addFirstStanButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  addFirstStanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 24,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginLeft: 34,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
});