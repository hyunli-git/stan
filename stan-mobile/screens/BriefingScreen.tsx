import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateAIBriefingWithWebSearch } from '../services/openaiService';

interface Briefing {
  id: string;
  stan_name: string;
  content: string;
  summary: string;
  sources: string[];
  created_at: string;
  stan_id: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  };
}

interface BriefingScreenProps {
  navigation: any;
}

export default function BriefingScreen({ navigation }: BriefingScreenProps) {
  const { user } = useAuth();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadBriefings();
  }, []);

  const loadBriefings = async () => {
    try {
      const { data, error } = await supabase
        .from('briefings')
        .select(`
          *,
          stans!briefings_stan_id_fkey (
            name,
            categories (
              name,
              icon,
              color
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform the data to match our interface
      const transformedBriefings = data?.map(briefing => ({
        ...briefing,
        stan_name: briefing.stans.name,
        categories: briefing.stans.categories,
      })) || [];

      setBriefings(transformedBriefings);
    } catch (error) {
      console.error('Error loading briefings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTodaysBriefings = async () => {
    setGenerating(true);
    
    try {
      // Simple test - just show an alert
      Alert.alert('🎉 Button Works!', 'The briefing generation button is working! This confirms the mobile app is functioning.');
      
    } catch (error: any) {
      Alert.alert('Error', `Something went wrong: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    loadBriefings();
  };

  const renderBriefing = ({ item }: { item: Briefing }) => (
    <View style={[styles.briefingCard, { borderLeftColor: item.categories.color }]}>
      <View style={styles.briefingHeader}>
        <View style={styles.briefingInfo}>
          <Text style={styles.briefingIcon}>{item.categories.icon}</Text>
          <View style={styles.briefingText}>
            <Text style={styles.briefingTitle}>{item.stan_name}</Text>
            <Text style={styles.briefingCategory}>{item.categories.name}</Text>
          </View>
        </View>
        <View style={styles.briefingMeta}>
          <Text style={styles.briefingTime}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.aiTag}>🤖 AI 웹 검색</Text>
        </View>
      </View>
      <Text style={styles.briefingContent}>{item.content}</Text>
      {item.sources && item.sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesLabel}>📎 소스:</Text>
          {item.sources.slice(0, 2).map((source, index) => (
            <Text key={index} style={styles.sourceLink} numberOfLines={1}>
              • {source.includes('naver') ? '네이버 검색' : source.includes('google') ? '구글 검색' : 'Web'}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📰</Text>
      <Text style={styles.emptyTitle}>No Briefings Yet</Text>
      <Text style={styles.emptyText}>
        Generate your first AI briefings to get daily updates about your favorite stans!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.title}>📰 Daily Briefings</Text>
        <Text style={styles.loadingText}>Loading briefings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📰 Daily Briefings</Text>
        <Text style={styles.subtitle}>
          AI-powered updates about your stans
        </Text>
        
        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={generateTodaysBriefings}
          disabled={generating}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonText}>
            {generating ? '⏳ AI 브리핑 생성 중...' : '🤖 오늘의 AI 브리핑 생성하기'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={briefings}
        renderItem={renderBriefing}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
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
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  briefingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  briefingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  briefingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  briefingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  briefingText: {
    flex: 1,
  },
  briefingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  briefingCategory: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  briefingMeta: {
    alignItems: 'flex-end',
  },
  briefingTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  aiTag: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sourcesLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceLink: {
    fontSize: 11,
    color: '#007AFF',
    marginBottom: 2,
  },
  briefingContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});