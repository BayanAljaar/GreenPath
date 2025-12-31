// app/trip/details.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import MapComponent from '../../components/MapComponent';
import { fetchCountries, Country } from '../../services/apiClient';
import { fetchCitiesByCountry } from '../../services/apiClient';

const { width, height } = Dimensions.get('window');

export default function TripDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId?: string;
    title?: string;
    countryCode?: string;
    countryName?: string;
    startDate?: string;
    endDate?: string;
    style?: string;
    notes?: string;
  }>();

  const tripId = params.tripId || '';
  const title = params.title || 'Trip';
  const countryCode = params.countryCode || '';
  const countryName = params.countryName || '';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const style = params.style || '';
  const notes = params.notes || '';

  // Debug: Log the date values to see what we're receiving
  useEffect(() => {
    console.log('Trip Details - Received params:', {
      startDate: params.startDate,
      endDate: params.endDate,
      startDateType: typeof params.startDate,
      endDateType: typeof params.endDate,
    });
  }, [params.startDate, params.endDate]);

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{
    latitude: number;
    longitude: number;
  }>>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    durationWalking: number;
    durationDriving: number;
  } | null>(null);
  const [countryInfo, setCountryInfo] = useState<Country | null>(null);
  const [cities, setCities] = useState<Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // الحصول على الموقع الحالي
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'The app needs location access permission');
        setLocationLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      return { latitude, longitude };
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Failed to get current location');
      setLocationLoading(false);
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  // الحصول على إحداثيات الدولة
  const getCountryCoordinates = async (countryName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(countryName)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        return {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        };
      }
      return null;
    } catch (err) {
      console.error('Error getting country coordinates:', err);
      return null;
    }
  };

  // حساب المسار
  const calculateRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    try {
      let walkingDistance = 0;
      let walkingDuration = 0;
      let drivingDistance = 0;
      let drivingDuration = 0;
      let routeCoordinates: Array<{ latitude: number; longitude: number }> = [];

      // استخدام OpenRouteService
      const [walkingResponse, drivingResponse] = await Promise.all([
        fetch('https://api.openrouteservice.org/v2/directions/foot-walking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
          }),
        }),
        fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
          }),
        }),
      ]);

      if (walkingResponse.ok) {
        const walkingData = await walkingResponse.json();
        if (walkingData.routes && walkingData.routes.length > 0) {
          const route = walkingData.routes[0];
          if (route.summary) {
            walkingDistance = route.summary.distance / 1000;
            walkingDuration = Math.ceil(route.summary.duration / 60);
          }
          if (route.geometry && route.geometry.coordinates) {
            routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
          }
        }
      }

      if (drivingResponse.ok) {
        const drivingData = await drivingResponse.json();
        if (drivingData.routes && drivingData.routes.length > 0) {
          const route = drivingData.routes[0];
          if (route.summary) {
            drivingDistance = route.summary.distance / 1000;
            drivingDuration = Math.ceil(route.summary.duration / 60);
          }
        }
      }

      setRouteInfo({
        distance: drivingDistance || walkingDistance,
        durationWalking: walkingDuration,
        durationDriving: drivingDuration,
      });
      setRouteCoordinates(routeCoordinates);
    } catch (err) {
      console.error('Error calculating route:', err);
    }
  };

  // تحميل البيانات
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // جلب معلومات الدولة
        if (countryCode) {
          const countries = await fetchCountries();
          const country = countries.find(c => c.code === countryCode);
          if (country) {
            setCountryInfo(country);
          }

          // جلب المدن
          try {
            const citiesData = await fetchCitiesByCountry(countryCode);
            const citiesWithCoords = await Promise.all(
              citiesData.slice(0, 10).map(async (city) => {
                try {
                  const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.name + ', ' + countryName)}&limit=1`
                  );
                  const data = await response.json();
                  if (data && data.length > 0) {
                    return {
                      name: city.name,
                      latitude: parseFloat(data[0].lat),
                      longitude: parseFloat(data[0].lon),
                    };
                  }
                } catch (err) {
                  console.error('Error getting city coordinates:', err);
                }
                return null;
              })
            );
            setCities(citiesWithCoords.filter(c => c !== null) as Array<{
              name: string;
              latitude: number;
              longitude: number;
            }>);
          } catch (err) {
            console.error('Error fetching cities:', err);
          }
        }

        // الحصول على الموقع الحالي
        const currentLoc = await getCurrentLocation();

        // الحصول على إحداثيات الوجهة
        if (countryName) {
          const destLoc = await getCountryCoordinates(countryName);
          if (destLoc) {
            setDestinationLocation(destLoc);
            
            // حساب المسار إذا كان لدينا الموقع الحالي
            if (currentLoc) {
              await calculateRoute(currentLoc, destLoc);
            }
          }
        }
      } catch (err) {
        console.error('Error loading trip details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [countryCode, countryName]);

  const formatDate = (dateString?: string) => {
    // Handle empty or undefined dates
    if (!dateString || dateString.trim() === '' || dateString === 'undefined' || dateString === 'null') {
      return 'Not set';
    }
    
    try {
      // Clean the date string
      const cleanDate = dateString.trim();
      
      // Try parsing the date string
      let date: Date;
      
      // If it's in YYYY-MM-DD format (most common from database)
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [year, month, day] = cleanDate.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        // Try standard Date parsing
        date = new Date(cleanDate);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Not set';
      }
      
      // Format the date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Not set';
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#1f9d55" />
        <ThemedText style={styles.loadingText}>Loading trip details...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
        </View>

        {/* Trip Information */}
        <View style={styles.tripInfoCard}>
          <View style={styles.countryHeader}>
            {countryInfo?.flag && (
              <ThemedText style={styles.flagLarge}>{countryInfo.flag}</ThemedText>
            )}
            <ThemedText type="defaultSemiBold" style={styles.countryName}>
              {countryName}
            </ThemedText>
          </View>
          
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <ThemedText style={styles.dateLabel}>📅 Start Date</ThemedText>
              <ThemedText style={styles.dateValue}>{formatDate(startDate)}</ThemedText>
            </View>
            <View style={styles.dateItem}>
              <ThemedText style={styles.dateLabel}>📅 End Date</ThemedText>
              <ThemedText style={styles.dateValue}>{formatDate(endDate)}</ThemedText>
            </View>
          </View>

          {style && (
            <View style={styles.styleContainer}>
              <ThemedText style={styles.styleLabel}>🎯 Travel Style:</ThemedText>
              <ThemedText style={styles.styleValue}>{style}</ThemedText>
            </View>
          )}

          {notes && (
            <View style={styles.notesContainer}>
              <ThemedText style={styles.notesLabel}>📝 Notes:</ThemedText>
              <ThemedText style={styles.notesValue}>{notes}</ThemedText>
            </View>
          )}
        </View>

        {/* Country Information */}
        {countryInfo && (
          <View style={styles.countryInfoCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              ℹ️ Country Information
            </ThemedText>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <ThemedText style={styles.infoIcon}>🌍</ThemedText>
                <ThemedText style={styles.infoCardLabel}>Region</ThemedText>
                <ThemedText style={styles.infoCardValue}>{countryInfo.region || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoCard}>
                <ThemedText style={styles.infoIcon}>🗣️</ThemedText>
                <ThemedText style={styles.infoCardLabel}>Language</ThemedText>
                <ThemedText style={styles.infoCardValue}>{countryInfo.mainLanguage || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoCard}>
                <ThemedText style={styles.infoIcon}>💰</ThemedText>
                <ThemedText style={styles.infoCardLabel}>Currency</ThemedText>
                <ThemedText style={styles.infoCardValue}>{countryInfo.currency || 'N/A'}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Map */}
        {destinationLocation && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                🗺️ Map & Route
              </ThemedText>
              {!currentLocation && (
                <Pressable
                  style={styles.getLocationButton}
                  onPress={async () => {
                    const loc = await getCurrentLocation();
                    if (loc && destinationLocation) {
                      await calculateRoute(loc, destinationLocation);
                    }
                  }}
                  disabled={locationLoading}
                >
                  <ThemedText style={styles.getLocationButtonText}>
                    {locationLoading ? 'Getting location...' : '📍 Get My Location'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
            <View style={styles.mapWrapper}>
              <MapComponent
                currentLocation={currentLocation || destinationLocation}
                destinationLocation={destinationLocation}
                destinationName={countryName}
                routeCoordinates={routeCoordinates}
                countryCities={cities}
              />
            </View>
          </View>
        )}

        {/* Available Cities */}
        {cities.length > 0 && (
          <View style={styles.citiesCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              🏙️ Available Cities ({cities.length})
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.citiesScroll}>
              {cities.map((city, index) => (
                <View key={index} style={styles.cityChip}>
                  <ThemedText style={styles.cityChipText}>{city.name}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Green Travel Tips */}
        <View style={styles.tipsCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            💡 Green Travel Tips
          </ThemedText>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <ThemedText style={styles.tipText}>
                🌱 Use public transportation or bicycles
              </ThemedText>
            </View>
            <View style={styles.tipItem}>
              <ThemedText style={styles.tipText}>
                🏨 Choose eco-friendly hotels
              </ThemedText>
            </View>
            <View style={styles.tipItem}>
              <ThemedText style={styles.tipText}>
                🍃 Reduce plastic use and bring a reusable water bottle
              </ThemedText>
            </View>
            <View style={styles.tipItem}>
              <ThemedText style={styles.tipText}>
                🚶 Enjoy walking and explore places on foot
              </ThemedText>
            </View>
            <View style={styles.tipItem}>
              <ThemedText style={styles.tipText}>
                🌍 Respect the local environment and culture
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f9d55',
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    opacity: 0.6,
    textAlign: 'center',
  },
  tripInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1f9d55',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  flagLarge: {
    fontSize: 40,
    marginRight: 12,
  },
  countryName: {
    fontSize: 24,
    color: '#1f2937',
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
  },
  dateLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  styleContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1f9d55',
  },
  styleLabel: {
    fontSize: 15,
    marginBottom: 6,
    color: '#374151',
    fontWeight: '600',
  },
  styleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f9d55',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  notesLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#374151',
    fontWeight: '700',
  },
  notesValue: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1f2937',
  },
  countryInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 20,
    color: '#1f2937',
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  getLocationButton: {
    backgroundColor: '#1f9d55',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  getLocationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  mapWrapper: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1f9d55',
  },
  citiesCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  citiesScroll: {
    marginTop: 12,
  },
  cityChip: {
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  cityChipText: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '700',
  },
  tipsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#a7f3d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipsList: {
    gap: 14,
  },
  tipItem: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1f9d55',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  tipText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1f2937',
    fontWeight: '500',
  },
});

