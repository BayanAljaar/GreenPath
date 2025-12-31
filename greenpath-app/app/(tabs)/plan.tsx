// app/(tabs)/plan.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Alert,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { fetchCountries, Country, saveTrip, updateTrip } from '../../services/apiClient';
import { useUser } from '../UserContext';
import MapComponent from '../../components/MapComponent';

const { width, height } = Dimensions.get('window');

export default function PlanScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  // حالة الخريطة
  const [showMap, setShowMap] = useState(false);
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
    distance: number; // بالكيلومتر
    durationWalking: number; // بالدقائق (مشي)
    durationDriving: number; // بالدقائق (سيارة)
  } | null>(null);
  
  // طريقة التنقل المختارة
  const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('driving');
  
  // حالة متابعة المسار
  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null); // حفظ ID الرحلة الحالية
  
  // حالة الأماكن القريبة
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<{
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    distance?: number;
  }>>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    googlePlaceId?: string;
  } | null>(null);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('restaurant');
  type PlaceSuggestion = { description: string; place_id: string };
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // معلومات إضافية عن الدولة المختارة (فنادق، معالم، إلخ)
  const [countryAttractions, setCountryAttractions] = useState<Array<{
    name: string;
    type: string;
    description?: string;
  }>>([]);
  const [attractionsLoading, setAttractionsLoading] = useState(false);
  
  // حالة المدن
  const [showCitiesMap, setShowCitiesMap] = useState(false);
  const [countryCities, setCountryCities] = useState<Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cityAttractions, setCityAttractions] = useState<Array<{
    name: string;
    type: string;
    description?: string;
  }>>([]);
  const [cityAttractionsLoading, setCityAttractionsLoading] = useState(false);
  
  // تفاصيل المكان المختار
  const [placeDetails, setPlaceDetails] = useState<{
    name: string;
    rating?: number;
    priceLevel?: number;
    openingHours?: string[];
    phone?: string;
    address?: string;
    website?: string;
    photos?: string[];
    reviews?: Array<{ author: string; rating: number; text: string }>;
  } | null>(null);
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState(false);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);

  // Google API Helper Functions
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_API_KEY) {
    console.warn('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set. Google APIs will not work.');
  }

  // Google Autocomplete helper
  const googleAutocomplete = async (query: string): Promise<Array<{ description: string; place_id: string }>> => {
    if (!GOOGLE_API_KEY) {
      return [];
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return [];
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(trimmedQuery)}&key=${GOOGLE_API_KEY}&language=en`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Google Autocomplete API error:', response.status);
        return [];
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        return data.predictions.map((pred: any) => ({
          description: pred.description,
          place_id: pred.place_id,
        }));
      }
      
      return [];
    } catch (err) {
      console.error('Error calling Google Autocomplete:', err);
      return [];
    }
  };

  // Google Place Details helper
  const googlePlaceDetails = async (placeId: string): Promise<{
    name: string;
    rating?: number;
    priceLevel?: number;
    phone?: string;
    website?: string;
    openingHours?: string[];
    reviews?: Array<{ author: string; rating: number; text: string }>;
    address?: string;
    geometry?: { location: { lat: number; lng: number } };
  } | null> => {
    if (!GOOGLE_API_KEY) {
      return null;
    }

    try {
      const fields = 'name,rating,price_level,formatted_phone_number,website,opening_hours,reviews,formatted_address,geometry';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${GOOGLE_API_KEY}&language=ar`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Google Place Details API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const result = data.result;
        
        const openingHours: string[] = [];
        if (result.opening_hours && result.opening_hours.weekday_text) {
          openingHours.push(...result.opening_hours.weekday_text);
        }

        const reviews: Array<{ author: string; rating: number; text: string }> = [];
        if (result.reviews && result.reviews.length > 0) {
          result.reviews.slice(0, 5).forEach((review: any) => {
            reviews.push({
              author: review.author_name || 'User',
              rating: review.rating || 0,
              text: review.text || '',
            });
          });
        }

        return {
          name: result.name || '',
          rating: result.rating,
          priceLevel: result.price_level,
          phone: result.formatted_phone_number,
          website: result.website,
          openingHours: openingHours.length > 0 ? openingHours : undefined,
          reviews: reviews.length > 0 ? reviews : undefined,
          address: result.formatted_address,
          geometry: result.geometry,
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error calling Google Place Details:', err);
      return null;
    }
  };

  // جلب الدول عند تحميل الصفحة
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('>>> PlanScreen: Starting to fetch countries...', 'User:', user ? 'logged in' : 'guest');
        const data = await fetchCountries();
        console.log('>>> PlanScreen: Fetched countries:', data?.length || 0);
        if (data && Array.isArray(data)) {
          if (data.length > 0) {
            setCountries(data);
            console.log('>>> PlanScreen: Countries set successfully:', data.length);
          } else {
            console.warn('>>> PlanScreen: Empty array received');
            setCountries([]);
          }
        } else {
          console.warn('>>> PlanScreen: Invalid data received:', typeof data);
          setCountries([]);
        }
      } catch (err: any) {
        console.error('>>> PlanScreen: Failed to fetch countries:', err);
        console.error('>>> PlanScreen: Error details:', {
          message: err?.message,
          code: err?.code,
          response: err?.response?.data,
          status: err?.response?.status,
        });
        // معالجة أفضل للأخطاء
        if (err?.message?.includes('Network Error') || err?.code === 'ERR_NETWORK') {
          setError('Cannot connect to server. Make sure the API server is running on port 4001.');
        } else {
          setError(`Failed to load countries: ${err?.message || 'Unknown error'}`);
        }
        setCountries([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]); // إعادة التحميل عند تغيير حالة المستخدم

  // تنظيف المتابعة عند إغلاق الصفحة
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [locationSubscription]);

  // الحصول على الموقع الحالي
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // طلب إذن الوصول للموقع
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location access is required to display the map'
        );
        setLocationLoading(false);
        return;
      }

      // الحصول على الموقع الحالي
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      
      return { latitude, longitude };
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Failed to get current location');
      setLocationLoading(false);
      return null;
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

  // حساب المسار بين موقعين حسب الشوارع (مع مراعاة اتجاه الشوارع)
  // نحسب المسارين (مشي وسيارة) معاً للحصول على أوقات دقيقة
  const calculateRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    mode: 'walking' | 'driving' = travelMode
  ) => {
    try {
      let walkingDistance = 0;
      let walkingDuration = 0;
      let drivingDistance = 0;
      let drivingDuration = 0;
      let routeCoordinates: Array<{ latitude: number; longitude: number }> = [];

      // Try Google Directions API first for durations
      if (GOOGLE_API_KEY) {
        try {
          // Get walking duration
          const walkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=walking&key=${GOOGLE_API_KEY}&language=en`;
          const walkingGoogleResponse = await fetch(walkingUrl);
          
          if (walkingGoogleResponse.ok) {
            const walkingGoogleData = await walkingGoogleResponse.json();
            if (walkingGoogleData.status === 'OK' && walkingGoogleData.routes && walkingGoogleData.routes.length > 0) {
              const route = walkingGoogleData.routes[0];
              if (route.legs && route.legs.length > 0) {
                const leg = route.legs[0];
                if (leg.duration && leg.duration.value) {
                  walkingDuration = Math.max(1, Math.ceil(leg.duration.value / 60));
                }
                if (leg.distance && leg.distance.value) {
                  walkingDistance = leg.distance.value / 1000;
                }
              }
            }
          }

          // Get driving duration with traffic
          const drivingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&departure_time=now&key=${GOOGLE_API_KEY}&language=en`;
          const drivingGoogleResponse = await fetch(drivingUrl);
          
          if (drivingGoogleResponse.ok) {
            const drivingGoogleData = await drivingGoogleResponse.json();
            if (drivingGoogleData.status === 'OK' && drivingGoogleData.routes && drivingGoogleData.routes.length > 0) {
              const route = drivingGoogleData.routes[0];
              if (route.legs && route.legs.length > 0) {
                const leg = route.legs[0];
                // Use duration_in_traffic if available, otherwise duration
                if (leg.duration_in_traffic && leg.duration_in_traffic.value) {
                  drivingDuration = Math.max(1, Math.ceil(leg.duration_in_traffic.value / 60));
                } else if (leg.duration && leg.duration.value) {
                  drivingDuration = Math.max(1, Math.ceil(leg.duration.value / 60));
                }
                if (leg.distance && leg.distance.value) {
                  drivingDistance = leg.distance.value / 1000;
                }
              }
            }
          }
        } catch (googleErr) {
          console.log('Google Directions API error:', googleErr);
          // Continue to fallback
        }
      }

      const API_KEY = '5b3ce3597851110001cf6248'; // API key عام
      
      // حساب المسارين معاً (مشي وسيارة) للحصول على أوقات دقيقة
      const [walkingResponse, drivingResponse] = await Promise.all([
        // حساب المسار للمشي
        fetch(
          `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${API_KEY}`,
          {
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
          }
        ),
        // حساب المسار بالسيارة
        fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}`,
          {
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
          }
        ),
      ]);
      
      // معالجة نتيجة المسار مشياً
      if (walkingResponse.ok) {
        const walkingData = await walkingResponse.json();
        if (walkingData.routes && walkingData.routes.length > 0) {
          const route = walkingData.routes[0];
          if (route.summary) {
            // Only update if Google didn't provide duration
            if (walkingDuration === 0) {
              walkingDuration = Math.max(1, Math.ceil(route.summary.duration / 60)); // تحويل من ثانية إلى دقيقة
            }
            if (walkingDistance === 0) {
              walkingDistance = route.summary.distance / 1000; // تحويل من متر إلى كيلومتر
            }
            console.log('Walking route:', { distance: walkingDistance, duration: walkingDuration });
          }
          // استخدام إحداثيات المسار المشي إذا كان الوضع مشياً
          if (mode === 'walking' && route.geometry && route.geometry.coordinates) {
            routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
          }
        }
      } else {
        console.log('Walking API failed:', walkingResponse.status);
      }
      
      // معالجة نتيجة المسار بالسيارة
      if (drivingResponse.ok) {
        const drivingData = await drivingResponse.json();
        if (drivingData.routes && drivingData.routes.length > 0) {
          const route = drivingData.routes[0];
          if (route.summary) {
            // Only update if Google didn't provide duration
            if (drivingDuration === 0) {
              drivingDuration = Math.max(1, Math.ceil(route.summary.duration / 60)); // تحويل من ثانية إلى دقيقة
            }
            if (drivingDistance === 0) {
              drivingDistance = route.summary.distance / 1000; // تحويل من متر إلى كيلومتر
            }
            console.log('Driving route:', { distance: drivingDistance, duration: drivingDuration });
          }
          // استخدام إحداثيات المسار بالسيارة إذا كان الوضع بالسيارة
          if (mode === 'driving' && route.geometry && route.geometry.coordinates) {
            routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
          }
        }
      } else {
        console.log('Driving API failed:', drivingResponse.status);
      }
      
      // إذا فشل OpenRouteService، نحاول OSRM
      if ((walkingDistance === 0 || drivingDistance === 0) && (!walkingResponse.ok || !drivingResponse.ok)) {
        // محاولة OSRM للمشي
        const osrmWalkingResponse = await fetch(
          `http://router.project-osrm.org/route/v1/foot/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`
        );
        
        // محاولة OSRM بالسيارة
        const osrmDrivingResponse = await fetch(
          `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`
        );
        
        if (osrmWalkingResponse.ok && walkingDistance === 0) {
          const osrmWalkingData = await osrmWalkingResponse.json();
          if (osrmWalkingData.routes && osrmWalkingData.routes.length > 0) {
            const route = osrmWalkingData.routes[0];
            if (route.distance && route.duration) {
              if (walkingDistance === 0) {
                walkingDistance = route.distance / 1000;
              }
              if (walkingDuration === 0) {
                walkingDuration = Math.max(1, Math.ceil(route.duration / 60));
              }
            }
            if (mode === 'walking' && route.geometry && route.geometry.coordinates && routeCoordinates.length === 0) {
              routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));
            }
          }
        }
        
        if (osrmDrivingResponse.ok && drivingDistance === 0) {
          const osrmDrivingData = await osrmDrivingResponse.json();
          if (osrmDrivingData.routes && osrmDrivingData.routes.length > 0) {
            const route = osrmDrivingData.routes[0];
            if (route.distance && route.duration) {
              if (drivingDistance === 0) {
                drivingDistance = route.distance / 1000;
              }
              if (drivingDuration === 0) {
                drivingDuration = Math.max(1, Math.ceil(route.duration / 60));
              }
            }
            if (mode === 'driving' && route.geometry && route.geometry.coordinates && routeCoordinates.length === 0) {
              routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));
            }
          }
        }
      }
      
      // إذا فشل كل شيء، نستخدم تقديرات
      if (walkingDistance === 0 && drivingDistance === 0) {
        // حساب تقديري للمسافة
        const distanceKm = Math.sqrt(
          Math.pow(destination.latitude - origin.latitude, 2) + 
          Math.pow(destination.longitude - origin.longitude, 2)
        ) * 111; // تقريباً 111 كم لكل درجة
        
        walkingDistance = distanceKm;
        drivingDistance = distanceKm;
        walkingDuration = Math.max(1, Math.ceil((distanceKm / 5) * 60)); // 5 كم/ساعة
        drivingDuration = Math.max(1, Math.ceil((distanceKm / 30) * 60)); // 30 كم/ساعة
        
        // خط مستقيم كبديل
        const numPoints = 20;
        for (let i = 0; i <= numPoints; i++) {
          const ratio = i / numPoints;
          routeCoordinates.push({
            latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
            longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
          });
        }
      }
      
      // استخدام المسافة الأكثر دقة (عادة تكون متقاربة)
      const finalDistance = mode === 'walking' ? (walkingDistance || drivingDistance) : (drivingDistance || walkingDistance);
      
      // التأكد من أن الأوقات مختلفة (إذا كانت متساوية، نستخدم تقديرات)
      let finalWalkingDuration = walkingDuration;
      let finalDrivingDuration = drivingDuration;
      
      // إذا لم نحصل على وقت للمشي، نستخدم تقدير
      if (finalWalkingDuration === 0) {
        finalWalkingDuration = Math.max(1, Math.ceil((finalDistance / 5) * 60)); // 5 كم/ساعة
      }
      
      // إذا لم نحصل على وقت بالسيارة، نستخدم تقدير
      if (finalDrivingDuration === 0) {
        finalDrivingDuration = Math.max(1, Math.ceil((finalDistance / 30) * 60)); // 30 كم/ساعة
      }
      
      // إذا كانت الأوقات متساوية (وهذا غير منطقي)، نعيد حسابها بناءً على المسافة
      if (finalWalkingDuration === finalDrivingDuration && finalDistance > 0) {
        console.log('Warning: Walking and driving durations are equal, recalculating...');
        finalWalkingDuration = Math.max(1, Math.ceil((finalDistance / 5) * 60)); // 5 كم/ساعة
        finalDrivingDuration = Math.max(1, Math.ceil((finalDistance / 30) * 60)); // 30 كم/ساعة
      }
      
      console.log('Final route info:', {
        distance: Math.round(finalDistance * 10) / 10,
        walking: finalWalkingDuration,
        driving: finalDrivingDuration,
      });
      
      // حفظ المعلومات
      setRouteInfo({
        distance: Math.round(finalDistance * 10) / 10,
        durationWalking: finalWalkingDuration,
        durationDriving: finalDrivingDuration,
      });
      
      setRouteCoordinates(routeCoordinates);
    } catch (err) {
      console.error('Error calculating route:', err);
      // في حالة الخطأ، نرسم خطاً مستقيماً كبديل
      const numPoints = 20;
      const points = [];
      for (let i = 0; i <= numPoints; i++) {
        const ratio = i / numPoints;
        points.push({
          latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
          longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
        });
      }
      setRouteCoordinates(points);
      
      // حساب تقديري للمسافة والوقت
      const distanceKm = Math.sqrt(
        Math.pow(destination.latitude - origin.latitude, 2) + 
        Math.pow(destination.longitude - origin.longitude, 2)
      ) * 111; // تقريباً 111 كم لكل درجة
      
      setRouteInfo({
        distance: Math.round(distanceKm * 10) / 10,
        durationWalking: Math.max(1, Math.ceil((distanceKm / 5) * 60)), // 5 كم/ساعة
        durationDriving: Math.max(1, Math.ceil((distanceKm / 30) * 60)), // 30 كم/ساعة
      });
    }
  };

  // البحث عن أماكن قريبة
  const searchNearbyPlaces = async (query: string = 'restaurant') => {
    if (!currentLocation) {
      Alert.alert('Error', 'Please get your current location first');
      return;
    }

    try {
      setPlacesLoading(true);
      const { latitude, longitude } = currentLocation;
      
      // محاولة استخدام Google Places Nearby Search API أولاً
      if (GOOGLE_API_KEY) {
        try {
          // خريطة أنواع الأماكن إلى Google Place Types
          const googleTypeMap: { [key: string]: string } = {
            'restaurant': 'restaurant',
            'cafe': 'cafe',
            'hotel': 'lodging',
            'museum': 'museum',
            'pharmacy': 'pharmacy',
            'bank': 'bank',
            'fuel': 'gas_station',
            'hospital': 'hospital',
            'park': 'park',
            'shopping': 'shopping_mall',
          };
          
          const googleType = googleTypeMap[query] || query;
          const radius = 2000; // 2 كم
          
          const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${googleType}&key=${GOOGLE_API_KEY}&language=ar`;
          
          const googleResponse = await fetch(nearbySearchUrl);
          
          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            
            if (googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {
              const places = googleData.results
                .map((place: any) => {
                  const placeLat = place.geometry?.location?.lat;
                  const placeLon = place.geometry?.location?.lng;
                  
                  if (!placeLat || !placeLon) return null;
                  
                  // حساب المسافة
                  const distance = calculateDistance(latitude, longitude, placeLat, placeLon);
                  
                  return {
                    name: place.name || 'Unknown place',
                    latitude: placeLat,
                    longitude: placeLon,
                    type: query,
                    distance: distance,
                    googlePlaceId: place.place_id, // حفظ place_id من Google
                  };
                })
                .filter((place: any) => place !== null && place.distance <= 2);
              
              // ترتيب حسب المسافة
              places.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
              
              if (places.length > 0) {
                setNearbyPlaces(places.slice(0, 20));
                setShowNearbyPlaces(true);
                setPlacesLoading(false);
                return; // نجح البحث من Google، لا حاجة للبحث في Overpass
              }
            }
          }
        } catch (googleErr) {
          console.log('Google Places Nearby Search failed, trying Overpass...', googleErr);
        }
      }
      
      // خريطة أنواع الأماكن إلى OSM tags (fallback)
      const placeTypeMap: { [key: string]: string[] } = {
        'restaurant': ['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'],
        'cafe': ['amenity=cafe', 'amenity=coffee_shop'],
        'hotel': ['tourism=hotel', 'tourism=hostel', 'tourism=motel'],
        'museum': ['tourism=museum', 'tourism=gallery'],
        'pharmacy': ['amenity=pharmacy', 'shop=pharmacy'],
        'bank': ['amenity=bank', 'amenity=atm'],
        'fuel': ['amenity=fuel', 'amenity=gas_station'],
        'hospital': ['amenity=hospital', 'amenity=clinic'],
        'park': ['leisure=park', 'leisure=recreation_ground'],
        'shopping': ['shop=supermarket', 'shop=mall', 'shop=convenience'],
      };
      
      // تحديد نوع البحث
      const searchTypes = placeTypeMap[query] || [`amenity=${query}`, `shop=${query}`, `tourism=${query}`];
      
      // استخدام Overpass API للبحث الدقيق عن أماكن قريبة
      // البحث في دائرة نصف قطرها 2 كم (2000 متر)
      const radius = 2000; // بالمتر
      const bbox = [
        longitude - (radius / 111320), // تقريباً 111320 متر لكل درجة
        latitude - (radius / 111320),
        longitude + (radius / 111320),
        latitude + (radius / 111320),
      ].join(',');
      
      // بناء استعلام Overpass
      const overpassQuery = `
        [out:json][timeout:25];
        (
          ${searchTypes.map(type => `node[${type}](around:${radius},${latitude},${longitude});`).join('\n          ')}
          ${searchTypes.map(type => `way[${type}](around:${radius},${latitude},${longitude});`).join('\n          ')}
        );
        out center meta;
      `;
      
      try {
        // محاولة استخدام Overpass API
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: overpassQuery,
        });
        
        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          const elements = overpassData.elements || [];
          
          const places = elements
            .map((element: any) => {
              const placeLat = element.lat || element.center?.lat;
              const placeLon = element.lon || element.center?.lon;
              
              if (!placeLat || !placeLon) return null;
              
              // حساب المسافة
              const distance = calculateDistance(latitude, longitude, placeLat, placeLon);
              
              // استخراج الاسم
              const name = element.tags?.name || 
                          element.tags?.['name:ar'] || 
                          element.tags?.['name:en'] || 
                          'Unknown place';
              
              return {
                name: name,
                latitude: placeLat,
                longitude: placeLon,
                type: query,
                distance: distance,
              };
            })
            .filter((place: any) => place !== null && place.distance <= 2); // فقط الأماكن ضمن 2 كم
          
          // ترتيب حسب المسافة
          places.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
          
          if (places.length > 0) {
            setNearbyPlaces(places.slice(0, 20)); // أول 20 مكان
            setShowNearbyPlaces(true);
            return;
          }
        }
      } catch (overpassErr) {
        console.log('Overpass API failed, trying Nominatim...', overpassErr);
      }
      
      // Fallback: استخدام Nominatim مع تحسينات
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&lat=${latitude}&lon=${longitude}&radius=2000&limit=30&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GreenPathApp/1.0',
          },
        }
      );
      
      const data = await response.json();
      
      const places = data
        .map((place: any) => {
          const placeLat = parseFloat(place.lat);
          const placeLon = parseFloat(place.lon);
          
          // حساب المسافة
          const distance = calculateDistance(latitude, longitude, placeLat, placeLon);
          
          // فقط الأماكن ضمن 2 كم
          if (distance > 2) return null;
          
          return {
            name: place.display_name.split(',')[0] || place.name || 'Unknown place',
            latitude: placeLat,
            longitude: placeLon,
            type: query,
            distance: distance,
          };
        })
        .filter((place: any) => place !== null);
      
      // ترتيب الأماكن حسب المسافة (الأقرب أولاً)
      places.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
      
      setNearbyPlaces(places.slice(0, 20));
      setShowNearbyPlaces(true);
    } catch (err) {
      console.error('Error searching nearby places:', err);
      Alert.alert('Error', 'Failed to search for nearby places');
    } finally {
      setPlacesLoading(false);
    }
  };

  // حساب المسافة بين نقطتين (Haversine formula)
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


// ترجمة مفتاح الفلتر (key) إلى query مناسب للبحث
const getSelectedFilterQuery = () => {
  // selectedFilter قد يكون key مثل gas_station بينما البحث يحتاج fuel
  const map: { [key: string]: string } = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    hotel: 'hotel',
    museum: 'museum',
    pharmacy: 'pharmacy',
    bank: 'bank',
    gas_station: 'fuel',
    hospital: 'hospital',
    park: 'park',
    shopping: 'shopping',
  };
  return map[selectedFilter] || 'restaurant';
};

// بحث بالاسم داخل نطاق قريب (2 كم) - مناسب لكتابة اسم مكان مثل Starbucks
const searchNearbyByName = async (name: string) => {
  if (!currentLocation) {
    Alert.alert('خطأ', 'يجب الحصول على الموقع الحالي أولاً');
    return;
  }
  try {
    setPlacesLoading(true);
    const { latitude, longitude } = currentLocation;
    const radiusMeters = 2000;
    const delta = radiusMeters / 111320; // تقريب درجة (111320م لكل درجة)

    const left = longitude - delta;
    const right = longitude + delta;
    const top = latitude + delta;
    const bottom = latitude - delta;

    const url =
      `https://nominatim.openstreetmap.org/search?format=json` +
      `&q=${encodeURIComponent(name)}` +
      `&viewbox=${left},${top},${right},${bottom}` +
      `&bounded=1&limit=20&addressdetails=1`;

    const res = await fetch(url, { headers: { 'User-Agent': 'GreenPathApp/1.0' } });
    const data = await res.json();

    const places = (data || [])
      .map((p: any) => {
        const placeLat = parseFloat(p.lat);
        const placeLon = parseFloat(p.lon);
        if (!placeLat || !placeLon) return null;

        const distance = calculateDistance(latitude, longitude, placeLat, placeLon);
        if (distance > 2) return null; // فقط ضمن 2 كم

        return {
          name: p.display_name?.split(',')[0] || p.name || 'Place',
          latitude: placeLat,
          longitude: placeLon,
          type: 'search',
          distance,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance);

    setNearbyPlaces(places);
    setShowNearbyPlaces(true);
  } catch (err) {
    console.error('Error searching nearby by name:', err);
      Alert.alert('Error', 'Failed to search by name');
  } finally {
    setPlacesLoading(false);
  }
};

// Autocomplete: اقتراحات أثناء الكتابة (ضمن 2 كم)
const fetchPlaceSuggestions = async (text: string) => {
  const q = text.trim();
  if (q.length < 2) {
    setPlaceSuggestions([]);
    return;
  }

  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) {
    // Fallback to Nominatim
    if (!currentLocation) {
      setPlaceSuggestions([]);
      return;
    }
    try {
      const { latitude, longitude } = currentLocation;
      const radiusMeters = 2000;
      const delta = radiusMeters / 111320;

      const left = longitude - delta;
      const right = longitude + delta;
      const top = latitude + delta;
      const bottom = latitude - delta;

      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&q=${encodeURIComponent(q)}` +
        `&viewbox=${left},${top},${right},${bottom}` +
        `&bounded=1&limit=6&addressdetails=1`;

      const res = await fetch(url, { headers: { 'User-Agent': 'GreenPathApp/1.0' } });
      if (!res.ok) {
        setPlaceSuggestions([]);
        return;
      }
      const data = await res.json();

      const sug = (data || []).map((p: any) => ({
        description: p.display_name?.split(',')[0] || p.name || 'Suggestion',
        place_id: `nominatim_${p.lat}_${p.lon}`,
      }));

      setPlaceSuggestions(sug);
    } catch (err) {
      console.log('Nominatim suggestions error:', err);
      setPlaceSuggestions([]);
    }
    return;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(q)}` +
      `&key=${encodeURIComponent(key)}` +
      `&language=ar`;

    console.log('Fetching Google Autocomplete for:', q);
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('Google Autocomplete response status:', data.status);
    
    if (data.status !== "OK") {
      console.warn('Google Autocomplete failed with status:', data.status, data.error_message || '');
      // Fallback to Nominatim if Google fails
      if (!currentLocation) {
        setPlaceSuggestions([]);
        return;
      }
      try {
        const { latitude, longitude } = currentLocation;
        const radiusMeters = 2000;
        const delta = radiusMeters / 111320;

        const left = longitude - delta;
        const right = longitude + delta;
        const top = latitude + delta;
        const bottom = latitude - delta;

        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search?format=json` +
          `&q=${encodeURIComponent(q)}` +
          `&viewbox=${left},${top},${right},${bottom}` +
          `&bounded=1&limit=6&addressdetails=1`;

        const nominatimRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'GreenPathApp/1.0' } });
        if (nominatimRes.ok) {
          const nominatimData = await nominatimRes.json();
          const sug = (nominatimData || []).map((p: any) => ({
            description: p.display_name?.split(',')[0] || p.name || 'Suggestion',
            place_id: `nominatim_${p.lat}_${p.lon}`,
          }));
          setPlaceSuggestions(sug);
          return;
        }
      } catch (nominatimErr) {
        console.error('Nominatim fallback error:', nominatimErr);
      }
      setPlaceSuggestions([]);
      return;
    }

    const sug = (data.predictions || []).slice(0, 6).map((p: any) => ({
      description: p.description,
      place_id: p.place_id,
    }));
    console.log('Setting suggestions:', sug.length);
    setPlaceSuggestions(sug);
  } catch (e) {
    console.error('Google Autocomplete error:', e);
    // Try Nominatim fallback on error
    if (currentLocation) {
      try {
        const { latitude, longitude } = currentLocation;
        const radiusMeters = 2000;
        const delta = radiusMeters / 111320;

        const left = longitude - delta;
        const right = longitude + delta;
        const top = latitude + delta;
        const bottom = latitude - delta;

        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search?format=json` +
          `&q=${encodeURIComponent(q)}` +
          `&viewbox=${left},${top},${right},${bottom}` +
          `&bounded=1&limit=6&addressdetails=1`;

        const nominatimRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'GreenPathApp/1.0' } });
        if (nominatimRes.ok) {
          const nominatimData = await nominatimRes.json();
          const sug = (nominatimData || []).map((p: any) => ({
            description: p.display_name?.split(',')[0] || p.name || 'Suggestion',
            place_id: `nominatim_${p.lat}_${p.lon}`,
          }));
          setPlaceSuggestions(sug);
          return;
        }
      } catch (nominatimErr) {
        console.error('Nominatim fallback error:', nominatimErr);
      }
    }
    setPlaceSuggestions([]);
  }
};
  // حساب المسافة المتبقية بناءً على المسار الفعلي
  const calculateRemainingRouteDistance = (
    currentPos: { latitude: number; longitude: number },
    routeCoords: Array<{ latitude: number; longitude: number }>,
    destination: { latitude: number; longitude: number }
  ): number => {
    if (!routeCoords || routeCoords.length === 0) {
      // إذا لم يكن هناك مسار، نستخدم المسافة المباشرة
      return calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        destination.latitude,
        destination.longitude
      );
    }

    // إيجاد أقرب نقطة على المسار للموقع الحالي
    let minDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < routeCoords.length; i++) {
      const dist = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        routeCoords[i].latitude,
        routeCoords[i].longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    // حساب المسافة المتبقية على المسار من أقرب نقطة إلى الوجهة
    let remainingDistance = 0;
    for (let i = closestIndex; i < routeCoords.length - 1; i++) {
      remainingDistance += calculateDistance(
        routeCoords[i].latitude,
        routeCoords[i].longitude,
        routeCoords[i + 1].latitude,
        routeCoords[i + 1].longitude
      );
    }
    
    // إضافة المسافة من الموقع الحالي إلى أقرب نقطة على المسار
    remainingDistance += minDistance;
    
    // إضافة المسافة من آخر نقطة في المسار إلى الوجهة
    if (routeCoords.length > 0) {
      const lastPoint = routeCoords[routeCoords.length - 1];
      remainingDistance += calculateDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        destination.latitude,
        destination.longitude
      );
    }

    return remainingDistance;
  };

  // بدء متابعة المسار
  // جلب اسم الدولة من الإحداثيات
  const getCountryFromCoordinates = async (lat: number, lon: number): Promise<{ countryName: string; countryCode: string } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=3&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.address) {
        const countryName = data.address.country || data.address.country_code?.toUpperCase() || 'Unknown';
        const countryCode = data.address.country_code?.toUpperCase() || 'XX';
        return { countryName, countryCode };
      }
      return null;
    } catch (err) {
      console.error('Error getting country from coordinates:', err);
      return null;
    }
  };

  const startNavigation = async () => {
    if (!currentLocation || !destinationLocation) {
      Alert.alert('Error', 'Please select a destination first');
      return;
    }

    if (!routeInfo) {
      Alert.alert('Error', 'Please calculate the route first');
      return;
    }

    try {
      // حفظ الرحلة إذا كان المستخدم مسجل دخول وكان هناك مكان مختار
      if (user && selectedPlace) {
        try {
          // جلب معلومات الدولة من موقع الوجهة
          const countryInfo = await getCountryFromCoordinates(
            destinationLocation.latitude,
            destinationLocation.longitude
          );
          
          if (countryInfo) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const savedTrip = await saveTrip({
              userName: user.userName,
              countryCode: countryInfo.countryCode,
              countryName: countryInfo.countryName,
              title: `${selectedPlace.name} - ${selectedPlace.type} - Green trip`,
              startDate: today.toISOString().split('T')[0],
              endDate: tomorrow.toISOString().split('T')[0],
              style: 'Local Exploration',
              notes: `Navigating to ${selectedPlace.name} (${selectedPlace.type})`,
            });
            
            // حفظ ID الرحلة
            if (savedTrip && savedTrip._id) {
              console.log('>>> Saved trip ID:', savedTrip._id);
              setCurrentTripId(savedTrip._id);
            } else {
              console.warn('>>> Warning: savedTrip or _id is missing:', savedTrip);
            }
            
            Alert.alert('✅', 'Trip saved! Check "My Trips" to see your current trip.');
          }
        } catch (saveErr) {
          console.error('Error saving trip:', saveErr);
          // لا نوقف العملية إذا فشل الحفظ
        }
      }

      // طلب إذن الموقع
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location access is required to navigate');
        return;
      }

      setIsNavigating(true);
      
      // استخدام المسافة الفعلية من routeInfo كقيمة أولية
      // لأن المسافة المتبقية يجب أن تبدأ من المسافة الكلية الفعلية
      setRemainingDistance(routeInfo.distance);

      // متابعة الموقع أثناء المشي
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // تحديث كل 5 ثواني
          distanceInterval: 10, // أو كل 10 أمتار
        },
        (location:any) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          // تحديث الموقع الحالي
          setCurrentLocation(newLocation);
          
          // حساب المسافة المتبقية بناءً على المسار الفعلي
          let calculatedDistance: number;
          if (routeCoordinates.length > 0) {
            calculatedDistance = calculateRemainingRouteDistance(newLocation, routeCoordinates, destinationLocation);
          } else {
            // إذا لم يكن هناك مسار، نستخدم المسافة المباشرة
            calculatedDistance = calculateDistance(
              newLocation.latitude,
              newLocation.longitude,
              destinationLocation.latitude,
              destinationLocation.longitude
            );
          }
          
          // استخدام المسافة المحسوبة (لكن نضمن أنها لا تتجاوز المسافة الكلية)
          const finalDistance = routeInfo && calculatedDistance > routeInfo.distance 
            ? routeInfo.distance 
            : calculatedDistance;
          
          setRemainingDistance(Math.max(0, finalDistance));
          
          // إذا وصلنا للوجهة (أقل من 50 متر)
          if (finalDistance < 0.05) {
            Alert.alert('🎉', 'You have arrived at your destination!');
            stopNavigation();
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (err) {
      console.error('Error starting navigation:', err);
      Alert.alert('Error', 'Failed to start navigation');
      setIsNavigating(false);
    }
  };

  // إيقاف متابعة المسار
  const stopNavigation = async () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsNavigating(false);
    setRemainingDistance(null);
    
    // تحديث الرحلة لتكون مكتملة
    if (currentTripId && user) {
      try {
        const today = new Date();
        // استخدام تاريخ اليوم مع الوقت 00:00:00 لضمان أن الرحلة تنتقل إلى المكتملة
        today.setHours(0, 0, 0, 0);
        const endDateStr = today.toISOString().split('T')[0];
        
        console.log('>>> stopNavigation: Updating trip:', currentTripId, 'endDate to:', endDateStr);
        
        const updatedTrip = await updateTrip(currentTripId, {
          endDate: endDateStr,
          notes: `Completed navigation to ${selectedPlace?.name || 'destination'}`,
        });
        
        console.log('>>> stopNavigation: Trip updated successfully:', updatedTrip);
        
        setCurrentTripId(null); // إعادة تعيين ID الرحلة
        Alert.alert('✅', 'Trip completed! Check "My Trips" to see it in completed trips.');
      } catch (err) {
        console.error('>>> stopNavigation: Error updating trip:', err);
        Alert.alert('Error', 'Failed to update trip. Please try again.');
      }
    } else {
      console.warn('>>> stopNavigation: No currentTripId or user. currentTripId:', currentTripId, 'user:', user?.userName);
    }
  };

  // جلب تفاصيل المكان من Google Places API
  const fetchPlaceDetails = async (place: {
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    googlePlaceId?: string;
  }) => {
    try {
      setPlaceDetailsLoading(true);
      
      // Try Google Place Details first if we have a place_id
      if (GOOGLE_API_KEY) {
        let placeId = place.googlePlaceId;
        
        // If no place_id, try to find it using nearby search first (أكثر دقة)
        if (!placeId) {
          try {
            // استخدام Nearby Search للبحث عن المكان القريب
            const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${place.latitude},${place.longitude}&radius=50&name=${encodeURIComponent(place.name)}&key=${GOOGLE_API_KEY}&language=ar`;
            const nearbyResponse = await fetch(nearbySearchUrl);
            
            if (nearbyResponse.ok) {
              const nearbyData = await nearbyResponse.json();
              if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
                // البحث عن أقرب مكان بنفس الاسم
                const closestPlace = nearbyData.results.find((p: any) => 
                  p.name.toLowerCase().includes(place.name.toLowerCase()) || 
                  place.name.toLowerCase().includes(p.name.toLowerCase())
                ) || nearbyData.results[0];
                placeId = closestPlace.place_id;
                console.log('>>> Found place_id using Nearby Search:', placeId);
              }
            }
          } catch (nearbyErr) {
            console.log('Google Nearby Search error, trying text search...', nearbyErr);
          }
          
          // If still no place_id, try text search
          if (!placeId) {
            try {
              const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(place.name)}&location=${place.latitude},${place.longitude}&radius=200&key=${GOOGLE_API_KEY}&language=ar`;
              const searchResponse = await fetch(searchUrl);
              
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
                  placeId = searchData.results[0].place_id;
                  console.log('>>> Found place_id using Text Search:', placeId);
                }
              }
            } catch (searchErr) {
              console.log('Google Text Search error:', searchErr);
            }
          }
        }
        
        // If we have a place_id, get details
        if (placeId) {
          console.log('>>> Fetching Google Place Details for place_id:', placeId);
          setShowPlaceDetails(true); // عرض الـ modal فوراً
          const details = await googlePlaceDetails(placeId);
          if (details) {
            console.log('>>> Google Place Details loaded successfully:', details.name);
            setPlaceDetails({
              name: details.name || place.name,
              rating: details.rating,
              priceLevel: details.priceLevel,
              openingHours: details.openingHours,
              phone: details.phone,
              address: details.address,
              website: details.website,
              reviews: details.reviews,
            });
            setPlaceDetailsLoading(false);
            return;
          } else {
            console.warn('>>> Google Place Details returned null for place_id:', placeId);
          }
        } else {
          console.warn('>>> No place_id found for place:', place.name);
        }
      }
      
      // Fallback: استخدام Overpass API
      try {
        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["name"~"${place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"](around:100,${place.latitude},${place.longitude});
            way["name"~"${place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"](around:100,${place.latitude},${place.longitude});
          );
          out body;
          >;
          out skel qt;
        `;
        
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: overpassQuery,
        });
        
        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          const elements = overpassData.elements || [];
          
          if (elements.length > 0) {
            const element = elements[0];
            const tags = element.tags || {};
            
            const openingHours: string[] = [];
            if (tags.opening_hours) {
              openingHours.push(tags.opening_hours);
            }
            
            setPlaceDetails({
              name: tags.name || place.name,
              rating: tags.rating ? parseFloat(tags.rating) : undefined,
              priceLevel: tags['price_range'] ? parseInt(tags['price_range']) : undefined,
              openingHours: openingHours,
              phone: tags.phone || tags['contact:phone'] || '',
              address: tags['addr:full'] || 
                       (tags['addr:street'] && tags['addr:housenumber'] 
                         ? `${tags['addr:street']} ${tags['addr:housenumber']}` 
                         : tags['addr:street'] || '') || `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`,
              website: tags.website || tags['contact:website'] || '',
            });
            setShowPlaceDetails(true);
            setPlaceDetailsLoading(false);
            return;
          }
        }
      } catch (overpassErr) {
        console.log('Overpass API error:', overpassErr);
      }
      
      // Fallback نهائي: استخدام Nominatim
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${place.latitude}&lon=${place.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'GreenPathApp/1.0',
            },
          }
        );
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          
          setPlaceDetails({
            name: place.name,
            address: nominatimData.display_name || `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`,
          });
          setShowPlaceDetails(true);
        } else {
          throw new Error('Nominatim failed');
        }
      } catch (nominatimErr) {
        console.log('Nominatim error:', nominatimErr);
        // معلومات أساسية
        setPlaceDetails({
          name: place.name,
          address: `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`,
        });
        setShowPlaceDetails(true);
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      // في حالة الخطأ، نعرض معلومات أساسية
      setPlaceDetails({
        name: place.name,
        address: `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`,
      });
      setShowPlaceDetails(true);
    } finally {
      setPlaceDetailsLoading(false);
    }
  };
// ضغطة مطوّلة على الخريطة: اختار نقطة كوجهة واحسب المسار
const handleMapLongPress = async (coordinate: { latitude: number; longitude: number }) => {
  // لازم يكون عندنا موقع المستخدم
  if (!currentLocation) {
    const cur = await getCurrentLocation();
    if (!cur) return;
  }

  // وقف أي متابعة سابقة
  stopNavigation();

  // جهّز الوجهة
  setDestinationLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude });
  setShowMap(true);

  // اعتبريها “مكان مختار” حتى تظهر عندك معلومات المسار/الأزرار
  const pseudoPlace = {
    name: '📍 Point selected from map',
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    type: 'map_long_press',
  };
  setSelectedPlace(pseudoPlace);

  // (اختياري) جلب تفاصيل المكان: غالباً ما رح يجيب تفاصيل كثيرة لأنه مجرد نقطة
  // await fetchPlaceDetails(pseudoPlace);

  // احسبي المسار
  const origin = currentLocation ?? (await getCurrentLocation());
  if (!origin) return;

  await calculateRoute(origin, { latitude: coordinate.latitude, longitude: coordinate.longitude }, travelMode);
};

  // Helper to fetch place details by place_id
  const fetchPlaceDetailsByPlaceId = async (placeId: string): Promise<void> => {
    try {
      const details = await googlePlaceDetails(placeId);
      
      if (!details) {
        Alert.alert('Error', 'Place details could not be loaded. Please try again.');
        return;
      }

      if (!details.geometry || !details.geometry.location) {
        Alert.alert('Error', 'Place location could not be loaded. Please try again.');
        return;
      }

      // Create place object
      const place = {
        name: details.name || '',
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        type: 'search' as const,
        googlePlaceId: placeId,
      };

      // Set place details state
      if (details) {
        setPlaceDetails({
          name: details.name || '',
          rating: details.rating,
          priceLevel: details.priceLevel,
          openingHours: details.openingHours,
          phone: details.phone,
          address: details.address,
          website: details.website,
          reviews: details.reviews,
        });
        setShowPlaceDetails(true);
      }

      // Call handleSelectPlace to set destination, calculate route, and open map
      await handleSelectPlace(place);
    } catch (err) {
      console.error('Error in fetchPlaceDetailsByPlaceId:', err);
      Alert.alert('Error', 'Failed to load place details. Please try again.');
    }
  };

  // اختيار مكان والذهاب إليه
  const handleSelectPlace = async (place: {
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    googlePlaceId?: string;
  }) => {
    if (!currentLocation) return;
    
    // إيقاف أي متابعة سابقة
    stopNavigation();
    
    setSelectedPlace(place);
    setDestinationLocation({ latitude: place.latitude, longitude: place.longitude });
    setShowMap(true);
    
    // جلب تفاصيل المكان
    await fetchPlaceDetails(place);
    
    // حساب المسار
    await calculateRoute(currentLocation, {
      latitude: place.latitude,
      longitude: place.longitude,
    }, travelMode);
  };

  // عرض الخريطة عند اختيار دولة
  const handleShowMap = async () => {
    if (!selectedCountry) return;

    setShowMap(true);
    setLocationLoading(true);

    // الحصول على الموقع الحالي
    const current = await getCurrentLocation();
    if (!current) {
      setLocationLoading(false);
      return;
    }

    // الحصول على إحداثيات الدولة المختارة
    const destination = await getCountryCoordinates(selectedCountry.name);
    if (!destination) {
      Alert.alert('Error', 'Could not find country coordinates');
      setLocationLoading(false);
      return;
    }

    setDestinationLocation(destination);
    
    // حساب المسار للدول (لا نستخدم طريقة التنقل لأن السفر بالطائرة)
    await calculateRoute(current, destination, 'driving');
    setLocationLoading(false);
  };

  // عرض الخريطة للأماكن القريبة
  const handleShowLocalMap = async () => {
    setLocationLoading(true);
    
    // إعادة تعيين جميع المعلومات المتعلقة بالدولة
    setSelectedCountry(null);
    setDestinationLocation(null);
    setRouteCoordinates([]);
    setSelectedPlace(null);
    setSearch('');
    
    const current = await getCurrentLocation();
    if (!current) {
      setLocationLoading(false);
      return;
    }
    
    setShowMap(true);
    setShowNearbyPlaces(true);
    setLocationLoading(false);
    // البحث عن مطاعم قريبة تلقائياً
    await searchNearbyPlaces('restaurant');
  };

  // فلترة الدول حسب البحث
  const searchLower = search.toLowerCase();
  const filtered = countries.filter((c) => {
    if (!searchLower) return true;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.code.toLowerCase().includes(searchLower) ||
      (c.region ?? '').toLowerCase().includes(searchLower) ||
      (c.mainLanguage ?? '').toLowerCase().includes(searchLower)
    );
  });

  // جلب معلومات إضافية عن الدولة (فنادق، معالم، إلخ) - قائمة مرتبة ومشجعة
  const fetchCountryAttractions = async (countryName: string) => {
    try {
      setAttractionsLoading(true);
      setCountryAttractions([]);
      
      // قائمة معالم مشهورة حقيقية لكل دولة (معلومات دقيقة ومشجعة)
      const famousAttractions: { [key: string]: Array<{ name: string; emoji: string; desc: string }> } = {
        'Turkey': [
          { name: 'Hagia Sophia', emoji: '🕌', desc: 'Great historical mosque in Istanbul - Byzantine architectural masterpiece' },
          { name: 'Topkapi Palace', emoji: '🏰', desc: 'Palace of Ottoman sultans - wonderful historical museum' },
          { name: 'Cappadocia', emoji: '🎈', desc: 'Charming natural region - hot air balloon rides' },
          { name: 'Grand Bazaar', emoji: '🛍️', desc: 'World\'s largest covered market - traditional shopping' },
          { name: 'Bosphorus', emoji: '⛴️', desc: 'Strait separating Europe and Asia - boat tours' },
          { name: 'Antalya', emoji: '🏖️', desc: 'Beautiful coastal city - amazing beaches' },
        ],
        'Israel': [
          { name: 'Western Wall', emoji: '🕍', desc: 'Holiest Jewish site - rich religious history' },
          { name: 'Dead Sea', emoji: '🏖️', desc: 'Lowest point on Earth - unique experience' },
          { name: 'Tel Aviv', emoji: '🌆', desc: 'Vibrant coastal city - modern culture' },
          { name: 'Jerusalem', emoji: '⛪', desc: 'Holy city - rich history and culture' },
          { name: 'Red Sea', emoji: '🐠', desc: 'Amazing diving - beautiful marine world' },
          { name: 'Mount of Olives', emoji: '⛰️', desc: 'Stunning panoramic view - religious history' },
        ],
        'Greece': [
          { name: 'Acropolis', emoji: '🏛️', desc: 'Temple of Athena - symbol of Greek civilization' },
          { name: 'Santorini Island', emoji: '🏝️', desc: 'Charming island - unforgettable sunset' },
          { name: 'Acropolis Museum', emoji: '🎭', desc: 'Archaeological treasures - ancient history' },
          { name: 'Mykonos', emoji: '🌊', desc: 'Party island - fun nightlife' },
          { name: 'Olympia', emoji: '🏟️', desc: 'Home of the Olympic Games - sports history' },
          { name: 'Delphi', emoji: '🔮', desc: 'Sacred archaeological site - Greek mythology' },
        ],
        'Italy': [
          { name: 'Colosseum', emoji: '🏛️', desc: 'Great Roman amphitheater - famous historical landmark' },
          { name: 'Leaning Tower of Pisa', emoji: '🗼', desc: 'Architectural wonder - artistic masterpiece' },
          { name: 'Venice', emoji: '🚤', desc: 'City on water - unique romance' },
          { name: 'Rome', emoji: '🏛️', desc: 'Eternal city - rich history and culture' },
          { name: 'Florence', emoji: '🎨', desc: 'Cradle of the Renaissance - art and culture' },
          { name: 'Pompeii', emoji: '🌋', desc: 'Archaeological city - preserved history' },
        ],
        'France': [
          { name: 'Eiffel Tower', emoji: '🗼', desc: 'Symbol of Paris - stunning panoramic view' },
          { name: 'Louvre Museum', emoji: '🎨', desc: 'World\'s largest museum - artistic treasures' },
          { name: 'Palace of Versailles', emoji: '🏰', desc: 'Luxurious royal palace - royal history' },
          { name: 'Notre-Dame', emoji: '⛪', desc: 'Gothic cathedral - architectural masterpiece' },
          { name: 'Champs-Élysées', emoji: '🛍️', desc: 'Most famous street in Paris - upscale shopping' },
          { name: 'Mont Saint-Michel', emoji: '🏰', desc: 'Religious island - charming landmark' },
        ],
        'Spain': [
          { name: 'Alhambra Palace', emoji: '🏰', desc: 'Andalusian palace in Granada - Islamic art' },
          { name: 'Sagrada Familia', emoji: '⛪', desc: 'Church in Barcelona - Gaudi masterpiece' },
          { name: 'Prado Museum', emoji: '🎨', desc: 'Art museum in Madrid - great paintings' },
          { name: 'Seville', emoji: '🎭', desc: 'Home of flamenco - Andalusian culture' },
          { name: 'Canary Islands', emoji: '🏝️', desc: 'Tropical islands - amazing beaches' },
          { name: 'Valencia', emoji: '🍊', desc: 'Orange city - arts and sciences' },
        ],
        'Jordan': [
          { name: 'Petra', emoji: '🏛️', desc: 'Pink city carved in rock - wonder of the world' },
          { name: 'Dead Sea', emoji: '🏖️', desc: 'Lowest point on Earth - therapeutic mud' },
          { name: 'Wadi Rum', emoji: '🏜️', desc: 'Red desert - stunning landscapes' },
          { name: 'Amman', emoji: '🏙️', desc: 'Modern capital - history and culture' },
          { name: 'Jerash', emoji: '🏛️', desc: 'Roman city - preserved ruins' },
        ],
        'Egypt': [
          { name: 'Pyramids of Giza', emoji: '🔺', desc: 'Seven wonders of the world - Pharaonic history' },
          { name: 'Sphinx', emoji: '🦁', desc: 'Great statue - symbol of civilization' },
          { name: 'Karnak Temple', emoji: '🏛️', desc: 'Temple complex - ancient history' },
          { name: 'Nile River', emoji: '⛴️', desc: 'World\'s longest river - boat tours' },
          { name: 'Luxor', emoji: '🏛️', desc: 'City of temples - Pharaonic ruins' },
        ],
        'Morocco': [
          { name: 'Marrakech', emoji: '🏰', desc: 'Red city - market and culture' },
          { name: 'Fes', emoji: '🕌', desc: 'Ancient Islamic city - rich history' },
          { name: 'Sahara Desert', emoji: '🏜️', desc: 'Vast desert - camel rides' },
          { name: 'Casablanca', emoji: '🌆', desc: 'Modern city - architectural art' },
        ],
        'United Arab Emirates': [
          { name: 'Burj Khalifa', emoji: '🏗️', desc: 'World\'s tallest tower - Dubai' },
          { name: 'Burj Al Arab', emoji: '⛵', desc: 'Luxury hotel - high-end comfort' },
          { name: 'Palm Island', emoji: '🌴', desc: 'Artificial island - architectural creativity' },
          { name: 'Abu Dhabi', emoji: '🏛️', desc: 'Cultural capital - world-class museums' },
        ],
      };
      
      // الحصول على المعالم الخاصة بالدولة
      let attractions = famousAttractions[countryName] || [];
      
      // إذا لم تكن هناك معالم محددة، نبحث عن معلومات عامة
      if (attractions.length === 0) {
        // جلب معلومات أساسية من REST Countries API
        let capital = '';
        try {
          const countryCode = selectedCountry?.code?.toLowerCase() || '';
          if (countryCode) {
            const restCountriesResponse = await fetch(
              `https://restcountries.com/v3.1/alpha/${countryCode}`
            );
            if (restCountriesResponse.ok) {
              const countryData = await restCountriesResponse.json();
              const country = countryData[0];
              
              if (country.capital && country.capital.length > 0) {
                capital = country.capital[0];
                attractions.push({
                  name: `العاصمة: ${capital}`,
                  emoji: '🏛️',
                  desc: `اكتشف عاصمة ${countryName} وثقافتها المميزة`,
                });
              }
            }
          }
        } catch (err) {
          console.log('REST Countries API error:', err);
        }
        
        // إضافة معلومات عامة
        attractions.push(
          {
            name: 'Historical Landmarks',
            emoji: '🏛️',
            desc: `Explore historical and cultural sites in ${countryName}`,
          },
          {
            name: 'Luxury Hotels',
            emoji: '🏨',
            desc: `Discover the best hotels and resorts in ${countryName}`,
          },
          {
            name: 'Local Restaurants',
            emoji: '🍽️',
            desc: `Taste delicious local dishes in ${countryName}`,
          },
          {
            name: 'Stunning Nature',
            emoji: '🌳',
            desc: `Enjoy natural landscapes in ${countryName}`,
          }
        );
      }
      
      // تحويل إلى الصيغة المطلوبة
      const formattedAttractions = attractions.map(attr => ({
        name: `${attr.emoji} ${attr.name}`,
        type: 'attraction',
        description: attr.desc,
      }));
      
      setCountryAttractions(formattedAttractions);
    } catch (err) {
      console.error('Error fetching country attractions:', err);
      // في حالة الخطأ، نعرض معلومات افتراضية
      setCountryAttractions([
        {
          name: `🏨 Hotels in ${countryName}`,
          type: 'hotel',
          description: `Discover the best hotels and resorts`,
        },
        {
          name: `🏛️ Historical Landmarks`,
          type: 'landmark',
          description: `Explore historical and cultural sites`,
        },
        {
          name: `🍽️ Local Restaurants`,
          type: 'restaurant',
          description: `Taste delicious local dishes`,
        },
      ]);
    } finally {
      setAttractionsLoading(false);
    }
  };

  // جلب المدن للدولة
  const fetchCountryCities = async (countryName: string, countryCode: string) => {
    try {
      setCitiesLoading(true);
      setCountryCities([]);
      setSelectedCity(null);
      setCityAttractions([]);
      
      const cities: Array<{ name: string; latitude: number; longitude: number }> = [];
      
      // جلب المدن من REST Countries API
      try {
        const response = await fetch(
          `https://restcountries.com/v3.1/alpha/${countryCode.toLowerCase()}`
        );
        if (response.ok) {
          const data = await response.json();
          const country = data[0];
          
          // الحصول على العاصمة
          if (country.capital && country.capital.length > 0) {
            const capital = country.capital[0];
            const capitalCoords = await getCityCoordinates(capital, countryName);
            if (capitalCoords) {
              cities.push({ name: capital, ...capitalCoords });
            }
          }
        }
      } catch (err) {
        console.log('Error fetching from REST Countries:', err);
      }
      
      // البحث عن مدن مشهورة حسب الدولة
      const famousCities: { [key: string]: string[] } = {
        'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa'],
        'Israel': ['Jerusalem', 'Tel Aviv', 'Haifa', 'Eilat', 'Nazareth'],
        'Greece': ['Athens', 'Thessaloniki', 'Santorini', 'Mykonos', 'Crete'],
        'Italy': ['Rome', 'Milan', 'Venice', 'Florence', 'Naples', 'Pisa'],
        'France': ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux'],
        'Spain': ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Granada'],
        'Jordan': ['Amman', 'Petra', 'Aqaba', 'Jerash'],
        'Egypt': ['Cairo', 'Alexandria', 'Luxor', 'Aswan', 'Giza'],
        'Morocco': ['Casablanca', 'Marrakech', 'Fes', 'Rabat', 'Tangier'],
        'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
      };
      
      const citiesToSearch = famousCities[countryName] || [];
      for (const cityName of citiesToSearch.slice(0, 6)) {
        if (cities.find(c => c.name === cityName)) continue;
        const coords = await getCityCoordinates(cityName, countryName);
        if (coords) {
          cities.push({ name: cityName, ...coords });
        }
        // تأخير قصير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setCountryCities(cities);
      
      // إذا لم نحصل على أي مدن، نستخدم موقع الدولة كبديل
      if (cities.length === 0) {
        const countryCoords = await getCountryCoordinates(countryName);
        if (countryCoords) {
          setCountryCities([{ name: countryName, ...countryCoords }]);
        }
      }
    } catch (err) {
      console.error('Error fetching country cities:', err);
      // في حالة الخطأ، نحاول جلب موقع الدولة فقط
      try {
        const countryCoords = await getCountryCoordinates(countryName);
        if (countryCoords) {
          setCountryCities([{ name: countryName, ...countryCoords }]);
        }
      } catch (err2) {
        console.error('Error getting country coordinates:', err2);
      }
    } finally {
      setCitiesLoading(false);
    }
  };
  
  // جلب إحداثيات مدينة
  const getCityCoordinates = async (cityName: string, countryName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cityName}, ${countryName}`)}&limit=1`,
        {
          headers: {
            'User-Agent': 'GreenPathApp/1.0',
          },
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (err) {
      console.log('Error getting city coordinates:', err);
      return null;
    }
  };
  
  // جلب معلومات سياحية للمدينة من APIs
  const fetchCityAttractions = async (cityName: string, countryName: string) => {
    try {
      setCityAttractionsLoading(true);
      setCityAttractions([]);
      
      const attractions: Array<{ name: string; type: string; description?: string }> = [];
      
      // استخدام Wikipedia API لجلب معلومات المدينة
      try {
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`
        );
        
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          if (wikiData.extract) {
            // استخراج معلومات من Wikipedia
            const extract = wikiData.extract.substring(0, 200) + '...';
            attractions.push({
              name: `📚 ${cityName}`,
              type: 'info',
              description: extract,
            });
          }
        }
      } catch (wikiErr) {
        console.log('Wikipedia API error:', wikiErr);
      }
      
      // استخدام Nominatim للبحث عن معالم سياحية
      const searchQueries = [
        { query: `tourist attraction ${cityName} ${countryName}`, emoji: '🎭', type: 'tourism' },
        { query: `museum ${cityName} ${countryName}`, emoji: '🏛️', type: 'museum' },
        { query: `landmark ${cityName} ${countryName}`, emoji: '🗼', type: 'landmark' },
        { query: `historic site ${cityName} ${countryName}`, emoji: '🏰', type: 'historic' },
        { query: `restaurant ${cityName} ${countryName}`, emoji: '🍽️', type: 'restaurant' },
        { query: `hotel ${cityName} ${countryName}`, emoji: '🏨', type: 'hotel' },
      ];
      
      const foundPlaces: Set<string> = new Set();
      for (const searchQuery of searchQueries.slice(0, 6)) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.query)}&limit=2&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'GreenPathApp/1.0',
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              for (const place of data) {
                const placeName = place.name || place.display_name?.split(',')[0];
                if (placeName && !foundPlaces.has(placeName)) {
                  foundPlaces.add(placeName);
                  
                  let desc = '';
                  if (place.display_name) {
                    const parts = place.display_name.split(',');
                    desc = parts.length > 1 ? `${parts[1].trim()}` : `Distinguished tourist attraction in ${cityName}`;
                  } else {
                    desc = `Special place in ${cityName}`;
                  }
                  
                  attractions.push({
                    name: `${searchQuery.emoji} ${placeName}`,
                    type: searchQuery.type,
                    description: desc,
                  });
                  
                  if (attractions.length >= 6) break;
                }
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.log(`Error searching for ${searchQuery.type}:`, err);
        }
      }
      
      // إذا لم نحصل على نتائج، نستخدم معلومات عامة
      if (attractions.length === 0) {
        attractions.push(
          {
            name: '🏛️ Historical Landmarks',
            type: 'landmark',
            description: `Explore ancient historical sites in ${cityName}`,
          },
          {
            name: '🏨 Luxury Hotels',
            type: 'hotel',
            description: `Discover the best hotels and accommodations in ${cityName}`,
          },
          {
            name: '🍽️ Local Restaurants',
            type: 'restaurant',
            description: `Taste delicious local dishes in ${cityName}`,
          },
          {
            name: '🎭 Culture & Arts',
            type: 'tourism',
            description: `Enjoy culture and arts in ${cityName}`,
          }
        );
      }
      
      setCityAttractions(attractions);
    } catch (err) {
      console.error('Error fetching city attractions:', err);
      setCityAttractions([
        {
          name: '🏛️ معالم تاريخية',
          type: 'landmark',
          description: `استكشف المواقع التاريخية في ${cityName}`,
        },
        {
          name: '🏨 فنادق',
          type: 'hotel',
          description: `اكتشف أفضل الفنادق في ${cityName}`,
        },
        {
          name: '🍽️ مطاعم',
          type: 'restaurant',
          description: `تذوق الأطباق المحلية في ${cityName}`,
        },
      ]);
    } finally {
      setCityAttractionsLoading(false);
    }
  };
  
  // عرض خريطة المدن
  const handleShowCitiesMap = async () => {
    if (!selectedCountry) return;
    
    setShowCitiesMap(true);
    setShowMap(true);
    setShowNearbyPlaces(false);
    
    // جلب الموقع الحالي في الخلفية (إذا لم يكن موجوداً)
    if (!currentLocation) {
      getCurrentLocation().catch(() => {
        // تجاهل الأخطاء - نستمر حتى لو فشل جلب الموقع
      });
    }
    
    // جلب المدن مباشرة (لا ننتظر الموقع)
    await fetchCountryCities(selectedCountry.name, selectedCountry.code);
  };
  
  // اختيار مدينة
  const handleSelectCity = async (city: { name: string; latitude: number; longitude: number }) => {
    setSelectedCity(city);
    if (selectedCountry) {
      await fetchCityAttractions(city.name, selectedCountry.name);
    }
  };
  
  // اختيار دولة
  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setSearch(country.name);
    Keyboard.dismiss();
    setShowMap(false); // إخفاء الخريطة عند اختيار دولة جديدة
    setShowCitiesMap(false);
    setCountryCities([]);
    setSelectedCity(null);
    setCityAttractions([]);
    // جلب معلومات إضافية عن الدولة
    fetchCountryAttractions(country.name);
  };

  // الانتقال إلى صفحة التخطيط
  const handlePlanTrip = () => {
    if (!selectedCountry) return;
    
    if (user) {
      router.push({
        pathname: '/trip/plan',
        params: {
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
        },
      });
    } else {
      router.push('/(auth)/landing');
    }
  };

  // الانتقال إلى صفحة التخطيط من مدينة
  const handlePlanTripFromCity = () => {
    if (!selectedCity || !selectedCountry) return;
    
    if (user) {
      router.push({
        pathname: '/trip/plan',
        params: {
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
          cityName: selectedCity.name,
        },
      });
    } else {
      router.push('/(auth)/landing');
    }
  };

  // البحث عند الضغط على Enter
  const handleSearchSubmit = () => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      setSelectedCountry(null);
      return;
    }

    const match = countries.find((c) => {
      const name = c.name.toLowerCase();
      const code = c.code.toLowerCase();
      return (
        name === trimmed ||
        name.startsWith(trimmed) ||
        code === trimmed ||
        code.startsWith(trimmed)
      );
    });

    if (match) {
      handleSelectCountry(match);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.infoText}>Loading countries... 🌍</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* العنوان */}
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            Plan New Trip 🌿
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Search for a country or region to start planning your green journey
          </ThemedText>
        </View>

        {/* زر الأماكن القريبة */}
        <Pressable
          style={styles.localPlacesButton}
          onPress={handleShowLocalMap}
        >
          <ThemedText style={styles.localPlacesButtonText}>
            🗺️ Discover nearby places (restaurants, attractions, etc.)
          </ThemedText>
        </Pressable>

        {/* البحث عن أماكن قريبة */}
        {showNearbyPlaces && (
          <View style={styles.nearbyPlacesContainer}>
            <View style={styles.nearbyPlacesHeader}>
              <ThemedText type="defaultSemiBold" style={styles.nearbyPlacesTitle}>
                Nearby Places
              </ThemedText>
              <Pressable
                style={styles.closePlacesButton}
                onPress={() => {
                  setShowNearbyPlaces(false);
                  setNearbyPlaces([]);
    setSelectedPlace(null);
    setDestinationLocation(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setShowMap(false);
                }}
              >
                <ThemedText style={styles.closePlacesText}>✕</ThemedText>
              </Pressable>
            </View>
            
            {/* أزرار الفلترة السريعة */}
            <View style={styles.filtersContainer}>
              <ThemedText style={styles.filtersLabel}>Quick Filter:</ThemedText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersScrollContent}
              >
                {[
                  { key: 'restaurant', label: '🍽️ Restaurant', query: 'restaurant' },
                  { key: 'cafe', label: '☕ Cafe', query: 'cafe' },
                  { key: 'hotel', label: '🏨 Hotel', query: 'hotel' },
                  { key: 'museum', label: '🏛️ Museum', query: 'museum' },
                  { key: 'pharmacy', label: '💊 Pharmacy', query: 'pharmacy' },
                  { key: 'bank', label: '🏦 Bank', query: 'bank' },
                  { key: 'gas_station', label: '⛽ Gas Station', query: 'fuel' },
                  { key: 'hospital', label: '🏥 Hospital', query: 'hospital' },
                  { key: 'park', label: '🌳 Park', query: 'park' },
                  { key: 'shopping', label: '🛍️ Shopping', query: 'shopping' },
                ].map((filter) => (
                  <Pressable
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.key && styles.filterButtonActive,
                    ]}
                    onPress={() => {
                      if (selectedFilter === filter.key) {
                          setSelectedFilter('');
                          setNearbyPlaces([]);
                          return;
                     }

                        setSelectedFilter(filter.key);
                        searchNearbyPlaces(filter.query);
                     }}

                    disabled={placesLoading}
                  >
                    <ThemedText
                      style={[
                        styles.filterButtonText,
                        selectedFilter === filter.key && styles.filterButtonTextActive,
                      ]}
                    >
                      {filter.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.placeSearchRow}>
              <TextInput
                placeholder="Search for a specific place..."
                value={placeSearchQuery}
                onChangeText={(t) => {
                setPlaceSearchQuery(t);
                // Debounce for suggestions (300ms as specified)
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  fetchPlaceSuggestions(t);
                }, 300);
              }}
                style={styles.placeSearchInput}
              />
              <Pressable
                style={styles.searchPlaceButton}
                onPress={() => {
                  const q = placeSearchQuery.trim();
                  if (q.length >= 2) {
                    setPlaceSuggestions([]);
                    return searchNearbyByName(q);
                  }
                  return searchNearbyPlaces(getSelectedFilterQuery());
                }}
                disabled={placesLoading}
              >
                <ThemedText style={styles.searchPlaceButtonText}>
                  {placesLoading ? '...' : 'Search'}
                </ThemedText>
              </Pressable>
            

{placeSuggestions.length > 0 && (
  <View
    style={{
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'white',
    }}
  >
    {placeSuggestions.map((s) => (
      <Pressable
        key={s.place_id}
        style={{
          padding: 12,
          borderBottomWidth: placeSuggestions.indexOf(s) === placeSuggestions.length - 1 ? 0 : 1,
          borderBottomColor: '#f3f4f6',
        }}
        onPress={async () => {
          setPlaceSearchQuery(s.description);
          setPlaceSuggestions([]);
          
          // If it's a Google place_id, use the new helper
          if (s.place_id && !s.place_id.startsWith('nominatim_')) {
            await fetchPlaceDetailsByPlaceId(s.place_id);
            return;
          }
          
          // Fallback for Nominatim results
          if (s.place_id && s.place_id.startsWith('nominatim_')) {
            const parts = s.place_id.replace('nominatim_', '').split('_');
            if (parts.length === 2) {
              handleSelectPlace({
                name: s.description,
                latitude: parseFloat(parts[0]),
                longitude: parseFloat(parts[1]),
                type: 'search',
              });
            }
          }
        }}
      >
        <ThemedText>{s.description}</ThemedText>
      </Pressable>
    ))}
  </View>
)}
</View>

            {placesLoading ? (
              <ActivityIndicator size="small" style={styles.placesLoader} />
            ) : nearbyPlaces.length > 0 ? (
              <ScrollView style={styles.placesList} nestedScrollEnabled>
                {nearbyPlaces.map((place, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.placeCard,
                      selectedPlace?.name === place.name && styles.placeCardSelected,
                    ]}
                    onPress={() => handleSelectPlace(place)}
                  >
                    <View style={styles.placeCardContent}>
                      <View style={styles.placeCardLeft}>
                        <ThemedText type="defaultSemiBold" style={styles.placeName}>
                          {place.name}
                        </ThemedText>
                        <ThemedText style={styles.placeDetails}>
                          {place.type}
                        </ThemedText>
                      </View>
                      <View style={styles.placeCardRight}>
                        <ThemedText style={styles.placeDistance}>
                          {place.distance && place.distance < 1 
                            ? `${Math.round(place.distance * 1000)} m` 
                            : place.distance 
                              ? `${place.distance.toFixed(1)} km`
                              : '—'}
                        </ThemedText>
                        <ThemedText style={styles.placeDistanceLabel}>
                          {place.distance && place.distance < 1 ? 'meters' : 'km'}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <ThemedText style={styles.noPlacesText}>
                No places found. Try searching with different keywords.
              </ThemedText>
            )}
          </View>
        )}

        {/* خانة البحث - نخفيها عند عرض الأماكن القريبة */}
        {!showNearbyPlaces && (
          <TextInput
            placeholder="Search for a country or region (e.g., Turkey, Israel, Greece...)"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            style={styles.searchInput}
          />
        )}

        {/* الدولة المختارة - نخفيها عند عرض الأماكن القريبة */}
        {selectedCountry && !showNearbyPlaces && (
          <>
            <View style={styles.selectedCountryBox}>
              <ThemedText type="defaultSemiBold" style={styles.selectedTitle}>
                {selectedCountry.flag ?? '🌍'} {selectedCountry.name}
              </ThemedText>
              <ThemedText style={styles.selectedDetails}>
                {selectedCountry.region ?? '—'} · {selectedCountry.mainLanguage ?? '—'} ·{' '}
                {selectedCountry.currency ?? '—'}
              </ThemedText>
              <View style={styles.buttonsRow}>
                <Pressable
                  style={styles.mapButton}
                  onPress={handleShowMap}
                  disabled={locationLoading}
                >
                  <ThemedText style={styles.mapButtonText}>
                    {locationLoading ? 'Loading...' : 'Show Map 🗺️'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.planButton}
                  onPress={handlePlanTrip}
                >
                  <ThemedText style={styles.planButtonText}>
                    Start Planning 🧭
                  </ThemedText>
                </Pressable>
              </View>
              
              {/* زر اختيار مدينة */}
              <Pressable
                style={styles.selectCityButton}
                onPress={handleShowCitiesMap}
                disabled={citiesLoading}
              >
                <ThemedText style={styles.selectCityButtonText}>
                  {citiesLoading ? 'Loading...' : '🏙️ Do you want to go to a specific city in this country?'}
                </ThemedText>
              </Pressable>
            </View>
            
            {/* معلومات إضافية عن الدولة لتشجيع السفر */}
            {attractionsLoading ? (
              <View style={styles.attractionsContainer}>
                <ActivityIndicator size="small" />
                <ThemedText style={styles.attractionsLoadingText}>
                  جاري تحميل المعلومات...
                </ThemedText>
              </View>
            ) : countryAttractions.length > 0 ? (
              <View style={styles.attractionsContainer}>
                <ThemedText type="defaultSemiBold" style={styles.attractionsTitle}>
                  ✨ Why travel to {selectedCountry.name}?
                </ThemedText>
                <ThemedText style={styles.attractionsSubtitle}>
                  Discover what makes this destination special
                </ThemedText>
                <View style={styles.attractionsList}>
                  {countryAttractions.map((attraction, index) => (
                    <View key={index} style={styles.attractionCard}>
                      <ThemedText type="defaultSemiBold" style={styles.attractionName}>
                        {attraction.name}
                      </ThemedText>
                      {attraction.description && (
                        <ThemedText style={styles.attractionDescription}>
                          {attraction.description}
                        </ThemedText>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        {/* الخريطة */}
        {showMap && (
          (selectedCountry && !showNearbyPlaces) || showNearbyPlaces || showCitiesMap
        ) && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <ThemedText type="defaultSemiBold" style={styles.mapTitle}>
                Map: {showCitiesMap && selectedCountry
                  ? `Cities of ${selectedCountry.name}`
                  : selectedCountry 
                    ? `From your location to ${selectedCountry.name}`
                    : showNearbyPlaces 
                      ? 'Nearby Places'
                      : 'Map'}
              </ThemedText>
              <Pressable
                style={styles.closeMapButton}
                onPress={() => {
                  setShowMap(false);
                  setShowCitiesMap(false);
                  setSelectedCity(null);
                  setCityAttractions([]);
                }}
              >
                <ThemedText style={styles.closeMapText}>✕</ThemedText>
              </Pressable>
            </View>
            
            {locationLoading || citiesLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" />
                <ThemedText style={styles.mapLoadingText}>
                  {citiesLoading ? 'Loading cities...' : 'Loading map...'}
                </ThemedText>
              </View>
            ) : (currentLocation || (showCitiesMap && countryCities.length > 0)) ? (
              <>
                <MapComponent
                  currentLocation={currentLocation || (showCitiesMap && countryCities.length > 0 ? {
                    latitude: countryCities[0].latitude,
                    longitude: countryCities[0].longitude,
                  } : { latitude: 0, longitude: 0 })}
                  destinationLocation={destinationLocation || (selectedPlace ? {
                    latitude: selectedPlace.latitude,
                    longitude: selectedPlace.longitude,
                  } : selectedCity ? {
                    latitude: selectedCity.latitude,
                    longitude: selectedCity.longitude,
                  } : showCitiesMap && countryCities.length > 0 ? {
                    latitude: countryCities[0].latitude,
                    longitude: countryCities[0].longitude,
                  } : currentLocation || { latitude: 0, longitude: 0 })}
                  destinationName={selectedCity?.name || selectedCountry?.name || selectedPlace?.name || 'Select a place'}
                  routeCoordinates={routeCoordinates}
                  nearbyPlaces={nearbyPlaces}
                  selectedPlace={selectedPlace}
                  isNavigating={isNavigating}
                  countryCities={showCitiesMap ? countryCities : []}
                  selectedCity={selectedCity}
                  onCitySelect={handleSelectCity}
                  onMapLongPress={handleMapLongPress}

                />
                
                {/* معلومات المدينة المختارة - صندوق مشابه لصندوق الدولة */}
                {selectedCity && (
                  <View style={styles.cityAttractionsContainer}>
                    <View style={styles.selectedCityHeader}>
                      <ThemedText type="defaultSemiBold" style={styles.selectedCityTitle}>
                        🏙️ {selectedCity.name}
                      </ThemedText>
                      {selectedCountry && (
                        <ThemedText style={styles.selectedCityCountry}>
                          {selectedCountry.name}
                        </ThemedText>
                      )}
                    </View>
                    
                    {cityAttractionsLoading ? (
                      <>
                        <ActivityIndicator size="small" />
                        <ThemedText style={styles.cityAttractionsLoadingText}>
                          Loading information...
                        </ThemedText>
                      </>
                    ) : cityAttractions.length > 0 ? (
                      <>
                        <ThemedText type="defaultSemiBold" style={styles.cityAttractionsTitle}>
                          ✨ Why travel to {selectedCity.name}?
                        </ThemedText>
                        <ThemedText style={styles.cityAttractionsSubtitle}>
                          Discover what makes this city special
                        </ThemedText>
                        <View style={styles.cityAttractionsList}>
                          {cityAttractions.map((attraction, index) => (
                            <View key={index} style={styles.cityAttractionCard}>
                              <ThemedText type="defaultSemiBold" style={styles.cityAttractionName}>
                                {attraction.name}
                              </ThemedText>
                              {attraction.description && (
                                <ThemedText style={styles.cityAttractionDescription}>
                                  {attraction.description}
                                </ThemedText>
                              )}
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <ThemedText style={styles.cityAttractionsSubtitle}>
                        Select this city to start planning your trip
                      </ThemedText>
                    )}
                    
                    {/* زر Start Planning للمدينة */}
                    <Pressable
                      style={styles.planCityButton}
                      onPress={handlePlanTripFromCity}
                    >
                      <ThemedText style={styles.planCityButtonText}>
                        Start Planning 🧭
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
                
                {/* اختيار طريقة التنقل - فقط للأماكن القريبة */}
                {selectedPlace && (
                  <View style={styles.travelModeContainer}>
                    <ThemedText style={styles.travelModeLabel}>Travel Mode:</ThemedText>
                    <View style={styles.travelModeButtons}>
                      <Pressable
                        style={[
                          styles.travelModeButton,
                          travelMode === 'walking' && styles.travelModeButtonActive,
                        ]}
                        onPress={async () => {
                          setTravelMode('walking');
                          if (currentLocation && destinationLocation) {
                            await calculateRoute(currentLocation, destinationLocation, 'walking');
                          }
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.travelModeButtonText,
                            travelMode === 'walking' && styles.travelModeButtonTextActive,
                          ]}
                        >
                          🚶 Walking
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.travelModeButton,
                          travelMode === 'driving' && styles.travelModeButtonActive,
                        ]}
                        onPress={async () => {
                          setTravelMode('driving');
                          if (currentLocation && destinationLocation) {
                            await calculateRoute(currentLocation, destinationLocation, 'driving');
                          }
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.travelModeButtonText,
                            travelMode === 'driving' && styles.travelModeButtonTextActive,
                          ]}
                        >
                          🚗 Driving
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* معلومات المسار - فقط للأماكن القريبة */}
                {routeInfo && selectedPlace && (
                  <View style={styles.routeInfoContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.routeInfoTitle}>
                      {isNavigating 
                        ? `Navigating... ${travelMode === 'walking' ? '🚶' : '🚗'}` 
                        : 'Route Information'}
                    </ThemedText>
                    
                    {/* المسافة المتبقية أثناء المتابعة */}
                    {isNavigating && remainingDistance !== null && routeInfo && (
                      <View style={styles.navigationStatus}>
                        <ThemedText style={styles.remainingDistanceText}>
                          Remaining Distance: {remainingDistance < 1 
                            ? `${Math.round(remainingDistance * 1000)} meters` 
                            : `${Math.round(remainingDistance * 10) / 10} km`}
                        </ThemedText>
                        <ThemedText style={styles.remainingTimeText}>
                          Estimated Time: {
                            (() => {
                              // حساب الوقت بناءً على نسبة المسافة المتبقية من المسافة الكلية
                              const totalDistance = routeInfo.distance;
                              const distanceRatio = totalDistance > 0 ? remainingDistance / totalDistance : 1;
                              
                              // استخدام الوقت الكلي حسب طريقة التنقل
                              const totalTime = travelMode === 'walking' 
                                ? routeInfo.durationWalking 
                                : routeInfo.durationDriving;
                              
                              // الوقت المتوقع = نسبة المسافة * الوقت الكلي
                              const estimatedTime = Math.max(1, Math.round(totalTime * distanceRatio));
                              
                              return `${estimatedTime} minutes`;
                            })()
                          }
                        </ThemedText>
                      </View>
                    )}
                    
                    <View style={styles.routeInfoRow}>
                      <View style={styles.routeInfoItem}>
                        <ThemedText style={styles.routeInfoLabel}>Distance</ThemedText>
                        <ThemedText style={styles.routeInfoValue}>
                          {routeInfo.distance} km
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.routeInfoItem,
                        travelMode === 'walking' && styles.routeInfoItemActive,
                      ]}>
                        <ThemedText style={styles.routeInfoLabel}>⏱️ Walking</ThemedText>
                        <ThemedText style={[
                          styles.routeInfoValue,
                          travelMode === 'walking' && styles.routeInfoValueActive,
                        ]}>
                          {routeInfo.durationWalking} min
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.routeInfoItem,
                        travelMode === 'driving' && styles.routeInfoItemActive,
                      ]}>
                        <ThemedText style={styles.routeInfoLabel}>🚗 Driving</ThemedText>
                        <ThemedText style={[
                          styles.routeInfoValue,
                          travelMode === 'driving' && styles.routeInfoValueActive,
                        ]}>
                          {routeInfo.durationDriving} min
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* زر بدء/إيقاف المسار */}
                    <Pressable
                      style={[
                        styles.navigationButton,
                        isNavigating && styles.navigationButtonActive,
                      ]}
                      onPress={isNavigating ? stopNavigation : startNavigation}
                    >
                      <ThemedText style={styles.navigationButtonText}>
                        {isNavigating 
                          ? '⏹️ Stop Navigation' 
                          : travelMode === 'walking' 
                            ? '🚶 Start Navigation (Walking)' 
                            : '🚗 Start Navigation (Driving)'}
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.mapErrorContainer}>
                <ThemedText style={styles.mapErrorText}>
                  Location not found
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* قائمة الدول المفلترة - نخفيها عند عرض الأماكن القريبة */}
        {!showNearbyPlaces && (
          <>
            {error && countries.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateTitle}>
                  Error loading countries
                </ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  {error}
                </ThemedText>
                <Pressable
                  style={styles.retryButton}
                  onPress={() => {
                    const load = async () => {
                      try {
                        setLoading(true);
                        setError(null);
                        const data = await fetchCountries();
                        if (data && Array.isArray(data)) {
                          setCountries(data);
                        }
                      } catch (err: any) {
                        setError(`Failed to load: ${err?.message || 'Unknown error'}`);
                      } finally {
                        setLoading(false);
                      }
                    };
                    load();
                  }}
                >
                  <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </Pressable>
              </View>
            )}
            {!error && search.length > 0 ? (
              <>
                <ThemedText style={styles.sectionLabel}>
                  Search Results ({filtered.length})
                </ThemedText>
                {filtered.length === 0 ? (
                  <ThemedText style={styles.noResults}>
                    No results found for "{search}"
                  </ThemedText>
                ) : (
                  filtered.map((item) => (
                    <Pressable
                      key={item._id}
                      style={[
                        styles.countryCard,
                        selectedCountry?._id === item._id && styles.countryCardSelected,
                      ]}
                      onPress={() => handleSelectCountry(item)}
                    >
                      <ThemedText style={styles.flag}>{item.flag ?? '🌍'}</ThemedText>
                      <View style={styles.countryTextContainer}>
                        <ThemedText type="defaultSemiBold" style={styles.countryName}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={styles.countryDetails}>
                          {item.region ?? '—'} · {item.mainLanguage ?? '—'} ·{' '}
                          {item.currency ?? '—'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))
                )}
              </>
            ) : !error ? (
              <>
                <ThemedText style={styles.sectionLabel}>
                  All Countries ({countries.length})
                </ThemedText>
                <ThemedText style={styles.hintText}>
                  Select a country to start planning your trip
                </ThemedText>
                {/* عرض جميع الدول مع إمكانية التمرير */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1f9d55" />
                    <ThemedText style={styles.loadingText}>Loading countries...</ThemedText>
                  </View>
                ) : countries.length > 0 ? (
                  countries.map((item) => (
                    <Pressable
                      key={item._id}
                      style={[
                        styles.countryCard,
                        selectedCountry?._id === item._id && styles.countryCardSelected,
                      ]}
                      onPress={() => handleSelectCountry(item)}
                    >
                      <ThemedText style={styles.flag}>{item.flag ?? '🌍'}</ThemedText>
                      <View style={styles.countryTextContainer}>
                        <ThemedText type="defaultSemiBold" style={styles.countryName}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={styles.countryDetails}>
                          {item.region ?? '—'} · {item.mainLanguage ?? '—'} ·{' '}
                          {item.currency ?? '—'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={styles.noResults}>
                    No countries available
                  </ThemedText>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
      
      {/* Modal لعرض تفاصيل المكان */}
      <Modal
        visible={showPlaceDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaceDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                {placeDetails?.name || 'Place Details'}
              </ThemedText>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowPlaceDetails(false)}
              >
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {placeDetailsLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" />
                  <ThemedText style={styles.modalLoadingText}>
                    Loading details...
                  </ThemedText>
                </View>
              ) : placeDetails ? (
                <>
                  {/* التقييم */}
                  {placeDetails.rating !== undefined && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        ⭐ Rating
                      </ThemedText>
                      <ThemedText style={styles.modalSectionValue}>
                        {placeDetails.rating.toFixed(1)} / 5.0
                      </ThemedText>
                    </View>
                  )}
                  
                  {/* مستوى الأسعار */}
                  {placeDetails.priceLevel !== undefined && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        💰 Price Level
                      </ThemedText>
                      <ThemedText style={styles.modalSectionValue}>
                        {'$'.repeat(placeDetails.priceLevel)} ({placeDetails.priceLevel === 1 ? 'Inexpensive' : placeDetails.priceLevel === 2 ? 'Moderate' : placeDetails.priceLevel === 3 ? 'Expensive' : 'Very Expensive'})
                      </ThemedText>
                    </View>
                  )}
                  
                  {/* العنوان */}
                  {placeDetails.address && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        📍 Address
                      </ThemedText>
                      <ThemedText style={styles.modalSectionValue}>
                        {placeDetails.address}
                      </ThemedText>
                    </View>
                  )}
                  
                  {/* الهاتف */}
                  {placeDetails.phone && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        📞 Phone
                      </ThemedText>
                      <Pressable
                        onPress={() => {
                          Linking.openURL(`tel:${placeDetails.phone}`);
                        }}
                      >
                        <ThemedText style={[styles.modalSectionValue, styles.modalLink]}>
                          {placeDetails.phone}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                  
                  {/* الموقع الإلكتروني */}
                  {placeDetails.website && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        🌐 Website
                      </ThemedText>
                      <Pressable
                        onPress={() => {
                          if (placeDetails.website) {
                            Linking.openURL(placeDetails.website);
                          }
                        }}
                      >
                        <ThemedText style={[styles.modalSectionValue, styles.modalLink]}>
                          {placeDetails.website}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                  
                  {/* أوقات العمل */}
                  {placeDetails.openingHours && placeDetails.openingHours.length > 0 && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        🕐 Opening Hours
                      </ThemedText>
                      {placeDetails.openingHours.map((hour, index) => (
                        <ThemedText key={index} style={styles.modalSectionValue}>
                          {hour}
                        </ThemedText>
                      ))}
                    </View>
                  )}
                  
                  {/* التقييمات */}
                  {placeDetails.reviews && placeDetails.reviews.length > 0 && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        💬 Reviews
                      </ThemedText>
                      {placeDetails.reviews.map((review, index) => (
                        <View key={index} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <ThemedText type="defaultSemiBold" style={styles.reviewAuthor}>
                              {review.author}
                            </ThemedText>
                            <ThemedText style={styles.reviewRating}>
                              {'⭐'.repeat(review.rating)}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.reviewText}>
                            {review.text}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <ThemedText style={styles.modalNoData}>
                  No information available
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7fb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f7fb',
  },
  infoText: {
    marginTop: 12,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginBottom: 0,
    textAlign: 'center',
    fontSize: 16,
    color: '#4b5563',
    opacity: 0.9,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  selectedCountryBox: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#e6f6ec',
    borderWidth: 1,
    borderColor: '#c2e5d1',
  },
  selectedTitle: {
    fontSize: 20,
    marginBottom: 6,
    color: '#1f2937',
    fontWeight: '700',
  },
  selectedDetails: {
    fontSize: 15,
    color: '#4b5563',
    opacity: 0.9,
    marginBottom: 14,
    lineHeight: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  planButton: {
    flex: 1,
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  planButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  mapContainer: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mapTitle: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
  },
  closeMapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMapText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  map: {
    width: '100%',
    height: 300,
  },
  mapLoadingContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  mapErrorContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  mapErrorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  mapWebContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: 20,
  },
  mapWebText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
    textAlign: 'center',
  },
  mapWebDetails: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 6,
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  hintText: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
  noResults: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 20,
    fontSize: 14,
  },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 16,
    minHeight: 70,
  },
  countryCardSelected: {
    backgroundColor: '#f0f9f4',
    borderColor: '#0f766e',
    borderWidth: 2.5,
    shadowColor: '#0f766e',
    shadowOpacity: 0.2,
  },
  flag: {
    fontSize: 40,
    minWidth: 50,
  },
  countryTextContainer: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  countryDetails: {
    fontSize: 14,
    color: '#4b5563',
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 20,
  },
  localPlacesButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  localPlacesButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  nearbyPlacesContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nearbyPlacesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyPlacesTitle: {
    fontSize: 17,
    color: '#1f2937',
  },
  closePlacesButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePlacesText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  placeSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  placeSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    fontSize: 14,
  },
  searchPlaceButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  searchPlaceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  placesList: {
    maxHeight: 300,
  },
  placesLoader: {
    marginVertical: 20,
  },
  placeCard: {
    padding: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  placeCardSelected: {
    backgroundColor: '#f0f9f4',
    borderColor: '#0f766e',
    borderWidth: 2,
  },
  placeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  placeCardRight: {
    alignItems: 'flex-end',
  },
  placeName: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 4,
  },
  placeDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  placeDistance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: 2,
  },
  placeDistanceLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  filtersScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filtersScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  noPlacesText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 20,
    paddingVertical: 20,
  },
  routeInfoContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f9f4',
    borderWidth: 1,
    borderColor: '#c2e5d1',
  },
  routeInfoTitle: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  routeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  routeInfoItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  routeInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  routeInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f766e',
  },
  navigationStatus: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  remainingDistanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
    textAlign: 'center',
  },
  remainingTimeText: {
    fontSize: 14,
    color: '#3b82f6',
    textAlign: 'center',
  },
  navigationButton: {
    marginTop: 12,
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navigationButtonActive: {
    backgroundColor: '#ef4444',
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  travelModeContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  travelModeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  travelModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  travelModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  travelModeButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  travelModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  travelModeButtonTextActive: {
    color: 'white',
  },
  routeInfoItemActive: {
    backgroundColor: '#e6f6ec',
    borderWidth: 2,
    borderColor: '#0f766e',
  },
  routeInfoValueActive: {
    color: '#0f766e',
    fontSize: 18,
  },
  attractionsContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  attractionsTitle: {
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 4,
    fontWeight: '700',
  },
  attractionsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  attractionsList: {
    marginTop: 8,
  },
  attractionCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  attractionName: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 6,
    fontWeight: '600',
  },
  attractionDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  attractionsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  selectCityButton: {
    marginTop: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  selectCityButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCityHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
  },
  selectedCityTitle: {
    fontSize: 20,
    color: '#92400e',
    marginBottom: 4,
    fontWeight: '700',
  },
  selectedCityCountry: {
    fontSize: 14,
    color: '#a16207',
    opacity: 0.8,
  },
  planCityButton: {
    marginTop: 16,
    backgroundColor: '#1f9d55',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#1f9d55',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  planCityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cityAttractionsContainer: {
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cityAttractionsTitle: {
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 4,
    fontWeight: '700',
  },
  cityAttractionsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  cityAttractionsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  cityAttractionsList: {
    gap: 8,
  },
  cityAttractionCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginBottom: 8,
  },
  cityAttractionName: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    fontWeight: '600',
  },
  cityAttractionDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  modalSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalSectionTitle: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalSectionValue: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  modalLink: {
    color: '#0f766e',
    textDecorationLine: 'underline',
  },
  modalNoData: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    padding: 40,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthor: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  reviewRating: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1f9d55',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  photosContainer: {
    marginTop: 8,
  },
  photoItem: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});