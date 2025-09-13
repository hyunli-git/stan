import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

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
}

interface Stan {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  description: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  categories: Category;
}

const STAN_SUGGESTIONS: StanSuggestion[] = [
  // K-Pop & Entertainment
  { id: '1', name: 'BTS', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Global superstars breaking barriers worldwide' },
  { id: '2', name: 'BLACKPINK', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Queens of K-Pop with killer fashion and music' },
  { id: '3', name: 'Stray Kids', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Self-producing powerhouse with incredible performances' },
  { id: '4', name: 'SEVENTEEN', category: 'K-Pop', categoryIcon: '🎵', categoryColor: '#FF6B6B', description: 'Synchronized perfection with 13 members' },
  
  // Music
  { id: '5', name: 'Taylor Swift', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Storytelling genius breaking records with every era' },
  { id: '6', name: 'Bad Bunny', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Reggaeton king bringing Latin music to the world' },
  { id: '7', name: 'Tyler, the Creator', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Creative visionary pushing boundaries in music and fashion' },
  { id: '8', name: 'The Weeknd', category: 'Music', categoryIcon: '🎸', categoryColor: '#C34A36', description: 'Dark R&B master with cinematic performances' },
  
  // Sports
  { id: '9', name: 'Los Angeles Lakers', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Purple and Gold legends with championship legacy' },
  { id: '10', name: 'Real Madrid', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Los Blancos - the most successful club in football' },
  { id: '11', name: 'Manchester United', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'Red Devils with massive global fanbase' },
  { id: '12', name: 'Dallas Cowboys', category: 'Sports', categoryIcon: '⚽', categoryColor: '#4ECDC4', description: 'America\'s Team with star power' },
  
  // Gaming
  { id: '13', name: 'League of Legends', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'The world\'s biggest esport with epic competitions' },
  { id: '14', name: 'Valorant', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Tactical shooter taking esports by storm' },
  { id: '15', name: 'Fortnite', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Battle royale phenomenon with constant updates' },
  { id: '16', name: 'Minecraft', category: 'Gaming', categoryIcon: '🎮', categoryColor: '#845EC2', description: 'Infinite creativity in blocky worlds' },
];

export default function AddStanScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [followedStans, setFollowedStans] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadFollowedStans();
      loadCategories();
    }, [])
  );

  const loadFollowedStans = async () => {
    try {
      const { data, error } = await supabase
        .from('stans')
        .select('name')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      if (data) {
        setFollowedStans(data.map(s => s.name));
      }
    } catch (error) {
      console.error('Error loading followed stans:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFollowToggle = async (suggestion: StanSuggestion) => {
    const isCurrentlyFollowed = followedStans.includes(suggestion.name);
    
    try {
      if (isCurrentlyFollowed) {
        // Unfollow
        const { error } = await supabase
          .from('stans')
          .delete()
          .eq('user_id', user?.id)
          .eq('name', suggestion.name);
          
        if (error) throw error;
        
        setFollowedStans(prev => prev.filter(name => name !== suggestion.name));
        showSnackbar(`Unfollowed ${suggestion.name}`);
      } else {
        // Follow
        const category = categories.find(c => c.name === suggestion.category);
        
        const { error } = await supabase
          .from('stans')
          .insert({
            user_id: user?.id,
            category_id: category?.id,
            name: suggestion.name,
            description: suggestion.description,
            priority: 3,
            is_active: true,
          });
          
        if (error) throw error;
        
        setFollowedStans(prev => [...prev, suggestion.name]);
        showSnackbar(`Following ${suggestion.name}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setIsSnackbarVisible(true);
    setTimeout(() => setIsSnackbarVisible(false), 3000);
  };

  const filteredSuggestions = STAN_SUGGESTIONS.filter(suggestion => {
    const matchesSearch = suggestion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         suggestion.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || suggestion.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderSuggestionItem = (item: StanSuggestion) => {
    const isFollowed = followedStans.includes(item.name);
    
    return (
      <div
        key={item.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={() => handleFollowToggle(item)}
      >
        <div style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: item.categoryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          position: 'relative',
          overflow: 'hidden',
          border: isFollowed ? '4px solid #1DB954' : 'none',
        }}>
          <span style={{ 
            fontSize: 48, 
            filter: 'brightness(0) invert(1)',
          }}>
            {item.categoryIcon}
          </span>
          
          {/* Following overlay */}
          {isFollowed && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(29, 185, 84, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ 
                color: '#fff', 
                fontSize: 32, 
                fontWeight: 'bold' 
              }}>
                ✓
              </span>
            </div>
          )}
        </div>
        
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {item.name}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#121212',
    }}>
      {/* Header */}
      <div style={{
        padding: '60px 24px 24px 24px',
        backgroundColor: '#121212',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#ffffff',
          margin: 0,
          marginBottom: 16,
          lineHeight: 1.2,
        }}>
          Discover New Artists
        </h1>
        
        <div style={{
          position: 'relative',
          marginBottom: 20,
        }}>
          <span style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 18,
            color: '#a7a7a7',
            zIndex: 1,
          }}>
            🔍
          </span>
          <input
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              fontSize: 16,
              backgroundColor: '#ffffff',
              border: 'none',
              borderRadius: 8,
              outline: 'none',
              color: '#000',
            }}
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 24px 100px 24px', // Bottom padding for tab bar
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          width: '100%',
        }}>
          {filteredSuggestions.map(renderSuggestionItem)}
        </div>
      </div>


      {/* Snackbar */}
      {isSnackbarVisible && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      )}
    </div>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
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
  bulkAddButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bulkAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  snackbar: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    borderRadius: 8,
    padding: 16,
    zIndex: 1000,
  },
  snackbarText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});