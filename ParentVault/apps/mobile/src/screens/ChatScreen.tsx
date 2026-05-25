/**
 * PARENTVAULT-COMMENTARY
 *
 * Nanny Bot-style command center where parents type natural-language updates, factual questions, and lookup requests about the child.
 *
 * It feeds messages into the vault store so commands can draft reminders, answer from stored RAG knowledge, or queue reviewed child-related web lookup.
 *
 * The assistant should feel capable and helpful while keeping ParentVault-focused scope. Legal/medical advice and silent sensitive mutations are out of bounds.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';

interface Message { role: 'parent' | 'assistant'; text: string }

const suggestedPrompts = [
  'What details are missing?',
  'Who is the pediatrician?',
  'Find the school calendar',
  'Add pickup Friday at 5 PM',
  'Log meds at 8 PM'
];

export function ChatScreen() {
  // Theme/styles first so visual behavior is easy to locate.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Local state holds the unsent composer text and the visible conversation history.
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi, I’m Nanny Bot. Ask me about the child, have me organize a note, draft a reminder, check what’s missing, or help find child-related details like school calendars, providers, or pharmacy info.' }
  ]);

  // Store action interprets the parent's message and drafts/saves supported updates.
  const applyChatText = useVaultStore(s => s.applyChatText);

  // Send protects against blank messages, adds the parent's message, then appends the assistant reply.
  const send = () => {
    if (!text.trim()) return;
    const reply = applyChatText(text.trim());
    setMessages(prev => [...prev, { role: 'parent', text: text.trim() }, { role: 'assistant', text: reply }]);
    setText('');
  };

  const sendPrompt = (prompt: string) => {
    const reply = applyChatText(prompt);
    setMessages(prev => [...prev, { role: 'parent', text: prompt }, { role: 'assistant', text: reply }]);
  };

  const isReviewDraft = (message: Message) => message.role === 'assistant' && /review|draft|confirm|look that up/i.test(message.text);

  // Render order: guidance card, message cards, then sticky composer at the bottom.
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>ParentVault chat</Text>
        <Text style={styles.subtitle}>A powerful Nanny Bot assistant for child questions, schedules, reminders, notes, imports, and helpful child-related lookup.</Text>
        <Card>
          <View style={styles.nannyHeader}>
            <View style={styles.nannyAvatar}><Text style={styles.nannyAvatarText}>NB</Text></View>
            <View style={styles.nannyHeaderText}>
              <Text style={styles.helperEyebrow}>Nanny Bot</Text>
              <Text style={styles.helperTitle}>Ask me to organize child details, reminders, notes, and lookups.</Text>
              <Text style={styles.helperCopy}>I’ll use saved vault information first and help organize anything new for parent review.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {suggestedPrompts.map(prompt => (
              <Pressable key={prompt} onPress={() => sendPrompt(prompt)} style={styles.chip}>
                <Text style={styles.chipText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

      {/* Empty state when conversation is cleared or fresh */}
      {messages.length === 1 && messages[0].role === 'assistant' && !text.trim() ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No new conversation yet</Text>
          <Text style={styles.emptySubtle}>This is a fresh chat. Ask about saved child information, add an update, check missing details, or ask Nanny Bot to help find school, care, provider, activity, or schedule information.</Text>
        </View>
      ) : null}
        {messages.map((message, index) => (
          <View key={index} style={[styles.messageRow, message.role === 'parent' && styles.parentMessageRow]}>
            {message.role === 'assistant' ? <View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>NB</Text></View> : null}
            <View style={[styles.bubble, message.role === 'parent' ? styles.parentBubble : styles.assistantBubble]}>
              <Text style={message.role === 'assistant' ? styles.assistant : styles.parent}>{message.role === 'assistant' ? 'Nanny Bot' : 'Parent'}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
              {isReviewDraft(message) ? (
                <View style={styles.reviewDraftCard}>
                  <Text style={styles.reviewDraftTitle}>Review draft</Text>
                  <Text style={styles.reviewDraftCopy}>I’ll keep this as a draft until the parent confirms what should be saved or used.</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <View style={styles.composerRow}>
          <TextInput value={text} onChangeText={setText} placeholder="Ask Nanny Bot about the child..." placeholderTextColor={theme.subtle} style={styles.input} multiline />
          <View style={styles.sendButton}><PrimaryButton onPress={send}>Send</PrimaryButton></View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Screen-specific styles for the Chat tab only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  helperEyebrow: { color: theme.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  helperTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  helperCopy: { color: theme.muted, marginTop: 8, lineHeight: 20 },
  nannyHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nannyHeaderText: { flex: 1 },
  nannyAvatar: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: theme.primary },
  nannyAvatarText: { color: theme.primary, fontWeight: '900', fontSize: 19 },
  chipRow: { gap: 8, paddingTop: 14 },
  chip: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.input, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { color: theme.text, fontWeight: '700', fontSize: 13 },
  assistant: { color: theme.primary, fontWeight: '800', marginBottom: 4 },
  parent: { color: theme.text, fontWeight: '800', marginBottom: 4 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  parentMessageRow: { justifyContent: 'flex-end' },
  smallAvatar: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: theme.primary },
  smallAvatarText: { color: theme.primary, fontWeight: '900', fontSize: 12 },
  bubble: { maxWidth: '84%', borderRadius: 18, padding: 14, borderWidth: 1 },
  assistantBubble: { backgroundColor: theme.surface, borderColor: theme.border, borderBottomLeftRadius: 6 },
  parentBubble: { backgroundColor: theme.primarySoft, borderColor: theme.primary, borderBottomRightRadius: 6 },
  messageText: { color: theme.text, lineHeight: 20 },
  reviewDraftCard: { marginTop: 12, borderRadius: 14, padding: 12, backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border },
  reviewDraftTitle: { color: theme.primary, fontWeight: '900', marginBottom: 4 },
  reviewDraftCopy: { color: theme.muted, lineHeight: 19 },
  emptyState: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: theme.surface },
  emptyTitle: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  emptySubtle: { color: theme.muted, lineHeight: 20 },
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: theme.app, borderTopWidth: 1, borderTopColor: theme.border },
  composerRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 14, backgroundColor: theme.input, padding: 12, borderWidth: 1, borderColor: theme.inputBorder, color: theme.text },
  sendButton: { width: 92 }
});

