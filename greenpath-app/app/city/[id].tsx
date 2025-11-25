import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Stack, useLocalSearchParams } from 'expo-router';

type CityInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
};

const CITIES: Record<string, CityInfo> = {
  // Turkey
  istanbul: {
    id: 'istanbul',
    name: 'איסטנבול',
    latitude: 41.0082,
    longitude: 28.9784,
    description: 'עיר מרהיבה, שווקים, בוספורוס, אוכל מעולה',
  },
  antalya: {
    id: 'antalya',
    name: 'אנטליה',
    latitude: 36.8969,
    longitude: 30.7133,
    description: 'עיר נופש, חופים וריזורטים',
  },
  cappadocia: {
    id: 'cappadocia',
    name: 'קפדוקיה',
    latitude: 38.6431,
    longitude: 34.8353,
    description: 'נופים, בלוני אוויר חם, חוויה מיוחדת',
  },

  // Greece
  athens: {
    id: 'athens',
    name: 'אתונה',
    latitude: 37.9838,
    longitude: 23.7275,
    description: 'אקרופוליס, היסטוריה ותרבות',
  },
  santorini: {
    id: 'santorini',
    name: 'סנטוריני',
    latitude: 36.3932,
    longitude: 25.4615,
    description: 'עיר כחולה-לבנה, נופים רומנטיים',
  },
  rhodes: {
    id: 'rhodes',
    name: 'רודוס',
    latitude: 36.4340,
    longitude: 28.2170,
    description: 'חופים, נופש ומשפחה',
  },

  // Italy
  rome: {
    id: 'rome',
    name: 'רומא',
    latitude: 41.9028,
    longitude: 12.4964,
    description: 'קולוסיאום, וותיקן, עיר עתיקה',
  },
  venice: {
    id: 'venice',
    name: 'ונציה',
    latitude: 45.4408,
    longitude: 12.3155,
    description: 'תעלות וגונדולות',
  },
  milan: {
    id: 'milan',
    name: 'מילאנו',
    latitude: 45.4642,
    longitude: 9.19,
    description: 'אופנה, קניות ומרכזים',
  },

  // France
  paris: {
    id: 'paris',
    name: 'פריז',
    latitude: 48.8566,
    longitude: 2.3522,
    description: 'מגדל אייפל, לובר, עיר אהבה',
  },
  nice: {
    id: 'nice',
    name: 'ניס',
    latitude: 43.7102,
    longitude: 7.2620,
    description: 'חופשה יוקרתית על הים',
  },
  marseille: {
    id: 'marseille',
    name: 'מרסיי',
    latitude: 43.2965,
    longitude: 5.3698,
    description: 'עיר נמל, אווירה ים תיכונית',
  },
};

export default function CityScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const city = id ? CITIES[id.toLowerCase()] : null;

  if (!city) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>לא נמצאו נתונים לעיר הזו.</Text>
      </View>
    );
  }

  const region: Region = {
    latitude: city.latitude,
    longitude: city.longitude,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  return (
    <>
      <Stack.Screen options={{ title: city.name }} />

      <View style={styles.container}>
        <Text style={styles.cityTitle}>{city.name}</Text>
        <Text style={styles.cityDescription}>{city.description}</Text>

        <MapView style={styles.map} initialRegion={region}>
          <Marker
            coordinate={{ latitude: city.latitude, longitude: city.longitude }}
            title={city.name}
            description={city.description}
          />
        </MapView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5faf7',
    padding: 16,
    gap: 10,
  },
  cityTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  cityDescription: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
  },
  map: {
    flex: 1,
    marginTop: 10,
    borderRadius: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#b71c1c',
  },
});
