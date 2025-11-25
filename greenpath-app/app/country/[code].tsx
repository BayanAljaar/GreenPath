import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Stack, useLocalSearchParams, router } from 'expo-router';

type City = {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
};

type CountryConfig = {
  name: string;
  code: string;
  center: Region;
  cities: City[];
};

const COUNTRIES: Record<string, CountryConfig> = {
  turkey: {
    code: 'turkey',
    name: 'טורקיה',
    center: {
      latitude: 39.0,
      longitude: 35.0,
      latitudeDelta: 8,
      longitudeDelta: 8,
    },
    cities: [
      {
        id: 'istanbul',
        name: 'איסטנבול',
        description: 'העיר הכי פופולרית, בוספורוס, מסגדים, שווקים',
        latitude: 41.0082,
        longitude: 28.9784,
      },
      {
        id: 'antalya',
        name: 'אנטליה',
        description: 'רצועת חוף, ריזורטים, חופשה בטן-גב',
        latitude: 36.8969,
        longitude: 30.7133,
      },
      {
        id: 'cappadocia',
        name: 'קפדוקיה',
        description: 'בלוני אוויר חם, נופים מיוחדים, גורמה',
        latitude: 38.6431,
        longitude: 34.8353,
      },
    ],
  },

  greece: {
    code: 'greece',
    name: 'יוון',
    center: {
      latitude: 39.0742,
      longitude: 21.8243,
      latitudeDelta: 6,
      longitudeDelta: 6,
    },
    cities: [
      {
        id: 'athens',
        name: 'אתונה',
        description: 'אקרופוליס, היסטוריה, עיר בירה',
        latitude: 37.9838,
        longitude: 23.7275,
      },
      {
        id: 'santorini',
        name: 'סנטוריני',
        description: 'אי רומנטי, נופים, כחול-לבן',
        latitude: 36.3932,
        longitude: 25.4615,
      },
      {
        id: 'rhodes',
        name: 'רודוס',
        description: 'אי עם חופים, נופש משפחתי',
        latitude: 36.4340,
        longitude: 28.2170,
      },
    ],
  },

  italy: {
    code: 'italy',
    name: 'איטליה',
    center: {
      latitude: 41.8719,
      longitude: 12.5674,
      latitudeDelta: 6.5,
      longitudeDelta: 6.5,
    },
    cities: [
      {
        id: 'rome',
        name: 'רומא',
        description: 'קולוסיאום, וותיקן, עיר הבירה',
        latitude: 41.9028,
        longitude: 12.4964,
      },
      {
        id: 'venice',
        name: 'ונציה',
        description: 'תעלות, גונדות, עיר על המים',
        latitude: 45.4408,
        longitude: 12.3155,
      },
      {
        id: 'milan',
        name: 'מילאנו',
        description: 'אופנה, קניות, מרכז מודרני',
        latitude: 45.4642,
        longitude: 9.1900,
      },
    ],
  },

  france: {
    code: 'france',
    name: 'צרפת',
    center: {
      latitude: 46.2276,
      longitude: 2.2137,
      latitudeDelta: 6.5,
      longitudeDelta: 6.5,
    },
    cities: [
      {
        id: 'paris',
        name: 'פריז',
        description: 'מגדל אייפל, לובר, בירת רומנטיקה',
        latitude: 48.8566,
        longitude: 2.3522,
      },
      {
        id: 'nice',
        name: 'ניס',
        description: 'קוט ד\'אזור, חוף, נופש יוקרתי',
        latitude: 43.7102,
        longitude: 7.2620,
      },
      {
        id: 'marseille',
        name: 'מרסיי',
        description: 'עיר נמל, אווירה ים תיכונית',
        latitude: 43.2965,
        longitude: 5.3698,
      },
    ],
  },
};

export default function CountryScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = (params.code || '').toLowerCase();
  const country = COUNTRIES[code];

  const mapRef = useRef<MapView | null>(null);

  if (!country) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>לא נמצאו נתונים עבור המדינה הזו.</Text>
      </View>
    );
  }

  const handleFocusCity = (city: City) => {
    if (!mapRef.current) return;

    mapRef.current.animateToRegion(
      {
        latitude: city.latitude,
        longitude: city.longitude,
        latitudeDelta: 3,
        longitudeDelta: 3,
      },
      700
    );
  };

  const handleOpenCity = (city: City) => {
    router.push({
      pathname: '/city/[id]',
      params: { id: city.id },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: country.name }} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.countryTitle}>{country.name}</Text>
        <Text style={styles.countrySubtitle}>
          בחר/י עיר על המפה או מהרשימה כדי להמשיך לתכנון הטיול.
        </Text>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={country.center}
          >
            {country.cities.map((city) => (
              <Marker
                key={city.id}
                coordinate={{ latitude: city.latitude, longitude: city.longitude }}
                title={city.name}
                description={city.description}
                onPress={() => handleFocusCity(city)}
              />
            ))}
          </MapView>
        </View>

        <Text style={styles.sectionTitle}>ערים פופולריות</Text>

        {country.cities.map((city) => (
          <TouchableOpacity
            key={city.id}
            style={styles.cityCard}
            onPress={() => handleOpenCity(city)}
          >
            <View style={styles.cityCardTextContainer}>
              <Text style={styles.cityName}>{city.name}</Text>
              <Text style={styles.cityDescription}>{city.description}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.hint}>
          בהמשך נוסיף כאן ניווט לעמודי ערים, מסלולים, מסעדות ועוד 💚
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#f5faf7',
    gap: 12,
  },
  countryTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  countrySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    marginBottom: 8,
  },
  mapContainer: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  map: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 4,
  },
  cityCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cityCardTextContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 2,
  },
  cityDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
  },
  hint: {
    fontSize: 13,
    color: '#777',
    marginTop: 12,
    textAlign: 'right',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f5faf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#b71c1c',
  },
});
