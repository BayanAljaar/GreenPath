import React, { useState,useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert,
  Dimensions,
  Modal, 
  TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../UserContext'; 
import { useRouter } from 'expo-router';
import { updateUserInfo, deleteAccount } from '../../services/apiClient';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator'; // ⬅️ أضيفي هذا الاستيراد في الأعلى
const { width } = Dimensions.get('window');

export default function ProfileMenuScreen() {
  const { user, logout, updateUser, deleteMyAccount } = useUser(); // استخراج الدوال الجديدة
  const [newName, setNewName] = useState(user?.userName || "");
  const [isModalVisible, setModalVisible] = useState(false);

  const router = useRouter();
 // 🛡️ حماية الصفحة: إذا لم يوجد مستخدم، اذهب لصفحة الهبوط
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/landing');
    }
  }, [user]);

  if (!user) {
    router.replace('/(auth)/landing');
    return null;
  } // لا ترسم شيئاً حتى يتم التوجيه
  
  // 1. دالة تغيير الصورة
  const pickImage = async () => {
    try {
      // 1. فتح مكتبة الصور
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // سنقوم بالضغط في الخطوة التالية
      });

    // 2. التحقق الآمن من وجود الأصول (هذا هو الكود الذي سألتِ عنه)
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // 3. استخدام ImageManipulator لتصغير الصورة جداً لتجنب خطأ 502
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImage.uri,
          [{ resize: { width: 100, height: 100 } }], // تصغير لـ 100 بكسل فقط
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        // 4. إرسال الصورة للسيرفر إذا وُجد الـ Base64
        if (manipResult.base64) {
          const imageBase64 = `data:image/jpeg;base64,${manipResult.base64}`;
          console.log("Image processed, size is now very small. Uploading...");
          // إظهار تنبيه بسيط لبدء الرفع
          
          await updateUser({ profilePicture: imageBase64 } as any);
          
          alert("Success: Profile picture updated!");
        }
      }
    } catch (error: any) {
      console.error("Error during image process:", error);
      alert("Error: " + (error.message || "Could not upload image"));
    }
};

  // 2. دالة تحديث الاسم
  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateUser({ userName: newName });
      setModalVisible(false);
      showNotify("Success", "Name updated successfully");
    } catch (e) {
      showNotify("Error", "Update failed");
    }
  };
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      logout();
    } else {
      Alert.alert("Logout", "Are you sure?", [
        { text: "Cancel" },
        { text: "Logout", onPress: logout }
      ]);
    }
  };
 
  /* 1. زر تعديل الاسم (مثال باستخدام Alert Prompt)*/
  const handleEditFullName = async () => {
  // تجربة سريعة لتغيير الاسم في MongoDB
  try {
    const newName = "Green Traveler"; 
    await updateUser({ userName: newName });
    Alert.alert("Success", "Name updated in MongoDB!");
  } catch (e) {
    Alert.alert("Error", "Failed to update name");
  }
};

