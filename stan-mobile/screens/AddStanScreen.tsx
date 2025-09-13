import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AppleMusicTheme } from '../styles/AppleMusicTheme';

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
  const [selectedStans, setSelectedStans] = useState<string[]>([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const { user } = useAuth();

  // Debug navigation
  useEffect(() => {
    console.log('🧭 Navigation object:', navigation);
    console.log('🧭 Navigation methods:', Object.keys(navigation));
  }, [navigation]);

  useEffect(() => {
    loadCategories();
    loadUserFollowedStans();
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

  // Debug effect to track selection changes
  useEffect(() => {
    console.log('🔍 Selected stans changed:', selectedStans);
  }, [selectedStans]);

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

  const loadUserFollowedStans = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔍 Loading user followed stans...');
      const { data, error } = await supabase
        .from('stans')
        .select('name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      
      const followedStanNames = data?.map(stan => stan.name) || [];
      console.log('👤 User follows:', followedStanNames);
      
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

  const toggleStanSelection = useCallback((suggestion: StanSuggestion) => {
    console.log('🔄 toggleStanSelection called for:', suggestion.name, 'ID:', suggestion.id);
    console.log('🔄 Current selected IDs:', selectedStans);
    
    setSelectedStans(prevSelected => {
      const newSelection = [...prevSelected];
      const index = newSelection.indexOf(suggestion.id);
      
      if (index > -1) {
        console.log('🗑️ Removing from selection at index:', index);
        newSelection.splice(index, 1);
      } else {
        console.log('➕ Adding to selection');
        newSelection.push(suggestion.id);
      }
      
      console.log('🔄 New selected IDs:', newSelection);
      return newSelection;
    });
  }, []);


  const clearSelections = useCallback(() => {
    console.log('🧼 Clearing all selections');
    setSelectedStans([]);
  }, []);

  const selectAllVisible = useCallback(() => {
    console.log('✅ Selecting all visible stans');
    setSelectedStans(prevSelected => {
      const newSelection = [...prevSelected];
      filteredSuggestions.forEach(suggestion => {
        if (!newSelection.includes(suggestion.id)) {
          newSelection.push(suggestion.id);
        }
      });
      return newSelection;
    });
  }, [filteredSuggestions]);

  const handleAddStans = async () => {
    console.log('🔄 handleAddStans called', { selectedCount: selectedStans.length, selectedIds: selectedStans });
    console.log('🔄 User context:', user);
    console.log('🔄 Categories loaded:', categories.length);
    
    if (!user) {
      console.log('❌ No user found - redirecting to login');
      Alert.alert('Authentication Required', 'Please log in to follow stans');
      return;
    }
    
    if (selectedStans.length === 0) {
      console.log('❌ No stans selected');
      Alert.alert('Error', 'Please select at least one stan to follow');
      return;
    }
    
    // Get currently followed stans
    const { data: currentStans } = await supabase
      .from('stans')
      .select('id, name')
      .eq('user_id', user?.id)
      .eq('is_active', true);
    
    const currentStanNames = currentStans?.map(s => s.name) || [];
    const currentStanIds = currentStans?.map(s => s.id) || [];
    
    // Determine what to add and what to remove
    const selectedSuggestions = SEARCH_DATABASE.filter(s => selectedStans.includes(s.id));
    const selectedStanNames = selectedSuggestions.map(s => s.name);
    
    const newStansToAdd = selectedSuggestions.filter(s => !currentStanNames.includes(s.name));
    const stansToRemove = currentStans?.filter(s => !selectedStanNames.includes(s.name)) || [];
    
    console.log('📋 Selected suggestions:', selectedStanNames);
    console.log('📋 Currently following:', currentStanNames);
    console.log('📋 New stans to add:', newStansToAdd.map(s => s.name));
    console.log('📋 Stans to remove:', stansToRemove.map(s => s.name));
    
    if (newStansToAdd.length === 0 && stansToRemove.length === 0) {
      Alert.alert('Info', 'No changes to make - selection matches your current following list!');
      return;
    }

    setLoading(true);
    try {
      let addedCount = 0;
      let removedCount = 0;
      
      // Remove unfollowed stans
      if (stansToRemove.length > 0) {
        console.log('🗑️ Removing unfollowed stans:', stansToRemove.map(s => s.name));
        const { error: removeError } = await supabase
          .from('stans')
          .delete()
          .in('id', stansToRemove.map(s => s.id));
          
        if (removeError) {
          console.error('❌ Error removing stans:', removeError);
          throw removeError;
        }
        
        removedCount = stansToRemove.length;
        console.log('✅ Successfully removed', removedCount, 'stans');
      }
      
      // Add new stans
      if (newStansToAdd.length > 0) {
        // Find or create categories for the new stans to add
        const stansToAdd = await Promise.all(newStansToAdd.map(async (suggestion) => {
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

        console.log('💾 Attempting to insert stans:', stansToAdd);
        const { data, error } = await supabase
          .from('stans')
          .insert(stansToAdd)
          .select();

        console.log('💾 Database insert result:', { data, error });

        if (error) {
          console.error('❌ Database error:', error);
          throw error;
        }

        addedCount = data?.length || newStansToAdd.length;
        console.log('✅ Successfully added stans:', addedCount);
      }
      
      console.log('✅ Changes completed - Added:', addedCount, 'Removed:', removedCount);
      
      // Keep current selections as they now reflect the updated following list
      console.log('🧹 Clearing search query only');
      setSearchQuery('');
      
      // Reload user stans to update the selection display
      await loadUserFollowedStans();
      
      // Show snackbar notification
      setSnackbarMessage('Your stans updated');
      setShowSnackbar(true);
      
      // Auto-hide snackbar and redirect after 2 seconds
      setTimeout(() => {
        setShowSnackbar(false);
        // Attempt navigation to Home after snackbar
        try {
          const parent = navigation.getParent();
          if (parent && parent.navigate) {
            parent.navigate('Home');
          } else if (navigation.jumpTo) {
            navigation.jumpTo('Home');
          } else {
            navigation.navigate('MainTabs', { 
              screen: 'Home',
              params: { refresh: true }
            });
          }
          console.log('✅ Post-snackbar navigation to Home initiated');
        } catch (navError) {
          console.log('❌ Post-snackbar navigation failed:', navError);
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error in handleAddStans:', error);
      console.error('❌ Error stack:', error.stack);
      
      let errorMessage = error.message || 'Failed to update stans';
      if (errorMessage.includes('duplicate')) {
        errorMessage = 'Some of these stans are already in your list!';
      }
      
      Alert.alert('Error', errorMessage);
      console.log('🚫 Error alert shown, not navigating');
    } finally {
      console.log('🏁 Finally block - setting loading to false');
      setLoading(false);
    }
  };


  const renderSuggestion = ({ item }: { item: StanSuggestion }) => {
    const isSelected = selectedStans.includes(item.id);
    console.log('🎨 Rendering:', item.name, 'Selected:', isSelected, 'ID:', item.id, 'Selected array:', selectedStans);
    
    const handlePress = () => {
      console.log('👆 Pressed:', item.name, 'Current state:', selectedStans);
      
      setSelectedStans(current => {
        const newSelection = [...current];
        const index = newSelection.indexOf(item.id);
        
        if (index > -1) {
          console.log('🗑️ Direct remove from selection');
          newSelection.splice(index, 1);
        } else {
          console.log('➕ Direct add to selection');
          newSelection.push(item.id);
        }
        
        console.log('🔄 Direct new selected IDs:', newSelection);
        return newSelection;
      });
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.suggestionCard, 
          { borderLeftColor: item.categoryColor },
          isSelected && styles.suggestionCardSelected
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionInfo}>
          <View style={[styles.suggestionIcon, { backgroundColor: item.categoryColor + '15' }]}>
            <Text style={styles.suggestionIconText}>{item.categoryIcon}</Text>
          </View>
          <View style={styles.suggestionText}>
            <Text style={styles.suggestionName}>{item.name}</Text>
            <Text style={styles.suggestionCategory}>{item.category}</Text>
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
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

        {/* DEBUG INFO AND TEST BUTTON */}
        <View style={{ padding: 20, backgroundColor: '#ffebee' }}>
          <Text style={{ fontSize: 14, marginBottom: 10, color: '#333' }}>
            DEBUG: filteredSuggestions.length = {filteredSuggestions.length}
          </Text>
          <Text style={{ fontSize: 14, marginBottom: 10, color: '#333' }}>
            DEBUG: selectedStans.length = {selectedStans.length}
          </Text>
          <Text style={{ fontSize: 14, marginBottom: 10, color: '#333' }}>
            DEBUG: loadingCategories = {loadingCategories.toString()}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'red',
              padding: 20,
              borderRadius: 10,
              alignItems: 'center',
              marginTop: 10,
            }}
            onPress={() => Alert.alert('TOP TEST BUTTON WORKS!', `Suggestions: ${filteredSuggestions.length}, Selected: ${selectedStans.length}`)}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              🔴 RED TEST BUTTON - TAP ME!
            </Text>
          </TouchableOpacity>
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
        <View style={styles.suggestionsSection}>
            {/* Debug Info */}
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Debug: {selectedStans.length} selected: [{selectedStans.join(', ')}]
              </Text>
            </View>
            
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
            
            {selectedStans.length > 0 && (
              <View style={styles.selectedCounter}>
                <Text style={styles.selectedCounterText}>
                  {selectedStans.length} selected
                </Text>
              </View>
            )}

            {/* SUPER SIMPLE TEST SELECTION */}
            <View style={{ padding: 10, backgroundColor: '#ffffcc', marginBottom: 10 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#ff9800', padding: 15, borderRadius: 8, marginBottom: 10 }}
                onPress={() => {
                  console.log('🧪 TEST: Adding BTS to selection');
                  setSelectedStans(current => [...current, '1']);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                  🧪 TEST: Add BTS to selection
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ backgroundColor: '#f44336', padding: 15, borderRadius: 8 }}
                onPress={() => {
                  console.log('🧪 TEST: Clearing selection');
                  setSelectedStans([]);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                  🧪 TEST: Clear selection
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={true}>
              {filteredSuggestions.map((item) => (
                <View key={item.id}>
                  {renderSuggestion({ item })}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
            
            {/* Fixed Bottom Add Button */}
            <View style={styles.fixedBottomButton}>
              <TouchableOpacity
                style={[styles.bulkAddButton]}
                onPress={() => {
                  console.log('🚀 BUTTON PRESSED! Starting handleAddStans...');
                  Alert.alert('BUTTON WORKS!', `Selected: ${selectedStans.length} stans`);
                  handleAddStans();
                }}
                disabled={false}
                activeOpacity={0.8}
              >
                <Text style={styles.bulkAddButtonText}>
                  {selectedStans.length > 0 
                    ? `Start Following (${selectedStans.length})` 
                    : 'Select stans to follow'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        {/* ALWAYS VISIBLE BLUE TEST BUTTON */}
        <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#e3f2fd', padding: 10, borderRadius: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: 'blue',
              padding: 20,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert('BLUE BUTTON WORKS!', `Suggestions: ${filteredSuggestions.length}, Selected: ${selectedStans.length}`);
              handleAddStans();
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              🔵 BLUE TEST + HANDLEADDSTANS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Snackbar Notification */}
        {showSnackbar && (
          <View style={styles.snackbar}>
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppleMusicTheme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppleMusicTheme.colors.background,
  },
  loadingText: {
    ...AppleMusicTheme.typography.body,
    color: AppleMusicTheme.colors.secondary,
    marginTop: AppleMusicTheme.spacing.sm,
  },
  header: {
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    paddingVertical: AppleMusicTheme.spacing.screenPadding,
    borderBottomWidth: 0.33,
    borderBottomColor: AppleMusicTheme.colors.separator,
    backgroundColor: AppleMusicTheme.colors.background,
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    ...AppleMusicTheme.typography.callout,
    color: AppleMusicTheme.colors.blue,
    fontWeight: '500',
  },
  title: {
    ...AppleMusicTheme.typography.title1,
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  subtitle: {
    ...AppleMusicTheme.typography.body,
    color: AppleMusicTheme.colors.secondary,
    lineHeight: 22,
  },
  searchSection: {
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    paddingVertical: AppleMusicTheme.spacing.md,
    backgroundColor: AppleMusicTheme.colors.background,
  },
  label: {
    ...AppleMusicTheme.typography.callout,
    fontWeight: '600',
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  searchInput: {
    borderWidth: 0,
    borderRadius: AppleMusicTheme.borderRadius.md,
    padding: AppleMusicTheme.spacing.md,
    ...AppleMusicTheme.typography.callout,
    backgroundColor: AppleMusicTheme.colors.surface,
    color: AppleMusicTheme.colors.primary,
  },
  suggestionsSection: {
    flex: 1,
    backgroundColor: AppleMusicTheme.colors.background,
    marginTop: AppleMusicTheme.spacing.sm,
    borderRadius: AppleMusicTheme.borderRadius.md,
    marginHorizontal: AppleMusicTheme.spacing.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...AppleMusicTheme.typography.headline,
    color: AppleMusicTheme.colors.primary,
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: AppleMusicTheme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppleMusicTheme.spacing.listItemPadding,
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    borderBottomWidth: 0.33,
    borderBottomColor: AppleMusicTheme.colors.separator,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppleMusicTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppleMusicTheme.spacing.listItemPadding,
  },
  suggestionIconText: {
    fontSize: 22,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    ...AppleMusicTheme.typography.callout,
    fontWeight: '500',
    color: AppleMusicTheme.colors.primary,
    marginBottom: 3,
  },
  suggestionCategory: {
    ...AppleMusicTheme.typography.footnote,
    color: AppleMusicTheme.colors.secondary,
    fontWeight: '400',
  },
  suggestionDescription: {
    display: 'none', // Hide for cleaner look
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
    paddingHorizontal: AppleMusicTheme.spacing.sm,
    paddingVertical: AppleMusicTheme.spacing.xs,
    borderRadius: AppleMusicTheme.borderRadius.xs,
    backgroundColor: AppleMusicTheme.colors.surfaceSecondary,
  },
  controlButtonText: {
    ...AppleMusicTheme.typography.caption,
    color: AppleMusicTheme.colors.secondary,
    fontWeight: '500',
  },
  selectedCounter: {
    backgroundColor: AppleMusicTheme.colors.surface,
    paddingHorizontal: AppleMusicTheme.spacing.sm,
    paddingVertical: AppleMusicTheme.spacing.xs,
    borderRadius: AppleMusicTheme.borderRadius.xs,
    alignSelf: 'flex-start',
    marginBottom: AppleMusicTheme.spacing.sm,
  },
  selectedCounterText: {
    ...AppleMusicTheme.typography.caption,
    color: AppleMusicTheme.colors.accent,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: AppleMusicTheme.colors.secondary,
    backgroundColor: AppleMusicTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: AppleMusicTheme.spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: AppleMusicTheme.colors.accent,
    borderColor: AppleMusicTheme.colors.accent,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionCardSelected: {
    backgroundColor: AppleMusicTheme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: AppleMusicTheme.colors.accent,
  },
  fixedBottomButton: {
    backgroundColor: AppleMusicTheme.colors.background,
    paddingHorizontal: AppleMusicTheme.spacing.screenPadding,
    paddingVertical: AppleMusicTheme.spacing.sm,
    borderTopWidth: 0.33,
    borderTopColor: AppleMusicTheme.colors.separator,
  },
  bulkAddButton: {
    backgroundColor: AppleMusicTheme.colors.accent,
    borderRadius: AppleMusicTheme.borderRadius.button,
    padding: AppleMusicTheme.spacing.md,
    alignItems: 'center',
  },
  bulkAddButtonText: {
    ...AppleMusicTheme.typography.callout,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Debug styles
  debugInfo: {
    backgroundColor: '#fff3cd',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'monospace',
  },
  // Snackbar styles
  snackbar: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  snackbarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});