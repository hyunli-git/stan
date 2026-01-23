/**
 * Interactive Briefing Screen with chat interface
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { voiceService } from '../services/voiceService';
import { streamingService } from '../services/streamingService';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface InteractiveBriefingScreenProps {
  route: any;
  navigation: any;
}

export default function InteractiveBriefingScreen({
  route,
  navigation,
}: InteractiveBriefingScreenProps) {
  const { briefing, stan } = route.params;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: briefing.summary,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Analyze user intent and respond appropriately
      const response = await generateResponse(inputText, briefing, stan);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = async (
    query: string,
    briefingData: any,
    stanData: any
  ): Promise<string> => {
    const lowerQuery = query.toLowerCase();

    // Quick actions
    if (lowerQuery.includes('more') || lowerQuery.includes('details')) {
      return `Here are more details:\n\n${briefingData.content.slice(0, 500)}...`;
    }

    if (lowerQuery.includes('source') || lowerQuery.includes('where')) {
      const sources = briefingData.sources.slice(0, 3);
      return `Here are the sources:\n\n${sources.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    }

    if (lowerQuery.includes('summary') || lowerQuery.includes('tldr')) {
      return `Quick summary: ${briefingData.summary}`;
    }

    if (lowerQuery.includes('trending') || lowerQuery.includes('viral')) {
      const trendingTopic = briefingData.topics.find(
        (t: any) => t.category === 'trending'
      );
      return trendingTopic
        ? `🔥 ${trendingTopic.content}`
        : "I don't have trending information right now.";
    }

    if (lowerQuery.includes('recommend') || lowerQuery.includes('similar')) {
      const recTopic = briefingData.topics.find(
        (t: any) => t.category === 'recommendations'
      );
      return recTopic
        ? `✨ ${recTopic.content}`
        : `Based on your interest in ${stanData.name}, you might also enjoy exploring related artists or topics in the same genre.`;
    }

    // Default response
    return `Let me help you with that! Could you be more specific? You can ask me to:
• Show more details
• Provide sources
• Explain trending topics
• Give recommendations
• Summarize specific sections`;
  };

  const handleSpeak = async (text: string) => {
    try {
      if (isSpeaking) {
        await voiceService.stopSpeaking();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        await voiceService.speakBriefing(text);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Voice error:', error);
      setIsSpeaking(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser && styles.userMessage,
          isSystem && styles.systemMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser && styles.userBubble,
            isSystem && styles.systemBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser && styles.userMessageText,
              isSystem && styles.systemMessageText,
            ]}
          >
            {message.content}
          </Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {!isUser && !isSystem && (
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => handleSpeak(message.content)}
          >
            <Text style={styles.speakIcon}>{isSpeaking ? '⏸️' : '🔊'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const quickActions = [
    { label: 'More details', action: () => setInputText('Tell me more details') },
    { label: 'Sources', action: () => setInputText('Show me the sources') },
    { label: 'Trending', action: () => setInputText('What\'s trending?') },
    { label: 'Recommendations', action: () => setInputText('Any recommendations?') },
  ];

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{stan.name} Chat</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={action.action}
              >
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  systemMessage: {
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  userBubble: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  userMessageText: {
    fontWeight: '500',
  },
  systemMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  speakButton: {
    marginLeft: 8,
    padding: 8,
  },
  speakIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  quickActionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    marginRight: 10,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
