import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

type Speaker = "me" | "other";

type Language = {
  label: string;
  value: string;
  speechCode: string;
};

type Message = {
  id: string;
  sender: Speaker;
  originalText: string;
  translatedText: string;
  originalLang: string;
  translatedLang: string;
  time: string;
};

type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: string;
  messages: Message[];
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const languages: Language[] = [
  { label: "Arabic", value: "Arabic", speechCode: "ar" },
  { label: "Hebrew", value: "Hebrew", speechCode: "he" },
  { label: "English", value: "English", speechCode: "en" },
  { label: "French", value: "French", speechCode: "fr" },
  { label: "Spanish", value: "Spanish", speechCode: "es" },
  { label: "German", value: "German", speechCode: "de" },
  { label: "Italian", value: "Italian", speechCode: "it" },
  { label: "Portuguese", value: "Portuguese", speechCode: "pt" },
  { label: "Russian", value: "Russian", speechCode: "ru" },
  { label: "Chinese", value: "Chinese", speechCode: "zh" },
  { label: "Japanese", value: "Japanese", speechCode: "ja" },
  { label: "Korean", value: "Korean", speechCode: "ko" },
  { label: "Turkish", value: "Turkish", speechCode: "tr" },
  { label: "Hindi", value: "Hindi", speechCode: "hi" },
  { label: "Dutch", value: "Dutch", speechCode: "nl" },
  { label: "Greek", value: "Greek", speechCode: "el" },
  { label: "Swedish", value: "Swedish", speechCode: "sv" },
  { label: "Polish", value: "Polish", speechCode: "pl" },
  { label: "Thai", value: "Thai", speechCode: "th" },
  { label: "Ukrainian", value: "Ukrainian", speechCode: "uk" },
  { label: "Vietnamese", value: "Vietnamese", speechCode: "vi" },
];

const initialConversations: Conversation[] = [
  {
    id: "1",
    title: "Taxi Conversation",
    subtitle: "Arabic ↔ Hebrew",
    lastMessage: "Start speaking to translate",
    messages: [],
  },
];

