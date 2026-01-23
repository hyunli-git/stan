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
import { AppleMusicTheme, getGradientColors } from '../styles/AppleMusicTheme';
import LocalStorageService from '../services/localStorageService';
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

// Function to generate short, engaging titles from topic data
const generateShortTitle = (originalTitle: string, content: string): string => {
  // Remove emojis from original title for processing
  const cleanTitle = originalTitle.replace(/[^\w\s&]/g, '').trim();
  
  // Extract key phrases from content for dynamic titles
  const contentWords = content.toLowerCase();
  
  // Create contextual short titles based on content
  if (contentWords.includes('new') && (contentWords.includes('song') || contentWords.includes('music') || contentWords.includes('album'))) {
    return 'New Music Drop';
  } else if (contentWords.includes('performance') || contentWords.includes('concert') || contentWords.includes('show')) {
    return 'Live Performance';
  } else if (contentWords.includes('fashion') || contentWords.includes('outfit') || contentWords.includes('wearing')) {
    return 'Fashion Moment';
  } else if (contentWords.includes('award') || contentWords.includes('win') || contentWords.includes('achievement')) {
    return 'Achievement Unlocked';
  } else if (contentWords.includes('fan') && (contentWords.includes('crazy') || contentWords.includes('viral') || contentWords.includes('trending'))) {
    return 'Fans Going Wild';
  } else if (contentWords.includes('airport') || contentWords.includes('spotted') || contentWords.includes('sighting')) {
    return 'Spotted Out & About';
  } else if (contentWords.includes('behind') || contentWords.includes('backstage') || contentWords.includes('personal')) {
    return 'Behind The Scenes';
  } else if (contentWords.includes('collaboration') || contentWords.includes('collab') || contentWords.includes('featuring')) {
    return 'Collaboration Alert';
  } else if (contentWords.includes('upcoming') || contentWords.includes('soon') || contentWords.includes('teaser')) {
    return 'Coming Soon';
  } else if (contentWords.includes('instagram') || contentWords.includes('twitter') || contentWords.includes('social')) {
    return 'Social Media Buzz';
  } else if (contentWords.includes('breaking') || contentWords.includes('urgent') || contentWords.includes('just')) {
    return 'Breaking News';
  } else if (contentWords.includes('chart') || contentWords.includes('number') || contentWords.includes('million')) {
    return 'Chart Success';
  }
  
  // Fallback to simplified version of original title
  const titleMap: { [key: string]: string } = {
    'Breaking & Hot Right Now': 'Breaking News',
    'Stan Twitter & Fan Reactions': 'Fan Reactions',
    'Visual Content & Fashion Moments': 'Visual Update',
    'Music, Performances & Studio Updates': 'Music Update',
    'Video Content & Behind-the-Scenes': 'New Video',
    'Records, Awards & Achievements': 'Achievement',
    'Travel, Appearances & Sightings': 'Public Appearance',
    'Collaborations & Industry News': 'Industry News',
    'Personal Updates & Life Moments': 'Personal Update',
    'Upcoming & Future Plans': 'Coming Soon'
  };
  
  return titleMap[originalTitle] || cleanTitle.split(' ').slice(0, 2).join(' ') || 'Latest Update';
};

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
  const { user, signOut, isAnonymous } = useAuth();
  const [briefingCards, setBriefingCards] = useState<BriefingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stans, setStans] = useState<Stan[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStansAndGenerateBriefings();
    }, [])
  );

  // Handle refresh parameter from navigation
  useEffect(() => {
    if (navigation.getState) {
      const route = navigation.getState()?.routes?.find(r => r.name === 'Home');
      if (route?.params?.refresh) {
        console.log('🔄 HomeScreen refresh triggered from navigation params');
        loadStansAndGenerateBriefings();
        // Clear the refresh parameter
        navigation.setParams({ refresh: false });
      }
    }
  }, [navigation]);

  // Add listener for tab press to refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      console.log('🏠 Home tab pressed - refreshing data');
      loadStansAndGenerateBriefings();
    });

    return unsubscribe;
  }, [navigation]);

  const loadStansAndGenerateBriefings = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-backend-7btyucqrz-haleys-projects-1932fed0.vercel.app';
      
      let data;
      let userFollowedStans: string[] = [];
      
      if (isAnonymous) {
        // Handle anonymous users - load from local storage
        console.log('👻 Anonymous user - loading from local storage');
        const localStans = await LocalStorageService.getStans();
        userFollowedStans = localStans.map(s => s.name);
        console.log(`👻 Anonymous user follows these stans:`, userFollowedStans);
        
        if (localStans.length === 0) {
          // No stans yet - show onboarding state
          setBriefingCards([]);
          setStans([]);
          setLoading(false);
          return;
        }
        
        // Create mock briefing cards for anonymous users
        // For now, just show the stans they follow without actual briefings
        const mockCards: BriefingCard[] = localStans.map(stan => ({
          id: stan.id,
          stanName: stan.name,
          category: stan.category,
          categoryIcon: '⭐', // Default icon
          gradientColors: getGradientColors(stan.category),
          topics: [{
            title: `Welcome to ${stan.name}!`,
            content: `You're now following ${stan.name}. Daily briefings will appear here with the latest updates and news!`,
            sources: [],
            images: []
          }],
          sources: [],
          images: [],
          lastGenerated: new Date().toISOString().split('T')[0]
        }));
        
        setBriefingCards(mockCards);
        setStans(localStans.map(ls => ({
          id: ls.id,
          name: ls.name,
          description: ls.description,
          priority: 1,
          created_at: ls.created_at,
          categories: {
            name: ls.category,
            icon: '⭐',
            color: '#4ECDC4'
          }
        })));
        
      } else if (user?.id) {
        // Handle logged-in users
        console.log(`👤 Fetching user's followed stans: ${user.id}`);
        try {
          const { data: followedStansData, error } = await supabase
            .from('stans')
            .select('name')
            .eq('user_id', user.id)
            .eq('is_active', true);
          
          if (!error && followedStansData) {
            userFollowedStans = followedStansData.map(s => s.name);
            console.log(`👤 User follows these stans:`, userFollowedStans);
          }
        } catch (error) {
          console.error('Error fetching user stans:', error);
        }
        
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
      
      let dailyBriefings: DailyBriefing[] = data.briefings || [];
      
      // Additional client-side filtering to ensure only followed stans appear
      if (userFollowedStans.length > 0) {
        const beforeFilter = dailyBriefings.length;
        dailyBriefings = dailyBriefings.filter(briefing => 
          briefing.stans && userFollowedStans.includes(briefing.stans.name)
        );
        console.log(`🔧 Client-side filtering: ${beforeFilter} → ${dailyBriefings.length} briefings`);
      }
      
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
                // Only show stans that actually have briefings (they should all be followed stans)
                setStans(retryBriefings.map(b => b.stans).filter(stan => stan != null));
                return;
              }
            }
          }
        } catch (genError) {
          console.error('Failed to generate briefings:', genError);
        }
        
        // If still no briefings, don't show any cards
        console.log('ℹ️ No briefings available - not showing any cards');
        setBriefingCards([]);
        setStans([]);
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
      // Only show stans that actually have briefings (they should all be followed stans)
      setStans(dailyBriefings.map(b => b.stans).filter(stan => stan != null));
      
    } catch (error) {
      console.error('Error loading briefings:', error);
      Alert.alert('Error', 'Failed to load briefings');
      // Fallback: clear cards if there's an error
      setBriefingCards([]);
      setStans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Disabled: No longer showing cards without briefings
  /*
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
          const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://stan-backend-7btyucqrz-haleys-projects-1932fed0.vercel.app';
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
  */


  const onRefresh = async () => {
    setRefreshing(true);
    // Clear cache first
    setBriefingCards([]);
    setStans([]);
    await loadStansAndGenerateBriefings();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Sign Out Failed', error.message);
    }
  };

  const renderBriefingCard = ({ item }: { item: BriefingCard }) => {
    // Use Apple Music themed gradients
    const gradient = getGradientColors(item.stan.categories.name);
    
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
                  <Text style={styles.timeAgo}>Now</Text>
                </View>
                <Text style={styles.artistName}>{item.stan.name}</Text>
                <Text style={styles.topicTitle}>{generateShortTitle(topic.title, topic.content)}</Text>
                <Text style={styles.topicContent}>{topic.content}</Text>
                
                {/* Display images from sources */}
                {topic.images && topic.images.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageScrollContainer}
                  >
                    {topic.images.map((image, imgIndex) => (
                      <TouchableOpacity 
                        key={imgIndex}
                        onPress={() => image.source && Linking.openURL(image.source)}
                        style={styles.imageContainer}
                      >
                        <Image 
                          source={{ uri: image.thumbnail || image.url }}
                          style={styles.sourceImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <View style={styles.cardActions}>
                  <View style={styles.sourceButtonsContainer}>
                    {topic.sources && topic.sources.slice(0, 3).map((source: string, index: number) => (
                      <TouchableOpacity 
                        key={index}
                        style={styles.sourceButton}
                        onPress={() => Linking.openURL(source).catch(err => 
                          Alert.alert('Error', 'Unable to open this link')
                        )}
                      >
                        <Text style={styles.sourceButtonText}>
                          {source.includes('youtube.com') ? '📺' : 
                           source.includes('instagram.com') ? '📷' : 
                           source.includes('twitter.com') || source.includes('x.com') ? '🐦' :
                           source.includes('tiktok.com') ? '🎵' : '🔗'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {topic.sources && topic.sources.length > 3 && (
                      <TouchableOpacity 
                        style={styles.sourceButton}
                        onPress={() => {
                          Alert.alert(
                            'All Sources',
                            topic.sources?.map((source: string, i: number) => `${i + 1}. ${source}`).join('\n\n') || 'No sources available',
                            [
                              { text: 'Cancel' },
                              { text: 'Open First', onPress: () => topic.sources?.[0] && Linking.openURL(topic.sources[0]) }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.sourceButtonText}>+{topic.sources.length - 3}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
            const gradient = getGradientColors(item.stan.categories.name);
            return (
              <View style={styles.briefingCard}>
                <LinearGradient
                  colors={[gradient[0], gradient[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardMeta}>
                    <Text style={styles.timeAgo}>Now</Text>
                  </View>
                  <Text style={styles.artistName}>{item.stan.name}</Text>
                  <Text style={styles.topicTitle}>{generateShortTitle(item.topic.title, item.topic.content)}</Text>
                  <Text style={styles.topicContent}>{item.topic.content}</Text>
                  
                  {/* Display images from topic or sources */}
                  {(item.topic.images && item.topic.images.length > 0) ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.imageScrollContainer}
                    >
                      {item.topic.images.map((image, imgIndex) => (
                        <TouchableOpacity 
                          key={imgIndex}
                          onPress={() => image.source && Linking.openURL(image.source)}
                          style={styles.imageContainer}
                        >
                          <Image 
                            source={{ uri: image.thumbnail || image.url }}
                            style={styles.sourceImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : null}
                  
                  <View style={styles.cardActions}>
                    <View style={styles.sourceButtonsContainer}>
                      {item.topic.sources && item.topic.sources.slice(0, 3).map((source: string, index: number) => (
                        <TouchableOpacity 
                          key={index}
                          style={styles.sourceButton}
                          onPress={() => Linking.openURL(source).catch(err => 
                            Alert.alert('Error', 'Unable to open this link')
                          )}
                        >
                          <Text style={styles.sourceButtonText}>
                            {source.includes('youtube.com') ? '📺' : 
                             source.includes('instagram.com') ? '📷' : 
                             source.includes('twitter.com') || source.includes('x.com') ? '🐦' :
                             source.includes('tiktok.com') ? '🎵' : '🔗'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {item.topic.sources && item.topic.sources.length > 3 && (
                        <TouchableOpacity 
                          style={styles.sourceButton}
                          onPress={() => {
                            Alert.alert(
                              'All Sources',
                              item.topic.sources?.map((source: string, i: number) => `${i + 1}. ${source}`).join('\n\n') || 'No sources available',
                              [
                                { text: 'Cancel' },
                                { text: 'Open First', onPress: () => item.topic.sources?.[0] && Linking.openURL(item.topic.sources[0]) }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.sourceButtonText}>+{item.topic.sources.length - 3}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppleMusicTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppleMusicTheme.colors.background,
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
    ...AppleMusicTheme.typography.body,
    color: AppleMusicTheme.colors.secondary,
    marginTop: AppleMusicTheme.spacing.sm,
  },
  headerContainer: {
    backgroundColor: AppleMusicTheme.colors.background,
    borderBottomWidth: 0.33,
    borderBottomColor: AppleMusicTheme.colors.separator,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    paddingVertical: AppleMusicTheme.spacing.md,
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
    ...AppleMusicTheme.typography.largeTitle,
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.xs,
  },
  welcome: {
    ...AppleMusicTheme.typography.subheadline,
    color: AppleMusicTheme.colors.secondary,
  },
  signOutButton: {
    backgroundColor: AppleMusicTheme.colors.surfaceSecondary,
    borderRadius: AppleMusicTheme.borderRadius.button,
    paddingHorizontal: AppleMusicTheme.spacing.sm,
    paddingVertical: AppleMusicTheme.spacing.xs,
  },
  signOutText: {
    ...AppleMusicTheme.typography.footnote,
    color: AppleMusicTheme.colors.secondary,
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
    borderRadius: AppleMusicTheme.borderRadius.card,
    marginHorizontal: AppleMusicTheme.spacing.screenPadding,
    marginBottom: AppleMusicTheme.spacing.screenPadding,
    overflow: 'hidden',
    ...AppleMusicTheme.shadows.card,
  },
  cardGradient: {
    padding: AppleMusicTheme.spacing.screenPadding,
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  sourceButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sourceButtonText: {
    ...AppleMusicTheme.typography.caption,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  timeAgo: {
    ...AppleMusicTheme.typography.caption,
    color: '#ffffff',
    opacity: 0.8,
  },
  artistName: {
    ...AppleMusicTheme.typography.title2,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: AppleMusicTheme.spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  topicTitle: {
    ...AppleMusicTheme.typography.callout,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: AppleMusicTheme.spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topicContent: {
    ...AppleMusicTheme.typography.subheadline,
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: AppleMusicTheme.spacing.md,
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
    borderRadius: AppleMusicTheme.borderRadius.button,
    paddingHorizontal: AppleMusicTheme.spacing.md,
    paddingVertical: AppleMusicTheme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: AppleMusicTheme.borderRadius.button,
    paddingHorizontal: AppleMusicTheme.spacing.md,
    paddingVertical: AppleMusicTheme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionButtonText: {
    ...AppleMusicTheme.typography.footnote,
    color: '#ffffff',
    fontWeight: '600',
  },
  imageScrollContainer: {
    marginVertical: AppleMusicTheme.spacing.sm,
    height: 120,
  },
  imageContainer: {
    marginRight: AppleMusicTheme.spacing.sm,
    borderRadius: AppleMusicTheme.borderRadius.image,
    overflow: 'hidden',
  },
  sourceImage: {
    width: 160,
    height: 100,
    borderRadius: AppleMusicTheme.borderRadius.image,
    backgroundColor: AppleMusicTheme.colors.surfaceSecondary,
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
    marginBottom: AppleMusicTheme.spacing.screenPadding,
  },
  emptyStateTitle: {
    ...AppleMusicTheme.typography.title2,
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...AppleMusicTheme.typography.body,
    color: AppleMusicTheme.colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: AppleMusicTheme.spacing.xxl,
  },
  addFirstStanButton: {
    backgroundColor: AppleMusicTheme.colors.accent,
    borderRadius: AppleMusicTheme.borderRadius.button,
    paddingHorizontal: AppleMusicTheme.spacing.lg,
    paddingVertical: AppleMusicTheme.spacing.md,
  },
  addFirstStanButtonText: {
    ...AppleMusicTheme.typography.callout,
    color: '#ffffff',
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
    borderRadius: AppleMusicTheme.borderRadius.image,
  },
  stanStoriesSection: {
    paddingVertical: AppleMusicTheme.spacing.md,
    paddingLeft: AppleMusicTheme.spacing.screenPadding,
  },
  stanStoriesContent: {
    paddingRight: AppleMusicTheme.spacing.screenPadding,
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
    marginBottom: AppleMusicTheme.spacing.sm,
    borderWidth: 2,
    borderColor: AppleMusicTheme.colors.primary,
    ...AppleMusicTheme.shadows.small,
  },
  stanStoryIcon: {
    fontSize: 24,
  },
  stanStoryName: {
    ...AppleMusicTheme.typography.caption,
    color: AppleMusicTheme.colors.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});