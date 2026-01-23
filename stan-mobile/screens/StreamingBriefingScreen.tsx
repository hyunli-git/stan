/**
 * Streaming Briefing Screen with real-time generation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { streamingService } from '../services/streamingService';
import { voiceService } from '../services/voiceService';

interface StreamingBriefingScreenProps {
  route: any;
  navigation: any;
}

export default function StreamingBriefingScreen({
  route,
  navigation,
}: StreamingBriefingScreenProps) {
  const { stan, userId } = route.params;

  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [completeBriefing, setCompleteBriefing] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    generateBriefing();

    // Pulse animation for loading
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const generateBriefing = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const generator = streamingService.generateBriefingStream(
        stan,
        userId,
        setProgress
      );

      for await (const chunk of generator) {
        if (chunk.event === 'chunk') {
          setStreamingText((prev) => prev + chunk.data.text);
          // Auto-scroll to bottom
          scrollViewRef.current?.scrollToEnd({ animated: true });
        } else if (chunk.event === 'complete') {
          setCompleteBriefing(chunk.data);
          setIsGenerating(false);
        } else if (chunk.event === 'error') {
          setError(chunk.data.error);
          setIsGenerating(false);
        }
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  };

  const handleSpeak = async () => {
    try {
      if (isSpeaking) {
        await voiceService.stopSpeaking();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        const textToSpeak = completeBriefing?.summary || streamingText;
        await voiceService.speakBriefing(textToSpeak);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Voice error:', error);
      setIsSpeaking(false);
    }
  };

  const handleShare = async () => {
    try {
      const content = completeBriefing?.content || streamingText;
      await Share.share({
        message: `Check out this briefing about ${stan.name}:\n\n${content.slice(0, 200)}...`,
        title: `${stan.name} Briefing`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleOpenInteractive = () => {
    if (completeBriefing) {
      navigation.navigate('InteractiveBriefing', {
        briefing: completeBriefing,
        stan,
      });
    }
  };

  const renderTopic = (topic: any, index: number) => (
    <View key={index} style={styles.topicCard}>
      <Text style={styles.topicTitle}>{topic.title}</Text>
      <Text style={styles.topicContent}>{topic.content}</Text>
      {topic.sources && topic.sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          {topic.sources.slice(0, 2).map((source: string, idx: number) => (
            <TouchableOpacity key={idx} style={styles.sourceButton}>
              <Text style={styles.sourceText} numberOfLines={1}>
                🔗 Source {idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{stan.name}</Text>
          <View style={styles.headerActions}>
            {completeBriefing && (
              <>
                <TouchableOpacity onPress={handleSpeak} style={styles.iconButton}>
                  <Text style={styles.icon}>{isSpeaking ? '⏸️' : '🔊'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                  <Text style={styles.icon}>📤</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {isGenerating && (
          <View style={styles.progressContainer}>
            <Animated.Text
              style={[styles.progressLabel, { transform: [{ scale: pulseAnim }] }]}
            >
              Generating your briefing...
            </Animated.Text>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={generateBriefing}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : completeBriefing ? (
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>📋 Summary</Text>
                <Text style={styles.summaryText}>{completeBriefing.summary}</Text>
              </View>

              {completeBriefing.topics?.map((topic: any, index: number) =>
                renderTopic(topic, index)
              )}

              <TouchableOpacity
                style={styles.chatButton}
                onPress={handleOpenInteractive}
              >
                <Text style={styles.chatButtonText}>💬 Ask Questions</Text>
              </TouchableOpacity>

              {completeBriefing.metadata && (
                <View style={styles.metadataCard}>
                  <Text style={styles.metadataText}>
                    Generated with {completeBriefing.metadata.agent_count} AI agents
                  </Text>
                  <Text style={styles.metadataText}>
                    {completeBriefing.metadata.topic_count} topics •{' '}
                    {completeBriefing.metadata.source_count} sources
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.streamingContainer}>
              <Text style={styles.streamingText}>{streamingText}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  icon: {
    fontSize: 24,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  progressLabel: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  streamingContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
  },
  streamingText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  topicCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  topicContent: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  sourcesContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  sourceButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  sourceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    marginVertical: 20,
  },
  chatButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  metadataCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginVertical: 2,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