export default function CommunicationScreen() {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState("1");
  const [showSidebar, setShowSidebar] = useState(true);

  const [myLanguage, setMyLanguage] = useState<Language>(languages[0]);
  const [otherLanguage, setOtherLanguage] = useState<Language>(languages[1]);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingSpeaker, setRecordingSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(false);

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectingType, setSelectingType] = useState<"from" | "to">("from");
  const [languageSearch, setLanguageSearch] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedText, setEditedText] = useState("");

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/communication/conversations`);
      const data = await response.json();

      const mapped = data.map((item: any) => ({
        id: item._id,
        title: item.title,
        subtitle: `${item.fromLanguage} ↔ ${item.toLanguage}`,
        lastMessage: item.lastMessage,
        messages: (item.messages || []).map((msg: any) => ({
          id: msg._id || msg.id,
          sender: msg.sender,
          originalText: msg.originalText,
          translatedText: msg.translatedText,
          originalLang: msg.originalLang,
          translatedLang: msg.translatedLang,
          time: msg.time,
        })),
      }));

      setConversations(mapped);

      if (mapped.length > 0) {
        setSelectedConversationId(mapped[0].id);

        const [from, to] = mapped[0].subtitle.split(" ↔ ");
        const fromLang = languages.find((lang) => lang.value === from);
        const toLang = languages.find((lang) => lang.value === to);

        if (fromLang) setMyLanguage(fromLang);
        if (toLang) setOtherLanguage(toLang);
      }
    } catch (error) {
      console.error("Load conversations error:", error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) {
      return null;
    }

    return (
      conversations.find((item) => item.id === selectedConversationId) ||
      conversations[0]
    );
  }, [conversations, selectedConversationId]);

  const filteredLanguages =
    languageSearch.trim().length === 0
      ? languages
      : languages.filter((lang) =>
          lang.label.toLowerCase().startsWith(languageSearch.toLowerCase())
        );

  const openLanguagePicker = (type: "from" | "to") => {
    setSelectingType(type);
    setLanguageSearch("");
    setLanguageModalVisible(true);
  };

  const updateSelectedConversationSubtitle = (
    fromLabel: string,
    toLabel: string
  ) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? {
              ...conversation,
              subtitle: `${fromLabel} ↔ ${toLabel}`,
            }
          : conversation
      )
    );
  };

  const startRecording = async (speaker: Speaker) => {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow microphone access.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setRecordingSpeaker(speaker);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording || !recordingSpeaker) return;

      setLoading(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);

      if (!uri) {
        Alert.alert("Error", "Recording file was not created.");
        setLoading(false);
        return;
      }

      const fromLanguage =
        recordingSpeaker === "me" ? myLanguage.value : otherLanguage.value;
      const toLanguage =
        recordingSpeaker === "me" ? otherLanguage.value : myLanguage.value;

      const formData = new FormData();

      formData.append("fromLanguage", fromLanguage);
      formData.append("toLanguage", toLanguage);
      formData.append("audio", {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      } as any);

      const response = await fetch(
        `${API_URL}/api/communication/voice-translate`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Translation failed");
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        sender: recordingSpeaker,
        originalText: data.originalText,
        translatedText: data.translatedText,
        originalLang: fromLanguage,
        translatedLang: toLanguage,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const saveResponse = await fetch(
        `${API_URL}/api/communication/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newMessage),
        }
      );

      const savedConversation = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(savedConversation.message || "Failed to save message");
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                title: savedConversation.title,
                lastMessage: savedConversation.lastMessage,
                messages: (savedConversation.messages || []).map((msg: any) => ({
                  id: msg._id || msg.id,
                  sender: msg.sender,
                  originalText: msg.originalText,
                  translatedText: msg.translatedText,
                  originalLang: msg.originalLang,
                  translatedLang: msg.translatedLang,
                  time: msg.time,
                })),
              }
            : conversation
        )
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Voice translation failed.");
    } finally {
      setLoading(false);
      setRecordingSpeaker(null);
    }
  };

  const playTranslation = (text: string, language: string) => {
    const selectedLang = languages.find((lang) => lang.value === language);

    Speech.stop();
    Speech.speak(text, {
      language: selectedLang?.speechCode || "en",
      rate: 0.9,
    });
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/communication/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Conversation",
          fromLanguage: myLanguage.value,
          toLanguage: otherLanguage.value,
        }),
      });

      const data = await response.json();

      const newConversation: Conversation = {
        id: data._id,
        title: data.title,
        subtitle: `${data.fromLanguage} ↔ ${data.toLanguage}`,
        lastMessage: data.lastMessage,
        messages: [],
      };

      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.id);
    } catch (error) {
      console.error("Create conversation error:", error);
      Alert.alert("Error", "Could not create conversation.");
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`${API_URL}/api/communication/conversations/${conversationId}`, {
        method: "DELETE",
      });

      setConversations((prev) => {
        const updated = prev.filter((item) => item.id !== conversationId);

        if (selectedConversationId === conversationId && updated.length > 0) {
          setSelectedConversationId(updated[0].id);
        }

        return updated;
      });
    } catch (error) {
      console.error("Delete conversation error:", error);
      Alert.alert("Error", "Could not delete conversation.");
    }
  };

  const saveEditedMessage = async () => {
    try {
      if (!editingMessage || !selectedConversation) return;

      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/communication/conversations/${selectedConversationId}/messages/${editingMessage.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalText: editedText,
            fromLanguage: editingMessage.originalLang,
            toLanguage: editingMessage.translatedLang,
          }),
        }
      );

      const updatedConversation = await response.json();

      if (!response.ok) {
        throw new Error(updatedConversation.message || "Failed to edit message");
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                lastMessage: updatedConversation.lastMessage,
                messages: (updatedConversation.messages || []).map((msg: any) => ({
                  id: msg._id || msg.id,
                  sender: msg.sender,
                  originalText: msg.originalText,
                  translatedText: msg.translatedText,
                  originalLang: msg.originalLang,
                  translatedLang: msg.translatedLang,
                  time: msg.time,
                })),
              }
            : conversation
        )
      );

      setEditModalVisible(false);
      setEditingMessage(null);
      setEditedText("");
    } catch (error) {
      console.error("Edit message error:", error);
      Alert.alert("Error", "Could not edit and re-translate message.");
    } finally {
      setLoading(false);
    }
  };

  const isRecordingMe = recordingSpeaker === "me";
  const isRecordingOther = recordingSpeaker === "other";

  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Communication</Text>
        </View>

        <View style={styles.emptyPage}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>

          <Pressable
            style={styles.createConversationButton}
            onPress={createNewConversation}
          >
            <Text style={styles.createConversationButtonText}>
              Create Conversation
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Communication</Text>
        <Text style={styles.description}>
          Speak, translate, read, and play the translated voice.
        </Text>
      </View>

      <View style={styles.content}>
        {showSidebar && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Conversations</Text>

              <View style={styles.sidebarActions}>
                <Pressable
                  style={styles.newButton}
                  onPress={createNewConversation}
                >
                  <Text style={styles.newButtonText}>＋</Text>
                </Pressable>

                <Pressable onPress={() => setShowSidebar(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </Pressable>
              </View>
            </View>

            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.id === selectedConversationId;

                return (
                  <Pressable
                    onPress={() => {
                      setSelectedConversationId(item.id);

                      const [from, to] = item.subtitle.split(" ↔ ");
                      const fromLang = languages.find(
                        (lang) => lang.value === from
                      );
                      const toLang = languages.find((lang) => lang.value === to);

                      if (fromLang) setMyLanguage(fromLang);
                      if (toLang) setOtherLanguage(toLang);
                    }}
                    onLongPress={() => {
                      Alert.alert(
                        "Delete conversation",
                        "Are you sure you want to delete this conversation?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteConversation(item.id),
                          },
                        ]
                      );
                    }}
                    style={[
                      styles.conversationCard,
                      active && styles.activeConversationCard,
                    ]}
                  >
                    <Text
                      style={[
                        styles.conversationTitle,
                        active && styles.activeText,
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.conversationSubtitle}>
                      {item.subtitle}
                    </Text>

                    <Text numberOfLines={1} style={styles.lastMessage}>
                      {item.lastMessage}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        <View style={styles.chatArea}>
          <View style={styles.chatHeader}>
            {!showSidebar && (
              <Pressable
                style={styles.openSidebarButton}
                onPress={() => setShowSidebar(true)}
              >
                <Text style={styles.openSidebarText}>☰</Text>
              </Pressable>
            )}

            <View>
              <Text style={styles.chatTitle}>{selectedConversation.title}</Text>

              <View style={styles.translateBar}>
                <Pressable
                  style={styles.languagePill}
                  onPress={() => openLanguagePicker("from")}
                >
                  <Text style={styles.languagePillLabel}>From</Text>
                  <Text style={styles.languagePillText}>{myLanguage.label}</Text>
                </Pressable>

                <Text style={styles.arrowText}>↔</Text>

                <Pressable
                  style={styles.languagePill}
                  onPress={() => openLanguagePicker("to")}
                >
                  <Text style={styles.languagePillLabel}>To</Text>
                  <Text style={styles.languagePillText}>
                    {otherLanguage.label}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Modal visible={languageModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Language</Text>

                  <Pressable onPress={() => setLanguageModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.switchRow}>
                  <Pressable
                    style={[
                      styles.switchButton,
                      selectingType === "from" && styles.activeSwitchButton,
                    ]}
                    onPress={() => setSelectingType("from")}
                  >
                    <Text
                      style={[
                        styles.switchButtonText,
                        selectingType === "from" && styles.activeSwitchText,
                      ]}
                    >
                      From
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.switchButton,
                      selectingType === "to" && styles.activeSwitchButton,
                    ]}
                    onPress={() => setSelectingType("to")}
                  >
                    <Text
                      style={[
                        styles.switchButtonText,
                        selectingType === "to" && styles.activeSwitchText,
                      ]}
                    >
                      To
                    </Text>
                  </Pressable>
                </View>

                <TextInput
                  placeholder="Search language..."
                  value={languageSearch}
                  onChangeText={setLanguageSearch}
                  style={styles.searchInput}
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                  {filteredLanguages.map((lang) => {
                    const selected =
                      selectingType === "from"
                        ? myLanguage.value === lang.value
                        : otherLanguage.value === lang.value;

                    return (
                      <Pressable
                        key={lang.value}
                        style={[
                          styles.modalLanguageItem,
                          selected && styles.selectedLanguageItem,
                        ]}
                        onPress={() => {
                          if (selectingType === "from") {
                            setMyLanguage(lang);
                            updateSelectedConversationSubtitle(
                              lang.label,
                              otherLanguage.label
                            );
                          } else {
                            setOtherLanguage(lang);
                            updateSelectedConversationSubtitle(
                              myLanguage.label,
                              lang.label
                            );
                          }

                          setLanguageSearch("");
                          setLanguageModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalLanguageText,
                            selected && styles.selectedLanguageText,
                          ]}
                        >
                          {lang.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal visible={editModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit recognized text</Text>

                  <Pressable
                    onPress={() => {
                      setEditModalVisible(false);
                      setEditingMessage(null);
                      setEditedText("");
                    }}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={editedText}
                  onChangeText={setEditedText}
                  multiline
                  style={styles.editTextInput}
                  placeholder="Edit the original recognized text..."
                />

                <Pressable
                  style={styles.saveEditButton}
                  onPress={saveEditedMessage}
                >
                  <Text style={styles.saveEditButtonText}>
                    Save and translate again
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <ScrollView
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {selectedConversation.messages.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Press one of the recording buttons and start speaking.
                </Text>
              </View>
            )}

            {selectedConversation.messages.map((message) => {
              const isMe = message.sender === "me";

              return (
                <View
                  key={message.id || (message as any)._id}
                  style={[
                    styles.messageWrapper,
                    isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.myBubble : styles.otherBubble,
                    ]}
                  >
                    <View style={styles.messageTopRow}>
                      <Text
                        style={[
                          styles.langLabel,
                          !isMe && styles.darkSmallText,
                        ]}
                      >
                        {message.originalLang} → {message.translatedLang}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          !isMe && styles.darkSmallText,
                        ]}
                      >
                        {message.time}
                      </Text>
                    </View>

                    <Text style={[styles.originalText, !isMe && styles.darkText]}>
                      {message.originalText}
                    </Text>

                    <View
                      style={[
                        styles.translationBox,
                        !isMe && styles.otherTranslationBox,
                      ]}
                    >
                      <Text
                        style={[
                          styles.translationLabel,
                          !isMe && styles.darkSmallText,
                        ]}
                      >
                        Translation
                      </Text>
                      <Text
                        style={[
                          styles.translatedText,
                          !isMe && styles.darkText,
                        ]}
                      >
                        {message.translatedText}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.editButtonWrapper,
                        isMe
                          ? styles.editButtonWrapperRight
                          : styles.editButtonWrapperLeft,
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.editButton,
                          !isMe && styles.otherEditButton,
                        ]}
                        onPress={() => {
                          setEditingMessage(message);
                          setEditedText(message.originalText);
                          setEditModalVisible(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.editButtonText,
                            !isMe && styles.otherEditButtonText,
                          ]}
                        >
                          ✏️
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      style={[
                        styles.playButton,
                        !isMe && styles.otherPlayButton,
                      ]}
                      onPress={() =>
                        playTranslation(
                          message.translatedText,
                          message.translatedLang
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.playButtonText,
                          !isMe && styles.otherPlayButtonText,
                        ]}
                      >
                        🔊 Play translated voice
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Translating voice...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.recordPanel}>
            <Pressable
              style={[
                styles.recordButton,
                isRecordingMe && styles.recordingButton,
              ]}
              onPress={isRecordingMe ? stopRecording : () => startRecording("me")}
              disabled={loading || isRecordingOther}
            >
              <Text style={styles.recordIcon}>🎙️</Text>
              <Text style={styles.recordText}>
                {isRecordingMe ? "Stop my recording" : "Record my voice"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.recordButtonSecondary,
                isRecordingOther && styles.recordingButton,
              ]}
              onPress={
                isRecordingOther ? stopRecording : () => startRecording("other")
              }
              disabled={loading || isRecordingMe}
            >
              <Text style={styles.recordIcon}>🎙️</Text>
              <Text
                style={[
                  styles.recordTextSecondary,
                  isRecordingOther && styles.recordText,
                ]}
              >
                {isRecordingOther
                  ? "Stop other recording"
                  : "Record other person"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const colors = {
  green: "#2E7D5B",
  lightGreen: "#EAF5EF",
  dark: "#1F2A24",
  gray: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  background: "#F7FAF8",
  danger: "#C2410C",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 55,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.dark,
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    color: colors.gray,
  },
  emptyPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createConversationButton: {
    marginTop: 16,
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createConversationButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  sidebar: {
    width: 145,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sidebarTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.dark,
  },
  sidebarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  newButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray,
  },
  conversationCard: {
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeConversationCard: {
    backgroundColor: colors.lightGreen,
    borderColor: colors.green,
  },
  conversationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.dark,
  },
  activeText: {
    color: colors.green,
  },
  conversationSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: colors.gray,
  },
  lastMessage: {
    marginTop: 6,
    fontSize: 10,
    color: colors.gray,
  },
  chatArea: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  chatHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.lightGreen,
  },
  openSidebarButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  openSidebarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.dark,
  },
  translateBar: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  languagePill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languagePillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray,
  },
  languagePillText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: colors.green,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.green,
  },
  messagesContainer: {
    flex: 1,
    padding: 12,
  },
  emptyBox: {
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.dark,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    color: colors.gray,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  myMessageWrapper: {
    alignItems: "flex-end",
  },
  otherMessageWrapper: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "92%",
    borderRadius: 18,
    padding: 12,
  },
  myBubble: {
    backgroundColor: colors.green,
  },
  otherBubble: {
    backgroundColor: "#F3F4F6",
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  langLabel: {
    fontSize: 10,
    color: "#DDEFE6",
    fontWeight: "700",
  },
  timeText: {
    fontSize: 10,
    color: "#DDEFE6",
  },
  darkSmallText: {
    color: colors.gray,
  },
  originalText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    lineHeight: 20,
  },
  darkText: {
    color: colors.dark,
  },
  translationBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  otherTranslationBox: {
    backgroundColor: colors.white,
  },
  translationLabel: {
    fontSize: 10,
    color: "#E8F5EE",
    marginBottom: 4,
    fontWeight: "700",
  },
  translatedText: {
    fontSize: 13,
    color: colors.white,
    lineHeight: 19,
  },
  playButton: {
    marginTop: 10,
    alignSelf: "stretch",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
  },
  otherPlayButton: {
    backgroundColor: colors.lightGreen,
  },
  playButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  otherPlayButtonText: {
    color: colors.green,
  },
  editButtonWrapper: {
    marginTop: 8,
    width: "100%",
  },
  editButtonWrapperRight: {
    alignItems: "flex-end",
  },
  editButtonWrapperLeft: {
    alignItems: "flex-start",
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  otherEditButton: {
    backgroundColor: colors.white,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  otherEditButtonText: {
    color: colors.green,
  },
  loadingBox: {
    marginTop: 12,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: colors.gray,
    fontSize: 13,
  },
  recordPanel: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  recordButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonSecondary: {
    flex: 1,
    backgroundColor: colors.lightGreen,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.green,
  },
  recordingButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  recordIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  recordText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
  },
  recordTextSecondary: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.green,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.dark,
  },
  switchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  activeSwitchButton: {
    backgroundColor: colors.green,
  },
  switchButtonText: {
    fontWeight: "700",
    color: colors.gray,
  },
  activeSwitchText: {
    color: colors.white,
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalLanguageItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedLanguageItem: {
    backgroundColor: colors.lightGreen,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modalLanguageText: {
    fontSize: 15,
    color: colors.dark,
  },
  selectedLanguageText: {
    color: colors.green,
    fontWeight: "800",
  },
  editTextInput: {
    minHeight: 110,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  saveEditButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveEditButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
});