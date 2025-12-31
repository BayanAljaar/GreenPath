// app/(tabs)/trips.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { useUser } from '../UserContext';
import { fetchUserTrips, Trip, fetchCountries, Country } from '../../services/apiClient';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

export default function TripsScreen() {
  const { user } = useUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [nearbyTrips, setNearbyTrips] = useState<string[]>([]);

  const loadTrips = async () => {
    if (!user?.userName) {
      console.log('>>> TripsScreen: No user, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('>>> TripsScreen: Loading trips for user:', user.userName);
      setLoading(true);
      const userTrips = await fetchUserTrips(user.userName);
      console.log('>>> TripsScreen: Fetched trips:', userTrips?.length || 0, userTrips);
      setTrips(userTrips || []);
    } catch (error: any) {
      console.error('>>> TripsScreen: Error loading trips:', error);
      console.error('>>> TripsScreen: Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // جلب الموقع الحالي والدول
  useEffect(() => {
    const getLocationAndCountries = async () => {
      try {
        // جلب الموقع الحالي
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
        
        // جلب قائمة الدول
        const countriesData = await fetchCountries();
        setCountries(countriesData);
      } catch (err) {
        console.error('Error getting location or countries:', err);
      }
    };
    
    getLocationAndCountries();
    loadTrips();
  }, [user]);

  // إعادة تحميل الرحلات عند التركيز على الصفحة (مثلاً بعد العودة من صفحة أخرى)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.userName) {
        loadTrips();
      }
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  // حساب المسافة بين موقعين (بالكيلومتر)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // جلب إحداثيات الدولة
  const getCountryCoordinates = async (countryName: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(countryName)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (err) {
      console.error('Error getting country coordinates:', err);
      return null;
    }
  };

  // التحقق من الرحلات القريبة
  useEffect(() => {
    const checkNearbyTrips = async () => {
      if (!currentLocation || trips.length === 0) return;
      
      const nearby: string[] = [];
      for (const trip of trips) {
        const countryCoords = await getCountryCoordinates(trip.countryName);
        if (countryCoords) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            countryCoords.latitude,
            countryCoords.longitude
          );
          // إذا كانت المسافة أقل من 50 كم، تعتبر قريبة
          if (distance < 50) {
            nearby.push(trip._id);
          }
        }
      }
      setNearbyTrips(nearby);
    };
    
    checkNearbyTrips();
  }, [currentLocation, trips]);
  
  // تقسيم الرحلات إلى رحلة حالية ورحلات مكتملة
  const now = new Date();
  now.setHours(0, 0, 0, 0); // إزالة الوقت للمقارنة الصحيحة
  
  const currentTrip = trips.find(trip => {
    // إذا كانت الرحلة قريبة من الموقع الحالي، تظهر في الرحلة الحالية
    if (nearbyTrips.includes(trip._id)) {
      return true;
    }
    
    // إذا لم يكن هناك endDate ولا startDate، نعتبرها رحلة حالية (مخطط لها)
    if (!trip.endDate && !trip.startDate) {
      return true; // رحلة مخطط لها بدون تواريخ
    }
    // إذا لم يكن هناك endDate لكن هناك startDate، نعتبرها حالية إذا كان startDate في المستقبل أو اليوم
    if (!trip.endDate && trip.startDate) {
      const startDate = new Date(trip.startDate);
      startDate.setHours(0, 0, 0, 0);
      return startDate >= now;
    }
    // إذا كان هناك endDate، نتحقق من أنه لم ينته بعد
    if (trip.endDate && trip.endDate.trim() !== '') {
      try {
        let endDate: Date;
        const cleanDate = trip.endDate.trim();
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          // تنسيق YYYY-MM-DD
          const [year, month, day] = cleanDate.split('-').map(Number);
          endDate = new Date(year, month - 1, day);
        } else {
          endDate = new Date(cleanDate);
        }
        
        if (isNaN(endDate.getTime())) {
          return false;
        }
        
        // استخدام بداية اليوم للمقارنة
        endDate.setHours(0, 0, 0, 0);
        return endDate > now; // الرحلة الحالية إذا كان endDate في المستقبل (بعد اليوم)
      } catch (err) {
        console.error('Error parsing endDate in currentTrip:', trip.endDate, err);
        return false;
      }
    }
    return false;
  });

  const completedTrips = trips.filter(trip => {
    // إذا لم يكن هناك endDate، لا نعتبرها مكتملة
    if (!trip.endDate || trip.endDate.trim() === '') return false;
    
    // إذا كان هناك startDate في المستقبل، لا نعتبرها مكتملة (يجب أن تكون في Future Trips)
    if (trip.startDate && trip.startDate.trim() !== '') {
      try {
        let startDate: Date;
        const cleanStartDate = trip.startDate.trim();
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStartDate)) {
          const [year, month, day] = cleanStartDate.split('-').map(Number);
          startDate = new Date(year, month - 1, day);
        } else {
          startDate = new Date(cleanStartDate);
        }
        
        if (!isNaN(startDate.getTime())) {
          startDate.setHours(0, 0, 0, 0);
          // إذا كان startDate في المستقبل، لا نعتبرها مكتملة
          if (startDate > now) {
            return false;
          }
        }
      } catch (err) {
        // إذا فشل التحقق من startDate، نتابع التحقق من endDate
      }
    }
    
    try {
      // معالجة تنسيقات التاريخ المختلفة
      let endDate: Date;
      const cleanDate = trip.endDate.trim();
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        // تنسيق YYYY-MM-DD
        const [year, month, day] = cleanDate.split('-').map(Number);
        endDate = new Date(year, month - 1, day);
      } else {
        endDate = new Date(cleanDate);
      }
      
      if (isNaN(endDate.getTime())) {
        return false;
      }
      
      // استخدام بداية اليوم للمقارنة
      endDate.setHours(0, 0, 0, 0);
      // الرحلات التي انتهت (endDate قبل اليوم أو اليوم نفسه إذا كانت مكتملة)
      // نستخدم <= بدلاً من < لضمان أن الرحلة التي تم تحديث endDate لها إلى اليوم تنتقل إلى المكتملة
      return endDate <= now;
    } catch (err) {
      console.error('Error parsing endDate:', trip.endDate, err);
      return false;
    }
  });

  // الرحلات المستقبلية (لها startDate في المستقبل)
  const futureTrips = trips.filter(trip => {
    // استبعاد الرحلة الحالية والرحلات المكتملة
    if (currentTrip && trip._id === currentTrip._id) return false;
    if (completedTrips.some(ct => ct._id === trip._id)) return false;
    
    // إذا كان هناك startDate، نتحقق من أنه في المستقبل
    if (trip.startDate && trip.startDate.trim() !== '' && trip.startDate !== 'undefined' && trip.startDate !== 'null') {
      try {
        let startDate: Date;
        const cleanDate = trip.startDate.trim();
        
        // معالجة تنسيقات التاريخ المختلفة
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          // تنسيق YYYY-MM-DD
          const [year, month, day] = cleanDate.split('-').map(Number);
          startDate = new Date(year, month - 1, day);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
          // تنسيق DD/MM/YYYY
          const [day, month, year] = cleanDate.split('/').map(Number);
          startDate = new Date(year, month - 1, day);
        } else if (/^\d{2}\/\d{2}$/.test(cleanDate)) {
          // تنسيق DD/MM (نستخدم السنة الحالية)
          const [day, month] = cleanDate.split('/').map(Number);
          const currentYear = new Date().getFullYear();
          startDate = new Date(currentYear, month - 1, day);
        } else {
          // محاولة تحليل التاريخ بشكل عام
          startDate = new Date(cleanDate);
        }
        
        if (isNaN(startDate.getTime())) {
          console.warn('Invalid startDate format:', trip.startDate, 'for trip:', trip.title);
          return false;
        }
        
        startDate.setHours(0, 0, 0, 0);
        // الرحلة مستقبلية إذا كان startDate بعد اليوم
        const isFuture = startDate > now;
        if (isFuture) {
          console.log('>>> Future trip found:', trip.title, 'startDate:', trip.startDate, 'parsed:', startDate.toISOString().split('T')[0]);
        }
        return isFuture;
      } catch (err) {
        console.error('Error parsing startDate in futureTrips:', trip.startDate, err);
        return false;
      }
    }
    
    return false;
  });

  // جميع الرحلات الأخرى (بدون تواريخ أو رحلات غير مصنفة)
  const allOtherTrips = trips.filter(trip => {
    // استبعاد الرحلة الحالية والرحلات المكتملة والرحلات المستقبلية
    if (currentTrip && trip._id === currentTrip._id) return false;
    if (completedTrips.some(ct => ct._id === trip._id)) return false;
    if (futureTrips.some(ft => ft._id === trip._id)) return false;
    return true;
  });

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#1f9d55" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">My Trips</ThemedText>
        <ThemedText style={styles.emptyText}>Please log in to view your trips</ThemedText>
      </ThemedView>
    );
  }

  console.log('>>> TripsScreen: Render - trips count:', trips.length, 'currentTrip:', currentTrip?._id, 'future:', futureTrips.length, 'completed:', completedTrips.length, 'others:', allOtherTrips.length);

  return (
    <ThemedView style={styles.container} lightColor="#ffffff" darkColor="#ffffff">
      <ThemedText type="title" style={styles.title} lightColor="#000000" darkColor="#000000">My Trips</ThemedText>
      
      {trips.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            No saved trips
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Start planning your trip from the Plan page
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* القسم الأول: الرحلة الحالية */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle} lightColor="#000000" darkColor="#000000">
              Current Trip
            </ThemedText>
            
            {currentTrip ? (
              <TripCard trip={currentTrip} countries={countries} />
            ) : (
              <View style={styles.emptyCard}>
                <ThemedText style={styles.emptyText} lightColor="#6b7280" darkColor="#6b7280">
                  No current trip
                </ThemedText>
              </View>
            )}
          </View>

        {/* القسم الثاني: الرحلات المستقبلية */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle} lightColor="#000000" darkColor="#000000">
            Future Trips ({futureTrips.length})
          </ThemedText>
          
          {futureTrips.length > 0 ? (
            futureTrips.map(trip => (
              <TripCard key={trip._id} trip={trip} countries={countries} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText} lightColor="#6b7280" darkColor="#6b7280">
                No future trips
              </ThemedText>
            </View>
          )}
        </View>

        {/* القسم الثالث: جميع الرحلات الأخرى */}
        {allOtherTrips.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle} lightColor="#000000" darkColor="#000000">
              All Other Trips ({allOtherTrips.length})
            </ThemedText>
            {allOtherTrips.map(trip => (
              <TripCard key={trip._id} trip={trip} countries={countries} />
            ))}
          </View>
        )}

        {/* القسم الرابع: الرحلات المكتملة */}
        <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle} lightColor="#000000" darkColor="#000000">
              Completed Trips ({completedTrips.length})
            </ThemedText>
          
          {completedTrips.length > 0 ? (
            completedTrips.map(trip => (
              <TripCard key={trip._id} trip={trip} countries={countries} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText} lightColor="#6b7280" darkColor="#6b7280">
                No completed trips
              </ThemedText>
            </View>
          )}
        </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

// مكون لعرض بطاقة الرحلة
function TripCard({ trip, countries }: { trip: Trip; countries: Country[] }) {
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString.trim() === '' || dateString === 'undefined' || dateString === 'null') {
      return 'Not set';
    }
    
    try {
      const cleanDate = dateString.trim();
      let date: Date;
      
      // If it's in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [year, month, day] = cleanDate.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(cleanDate);
      }
      
      if (isNaN(date.getTime())) {
        return 'Not set';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Not set';
    }
  };

  const handlePress = () => {
    router.push({
      pathname: '/trip/details',
      params: {
        tripId: trip._id,
        title: trip.title,
        countryCode: trip.countryCode,
        countryName: trip.countryName,
        startDate: trip.startDate || '',
        endDate: trip.endDate || '',
        style: trip.style || '',
        notes: trip.notes || '',
      },
    });
  };

  // البحث عن علم الدولة
  const countryInfo = countries.find(c => c.code === trip.countryCode || c.name === trip.countryName);
  const flagEmoji = countryInfo?.flag || '🌍';

  return (
    <Pressable style={styles.tripCard} onPress={handlePress}>
      <View style={styles.cardHeader}>
        <View style={styles.flagContainer}>
          <ThemedText style={styles.flagEmoji}>{flagEmoji}</ThemedText>
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="defaultSemiBold" style={styles.tripTitle} lightColor="#1f9d55" darkColor="#1f9d55">
            {trip.title}
          </ThemedText>
          <ThemedText style={styles.tripCountry} lightColor="#374151" darkColor="#374151">
            {trip.countryName}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.tripDates}>
        <View style={styles.dateRow}>
          <ThemedText style={styles.dateLabel} lightColor="#6b7280" darkColor="#6b7280">📅 From:</ThemedText>
          <ThemedText style={styles.dateValue} lightColor="#111827" darkColor="#111827">
            {formatDate(trip.startDate)}
          </ThemedText>
        </View>
        <View style={styles.dateRow}>
          <ThemedText style={styles.dateLabel} lightColor="#6b7280" darkColor="#6b7280">📅 To:</ThemedText>
          <ThemedText style={styles.dateValue} lightColor="#111827" darkColor="#111827">
            {formatDate(trip.endDate)}
          </ThemedText>
        </View>
      </View>
      
      {trip.style && (
        <View style={styles.styleContainer}>
          <ThemedText style={styles.styleText} lightColor="#15803d" darkColor="#15803d">
            🎯 {trip.style}
          </ThemedText>
        </View>
      )}
      
      <View style={styles.tapHint}>
        <ThemedText style={styles.tapHintText} lightColor="#ffffff" darkColor="#ffffff">
          Tap to view details and map 🗺️
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 18,
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#1f9d55',
    shadowColor: '#1f9d55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  flagContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#1f9d55',
  },
  flagEmoji: {
    fontSize: 30,
  },
  titleContainer: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 22,
    marginBottom: 6,
    fontWeight: '800',
  },
  tripCountry: {
    fontSize: 17,
    fontWeight: '600',
  },
  tripDates: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  styleContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1f9d55',
    alignSelf: 'flex-start',
  },
  styleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tapHint: {
    marginTop: 8,
    backgroundColor: '#1f9d55',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 17,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});