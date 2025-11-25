import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

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

  {/* ROW 1 */}
<View style={styles.cardsRow}>

  {/* טורקיה */}
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push({
        pathname: "/country/[code]",
        params: { code: "turkey" },
      })
    }
  >
    <Text style={styles.cardTitle}>🇹🇷 טורקיה</Text>
    <Text style={styles.cardText}>איסטנבול, אנטליה, קפדוקיה</Text>
  </TouchableOpacity>

  {/* יוון */}
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push({
        pathname: "/country/[code]",
        params: { code: "greece" },
      })
    }
  >
    <Text style={styles.cardTitle}>🇬🇷 יוון</Text>
    <Text style={styles.cardText}>אתונה, סנטוריני, רודוס</Text>
  </TouchableOpacity>

</View>


{/* ROW 2 */}
<View style={styles.cardsRow}>

  {/* איטליה */}
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push({
        pathname: "/country/[code]",
        params: { code: "italy" },
      })
    }
  >
    <Text style={styles.cardTitle}>🇮🇹 איטליה</Text>
    <Text style={styles.cardText}>רומא, ונציה, מילאנו</Text>
  </TouchableOpacity>

  {/* צרפת */}
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push({
        pathname: "/country/[code]",
        params: { code: "france" },
      })
    }
  >
    <Text style={styles.cardTitle}>🇫🇷 צרפת</Text>
    <Text style={styles.cardText}>פריז, ניס, מרסיי</Text>
  </TouchableOpacity>

</View>


      
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
    textAlign: 'left',
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
    elevation: 2,
    shadowColor: '#000',
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
