import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LocalStorageService from '../services/localStorageService';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
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

interface AddStanScreenProps {
  navigation: any;
}

// Extended search database with popular stans
const SEARCH_DATABASE: StanSuggestion[] = [
  // K-Pop & Entertainment
  { id: '1', name: 'BTS', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Global superstars breaking barriers worldwide' },
  { id: '2', name: 'BLACKPINK', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Queens of K-Pop with killer fashion and music' },
  { id: '17', name: 'aespa', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Next-generation K-Pop with virtual avatars' },
  { id: '18', name: 'TWICE', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Feel-good K-Pop with infectious energy' },
  { id: '19', name: 'IVE', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Rising stars with elegant concepts' },
  { id: '20', name: 'NewJeans', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Y2K-inspired fresh K-Pop sound' },
  { id: '21', name: 'ITZY', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Teen crush with powerful performances' },
  
  // Artists & Music
  { id: '3', name: 'Taylor Swift', category: 'Music', categoryIcon: '🎤', categoryColor: '#4ECDC4', description: 'Pop icon with storytelling mastery' },
  { id: '4', name: 'Drake', category: 'Music', categoryIcon: '🎤', categoryColor: '#4ECDC4', description: 'Chart-topping rapper and cultural icon' },
  { id: '22', name: 'Olivia Rodrigo', category: 'Music', categoryIcon: '🎤', categoryColor: '#4ECDC4', description: 'Pop-rock sensation with emotional depth' },
  { id: '23', name: 'Billie Eilish', category: 'Music', categoryIcon: '🎤', categoryColor: '#4ECDC4', description: 'Unique sound and visual aesthetic' },
  { id: '24', name: 'The Weeknd', category: 'Music', categoryIcon: '🎤', categoryColor: '#4ECDC4', description: 'R&B superstar with dark pop vibes' },
  
  // Entertainment & Movies
  { id: '5', name: 'Marvel Studios', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Superhero universe dominating cinema' },
  { id: '6', name: 'Stranger Things', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: '80s nostalgia with supernatural thrills' },
  { id: '16', name: 'K-Pop Demon Hunters', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Netflix\'s biggest movie ever - K-Pop girl group fights demons!' },
  { id: '25', name: 'Wednesday', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Dark comedy series taking over social media' },
  { id: '26', name: 'House of the Dragon', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Epic fantasy drama successor to GoT' },
  
  // Sports
  { id: '7', name: 'Lionel Messi', category: 'Sports', categoryIcon: '⚽', categoryColor: '#95E1D3', description: 'Football legend and Inter Miami star' },
  { id: '8', name: 'LeBron James', category: 'Sports', categoryIcon: '🏀', categoryColor: '#95E1D3', description: 'Basketball king and cultural influence' },
  { id: '27', name: 'Cristiano Ronaldo', category: 'Sports', categoryIcon: '⚽', categoryColor: '#95E1D3', description: 'Global football icon and social media king' },
  { id: '28', name: 'Serena Williams', category: 'Sports', categoryIcon: '🎾', categoryColor: '#95E1D3', description: 'Tennis legend and empowerment advocate' },
  { id: '29', name: 'Stephen Curry', category: 'Sports', categoryIcon: '🏀', categoryColor: '#95E1D3', description: 'Revolutionary basketball player changing the game' },
  
  // Gaming & Tech
  { id: '9', name: 'Pokémon', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#A8E6CF', description: 'Beloved franchise spanning games, shows, and movies' },
  { id: '10', name: 'Fortnite', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#A8E6CF', description: 'Battle royale phenomenon with constant updates' },
  { id: '30', name: 'Genshin Impact', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#A8E6CF', description: 'Open-world RPG with stunning visuals' },
  { id: '31', name: 'Minecraft', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#A8E6CF', description: 'Creative sandbox game loved by all ages' },
  { id: '32', name: 'League of Legends', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#A8E6CF', description: 'Competitive MOBA with global esports scene' },
  
  // Anime & Manga
  { id: '11', name: 'Attack on Titan', category: 'Anime', categoryIcon: '🗾', categoryColor: '#FFB6C1', description: 'Epic dark fantasy anime with complex storytelling' },
  { id: '12', name: 'One Piece', category: 'Anime', categoryIcon: '🗾', categoryColor: '#FFB6C1', description: 'Long-running adventure manga and anime series' },
  { id: '33', name: 'Demon Slayer', category: 'Anime', categoryIcon: '🗾', categoryColor: '#FFB6C1', description: 'Breathtaking animation and emotional storytelling' },
  { id: '34', name: 'Jujutsu Kaisen', category: 'Anime', categoryIcon: '🗾', categoryColor: '#FFB6C1', description: 'Modern supernatural action series' },
  { id: '35', name: 'Chainsaw Man', category: 'Anime', categoryIcon: '🗾', categoryColor: '#FFB6C1', description: 'Dark supernatural series with cult following' },
  
  // Books & Literature
  { id: '13', name: 'Colleen Hoover', category: 'Books', categoryIcon: '📚', categoryColor: '#DDA0DD', description: 'Romance novelist taking BookTok by storm' },
  { id: '14', name: 'Harry Potter', category: 'Books', categoryIcon: '📚', categoryColor: '#DDA0DD', description: 'Magical world that defined a generation' },
  { id: '36', name: 'Sarah J. Maas', category: 'Books', categoryIcon: '📚', categoryColor: '#DDA0DD', description: 'Fantasy romance author with devoted fanbase' },
  { id: '37', name: 'BookTok', category: 'Books', categoryIcon: '📚', categoryColor: '#DDA0DD', description: 'TikTok book community driving reading trends' },
  
  // General Culture & Lifestyle
  { id: '15', name: 'MrBeast', category: 'Content Creator', categoryIcon: '📱', categoryColor: '#87CEEB', description: 'YouTube philanthropy and entertainment empire' },
  { id: '38', name: 'Emma Chamberlain', category: 'Content Creator', categoryIcon: '📱', categoryColor: '#87CEEB', description: 'Lifestyle influencer defining Gen Z aesthetics' },
  { id: '39', name: 'Charli D\'Amelio', category: 'Content Creator', categoryIcon: '📱', categoryColor: '#87CEEB', description: 'TikTok dancing sensation and social media star' },
  { id: '40', name: 'PewDiePie', category: 'Content Creator', categoryIcon: '📱', categoryColor: '#87CEEB', description: 'YouTube gaming legend with massive following' },
];

export default function AddStanScreen({ navigation }: AddStanScreenProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<StanSuggestion[]>([]);
  const [selectedStans, setSelectedStans] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user, isAnonymous } = useAuth();

  useEffect(() => {
    loadCategories();
    loadUserFollowedStans();
    setFilteredSuggestions(SEARCH_DATABASE);
  }, []);

  useEffect(() => {
    filterSuggestions();
  }, [searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      
      // Map category IDs to search database
      if (data) {
        SEARCH_DATABASE.forEach(suggestion => {
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

  const loadUserFollowedStans = async () => {
    try {
      console.log('🔍 Loading user followed stans...');
      let followedStanNames: string[] = [];
      
      if (isAnonymous) {
        // Load from local storage for anonymous users
        const localStans = await LocalStorageService.getStans();
        followedStanNames = localStans.map(stan => stan.name);
        console.log('👻 Anonymous user follows:', followedStanNames);
      } else if (user?.id) {
        // Load from Supabase for logged-in users
        const { data, error } = await supabase
          .from('stans')
          .select('name')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) throw error;
        followedStanNames = data?.map(stan => stan.name) || [];
        console.log('👤 Logged-in user follows:', followedStanNames);
      }
      
      // Mark already followed stans as selected
      const preSelectedIds: string[] = [];
      SEARCH_DATABASE.forEach(suggestion => {
        if (followedStanNames.includes(suggestion.name)) {
          preSelectedIds.push(suggestion.id);
        }
      });
      
      console.log('✅ Pre-selecting stans:', preSelectedIds);
      setSelectedStans(preSelectedIds);
      
    } catch (error) {
      console.error('Error loading user stans:', error);
    }
  };

  const filterSuggestions = () => {
    let filtered = SEARCH_DATABASE;

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    setFilteredSuggestions(filtered);
  };

  const toggleStanSelection = useCallback((suggestion: StanSuggestion) => {
    console.log('🔄 [WEB-PRESSABLE] Toggling stan selection:', suggestion.name, 'ID:', suggestion.id);
    setSelectedStans(prev => {
      const newSelection = prev.includes(suggestion.id) 
        ? prev.filter(id => id !== suggestion.id)
        : [...prev, suggestion.id];
      
      console.log('✅ Updated selection:', newSelection);
      return newSelection;
    });
  }, []);

  const handleFollowStans = async () => {
    if (selectedStans.length === 0) {
      Alert.alert('Select Some Stans', 'Choose at least one person or topic to follow');
      return;
    }

    setLoading(true);
    try {
      const selectedSuggestions = SEARCH_DATABASE.filter(s => selectedStans.includes(s.id));

      if (isAnonymous) {
        // Handle anonymous users - save to local storage
        const localStans = await LocalStorageService.getStans();
        const localStanNames = localStans.map(s => s.name);
        
        let addedCount = 0;
        for (const suggestion of selectedSuggestions) {
          if (!localStanNames.includes(suggestion.name)) {
            await LocalStorageService.addStan({
              name: suggestion.name,
              description: suggestion.description,
              category: suggestion.category,
              category_id: suggestion.categoryId || '',
              is_active: true,
            });
            addedCount++;
          }
        }
        
        Alert.alert(
          'Success! ✨',
          `Added ${addedCount} new stan${addedCount !== 1 ? 's' : ''} to your list!`,
          [{ text: 'Continue', onPress: () => navigation.navigate('Home') }]
        );
      } else if (user?.id) {
        // Handle logged-in users
        const { data: currentStans } = await supabase
          .from('stans')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const currentStanNames = currentStans?.map(s => s.name) || [];
        const newStansToAdd = selectedSuggestions.filter(s => !currentStanNames.includes(s.name));
        const stansToRemove = currentStans?.filter(s => !selectedSuggestions.map(sel => sel.name).includes(s.name)) || [];

        if (stansToRemove.length > 0) {
          await supabase
            .from('stans')
            .delete()
            .in('id', stansToRemove.map(s => s.id));
        }

        if (newStansToAdd.length > 0) {
          const stansToInsert = newStansToAdd.map(suggestion => ({
            user_id: user.id,
            name: suggestion.name,
            description: suggestion.description,
            category_id: suggestion.categoryId || '',
            is_active: true,
            priority: 1,
          }));

          await supabase.from('stans').insert(stansToInsert);
        }

        Alert.alert(
          'Perfect! ✨',
          `Updated your stan list successfully!`,
          [{ text: 'Continue', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error) {
      console.error('Error updating stans:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const renderSuggestionCard = ({ item }: { item: StanSuggestion }) => {
    const isSelected = selectedStans.includes(item.id);
    
    return (
      <View
        style={[
          styles.suggestionCard,
          isSelected && styles.suggestionCardSelected
        ]}
      >
        <TouchableOpacity
          style={styles.suggestionTouchable}
          onPress={() => {
            console.log('📱 [WEB-FIX] Card pressed:', item.name);
            toggleStanSelection(item);
          }}
          activeOpacity={0.8}
        >
        <View style={styles.suggestionContent}>
          <View style={styles.suggestionHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor + '20' }]}>
              <Text style={styles.categoryBadgeIcon}>{item.categoryIcon}</Text>
              <Text style={[styles.categoryBadgeText, { color: item.categoryColor }]}>
                {item.category}
              </Text>
            </View>
            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
              {isSelected && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </View>
          
          <Text style={styles.suggestionName}>{item.name}</Text>
          <Text style={styles.suggestionDescription}>{item.description}</Text>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Your Interests (Web Fixed)</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Choose topics and people you'd like daily updates about
      </Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for anyone or anything..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        style={styles.categoryScrollContainer}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && styles.categoryChipSelected
          ]}
          onPress={() => {
            console.log('🏷️ All category pressed');
            setSelectedCategory(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextSelected]}>
            All
          </Text>
        </TouchableOpacity>
        
        {[...new Set(SEARCH_DATABASE.map(item => item.category))].map((category) => {
          const suggestion = SEARCH_DATABASE.find(s => s.category === category);
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipSelected
              ]}
              onPress={() => {
                console.log('🏷️ Category pressed:', category);
                setSelectedCategory(selectedCategory === category ? null : category);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{suggestion?.categoryIcon}</Text>
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextSelected]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Suggestions List */}
      <FlatList
        data={filteredSuggestions}
        renderItem={renderSuggestionCard}
        keyExtractor={(item) => item.id}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsList}
      />

      {/* Follow Button */}
      {selectedStans.length > 0 && (
        <View style={styles.followButtonContainer}>
          <TouchableOpacity
            style={[
              styles.followButton,
              loading && styles.followButtonDisabled
            ]}
            onPress={handleFollowStans}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.followButtonText}>
              {loading ? 'Updating...' : `Follow ${selectedStans.length} ${selectedStans.length === 1 ? 'Interest' : 'Interests'}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#999',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    height: 44,
  },
  categoryScrollContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#000',
  },
  categoryChipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  suggestionsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  suggestionCardSelected: {
    borderColor: '#000',
    borderWidth: 2,
  },
  suggestionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  suggestionTouchable: {
    flex: 1,
  },
  suggestionContent: {
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  followButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 20,
    right: 20,
  },
  followButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});