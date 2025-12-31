// components/MapComponent.tsx
import React, { useRef } from 'react';
import { View, StyleSheet, Platform, Pressable, Linking } from 'react-native';
import { ThemedText } from './themed-text';

type Place = {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distance?: number;
};

type City = {
  name: string;
  latitude: number;
  longitude: number;
};

type MapComponentProps = {
  currentLocation: { latitude: number; longitude: number };
  destinationLocation?: { latitude: number; longitude: number };
  destinationName: string;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  nearbyPlaces?: Place[];
  selectedPlace?: Place | null;
  isNavigating?: boolean;
  countryCities?: City[];
  selectedCity?: City | null;
  onCitySelect?: (city: City) => void;
  onMapLongPress?: (coordinate: { latitude: number; longitude: number }) => void;

};

export default function MapComponent({
  currentLocation,
  destinationLocation,
  destinationName,
  routeCoordinates,
  nearbyPlaces = [],
  selectedPlace = null,
  isNavigating = false,
  countryCities = [],
  selectedCity = null,
  onCitySelect,
  onMapLongPress,
}: MapComponentProps) {
  // جميع Hooks يجب أن تكون في البداية قبل أي return
  const mapRef = useRef<any>(null);
  
  // على الأجهزة المحمولة، نحمل الخريطة ديناميكياً
  const [MapComponents, setMapComponents] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // تحميل الخريطة
  React.useEffect(() => {
    // على الويب، لا نحمل الخريطة
    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }
    
    const loadMap = async () => {
      try {
        console.log('Loading react-native-maps...');
        const Maps = await import('react-native-maps');
        console.log('Maps loaded successfully:', Maps);
        
        if (!Maps.default) {
          throw new Error('MapView component not found in react-native-maps');
        }
        
        setMapComponents({
          MapView: Maps.default,
          Marker: Maps.Marker,
          Polyline: Maps.Polyline,
          PROVIDER_GOOGLE: Maps.PROVIDER_GOOGLE,
        });
        console.log('Map components set successfully');
      } catch (err: any) {
        console.error('Error loading maps:', err);
        console.error('Error details:', {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        });
        // لا نضع MapComponents حتى يظهر رسالة الخطأ
      } finally {
        setLoading(false);
      }
    };

    loadMap();
  }, []);

  // تحديث الخريطة لمتابعة موقع المستخدم أثناء المتابعة
  React.useEffect(() => {
    if (isNavigating && mapRef.current && currentLocation && MapComponents) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [currentLocation, isNavigating, MapComponents]);

  // على الويب، نعرض معلومات بديلة
  if (Platform.OS === 'web') {
    return (
      <View style={styles.mapWebContainer}>
        <ThemedText style={styles.mapWebText}>
          الخريطة متاحة فقط على الأجهزة المحمولة
        </ThemedText>
        <ThemedText style={styles.mapWebDetails}>
          الموقع الحالي: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
        </ThemedText>
        {destinationLocation && (
          <ThemedText style={styles.mapWebDetails}>
            الوجهة ({destinationName}): {destinationLocation.latitude.toFixed(4)}, {destinationLocation.longitude.toFixed(4)}
          </ThemedText>
        )}
        {nearbyPlaces && nearbyPlaces.length > 0 && (
          <ThemedText style={styles.mapWebDetails}>
            الأماكن القريبة: {nearbyPlaces.length} مكان
          </ThemedText>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.mapLoadingContainer}>
        <ThemedText style={styles.mapLoadingText}>
          جاري تحميل الخريطة...
        </ThemedText>
      </View>
    );
  }

  if (!MapComponents) {
    // إنشاء رابط Google Maps كبديل
    const openGoogleMaps = () => {
      let url = '';
      if (destinationLocation) {
        // رابط من الموقع الحالي إلى الوجهة
        url = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${destinationLocation.latitude},${destinationLocation.longitude}`;
      } else {
        // رابط للموقع الحالي فقط
        url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      }
      Linking.openURL(url).catch(err => {
        console.error('Error opening Google Maps:', err);
      });
    };

    return (
      <View style={styles.mapErrorContainer}>
        <ThemedText style={styles.mapErrorText}>
          لم يتم تحميل الخريطة
        </ThemedText>
        <ThemedText style={styles.mapErrorSubtext}>
          الخريطة تحتاج إلى build مخصص. استخدم Expo Development Build أو EAS Build.
        </ThemedText>
        <ThemedText style={styles.mapErrorDetails}>
          الموقع الحالي: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
        </ThemedText>
        {destinationLocation && (
          <ThemedText style={styles.mapErrorDetails}>
            الوجهة: {destinationLocation.latitude.toFixed(4)}, {destinationLocation.longitude.toFixed(4)}
          </ThemedText>
        )}
        <Pressable style={styles.openMapsButton} onPress={openGoogleMaps}>
          <ThemedText style={styles.openMapsButtonText}>
            فتح Google Maps
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = MapComponents;

  // دوال التكبير والتصغير
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then((camera: any) => {
        mapRef.current.setCamera({
          ...camera,
          zoom: camera.zoom + 1,
        });
      });
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then((camera: any) => {
        mapRef.current.setCamera({
          ...camera,
          zoom: Math.max(1, camera.zoom - 1),
        });
      });
    }
  };

  // حساب المنطقة الأولية للخريطة
  const calculateInitialRegion = () => {
    // إذا كان هناك مدن، نركز عليها
    if (countryCities && countryCities.length > 0) {
      const allLats = countryCities.map(c => c.latitude);
      const allLons = countryCities.map(c => c.longitude);
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLon = Math.min(...allLons);
      const maxLon = Math.max(...allLons);
      
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 5),
        longitudeDelta: Math.max((maxLon - minLon) * 1.5, 5),
      };
    } else if (destinationLocation && currentLocation) {
      return {
        latitude: (currentLocation.latitude + destinationLocation.latitude) / 2,
        longitude: (currentLocation.longitude + destinationLocation.longitude) / 2,
        latitudeDelta: Math.abs(currentLocation.latitude - destinationLocation.latitude) * 1.5 + 10,
        longitudeDelta: Math.abs(currentLocation.longitude - destinationLocation.longitude) * 1.5 + 10,
      };
    } else if (nearbyPlaces && nearbyPlaces.length > 0 && currentLocation) {
      // إذا كان هناك أماكن قريبة، نركز على الموقع الحالي مع الأماكن القريبة
      const minLat = Math.min(...nearbyPlaces.map(p => p.latitude), currentLocation.latitude);
      const maxLat = Math.max(...nearbyPlaces.map(p => p.latitude), currentLocation.latitude);
      const minLon = Math.min(...nearbyPlaces.map(p => p.longitude), currentLocation.longitude);
      const maxLon = Math.max(...nearbyPlaces.map(p => p.longitude), currentLocation.longitude);
      
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta: (maxLat - minLat) * 1.5 + 0.1,
        longitudeDelta: (maxLon - minLon) * 1.5 + 0.1,
      };
    } else if (currentLocation) {
      // فقط الموقع الحالي
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    } else {
      // موقع افتراضي (وسط العالم)
      return {
        latitude: 20,
        longitude: 0,
        latitudeDelta: 50,
        longitudeDelta: 50,
      };
    }
  };

  return (
    <View style={styles.mapWrapper}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={calculateInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        zoomEnabled={true}
        zoomControlEnabled={false}
        followsUserLocation={isNavigating}
        userLocationPriority={isNavigating ? 'high' : 'balanced'}
        onLongPress={(e: any) => {
           const coord = e.nativeEvent.coordinate;
           onMapLongPress?.(coord);
         }}
      >
        {/* الموقع الحالي - فقط إذا كان موجوداً */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="موقعك الحالي"
            pinColor="#0f766e"
          />
        )}
        
        {/* الوجهة (إذا كانت موجودة) */}
        {destinationLocation && (
          <Marker
            coordinate={destinationLocation}
            title={destinationName}
            pinColor="#ef4444"
          />
        )}
        
        {/* الأماكن القريبة */}
        {nearbyPlaces && nearbyPlaces.map((place, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.type}
            pinColor={selectedPlace?.name === place.name ? "#f59e0b" : "#3b82f6"}
          />
        ))}
        
        {/* مدن الدولة */}
        {countryCities && countryCities.map((city, index) => (
          <Marker
            key={`city-${index}`}
            coordinate={{ latitude: city.latitude, longitude: city.longitude }}
            title={city.name}
            description="مدينة"
            pinColor={selectedCity?.name === city.name ? "#f59e0b" : "#10b981"}
            onPress={() => onCitySelect && onCitySelect(city)}
          />
        ))}
        
        {/* المسار */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0f766e"
            strokeWidth={3}
          />
        )}
      </MapView>
      
      {/* أزرار التكبير والتصغير */}
      <View style={styles.zoomControls}>
        <Pressable style={[styles.zoomButton, styles.zoomButtonFirst]} onPress={zoomIn}>
          <ThemedText style={styles.zoomButtonText}>+</ThemedText>
        </Pressable>
        <Pressable style={styles.zoomButton} onPress={zoomOut}>
          <ThemedText style={styles.zoomButtonText}>−</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  map: {
    width: '100%',
    height: 300,
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  zoomButtonFirst: {
    borderBottomWidth: 1,
  },
  zoomButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
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
    padding: 20,
  },
  mapErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  mapErrorSubtext: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  mapErrorDetails: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 4,
    textAlign: 'center',
  },
  openMapsButton: {
    marginTop: 16,
    backgroundColor: '#0f766e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  openMapsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

