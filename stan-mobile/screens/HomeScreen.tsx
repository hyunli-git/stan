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
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
// Import removed - using daily briefings API instead

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

interface ImageData {
  url: string;
  alt: string;
  source: string;
  thumbnail?: string;
}

interface BriefingTopic {
  title: string;
  content: string;
  sources?: string[];
  images?: ImageData[];
}

interface BriefingContent {
  content: string;
  summary: string;
  sources: string[];
  topics?: BriefingTopic[];
  searchSources?: string[];
}

interface DailyBriefing {
  id: string;
  stan_id: string;
  date: string;
  content: string; // JSON string
  topics: BriefingTopic[];
  search_sources: string[];
  created_at: string;
  stans: Stan;
}

interface BriefingCard {
  id: string;
  stan: Stan;
  briefing: BriefingContent | null;
  loading: boolean;
  error: string | null;
}


interface HomeScreenProps {
  navigation: any;
}


const { width: screenWidth } = Dimensions.get('window');

// Component to render scrollable images
const ImageCarousel = ({ images }: { images: ImageData[] }) => {
  if (!images || images.length === 0) return null;

  return (
    <View style={styles.imageCarouselContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        style={styles.imageCarousel}
        contentContainerStyle={styles.imageCarouselContent}
      >
        {images.map((image, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.imageContainer}
            onPress={() => {
              Alert.alert(
                'View Image',
                image.alt,
                [
                  { text: 'Cancel' },
                  { text: 'View Source', onPress: () => Linking.openURL(image.source) }
                ]
              );
            }}
          >
            <Image 
              source={{ uri: image.thumbnail || image.url }}
              style={styles.briefingImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

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
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-peach.vercel.app';
      
      // Only fetch briefings if user is logged in
      let data;
      
      if (user?.id) {
        console.log(`🔍 Fetching briefings for user: ${user.id}`);
        const response = await fetch(`${backendUrl}/api/daily-briefings?userId=${user.id}`);
        
        if (response.ok) {
          data = await response.json();
          console.log(`📰 Loaded ${data.briefings?.length || 0} briefings for user ${user.id}`);
          
          // Debug: Log briefing stans to verify they belong to user
          if (data.briefings && data.briefings.length > 0) {
            console.log('🔍 Briefing stans:', data.briefings.map(b => ({ 
              stanId: b.stan_id, 
              stanName: b.stans?.name 
            })));
          }
        } else {
          console.error('Failed to fetch user briefings:', response.status, response.statusText);
          throw new Error('Failed to fetch briefings');
        }
      } else {
        // No user logged in - redirect to auth
        console.log('⚠️ No user logged in');
        throw new Error('User not authenticated');
      }
      
      const dailyBriefings: DailyBriefing[] = data.briefings || [];
      
      console.log(`📰 Loaded ${dailyBriefings.length} briefings for user`);
      
      if (dailyBriefings.length === 0) {
        // No briefings available for user's stans - check if user has stans
        console.log('⚠️ No briefings found for user stans, attempting to generate...');
        
        // Trigger briefing generation for this user
        try {
          const genResponse = await fetch(`${backendUrl}/api/force-generate-briefings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user.id }),
          });
          
          if (genResponse.ok) {
            const genData = await genResponse.json();
            console.log('✅ Briefing generation triggered:', genData);
            
            // Wait a moment then retry fetching briefings
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry fetching briefings
            const retryResponse = await fetch(`${backendUrl}/api/daily-briefings?userId=${user.id}`);
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retryBriefings = retryData.briefings || [];
              
              if (retryBriefings.length > 0) {
                console.log(`📰 Successfully loaded ${retryBriefings.length} newly generated briefings`);
                
                // Convert to briefing cards
                const cards: BriefingCard[] = retryBriefings.map(briefing => ({
                  id: briefing.id,
                  stan: briefing.stans,
                  briefing: {
                    content: briefing.content,
                    summary: briefing.topics[0]?.content.split('.')[0] + '.' || 'Daily update available',
                    sources: briefing.search_sources,
                    topics: briefing.topics,
                    searchSources: briefing.search_sources,
                  },
                  loading: false,
                  error: null,
                }));
                
                setBriefingCards(cards);
                setStans(retryBriefings.map(b => b.stans));
                return;
              }
            }
          }
        } catch (genError) {
          console.error('Failed to generate briefings:', genError);
        }
        
        // If still no briefings, show placeholder
        await checkForStansWithoutBriefings();
        return;
      }
      
      // Convert daily briefings to briefing cards
      const cards: BriefingCard[] = dailyBriefings.map(briefing => ({
        id: briefing.id,
        stan: briefing.stans,
        briefing: {
          content: briefing.content,
          summary: briefing.topics[0]?.content.split('.')[0] + '.' || 'Daily update available',
          sources: briefing.search_sources,
          topics: briefing.topics,
          searchSources: briefing.search_sources,
        },
        loading: false,
        error: null,
      }));
      
      setBriefingCards(cards);
      setStans(dailyBriefings.map(b => b.stans));
      
    } catch (error) {
      console.error('Error loading briefings:', error);
      Alert.alert('Error', 'Failed to load briefings');
      // Fallback: try to load stans without briefings
      await checkForStansWithoutBriefings();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkForStansWithoutBriefings = async () => {
    try {
      console.log(`🔍 Checking user stans for user: ${user?.id}`);
      // Get user's stans to show even without briefings
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
      console.log(`📋 User has ${stansData.length} stans:`, stansData.map(s => s.name));
      setStans(stansData);
      
      // Show cards with better placeholder content
      const placeholderCards: BriefingCard[] = stansData.map(stan => ({
        id: stan.id,
        stan: stan,
        briefing: {
          content: `Getting the latest updates for ${stan.name}...`,
          summary: 'Refreshing content...',
          sources: [],
          topics: [
            {
              title: '🔄 Generating Fresh Content',
              content: `We're fetching the latest news and updates about ${stan.name}. This usually takes just a moment. Pull down to refresh!`,
              sources: []
            },
            {
              title: '💡 While You Wait',
              content: `Your personalized briefing will include breaking news, social media buzz, and upcoming events. Content updates daily!`,
              sources: []
            }
          ],
          searchSources: []
        },
        loading: false,
        error: null,
      }));
      
      setBriefingCards(placeholderCards);
      
      // Trigger briefing generation after showing placeholder
      setTimeout(async () => {
        console.log('⏰ Auto-triggering briefing generation...');
        try {
          const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-peach.vercel.app';
          const genResponse = await fetch(`${backendUrl}/api/force-generate-briefings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user?.id }),
          });
          
          if (genResponse.ok) {
            console.log('✅ Briefings generated, refreshing...');
            // Refresh to show new content
            await loadStansAndGenerateBriefings();
          }
        } catch (genError) {
          console.error('Auto-generation failed:', genError);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error loading stans:', error);
      Alert.alert('Error', 'Failed to load your stans');
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
                onPress={() => loadStansAndGenerateBriefings()}
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
                
                {/* Image carousel for topic */}
                <ImageCarousel images={topic.images || []} />
                
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



  const renderStanStory = ({ item }: { item: Stan }) => (
    <TouchableOpacity style={styles.stanStory}>
      <View style={[styles.stanStoryImage, { backgroundColor: item.categories.color }]}>
        <Text style={styles.stanStoryIcon}>{item.categories.icon}</Text>
      </View>
      <Text style={styles.stanStoryName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/stan-logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>STAN</Text>
          </View>
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
      
      {/* Stan Stories - Horizontal Scroll */}
      {stans.length > 0 && (
        <View style={styles.stanStoriesSection}>
          <FlatList
            data={stans}
            renderItem={renderStanStory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stanStoriesContent}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      )}
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
        <View style={styles.loadingLogoContainer}>
          <Image 
            source={require('../assets/stan-logo.png')} 
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.title}>STAN</Text>
        </View>
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
                  
                  {/* Image carousel for topic */}
                  <ImageCarousel images={item.topic.images || []} />
                  
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
  loadingLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingLogo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
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
  imageCarouselContainer: {
    marginVertical: 12,
  },
  imageCarousel: {
    flexGrow: 0,
  },
  imageCarouselContent: {
    paddingRight: 16,
  },
  imageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  briefingImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  stanStoriesSection: {
    paddingVertical: 16,
    paddingLeft: 24,
  },
  stanStoriesContent: {
    paddingRight: 24,
  },
  stanStory: {
    alignItems: 'center',
    width: 70,
  },
  stanStoryImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stanStoryIcon: {
    fontSize: 24,
  },
  stanStoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});