// في الـ JSX تأكدي من عرض المسمى الصحيح:
<Text style={styles.userName}>{user?.userName || "Traveler"}</Text>

  const handleChangeUsername = () => {
    // بدلاً من الـ Alert المعقد، سنقوم بتوجيه المستخدم أو إظهار رسالة
    Alert.alert(
      "Edit Username",
      "To change your username, we will open the settings editor.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          onPress: () => {
            // هنا يمكنكِ التوجيه لصفحة تعديل البيانات 
            // router.push('/edit-profile');
            console.log("Navigate to edit screen");
          } 
        }
      ]
    ); 
  };

  // دالة حفظ الاسم الجديد في الداتابيز
  // دالة حفظ الاسم الجديد في الداتابيز
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateUser({ userName: newName }); // استدعاء الدالة التي تربط بـ MongoDB
      setModalVisible(false);
      Alert.alert("Success", "Name updated in database!");
    } catch (e) {
      Alert.alert("Error", "Could not update name");
    }
  };
  // 2. زر حذف الحساب (مربوط بالداتابيز)
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account", 
      "This is permanent. All your data will be wiped from MongoDB.", 
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteMyAccount();
              Alert.alert("Deleted", "Your account has been removed.");
            } catch (e) { Alert.alert("Error", "Could not delete"); }
          } 
        }
      ]
    );
  };
  const showNotify = (title: string, msg: string) => {
    if (Platform.OS === 'web') alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleUpdate = async () => {
    // نضع شرط التحقق: إذا لم يكن هناك مستخدم، اخرج من الدالة ولا تفعل شيئاً
    if (!user) return; 

    try {
      // الآن TypeScript متأكد أن user ليس null وسيعمل الكود
      await updateUserInfo(user.id, { userName: "NewName" });
      Alert.alert("Success", "Database updated!");
    } catch (err) {
      console.log(err);
    }
  };

  console.log("Current user image status:", user?.profilePicture ? "Has Image" : "No Image");
  
  return (
    <ScrollView style={styles.container}>
      {/* الجزء العلوي (Header) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          <Image 
            source={{ uri: user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} 
            style={styles.profileImg} 
          />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userNameText}>{user?.userName || "Green Traveler"}</Text>
        <Text style={styles.userEmailText}>{user?.email}</Text>
      </View>

      {/* قائمة الخيارات (Menu) */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
          <View style={[styles.iconBox, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="person" size={20} color="#4CAF50" />
          </View>
          <Text style={styles.menuItemText}>Edit UserName</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <View style={[styles.iconBox, { backgroundColor: '#ffebee' }]}>
            <Ionicons name="log-out" size={20} color="#f44336" />
          </View>
          <Text style={[styles.menuItemText, { color: '#f44336' }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={deleteMyAccount}>
          <View style={[styles.iconBox, { backgroundColor: '#f5f5f5' }]}>
            <Ionicons name="trash" size={20} color="#666" />
          </View>
          <Text style={[styles.menuItemText, { color: '#666' }]}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* نافذة التعديل (Modal) */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput 
              style={styles.input} 
              value={newName} 
              onChangeText={setNewName}
              placeholder="UserName"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateName} style={styles.btnSave}>
                <Text style={{ color: 'white' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}


// مكون MenuRow الفرعي
const MenuRow = ({ icon, label, subLabel, onPress, color, iconColor, isLast }: any) => (
  <TouchableOpacity 
    style={[styles.menuRow, !isLast && styles.rowBorder]} 
    onPress={onPress}
  >
    <View style={styles.rowLeft}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        {subLabel && <Text style={styles.rowSubLabel}>{subLabel}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  darkHeader: {
    backgroundColor: '#0F172A',
    height: 250, // تم تكبيره قليلاً لعرض الاسم
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  profileInfo: { alignItems: 'center', marginTop: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    borderWidth: 4, 
    borderColor: 'rgba(255,255,255,0.2)' 
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 15 },
  userHandle: { color: '#94A3B8', fontSize: 14, fontWeight: '500', marginBottom: 10 },
  content: { paddingHorizontal: 20, marginTop: -30 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#94A3B8', 
    textTransform: 'uppercase', 
    marginBottom: 15 
  },
  menuRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12 
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    width: 42, 
    height: 42, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  rowSubLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  logoutRow: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  deleteBtn: { marginTop: 10, alignItems: 'center' },
  deleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 30, marginBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { width: '100%', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 10, paddingHorizontal: 20 },
  header: { alignItems: "center", padding: 40, backgroundColor: "#1a242f" },
  profileImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#4CAF50" },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4CAF50', padding: 5, borderRadius: 15 },
  userEmail: { color: "#ccc", fontSize: 14 },
  menu: { marginTop: 20, backgroundColor: "white", marginHorizontal: 20, borderRadius: 15, elevation: 2 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  menuText: { marginLeft: 15, fontSize: 16, color: "#333" },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  logoutBtn: {
    marginTop: 20,
    borderBottomWidth: 0, // لإزالة الخط السفلي في آخر عنصر
  },
  

  imageContainer: { position: 'relative' },
  cameraBadge: { 
    position: 'absolute', 
    bottom: 5, 
    right: 5, 
    backgroundColor: '#4CAF50', 
    padding: 6, 
    borderRadius: 20,
    elevation: 3
  },
  userNameText: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 15 },
  userEmailText: { color: "#bdc3c7", fontSize: 14, marginTop: 4 },
  menuContainer: { 
    backgroundColor: "white", 
    marginTop: -20, 
    marginHorizontal: 20, 
    borderRadius: 20, 
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
 
  menuItemText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500', color: "#2c3e50" },
  modalBox: { backgroundColor: 'white', margin: 30, padding: 25, borderRadius: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  btnCancel: { marginRight: 25 },
  btnSave: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },

});