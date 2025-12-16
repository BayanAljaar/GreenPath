// app/(tabs)/profile.tsx
import React from 'react';
import { StyleSheet, Button } from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { useUser } from '../UserContext'; // لاستخدام دالة تسجيل الخروج

export default function ProfileScreen() {
  const { user, logout } = useUser();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">ملف المستخدم (Profile)</ThemedText>
      <ThemedText style={{ marginTop: 10 }}>مرحبًا، {user?.name || 'زائر'}!</ThemedText>
      
      {/* 💡 يمكن وضع خيارات تسجيل الدخول/الخروج/تغيير الصورة هنا */}
      <Button title="تسجيل الخروج" onPress={logout} color="#ef4444" />
      
      <ThemedText style={{ marginTop: 20 }}>هنا يمكن إضافة خيارات لتغيير الصورة، كلمة المرور، إلخ.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
});