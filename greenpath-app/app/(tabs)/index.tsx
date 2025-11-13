import { StyleSheet, Text, View, TextInput, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>Guide to GreenPath</Text>

      <Text style={styles.title}>לאן את/ה רוצה לנסוע? 🌍</Text>
      <Text style={styles.subtitle}>
        אפשר לחפש ישירות עיר, או לבחור מדינה מהרשימה כדי להתחיל לתכנן את המסע.
      </Text>

      <Text style={styles.label}>חיפוש עיר או מדינה</Text>
      <TextInput
        style={styles.input}
        placeholder="למשל: Istanbul, Paris, Tel Aviv..."
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>מדינות פופולריות</Text>
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🇹🇷 טורקיה</Text>
          <Text style={styles.cardText}>איסטנבול, אנטליה, קפדוקיה</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🇬🇷 יוון</Text>
          <Text style={styles.cardText}>אתונה, סנטוריני, רודוס</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🇮🇹 איטליה</Text>
          <Text style={styles.cardText}>רומא, ונציה, מילאנו</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🇫🇷 צרפת</Text>
          <Text style={styles.cardText}>פריז, ניס, מרסיי</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        בהמשך נוסיף כאן חיפוש אמיתי מכל העולם, מסלולים, מפה, קול וחוויות משתמש 💚
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: '#f5faf7',
    gap: 16,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
    alignSelf: 'flex-end',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 15,
    color: '#444',
    textAlign: 'right',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c5e1a5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: 'left', // כדי להקליד באנגלית נוח
    backgroundColor: '#fff',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    elevation: 2, // אנדרואיד
    shadowColor: '#000', // iOS
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
  },
  cardText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'right',
  },
  hint: {
    fontSize: 13,
    color: '#777',
    marginTop: 16,
    textAlign: 'right',
  },
});
