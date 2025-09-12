import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

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
  { id: '16', name: 'K-Pop Demon Hunters', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Netflix\'s biggest movie ever - K-Pop girl group fights demons!' },
  { id: '17', name: 'aespa', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Next-generation K-Pop with virtual avatars' },
  { id: '18', name: 'TWICE', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Feel-good K-Pop with infectious energy' },
  { id: '19', name: 'IVE', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Rising stars with elegant concepts' },
  { id: '20', name: 'NewJeans', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Y2K-inspired fresh K-Pop sound' },
  { id: '21', name: 'ITZY', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Teen crush with powerful performances' },
  
  // Music - Western
  { id: '3', name: 'Taylor Swift', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Storytelling genius breaking records with every era' },
  { id: '4', name: 'Bad Bunny', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Reggaeton king bringing Latin music to the world' },
  { id: '5', name: 'Tyler, the Creator', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Creative visionary pushing boundaries in music and fashion' },
  { id: '22', name: 'Drake', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Hip-hop icon dominating charts for over a decade' },
  { id: '23', name: 'Billie Eilish', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Genre-defying artist with haunting melodies' },
  { id: '24', name: 'The Weeknd', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Dark R&B master with cinematic sound' },
  { id: '25', name: 'Dua Lipa', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Pop perfection with disco-influenced hits' },
  { id: '26', name: 'Harry Styles', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Solo superstar with genre-blending artistry' },
  { id: '27', name: 'Olivia Rodrigo', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Gen Z songwriter capturing teenage emotions' },
  
  // Sports
  { id: '6', name: 'Los Angeles Lakers', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Purple and Gold legends with championship legacy' },
  { id: '7', name: 'Real Madrid', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Los Blancos - the most successful club in football' },
  { id: '8', name: 'Manchester United', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Red Devils with massive global fanbase' },
  { id: '9', name: 'Dallas Cowboys', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'America\'s Team with star power' },
  { id: '10', name: 'New York Yankees', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: '27-time World Series champions' },
  { id: '11', name: 'Toronto Blue Jays', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Canada\'s team with passionate fans and exciting young talent' },
  { id: '28', name: 'Golden State Warriors', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Dynasty team revolutionizing basketball' },
  { id: '29', name: 'Barcelona', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Més que un club - more than a club' },
  { id: '30', name: 'Arsenal', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'The Gunners with beautiful football philosophy' },
  { id: '31', name: 'Chelsea', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'London Blues with European success' },
  { id: '32', name: 'Liverpool', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'You\'ll Never Walk Alone - Anfield legends' },
  
  // Gaming
  { id: '12', name: 'League of Legends', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'The world\'s biggest esport with epic competitions' },
  { id: '13', name: 'Valorant', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Tactical shooter taking esports by storm' },
  { id: '14', name: 'Fortnite', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Battle royale phenomenon with constant updates' },
  { id: '15', name: 'Minecraft', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Infinite creativity in blocky worlds' },
  { id: '33', name: 'Call of Duty', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'FPS franchise with massive tournaments' },
  { id: '34', name: 'Among Us', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Social deduction game that took the world by storm' },
  { id: '35', name: 'Genshin Impact', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Open-world RPG with anime aesthetics' },
  
  // Movies & TV
  { id: '36', name: 'Marvel Cinematic Universe', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Superhero franchise connecting movies and shows' },
  { id: '37', name: 'Stranger Things', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Netflix sci-fi hit with 80s nostalgia' },
  { id: '38', name: 'Wednesday', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Addams Family spinoff with viral dance' },
  { id: '39', name: 'House of the Dragon', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Game of Thrones prequel with dragons' },
  { id: '40', name: 'The Batman', category: 'Movies & TV', categoryIcon: '🎬', categoryColor: '#F9F871', description: 'Dark Knight\'s latest cinematic adventure' },
  
  // Content Creators
  { id: '41', name: 'MrBeast', category: 'Content Creators', categoryIcon: '📱', categoryColor: '#FF9500', description: 'YouTube philanthropist with viral challenges' },
  { id: '42', name: 'PewDiePie', category: 'Content Creators', categoryIcon: '📱', categoryColor: '#FF9500', description: 'Gaming legend and YouTube pioneer' },
  { id: '43', name: 'Emma Chamberlain', category: 'Content Creators', categoryIcon: '📱', categoryColor: '#FF9500', description: 'Gen Z lifestyle influencer and coffee entrepreneur' },
  { id: '44', name: 'Charli D\'Amelio', category: 'Content Creators', categoryIcon: '📱', categoryColor: '#FF9500', description: 'TikTok dancing queen with massive following' },
];

export default function AddStanScreen({ navigation }: AddStanScreenProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<StanSuggestion[]>([]);
  const [selectedStans, setSelectedStans] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    loadCategories();
    // Show popular suggestions by default
    setFilteredSuggestions(SEARCH_DATABASE.slice(0, 20));
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = SEARCH_DATABASE.filter(suggestion =>
        suggestion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 15); // Limit to 15 results for better performance
      
      setFilteredSuggestions(filtered);
    } else {
      // Show all suggestions by default (popular stans)
      setFilteredSuggestions(SEARCH_DATABASE.slice(0, 20)); // Show top 20 popular stans by default
    }
  }, [searchQuery]);

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
    } finally {
      setLoadingCategories(false);
    }
  };

  const toggleStanSelection = (suggestion: StanSuggestion) => {
    const newSelection = new Set(selectedStans);
    if (newSelection.has(suggestion.id)) {
      newSelection.delete(suggestion.id);
    } else {
      newSelection.add(suggestion.id);
    }
    setSelectedStans(newSelection);
  };

  const selectSuggestion = toggleStanSelection; // Keep for backward compatibility

  const clearSelections = () => {
    setSelectedStans(new Set());
  };

  const selectAllVisible = () => {
    const newSelection = new Set(selectedStans);
    filteredSuggestions.forEach(suggestion => {
      newSelection.add(suggestion.id);
    });
    setSelectedStans(newSelection);
  };

  const handleAddStans = async () => {
    console.log('🔄 handleAddStans called', { selectedCount: selectedStans.size });
    
    if (selectedStans.size > 0) {
      // Bulk add selected stans
      const selectedSuggestions = SEARCH_DATABASE.filter(s => selectedStans.has(s.id));
      console.log('📋 Selected suggestions:', selectedSuggestions.map(s => s.name));
      
      if (selectedSuggestions.length === 0) {
        Alert.alert('Error', 'Please select at least one stan to follow');
        return;
      }

      setLoading(true);
      try {
        // Find or create categories for the selected stans
        const stansToAdd = await Promise.all(selectedSuggestions.map(async (suggestion) => {
          // Try to find existing category by name
          let categoryId = suggestion.categoryId;
          
          if (!categoryId) {
            // Find category by name
            const existingCategory = categories.find(cat => 
              cat.name.toLowerCase() === suggestion.category.toLowerCase()
            );
            
            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              // Create new category if it doesn't exist
              const { data: newCategory, error: categoryError } = await supabase
                .from('categories')
                .insert({
                  name: suggestion.category,
                  icon: suggestion.categoryIcon || '📌',
                  color: suggestion.categoryColor || '#6B46C1'
                })
                .select()
                .single();
              
              if (categoryError) throw categoryError;
              categoryId = newCategory.id;
            }
          }
          
          return {
            user_id: user?.id,
            category_id: categoryId,
            name: suggestion.name,
            description: suggestion.description,
            priority: 3,
          };
        }));

        const { data, error } = await supabase
          .from('stans')
          .insert(stansToAdd)
          .select();

        if (error) throw error;

        const addedCount = data?.length || selectedSuggestions.length;
        
        // Clear selections
        setSelectedStans(new Set());
        setSearchQuery('');
        
        // Navigate back immediately
        navigation.goBack();
        
        // Show quick success message (optional - remove if you don't want any message)
        Alert.alert(
          'Success! 🎉',
          `You're now following ${addedCount} new ${addedCount === 1 ? 'stan' : 'stans'}!`
        );
      } catch (error: any) {
        console.error('Error adding stans:', error);
        
        let errorMessage = error.message || 'Failed to add stans';
        if (errorMessage.includes('duplicate')) {
          errorMessage = 'Some of these stans are already in your list!';
        }
        
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Error', 'Please select at least one stan to follow');
    }
  };


  const renderSuggestion = ({ item }: { item: StanSuggestion }) => {
    const isSelected = selectedStans.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.suggestionCard, 
          { borderLeftColor: item.categoryColor },
          isSelected && styles.suggestionCardSelected
        ]}
        onPress={() => selectSuggestion(item)}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionHeader}>
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionIcon}>{item.categoryIcon}</Text>
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionName}>{item.name}</Text>
              <Text style={styles.suggestionCategory}>{item.category}</Text>
            </View>
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
        <Text style={styles.suggestionDescription}>{item.description}</Text>
      </TouchableOpacity>
    );
  };

  if (loadingCategories) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.title}>🌟 STAN</Text>
        <Text style={styles.loadingText}>Loading categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add New Stan</Text>
          <Text style={styles.subtitle}>
            Who or what do you want to follow?
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <Text style={styles.label}>Search for stans to follow</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search BTS, Taylor Swift, Lakers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            placeholderTextColor="#999"
          />
        </View>

        {/* Search Results */}
        {filteredSuggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim().length > 0 ? 'Search Results' : 'Popular Suggestions'}
              </Text>
              <View style={styles.multiSelectControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={selectAllVisible}
                  activeOpacity={0.7}
                >
                  <Text style={styles.controlButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={clearSelections}
                  activeOpacity={0.7}
                >
                  <Text style={styles.controlButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedStans.size > 0 && (
              <View style={styles.selectedCounter}>
                <Text style={styles.selectedCounterText}>
                  {selectedStans.size} selected
                </Text>
              </View>
            )}

            <FlatList
              data={filteredSuggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={10}
              ListFooterComponent={() => <View style={{ height: 20 }} />}
            />
            
            {/* Fixed Bottom Add Button */}
            <View style={styles.fixedBottomButton}>
              <TouchableOpacity
                style={[
                  styles.bulkAddButton, 
                  loading && styles.addButtonDisabled,
                  selectedStans.size === 0 && styles.addButtonDisabled
                ]}
                onPress={handleAddStans}
                disabled={loading || selectedStans.size === 0}
                activeOpacity={0.8}
              >
                <Text style={styles.bulkAddButtonText}>
                  {loading 
                    ? 'Adding...' 
                    : selectedStans.size === 0
                    ? 'Select stans to follow'
                    : `✨ Start Following ${selectedStans.size} ${selectedStans.size === 1 ? 'Stan' : 'Stans'}`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  suggestionsSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
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
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 100,
    color: '#000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 'auto',
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  manualAddButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  manualAddText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  // Multi-select styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  multiSelectControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  controlButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedCounter: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  selectedCounterText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionCardSelected: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  fixedBottomButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bulkAddButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bulkAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});