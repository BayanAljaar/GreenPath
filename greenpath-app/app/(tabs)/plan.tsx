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
import { fetchCountries, Country } from '../../services/apiClient';
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
  } | null>(null);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('restaurant');
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ name: string; latitude: number; longitude: number }>>([]);
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

  // جلب الدول عند تحميل الصفحة
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCountries();
        setCountries(data);
      } catch (err: any) {
        console.error('Failed to fetch countries:', err);
        // معالجة أفضل للأخطاء
        if (err?.message?.includes('Network Error') || err?.code === 'ERR_NETWORK') {
          setError('لا يمكن الاتصال بالخادم. تأكد من أن الـ API server يعمل على المنفذ 4001.');
        } else {
          setError('حدث خلل في تحميل الدول. حاول مرة أخرى لاحقاً.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
          'إذن الموقع',
          'يجب السماح بالوصول إلى الموقع لعرض الخريطة'
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
      Alert.alert('خطأ', 'فشل في الحصول على الموقع الحالي');
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
      
      let walkingDistance = 0;
      let walkingDuration = 0;
      let drivingDistance = 0;
      let drivingDuration = 0;
      let routeCoordinates: Array<{ latitude: number; longitude: number }> = [];
      
      // معالجة نتيجة المسار مشياً
      if (walkingResponse.ok) {
        const walkingData = await walkingResponse.json();
        if (walkingData.routes && walkingData.routes.length > 0) {
          const route = walkingData.routes[0];
          if (route.summary) {
            walkingDistance = route.summary.distance / 1000; // تحويل من متر إلى كيلومتر
            walkingDuration = Math.round(route.summary.duration / 60); // تحويل من ثانية إلى دقيقة
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
            drivingDistance = route.summary.distance / 1000; // تحويل من متر إلى كيلومتر
            drivingDuration = Math.round(route.summary.duration / 60); // تحويل من ثانية إلى دقيقة
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
              walkingDistance = route.distance / 1000;
              walkingDuration = Math.round(route.duration / 60);
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
              drivingDistance = route.distance / 1000;
              drivingDuration = Math.round(route.duration / 60);
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
        walkingDuration = Math.round((distanceKm / 5) * 60); // 5 كم/ساعة
        drivingDuration = Math.round((distanceKm / 50) * 60); // 50 كم/ساعة
        
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
        finalWalkingDuration = Math.round((finalDistance / 5) * 60); // 5 كم/ساعة
      }
      
      // إذا لم نحصل على وقت بالسيارة، نستخدم تقدير
      if (finalDrivingDuration === 0) {
        finalDrivingDuration = Math.round((finalDistance / 50) * 60); // 50 كم/ساعة
      }
      
      // إذا كانت الأوقات متساوية (وهذا غير منطقي)، نعيد حسابها بناءً على المسافة
      if (finalWalkingDuration === finalDrivingDuration && finalDistance > 0) {
        console.log('Warning: Walking and driving durations are equal, recalculating...');
        finalWalkingDuration = Math.round((finalDistance / 5) * 60); // 5 كم/ساعة
        finalDrivingDuration = Math.round((finalDistance / 50) * 60); // 50 كم/ساعة
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
        durationWalking: Math.round((distanceKm / 5) * 60), // 5 كم/ساعة
        durationDriving: Math.round((distanceKm / 50) * 60), // 50 كم/ساعة
      });
    }
  };

  // البحث عن أماكن قريبة
  const searchNearbyPlaces = async (query: string = 'restaurant') => {
    if (!currentLocation) {
      Alert.alert('خطأ', 'يجب الحصول على الموقع الحالي أولاً');
      return;
    }

    try {
      setPlacesLoading(true);
      const { latitude, longitude } = currentLocation;
      
      // خريطة أنواع الأماكن إلى OSM tags
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
                          'مكان غير معروف';
              
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
            name: place.display_name.split(',')[0] || place.name || 'مكان غير معروف',
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
      Alert.alert('خطأ', 'فشل في البحث عن أماكن قريبة');
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
          name: p.display_name?.split(',')[0] || p.name || 'مكان',
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
    Alert.alert('خطأ', 'فشل في البحث بالاسم');
  } finally {
    setPlacesLoading(false);
  }
};

// Autocomplete: اقتراحات أثناء الكتابة (ضمن 2 كم)
const fetchPlaceSuggestions = async (text: string) => {
  if (!currentLocation) return;
  const q = text.trim();
  if (q.length < 2) {
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
    if (!res.ok) return;
    const data = await res.json();

    const sug = (data || []).map((p: any) => ({
      name: p.display_name?.split(',')[0] || p.name || 'اقتراح',
      latitude: parseFloat(p.lat),
      longitude: parseFloat(p.lon),
    }));

    setPlaceSuggestions(sug);
  } catch (err) {
    console.log('Suggestions error:', err);
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
  const startNavigation = async () => {
    if (!currentLocation || !destinationLocation) {
      Alert.alert('خطأ', 'يجب اختيار وجهة أولاً');
      return;
    }

    if (!routeInfo) {
      Alert.alert('خطأ', 'يجب حساب المسار أولاً');
      return;
    }

    try {
      // طلب إذن الموقع
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الموقع', 'يجب السماح بالوصول إلى الموقع لمتابعة المسار');
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
        (location) => {
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
            Alert.alert('🎉', 'وصلت إلى الوجهة!');
            stopNavigation();
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (err) {
      console.error('Error starting navigation:', err);
      Alert.alert('خطأ', 'فشل في بدء متابعة المسار');
      setIsNavigating(false);
    }
  };

  // إيقاف متابعة المسار
  const stopNavigation = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsNavigating(false);
    setRemainingDistance(null);
  };

  // جلب تفاصيل المكان من Google Places API
  const fetchPlaceDetails = async (place: {
    name: string;
    latitude: number;
    longitude: number;
    type: string;
  }) => {
    try {
      setPlaceDetailsLoading(true);
      
      // Google Places API Key - يمكن إضافته في ملف .env أو Constants
      // للحصول على API key: https://console.cloud.google.com/apis/credentials
      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY';
      
      // محاولة استخدام Google Places API أولاً
      if (GOOGLE_PLACES_API_KEY && GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY') {
        try {
          // 1. البحث عن المكان باستخدام Text Search
          const searchResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(place.name)}&location=${place.latitude},${place.longitude}&radius=100&key=${GOOGLE_PLACES_API_KEY}`
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            
            if (searchData.results && searchData.results.length > 0) {
              // استخدام أول نتيجة (الأقرب)
              const placeResult = searchData.results[0];
              const placeId = placeResult.place_id;
              
              // 2. جلب التفاصيل الكاملة باستخدام Place Details API
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,price_level,opening_hours,formatted_phone_number,formatted_address,website,photos,reviews,international_phone_number&key=${GOOGLE_PLACES_API_KEY}`
              );
              
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                
                if (detailsData.result) {
                  const result = detailsData.result;
                  
                  // استخراج أوقات العمل
                  const openingHours: string[] = [];
                  if (result.opening_hours && result.opening_hours.weekday_text) {
                    openingHours.push(...result.opening_hours.weekday_text);
                  }
                  
                  // استخراج الصور
                  const photos: string[] = [];
                  if (result.photos && result.photos.length > 0) {
                    result.photos.slice(0, 3).forEach((photo: any) => {
                      photos.push(
                        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
                      );
                    });
                  }
                  
                  // استخراج التقييمات
                  const reviews: Array<{ author: string; rating: number; text: string }> = [];
                  if (result.reviews && result.reviews.length > 0) {
                    result.reviews.slice(0, 5).forEach((review: any) => {
                      reviews.push({
                        author: review.author_name || 'مستخدم',
                        rating: review.rating || 0,
                        text: review.text || '',
                      });
                    });
                  }
                  
                  setPlaceDetails({
                    name: result.name || place.name,
                    rating: result.rating,
                    priceLevel: result.price_level, // 0-4 (0 = مجاني، 4 = غالي جداً)
                    openingHours: openingHours,
                    phone: result.formatted_phone_number || result.international_phone_number || '',
                    address: result.formatted_address || '',
                    website: result.website || '',
                    photos: photos,
                    reviews: reviews,
                  });
                  setShowPlaceDetails(true);
                  setPlaceDetailsLoading(false);
                  return;
                }
              }
            }
          }
        } catch (googleErr) {
          console.log('Google Places API error:', googleErr);
          // نستمر إلى Fallback APIs
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
    name: '📍 نقطة مختارة من الخريطة',
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

  // اختيار مكان والذهاب إليه
  const handleSelectPlace = async (place: {
    name: string;
    latitude: number;
    longitude: number;
    type: string;
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
      Alert.alert('خطأ', 'لم يتم العثور على إحداثيات الدولة');
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
          { name: 'آيا صوفيا', emoji: '🕌', desc: 'مسجد تاريخي عظيم في إسطنبول - تحفة معمارية بيزنطية' },
          { name: 'قصر توبكابي', emoji: '🏰', desc: 'قصر السلاطين العثمانيين - متحف تاريخي رائع' },
          { name: 'كابادوكيا', emoji: '🎈', desc: 'منطقة طبيعية ساحرة - رحلات بالمنطاد' },
          { name: 'البازار الكبير', emoji: '🛍️', desc: 'أكبر سوق مغطى في العالم - تسوق تقليدي' },
          { name: 'البوسفور', emoji: '⛴️', desc: 'مضيق يفصل بين أوروبا وآسيا - رحلات بحرية' },
          { name: 'أنطاليا', emoji: '🏖️', desc: 'مدينة ساحلية جميلة - شواطئ رائعة' },
        ],
        'Israel': [
          { name: 'حائط البراق', emoji: '🕍', desc: 'أقدس موقع يهودي - تاريخ ديني عريق' },
          { name: 'البحر الميت', emoji: '🏖️', desc: 'أدنى نقطة على الأرض - تجربة فريدة' },
          { name: 'تل أبيب', emoji: '🌆', desc: 'مدينة ساحلية نابضة بالحياة - ثقافة حديثة' },
          { name: 'القدس', emoji: '⛪', desc: 'مدينة مقدسة - تاريخ وثقافة غنية' },
          { name: 'البحر الأحمر', emoji: '🐠', desc: 'غوص رائع - عالم بحري خلاب' },
          { name: 'جبل الزيتون', emoji: '⛰️', desc: 'منظر بانورامي رائع - تاريخ ديني' },
        ],
        'Greece': [
          { name: 'الأكروبوليس', emoji: '🏛️', desc: 'معبد أثينا - رمز الحضارة اليونانية' },
          { name: 'جزيرة سانتوريني', emoji: '🏝️', desc: 'جزيرة ساحرة - غروب شمس لا يُنسى' },
          { name: 'متحف الأكروبوليس', emoji: '🎭', desc: 'كنوز أثرية - تاريخ عريق' },
          { name: 'ميكونوس', emoji: '🌊', desc: 'جزيرة حفلات - حياة ليلية ممتعة' },
          { name: 'أوليمبيا', emoji: '🏟️', desc: 'موطن الألعاب الأولمبية - تاريخ رياضي' },
          { name: 'دلفي', emoji: '🔮', desc: 'موقع أثري مقدس - أساطير يونانية' },
        ],
        'Italy': [
          { name: 'الكولوسيوم', emoji: '🏛️', desc: 'مدرج روماني عظيم - معلم تاريخي شهير' },
          { name: 'برج بيزا المائل', emoji: '🗼', desc: 'معجزة معمارية - تحفة فنية' },
          { name: 'البندقية', emoji: '🚤', desc: 'مدينة على الماء - رومانسية فريدة' },
          { name: 'روما', emoji: '🏛️', desc: 'مدينة الخالدة - تاريخ وثقافة غنية' },
          { name: 'فلورنسا', emoji: '🎨', desc: 'مهد عصر النهضة - فن وثقافة' },
          { name: 'البومبي', emoji: '🌋', desc: 'مدينة أثرية - تاريخ محفوظ' },
        ],
        'France': [
          { name: 'برج إيفل', emoji: '🗼', desc: 'رمز باريس - منظر بانورامي رائع' },
          { name: 'متحف اللوفر', emoji: '🎨', desc: 'أكبر متحف في العالم - كنوز فنية' },
          { name: 'قصر فرساي', emoji: '🏰', desc: 'قصر ملكي فاخر - تاريخ ملكي' },
          { name: 'نوتردام', emoji: '⛪', desc: 'كاتدرائية قوطية - تحفة معمارية' },
          { name: 'شامب إليزيه', emoji: '🛍️', desc: 'أشهر شارع في باريس - تسوق راقي' },
          { name: 'مونت سان ميشيل', emoji: '🏰', desc: 'جزيرة دينية - معلم ساحر' },
        ],
        'Spain': [
          { name: 'قصر الحمراء', emoji: '🏰', desc: 'قصر أندلسي في غرناطة - فن إسلامي' },
          { name: 'ساغرادا فاميليا', emoji: '⛪', desc: 'كنيسة في برشلونة - تحفة غاودي' },
          { name: 'متحف برادو', emoji: '🎨', desc: 'متحف فني في مدريد - لوحات عظيمة' },
          { name: 'إشبيلية', emoji: '🎭', desc: 'موطن الفلامنكو - ثقافة أندلسية' },
          { name: 'جزر الكناري', emoji: '🏝️', desc: 'جزر استوائية - شواطئ رائعة' },
          { name: 'بلنسية', emoji: '🍊', desc: 'مدينة برتقالية - فنون وعلوم' },
        ],
        'Jordan': [
          { name: 'البتراء', emoji: '🏛️', desc: 'مدينة وردية منحوتة في الصخر - عجائب الدنيا' },
          { name: 'البحر الميت', emoji: '🏖️', desc: 'أدنى نقطة على الأرض - طين علاجي' },
          { name: 'وادي رم', emoji: '🏜️', desc: 'صحراء حمراء - مناظر خلابة' },
          { name: 'عمان', emoji: '🏙️', desc: 'عاصمة حديثة - تاريخ وثقافة' },
          { name: 'جرش', emoji: '🏛️', desc: 'مدينة رومانية - آثار محفوظة' },
        ],
        'Egypt': [
          { name: 'أهرامات الجيزة', emoji: '🔺', desc: 'عجائب الدنيا السبع - تاريخ فرعوني' },
          { name: 'أبو الهول', emoji: '🦁', desc: 'تمثال عظيم - رمز الحضارة' },
          { name: 'معبد الكرنك', emoji: '🏛️', desc: 'مجمع معابد - تاريخ عريق' },
          { name: 'نهر النيل', emoji: '⛴️', desc: 'أطول نهر في العالم - رحلات بحرية' },
          { name: 'الأقصر', emoji: '🏛️', desc: 'مدينة المعابد - آثار فرعونية' },
        ],
        'Morocco': [
          { name: 'مراكش', emoji: '🏰', desc: 'المدينة الحمراء - سوق وثقافة' },
          { name: 'فاس', emoji: '🕌', desc: 'مدينة إسلامية قديمة - تاريخ عريق' },
          { name: 'الصحراء الكبرى', emoji: '🏜️', desc: 'صحراء شاسعة - رحلات جمال' },
          { name: 'الدار البيضاء', emoji: '🌆', desc: 'مدينة حديثة - فن معماري' },
        ],
        'United Arab Emirates': [
          { name: 'برج خليفة', emoji: '🏗️', desc: 'أطول برج في العالم - دبي' },
          { name: 'برج العرب', emoji: '⛵', desc: 'فندق فاخر - رفاهية عالية' },
          { name: 'جزيرة النخيل', emoji: '🌴', desc: 'جزيرة اصطناعية - إبداع معماري' },
          { name: 'أبوظبي', emoji: '🏛️', desc: 'عاصمة ثقافية - متاحف عالمية' },
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
            name: 'معالم تاريخية',
            emoji: '🏛️',
            desc: `استكشف المواقع التاريخية والثقافية في ${countryName}`,
          },
          {
            name: 'فنادق فاخرة',
            emoji: '🏨',
            desc: `اكتشف أفضل الفنادق والمنتجعات في ${countryName}`,
          },
          {
            name: 'مطاعم محلية',
            emoji: '🍽️',
            desc: `تذوق الأطباق المحلية الشهية في ${countryName}`,
          },
          {
            name: 'طبيعة خلابة',
            emoji: '🌳',
            desc: `استمتع بالمناظر الطبيعية في ${countryName}`,
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
          name: `🏨 فنادق في ${countryName}`,
          type: 'hotel',
          description: `اكتشف أفضل الفنادق والمنتجعات`,
        },
        {
          name: `🏛️ معالم تاريخية`,
          type: 'landmark',
          description: `استكشف المواقع التاريخية والثقافية`,
        },
        {
          name: `🍽️ مطاعم محلية`,
          type: 'restaurant',
          description: `تذوق الأطباق المحلية الشهية`,
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
                    desc = parts.length > 1 ? `${parts[1].trim()}` : `معلم سياحي مميز في ${cityName}`;
                  } else {
                    desc = `مكان مميز في ${cityName}`;
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
            name: '🏛️ معالم تاريخية',
            type: 'landmark',
            description: `استكشف المواقع التاريخية العريقة في ${cityName}`,
          },
          {
            name: '🏨 فنادق فاخرة',
            type: 'hotel',
            description: `اكتشف أفضل الفنادق والإقامة في ${cityName}`,
          },
          {
            name: '🍽️ مطاعم محلية',
            type: 'restaurant',
            description: `تذوق الأطباق المحلية الشهية في ${cityName}`,
          },
          {
            name: '🎭 ثقافة وفنون',
            type: 'tourism',
            description: `استمتع بالثقافة والفنون في ${cityName}`,
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
        <ThemedText style={styles.infoText}>جاري تحميل الدول... 🌍</ThemedText>
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
            תכנון טיול חדש 🌿
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            ابحث عن دولة أو منطقة لبدء التخطيط لرحلتك الخضراء
          </ThemedText>
        </View>

        {/* زر الأماكن القريبة */}
        <Pressable
          style={styles.localPlacesButton}
          onPress={handleShowLocalMap}
        >
          <ThemedText style={styles.localPlacesButtonText}>
            🗺️ اكتشف أماكن قريبة منك (مطاعم، معالم، إلخ)
          </ThemedText>
        </Pressable>

        {/* البحث عن أماكن قريبة */}
        {showNearbyPlaces && (
          <View style={styles.nearbyPlacesContainer}>
            <View style={styles.nearbyPlacesHeader}>
              <ThemedText type="defaultSemiBold" style={styles.nearbyPlacesTitle}>
                أماكن قريبة منك
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
              <ThemedText style={styles.filtersLabel}>فلتر سريع:</ThemedText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersScrollContent}
              >
                {[
                  { key: 'restaurant', label: '🍽️ مطعم', query: 'restaurant' },
                  { key: 'cafe', label: '☕ مقهى', query: 'cafe' },
                  { key: 'hotel', label: '🏨 فندق', query: 'hotel' },
                  { key: 'museum', label: '🏛️ متحف', query: 'museum' },
                  { key: 'pharmacy', label: '💊 صيدلية', query: 'pharmacy' },
                  { key: 'bank', label: '🏦 بنك', query: 'bank' },
                  { key: 'gas_station', label: '⛽ محطة وقود', query: 'fuel' },
                  { key: 'hospital', label: '🏥 مستشفى', query: 'hospital' },
                  { key: 'park', label: '🌳 حديقة', query: 'park' },
                  { key: 'shopping', label: '🛍️ تسوق', query: 'shopping' },
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
                placeholder="ابحث عن مكان محدد..."
                value={placeSearchQuery}
                onChangeText={(t) => {
                setPlaceSearchQuery(t);
                // Debounce for suggestions
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  fetchPlaceSuggestions(t);
                }, 350);
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
                  {placesLoading ? '...' : 'بحث'}
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
    {placeSuggestions.map((s, idx) => (
      <Pressable
        key={`${s.name}-${idx}`}
        style={{
          padding: 12,
          borderBottomWidth: idx === placeSuggestions.length - 1 ? 0 : 1,
          borderBottomColor: '#f3f4f6',
        }}
        onPress={() => {
          setPlaceSearchQuery(s.name);
          setPlaceSuggestions([]);
          handleSelectPlace({
            name: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            type: 'search',
          });
        }}
      >
        <ThemedText>{s.name}</ThemedText>
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
                            ? `${Math.round(place.distance * 1000)} م` 
                            : place.distance 
                              ? `${place.distance.toFixed(1)} كم`
                              : '—'}
                        </ThemedText>
                        <ThemedText style={styles.placeDistanceLabel}>
                          {place.distance && place.distance < 1 ? 'متر' : 'كيلومتر'}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <ThemedText style={styles.noPlacesText}>
                لم يتم العثور على أماكن. جرب البحث بكلمات مختلفة.
              </ThemedText>
            )}
          </View>
        )}

        {/* خانة البحث - نخفيها عند عرض الأماكن القريبة */}
        {!showNearbyPlaces && (
          <TextInput
            placeholder="ابحث عن دولة أو منطقة (مثال: تركيا، إسرائيل، اليونان...)"
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
                    {locationLoading ? 'جاري التحميل...' : 'عرض الخريطة 🗺️'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.planButton}
                  onPress={handlePlanTrip}
                >
                  <ThemedText style={styles.planButtonText}>
                    بدء التخطيط 🧭
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
                  {citiesLoading ? 'جاري التحميل...' : '🏙️ هل تريد الذهاب إلى مدينة معينة في هذه الدولة؟'}
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
                  ✨ لماذا تسافر إلى {selectedCountry.name}؟
                </ThemedText>
                <ThemedText style={styles.attractionsSubtitle}>
                  اكتشف ما يجعل هذه الوجهة مميزة
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
                الخريطة: {showCitiesMap && selectedCountry
                  ? `مدن ${selectedCountry.name}`
                  : selectedCountry 
                    ? `من موقعك إلى ${selectedCountry.name}`
                    : showNearbyPlaces 
                      ? 'الأماكن القريبة منك'
                      : 'الخريطة'}
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
                  {citiesLoading ? 'جاري تحميل المدن...' : 'جاري تحميل الخريطة...'}
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
                  destinationName={selectedCity?.name || selectedCountry?.name || selectedPlace?.name || 'اختر مكاناً'}
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
                    {cityAttractionsLoading ? (
                      <>
                        <ActivityIndicator size="small" />
                        <ThemedText style={styles.cityAttractionsLoadingText}>
                          جاري تحميل المعلومات...
                        </ThemedText>
                      </>
                    ) : cityAttractions.length > 0 ? (
                      <>
                        <ThemedText type="defaultSemiBold" style={styles.cityAttractionsTitle}>
                          ✨ لماذا تسافر إلى {selectedCity.name}؟
                        </ThemedText>
                        <ThemedText style={styles.cityAttractionsSubtitle}>
                          اكتشف ما يجعل هذه المدينة مميزة
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
                    ) : null}
                  </View>
                )}
                
                {/* اختيار طريقة التنقل - فقط للأماكن القريبة */}
                {selectedPlace && (
                  <View style={styles.travelModeContainer}>
                    <ThemedText style={styles.travelModeLabel}>طريقة التنقل:</ThemedText>
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
                          🚶 مشياً
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
                          🚗 بالسيارة
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
                        ? `جاري المتابعة... ${travelMode === 'walking' ? '🚶' : '🚗'}` 
                        : 'معلومات المسار'}
                    </ThemedText>
                    
                    {/* المسافة المتبقية أثناء المتابعة */}
                    {isNavigating && remainingDistance !== null && routeInfo && (
                      <View style={styles.navigationStatus}>
                        <ThemedText style={styles.remainingDistanceText}>
                          المسافة المتبقية: {remainingDistance < 1 
                            ? `${Math.round(remainingDistance * 1000)} متر` 
                            : `${Math.round(remainingDistance * 10) / 10} كم`}
                        </ThemedText>
                        <ThemedText style={styles.remainingTimeText}>
                          الوقت المتوقع: {
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
                              
                              return `${estimatedTime} دقيقة`;
                            })()
                          }
                        </ThemedText>
                      </View>
                    )}
                    
                    <View style={styles.routeInfoRow}>
                      <View style={styles.routeInfoItem}>
                        <ThemedText style={styles.routeInfoLabel}>المسافة</ThemedText>
                        <ThemedText style={styles.routeInfoValue}>
                          {routeInfo.distance} كم
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.routeInfoItem,
                        travelMode === 'walking' && styles.routeInfoItemActive,
                      ]}>
                        <ThemedText style={styles.routeInfoLabel}>⏱️ مشياً</ThemedText>
                        <ThemedText style={[
                          styles.routeInfoValue,
                          travelMode === 'walking' && styles.routeInfoValueActive,
                        ]}>
                          {routeInfo.durationWalking} دقيقة
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.routeInfoItem,
                        travelMode === 'driving' && styles.routeInfoItemActive,
                      ]}>
                        <ThemedText style={styles.routeInfoLabel}>🚗 بالسيارة</ThemedText>
                        <ThemedText style={[
                          styles.routeInfoValue,
                          travelMode === 'driving' && styles.routeInfoValueActive,
                        ]}>
                          {routeInfo.durationDriving} دقيقة
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
                          ? '⏹️ إيقاف المتابعة' 
                          : travelMode === 'walking' 
                            ? '🚶 بدء المتابعة مشياً' 
                            : '🚗 بدء المتابعة بالسيارة'}
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.mapErrorContainer}>
                <ThemedText style={styles.mapErrorText}>
                  لم يتم العثور على الموقع
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* قائمة الدول المفلترة - نخفيها عند عرض الأماكن القريبة */}
        {!showNearbyPlaces && (
          <>
            {search.length > 0 && (
              <ThemedText style={styles.sectionLabel}>
                نتائج البحث ({filtered.length})
              </ThemedText>
            )}

            {filtered.length === 0 && search.length > 0 ? (
              <ThemedText style={styles.noResults}>
                لم يتم العثور على نتائج للبحث "{search}"
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

            {/* إذا لم يكن هناك بحث، نعرض بعض الدول المقترحة */}
            {search.length === 0 && (
              <>
                <ThemedText style={styles.sectionLabel}>
                  ابدأ بالبحث عن دولة أو منطقة
                </ThemedText>
                <ThemedText style={styles.hintText}>
                  اكتب اسم الدولة أو الكود (مثل: TR, IL, GR) أو المنطقة (مثل: Europe, Asia)
                </ThemedText>
              </>
            )}
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
                {placeDetails?.name || 'تفاصيل المكان'}
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
                    جاري تحميل التفاصيل...
                  </ThemedText>
                </View>
              ) : placeDetails ? (
                <>
                  {/* التقييم */}
                  {placeDetails.rating !== undefined && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        ⭐ التقييم
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
                        💰 مستوى الأسعار
                      </ThemedText>
                      <ThemedText style={styles.modalSectionValue}>
                        {'$'.repeat(placeDetails.priceLevel)} ({placeDetails.priceLevel === 1 ? 'رخيص' : placeDetails.priceLevel === 2 ? 'متوسط' : placeDetails.priceLevel === 3 ? 'غالي' : 'فاخر'})
                      </ThemedText>
                    </View>
                  )}
                  
                  {/* العنوان */}
                  {placeDetails.address && (
                    <View style={styles.modalSection}>
                      <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                        📍 العنوان
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
                        📞 الهاتف
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
                        🌐 الموقع الإلكتروني
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
                        🕐 أوقات العمل
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
                        💬 التقييمات
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
                  لا توجد معلومات متاحة
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