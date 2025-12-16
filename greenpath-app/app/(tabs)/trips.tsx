// app/(tabs)/trips.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';

export default function TripsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">زياراتي</ThemedText>
      <ThemedText>هنا ستظهر الرحلات التي حفظها المستخدم.</ThemedText>
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