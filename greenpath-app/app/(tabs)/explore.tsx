// app/(tabs)/expre.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';

export default function ShareScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Share: مجتمع GreenPath</ThemedText>
      <ThemedText>هنا يمكن للمستخدمين مشاركة صورهم وتجاربهم.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});