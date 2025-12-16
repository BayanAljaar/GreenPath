// app/(tabs)/plan.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';

export default function PlanScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">מסלול: תכנון טיול חדש</ThemedText>
      <ThemedText>هذه الصفحة ستحتوي على منطق اختيار الدولة وبدء التخطيط.</ThemedText>
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