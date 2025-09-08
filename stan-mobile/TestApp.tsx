import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateAIBriefingWithWebSearch } from './services/openaiService';

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

export default function TestApp() {
  const [loading, setLoading] = useState(false);
  const [briefingResult, setBriefingResult] = useState<BriefingContent | null>(null);

  const testBriefing = async () => {
    console.log('🚀 Starting briefing generation test...');
    setLoading(true);
    
    try {
      const testStan = {
        id: 'test-1',
        name: 'Tyler, the Creator',
        categories: {
          name: 'Music',
          icon: '🎸',
          color: '#C34A36'
        },
        description: 'Creative visionary pushing boundaries in music and fashion'
      };

      console.log('🔄 Testing briefing generation for:', testStan.name);
      console.log('🔄 Stan object:', JSON.stringify(testStan, null, 2));
      
      const briefingContent = await generateAIBriefingWithWebSearch(testStan);
      
      console.log('✅ Generated content length:', briefingContent.content.length);
      console.log('✅ Briefing content preview:', briefingContent.content.substring(0, 200) + '...');
      console.log('✅ Topics found:', briefingContent.topics?.length || 0);
      
      // Set the result to display in the UI
      setBriefingResult(briefingContent);
      
      // Also try to show an alert (may not work in web browser)
      try {
        Alert.alert(
          '🎉 Briefing Generated!', 
          'Briefing has been generated successfully! Check below for the full content.',
          [{ text: 'OK', onPress: () => console.log('✅ Alert dismissed') }]
        );
      } catch (alertError) {
        console.log('📱 Alert not supported in web browser, showing content below');
      }
      
    } catch (error: any) {
      console.error('❌ TestApp Error:', error);
      console.error('❌ Error stack:', error.stack);
      setBriefingResult({
        content: `❌ Error: Failed to generate briefing\n\nType: ${error.name || 'Unknown'}\nMessage: ${error.message || 'Unknown error'}\n\nCheck console for details.`,
        summary: 'Error occurred',
        sources: [],
        topics: []
      });
      
      try {
        Alert.alert(
          '❌ Error', 
          `Failed to generate briefing:\n\nType: ${error.name || 'Unknown'}\nMessage: ${error.message || 'Unknown error'}\n\nCheck console for details.`,
          [{ text: 'OK', onPress: () => console.log('❌ Error alert dismissed') }]
        );
      } catch (alertError) {
        console.log('📱 Alert not supported in web browser, showing error above');
      }
    } finally {
      console.log('🏁 Briefing generation test completed');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🌟 STAN Mobile App Test</Text>
        <Text style={styles.subtitle}>Testing AI Briefing Generation</Text>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testBriefing}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Generating Briefing...' : '🤖 Generate Tyler, the Creator Briefing'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryButton]}
          onPress={() => alert('Prompt Management System:\n\n✅ Custom briefing prompts\n✅ Focus areas & exclude topics\n✅ Tone & length settings\n✅ Include/exclude sections\n✅ Template system\n✅ Per-stan customization\n\nThis would open a settings screen to customize how briefings are generated for each stan.')}
        >
          <Text style={styles.secondaryButtonText}>
            ⚙️ Manage Briefing Settings
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Test the OpenAI integration and prompt management system.
        </Text>
        
        {briefingResult ? (
          <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultTitle}>🎉 Generated Briefing:</Text>
            
            {/* Show topics as separate cards if available */}
            {briefingResult.topics && briefingResult.topics.length > 0 ? (
              <>
                {briefingResult.topics.map((topic, index) => {
                  // Dynamic gradient colors based on topic index
                  const gradientColors = [
                    ['#667eea', '#764ba2'], // Purple-blue
                    ['#f093fb', '#f5576c'], // Pink-red
                    ['#4facfe', '#00f2fe'], // Blue-cyan
                    ['#43e97b', '#38f9d7'], // Green-cyan
                    ['#fa709a', '#fee140'], // Pink-yellow
                  ][index % 5];
                  
                  return (
                    <View key={index} style={styles.topicCard}>
                      <LinearGradient
                        colors={[gradientColors[0], gradientColors[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                      >
                        {/* Card metadata */}
                        <View style={styles.cardMeta}>
                          <Text style={styles.sourceCount}>
                            {topic.sources?.length || 0} SOURCES
                          </Text>
                          <Text style={styles.timeAgo}>Just now</Text>
                        </View>
                        
                        <Text style={styles.topicTitle}>{topic.title}</Text>
                        <Text style={styles.topicContent}>{topic.content}</Text>
                        
                        {/* Action buttons */}
                        <View style={styles.cardActions}>
                          {topic.sources && topic.sources.length > 0 && (
                            <TouchableOpacity 
                              style={styles.viewSourcesButton}
                              onPress={() => {
                                // Show sources in alert or modal
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
                          <TouchableOpacity style={styles.moreButton}>
                            <Text style={styles.moreButtonText}>⋯</Text>
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })}
                
                {/* Show general search sources */}
                {briefingResult.searchSources && briefingResult.searchSources.length > 0 && (
                  <View style={styles.generalSourcesContainer}>
                    <Text style={styles.generalSourcesTitle}>🌐 Web Search Sources:</Text>
                    {briefingResult.searchSources.map((source, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.sourceLink}
                        onPress={() => Linking.openURL(source)}
                      >
                        <Text style={styles.sourceLinkText}>
                          🔗 {source.length > 50 ? source.substring(0, 50) + '...' : source}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              /* Fallback: show original content */
              <Text style={styles.resultContent}>{briefingResult.content}</Text>
            )}
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 280,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 280,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 20,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    maxHeight: 500,
    width: '100%',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'left',
  },
  topicCard: {
    borderRadius: 16,
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
  sourcesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  sourceLink: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  sourceLinkText: {
    fontSize: 11,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  generalSourcesContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  generalSourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
});