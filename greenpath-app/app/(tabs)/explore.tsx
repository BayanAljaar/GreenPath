import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Modal, 
  TextInput, ScrollView, Alert, Dimensions, ActivityIndicator, Share 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../UserContext';
// إضافات ضرورية للربط مع السيرفر
import * as ImageManipulator from 'expo-image-manipulator';
import { createPost, fetchAllPosts,deletePost  } from '../../services/apiClient'; // ⬅️ أضيفي هذا السطر هنا 

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2 - 15;

export default function ExploreScreen() {
  const { user } = useUser();
  const mapRef = useRef<MapView>(null);

  // حالات البيانات والفلترة
  const [posts, setPosts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); // حالة التحميل من السيرفر
  const [exploreMode, setExploreMode] = useState<'all' | 'mine'>('all'); 
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(["Nature", "Hotels", "Museums"]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // حالات الرفع والموقع
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [newPostComment, setNewPostComment] = useState('');
  const [newPostRating, setNewPostRating] = useState(0);
  const [newPostLocationName, setNewPostLocationName] = useState(''); 
  const [showMap, setShowMap] = useState(false);
  const [mapSearch, setMapSearch] = useState(''); 
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // حالة عرض الصورة المكبرة
  const [selectedPostForView, setSelectedPostForView] = useState<any>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  const [markerRegion, setMarkerRegion] = useState({
    latitude: 31.9631, longitude: 35.9304,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  // --- 1. جلب البيانات من السيرفر عند فتح الصفحة ---
  const loadPostsFromServer = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPosts();
      //now   setPosts(data);
      setPosts(Array.isArray(data) ? data : (data.posts || []));
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostsFromServer();
  }, []);
  // منطق المشاركة
 {/*
  const handleShare = async (post: any) => {
    try {
      await Share.share({
        message: `شاهد هذا المكان الرائع: ${post.location}\nالتقييم: ${post.rating}/5\n${post.comment}`,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };*/}
  const handleShare = async (post: any) => {
  try {
      // تجهيز الرابط الدعائي
      const appLink = "https://greenpath-app.com/download"; 
      
      // تجهيز الرسالة النصية
      const message = `
  🌟 Discover new places with GreenPath!
  📍 Lacation: ${post.location}
  📝 Review: ${post.comment}
  ⭐ Rating: ${post.rating}/5

  Your journey starts here - Download the app today: 
  ${appLink}
      `;

    // نظام المشاركة
    const result = await Share.share({
      message: message,
      title: ' Sharing GreenPath',
      // ملاحظة: مشاركة الصور المباشرة (Base64) عبر Share.share محدودة في بعض الأنظمة
      // يفضل غالباً مشاركة النص والرابط، وإذا أردتِ مشاركة الصورة كملف تحتاجي مكتبة مثل react-native-share
    });

    if (result.action === Share.sharedAction) {
      console.log("Done! Your Image was Shared...");
    }
  } catch (error: any) {
    Alert.alert("Unable to share image. Try again later!", error.message);  
  }
};

  // منطق الفلترة والبحث
  useEffect(() => {
    //now      let result = posts;
    let result = [...posts];
    if (exploreMode === 'mine') {
      // MongoDB تستخدم غالباً userId كـ String، تأكدي من المقارنة بدقة
      result = result.filter(p => String(p.userId) === String(user?.id));

    }
    if (activeFilter) {
      result = result.filter(p => p.category === activeFilter);
    }
    if (searchQuery) {
      result = result.filter(p => 
        (p.comment || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.location || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredPosts(result);
  }, [posts, exploreMode, activeFilter, searchQuery, user]);

  const getAddressFromCoords = async (lat: number, lon: number) => {
    try {
      let response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (response.length > 0) {
        let item = response[0];
        return `${item.city || item.region || ''}, ${item.street || item.name || ''}`;
      }
      return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    } catch (e) { return `${lat.toFixed(3)}, ${lon.toFixed(3)}`; }
  };

  // --- 2. دالة النشر المعدلة لحفظ الصور بشكل صحيح ---
  const handlePublish = async () => {
    if (!user) return Alert.alert("", "Please log in to Continue!");
    if (!newPostLocationName) return Alert.alert("Location Required", "Select a location before publishing your post");
    if (newPostRating === 0) return Alert.alert("Rating Required", "Please provide a star rating");
    if (selectedImages.length === 0) return Alert.alert("Image required", "Upload at least one image to continue...");
    
    try {
      setIsSearchingMap(true); // استخدام هذه الحالة كـ Loading مؤقت للرفع

      
      // أ. معالجة الصور: تصغير العرض لـ 600px وضغط الجودة لـ 60% لتقليل حجم الـ Base64
      const processedImages = await Promise.all(
        selectedImages.map(async (uri) => {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 500 } }], 
            { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          return `data:image/jpeg;base64,${manipResult.base64}`;
        })
      );

      // ب. تجهيز البيانات للسيرفر
      const payload = {
        userId: user.id,
        userName: user.userName || user.fullName,
        userImage: user.profilePicture || "",
        images: processedImages, // الصور أصبحت نصوص Base64 الآن
        location: newPostLocationName,
        comment: newPostComment,
        rating: newPostRating,
        category: activeFilter || "General"
      };

   
      // ج. الإرسال لقاعدة البيانات  
       await createPost(payload);
     

        Alert.alert("Posted Saved!");

        // د. تنظيف الحقول وإغلاق المودال       
       setIsUploadModalVisible(false);
        setNewPostLocationName('');
        setSelectedImages([]);
        setNewPostComment('');
        setNewPostRating(0);
        
        // هـ. إعادة تحميل البيانات من السيرفر لرؤية المنشور الجديد
       loadPostsFromServer();
      

    } catch (error: any){
      if (error.response) {
        // السيرفر رد ولكن بحالة خطأ (مثل 404 أو 500)
        console.error("Server Error Data:", error.response.data);
        Alert.alert("Server Error", `Server returned an error || Link not found : ${error.response.status}`);
      } else if (error.request) {
        // لم يتم تلقي رد (مشكلة شبكة أو حجم بيانات ضخم)
        Alert.alert("Connection Error", "No response received from the server . Please check your internet connection or try to upload smaller images.");
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  const navigateToPlace = async () => {
    if (mapSearch.trim() === "") return;
    setIsSearchingMap(true);
    try {
      let result = await Location.geocodeAsync(mapSearch);
      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        const newReg = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setMarkerRegion(newReg);
        mapRef.current?.animateToRegion(newReg, 1500);
      }
    } finally { setIsSearchingMap(false); }
  };

  const StarRating = ({ rating, size = 20, interactive = false }: any) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            disabled={!interactive} 
            onPress={() => interactive && setNewPostRating(star)}
          >
            <Ionicons 
              name={star <= (interactive ? newPostRating : rating) ? "star" : "star-outline"} 
              size={size} 
              color="#FFD700" 
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  //ExploreScreen
  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "", // تم حذف العنوان هنا
      "Are you sure you want to permanently delete this post?",
      [
        { text: "Cancel", 
           style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deletePost(postId);
              Alert.alert("The post has been deleted successfully.");
              setIsViewModalVisible(false); // إغلاق المودال
              loadPostsFromServer(); // تحديث القائمة
            } catch (error) {
              Alert.alert("Error", "Failed to delete the post. Please try again.");
            }
          } 
        }
      ]
    );
  };

  // شاشة انتظار عند فتح الصفحة
  if (loading && posts.length === 0) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity style={[styles.tabBtn, exploreMode === 'all' && styles.activeTabBtn]} onPress={() => setExploreMode('all')}>
          <Text style={[styles.tabText, exploreMode === 'all' && styles.activeTabText]}>Explore</Text>
        </TouchableOpacity>
        {user && (
          <TouchableOpacity style={[styles.tabBtn, exploreMode === 'mine' && styles.activeTabBtn]} onPress={() => setExploreMode('mine')}>
            <Text style={[styles.tabText, exploreMode === 'mine' && styles.activeTabText]}>My Posts</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsList}>
        <TouchableOpacity style={[styles.tag, !activeFilter && styles.activeTag]} onPress={() => setActiveFilter(null)}>
          <Text style={styles.tagText}>All</Text>
        </TouchableOpacity>
        {dynamicCategories.map((c, i) => (
          <TouchableOpacity key={i} style={[styles.tag, activeFilter === c && styles.activeTag]} onPress={() => setActiveFilter(c)}>
            <Text style={styles.tagText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredPosts}
        numColumns={2}
        keyExtractor={(item) => item._id || item.id|| Math.random().toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.gridItem} onPress={() => { setSelectedPostForView(item); setIsViewModalVisible(true); }}>
            <Image source={{ uri: (item.images && item.images[0]) ? item.images[0] : 'https://via.placeholder.com/150' }} 
              style={styles.img} />
            
            <View style={styles.gridRating}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.gridRatingText}>{item.rating}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ?
          <ActivityIndicator size="small" color="#00C853" style={{marginTop: 20}} /> :
        <Text style={styles.emptyText}>{exploreMode === 'mine' ? "You haven't posted anything yet." : "No posts found."}</Text>}
          onRefresh={loadPostsFromServer} // إضافة خاصية السحب للتحديث
        refreshing={loading}
    />

      {user && (
        <TouchableOpacity style={styles.fab} onPress={async () => {
          let res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
          if (!res.canceled) { setSelectedImages(res.assets.map(a => a.uri)); setIsUploadModalVisible(true); }
        }}>
          <Ionicons name="camera" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* مودال العرض */}
      <Modal visible={isViewModalVisible} transparent={true} animationType="fade">
        <View style={styles.fullViewContainer}>
          <TouchableOpacity style={styles.closeViewBtn} onPress={() => setIsViewModalVisible(false)}>
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
          {selectedPostForView && (
            <View style={styles.fullPostContent}>
              <Image source={{ uri: selectedPostForView.images[0] }} style={styles.fullImg} resizeMode="contain" />
              <View style={styles.postDetailsBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#00C853" />
                    <Text style={styles.detailLocText}>{selectedPostForView.location}</Text>
                  </View>
                  {/* قسم الأزرار (مشاركة + حذف) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    {/* زر المشاركة */}
                  <TouchableOpacity onPress={() => handleShare(selectedPostForView)}>
                    <Ionicons name="share-social" size={24} color="#00C853" />
                  </TouchableOpacity>
                  {/* زر الحذف - يظهر فقط إذا كان المستخدم هو صاحب المنشور */}
                    {user && String(selectedPostForView.userId) === String(user.id) && (
                      <TouchableOpacity onPress={() => handleDeletePost(selectedPostForView._id)}>
                        <Ionicons name="trash-outline" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    )}
                </View>
                </View>
                <StarRating rating={selectedPostForView.rating} size={24} />
                <Text style={styles.detailCommentText}>{selectedPostForView.comment}</Text>
                <Text style={{color: '#888', fontSize: 12, marginTop: 10}}>Posted by: {selectedPostForView.userName || "Guest"}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* مودال الرفع */}
      <Modal visible={isUploadModalVisible} animationType="slide">
        <View style={styles.modalBody}>
          {isSearchingMap && (
             <View style={{position:'absolute', top: 100, zIndex: 10, alignItems: 'center'}}>
                <ActivityIndicator size="large" color="#00C853" />
                <Text>Uploading to Database...</Text>
             </View>
          )}
          <Text style={styles.modalTitle}>New Post</Text>
          <Text style={styles.ratingLabel}>Rate this place:</Text>
          <StarRating interactive={true} size={40} />
          <TextInput style={styles.textArea} placeholder="What's on your mind?" multiline value={newPostComment} onChangeText={setNewPostComment} />
          <TouchableOpacity style={styles.locSelector} onPress={() => setShowMap(true)}>
            <Ionicons name="location" size={22} color="#00C853" />
            <Text style={styles.locText}>{newPostLocationName || "Select Location on Map"}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
             style={[styles.pubButton, isSearchingMap && {backgroundColor: '#ccc'}]} 
             onPress={handlePublish} 
             disabled={isSearchingMap}
          >
            <Text style={styles.pubText}>Publish</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsUploadModalVisible(false)} style={{marginTop: 15}}><Text style={{color: 'red'}}>Cancel</Text></TouchableOpacity>
        </View>

        <Modal visible={showMap} animationType="fade">
          <View style={{ flex: 1 }}>
            <View style={styles.mapSearchBox}>
              <TextInput style={styles.mapInput} placeholder="Search..." value={mapSearch} onChangeText={setMapSearch} onSubmitEditing={navigateToPlace} />
              <TouchableOpacity onPress={navigateToPlace} style={{padding:10}}><Ionicons name="paper-plane" size={22} color="#00C853" /></TouchableOpacity>
            </View>
            <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={markerRegion} onPress={(e) => setMarkerRegion({ ...markerRegion, ...e.nativeEvent.coordinate })}>
              <Marker coordinate={markerRegion} />
            </MapView>
            <View style={styles.mapFooter}>
              <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
                const name = await getAddressFromCoords(markerRegion.latitude, markerRegion.longitude);
                setNewPostLocationName(name);
                setShowMap(false);
              }}>
                <Text style={styles.pubText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

// ... الـ Styles تبقى كما هي تماماً بدون أي تعديل ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingHorizontal: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 25, padding: 12 },
  searchInput: { flex: 1, color: 'white', marginLeft: 10, textAlign: 'right' },
  tabSwitcher: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 15, marginBottom: 5 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#333' },
  activeTabBtn: { borderBottomColor: '#00C853' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#00C853' },
  catsList: { maxHeight: 50, marginVertical: 10, paddingLeft: 15 },
  tag: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  activeTag: { backgroundColor: '#00C853' },
  tagText: { color: 'white', fontWeight: 'bold' },
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, margin: 5, borderRadius: 15, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  gridRating: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' },
  gridRatingText: { color: '#fff', fontSize: 10, marginLeft: 2, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#00C853', width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 50, fontSize: 16 },
  fullViewContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeViewBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
  fullPostContent: { width: width, alignItems: 'center' },
  fullImg: { width: width, height: height * 0.6 },
  postDetailsBox: { width: '90%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginTop: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  detailLocText: { color: '#00C853', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  detailCommentText: { color: '#fff', fontSize: 16, lineHeight: 22, marginTop: 10 },
  starContainer: { flexDirection: 'row', marginVertical: 5 },
  ratingLabel: { fontSize: 16, color: '#333', marginBottom: 5, fontWeight: 'bold' },
  modalBody: { flex: 1, backgroundColor: '#fff', padding: 25, paddingTop: 60, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  textArea: { width: '100%', height: 120, backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, textAlign: 'right', marginTop: 20 },
  locSelector: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 15, backgroundColor: '#E8F5E9', borderRadius: 15, marginVertical: 20, borderWidth: 1, borderColor: '#00C853' },
  locText: { marginLeft: 10, color: '#2E7D32', fontWeight: 'bold' },
  pubButton: { width: '100%', backgroundColor: '#00C853', padding: 18, borderRadius: 15, alignItems: 'center' },
  pubText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mapSearchBox: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10, flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 5, elevation: 10 },
  mapInput: { flex: 1, padding: 12, textAlign: 'right' },
  mapFooter: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 20, borderRadius: 25, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#00C853', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30 }
});