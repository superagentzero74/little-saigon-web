import { db, auth, storage } from "./firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  DocumentSnapshot, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Business, BusinessPhoto, Review, MonVietDish, BusinessCategory,
  AppUser, CheckIn, Reward, Redemption, PhotoTag, DishSection,
} from "./types";
import { POINTS } from "./types";

// ============================================
// Businesses
// ============================================

export async function getBusinesses(options?: {
  category?: BusinessCategory;
  limitCount?: number;
  startAfterDoc?: DocumentSnapshot;
}): Promise<{ businesses: Business[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: any[] = [];
  if (options?.category) constraints.push(where("category", "==", options.category));
  constraints.push(orderBy("rating", "desc"));
  constraints.push(limit(options?.limitCount || 24));
  if (options?.startAfterDoc) constraints.push(startAfter(options.startAfterDoc));

  const q = query(collection(db, "businesses"), ...constraints);
  const snapshot = await getDocs(q);
  const businesses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
  return { businesses, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null };
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, "businesses", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Business;
}

export async function getBusinessesByCategory(category: BusinessCategory, limitCount = 12): Promise<Business[]> {
  const q = query(collection(db, "businesses"), where("category", "==", category), orderBy("rating", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function getTopRatedBusinesses(limitCount = 12): Promise<Business[]> {
  const q = query(collection(db, "businesses"), orderBy("rating", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function searchBusinesses(searchQuery: string): Promise<Business[]> {
  // Client-side filter for MVP. TODO: Algolia/Typesense
  const q = query(collection(db, "businesses"), orderBy("name"));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
  const lower = searchQuery.toLowerCase();
  return all.filter(
    (b) =>
      b.name.toLowerCase().includes(lower) ||
      b.address?.toLowerCase().includes(lower) ||
      b.category?.toLowerCase().includes(lower)
  );
}

// ============================================
// Business Photos
// ============================================

export async function getBusinessPhotos(businessId: string): Promise<BusinessPhoto[]> {
  const q = query(collection(db, "businesses", businessId, "photos"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BusinessPhoto[];
}

export async function uploadBusinessPhoto(
  businessId: string,
  file: File,
  tag: PhotoTag
): Promise<BusinessPhoto> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to upload photos");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `businesses/${businessId}/photos/${user.uid}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const photoData = {
    businessId,
    userId: user.uid,
    url,
    tag,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "businesses", businessId, "photos"), photoData);

  // Award points
  await awardPoints(user.uid, POINTS.PHOTO_UPLOAD, "photo_upload", businessId);

  return { id: docRef.id, ...photoData } as BusinessPhoto;
}

// ============================================
// Reviews
// ============================================

export async function getReviewsForBusiness(businessId: string, limitCount = 20): Promise<Review[]> {
  const q = query(collection(db, "reviews"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Review[];
}

export async function hasUserReviewed(businessId: string, userId: string): Promise<boolean> {
  const q = query(collection(db, "reviews"), where("businessId", "==", businessId), where("userId", "==", userId), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function submitReview(
  businessId: string,
  rating: number,
  text: string
): Promise<Review> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to review");

  const userProfile = await getUserProfile(user.uid);
  const reviewData = {
    businessId,
    userId: user.uid,
    userName: userProfile?.displayName || user.displayName || "Anonymous",
    userPhotoURL: userProfile?.photoURL || user.photoURL || null,
    rating,
    text,
    pointsEarned: POINTS.REVIEW,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "reviews"), reviewData);

  // Award points + increment review count
  await awardPoints(user.uid, POINTS.REVIEW, "review", businessId);
  await updateDoc(doc(db, "users", user.uid), { reviewCount: increment(1) });

  return { id: docRef.id, ...reviewData } as Review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, "reviews", reviewId));
}

// ============================================
// Check-Ins
// ============================================

export async function checkIn(businessId: string, userLat: number, userLng: number): Promise<CheckIn> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to check in");

  // Verify location — 200m radius
  const business = await getBusinessById(businessId);
  if (!business) throw new Error("Business not found");

  const distance = haversineDistance(userLat, userLng, business.latitude, business.longitude);
  if (distance > 200) {
    throw new Error("You're not close enough to check in. You need to be within 200 meters.");
  }

  const checkInData = {
    userId: user.uid,
    businessId,
    timestamp: serverTimestamp(),
    pointsEarned: POINTS.CHECK_IN,
  };

  const docRef = await addDoc(collection(db, "checkIns"), checkInData);

  // Award points + increment check-in count
  await awardPoints(user.uid, POINTS.CHECK_IN, "check_in", businessId);
  await updateDoc(doc(db, "users", user.uid), { checkInCount: increment(1) });

  return { id: docRef.id, ...checkInData } as CheckIn;
}

export async function getUserCheckIns(userId: string): Promise<CheckIn[]> {
  const q = query(collection(db, "checkIns"), where("userId", "==", userId), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CheckIn[];
}

// ============================================
// User Profile
// ============================================

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function createUserProfile(userId: string, data: Partial<AppUser>): Promise<void> {
  await setDoc(doc(db, "users", userId), {
    displayName: data.displayName || "",
    email: data.email || "",
    photoURL: data.photoURL || null,
    points: 0,
    reviewCount: 0,
    checkInCount: 0,
    role: "user",
    favorites: [],
    checkedDishes: [],
    createdAt: serverTimestamp(),
    ...data,
  });
}

export async function updateUserProfile(userId: string, data: Partial<AppUser>): Promise<void> {
  await updateDoc(doc(db, "users", userId), { ...data, lastActive: serverTimestamp() });
}

// ============================================
// Favorites
// ============================================

export async function toggleFavorite(userId: string, businessId: string): Promise<boolean> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  const favorites: string[] = snap.data()?.favorites || [];
  const isFav = favorites.includes(businessId);

  if (isFav) {
    await updateDoc(userRef, { favorites: arrayRemove(businessId) });
  } else {
    await updateDoc(userRef, { favorites: arrayUnion(businessId) });
  }
  return !isFav;
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.data()?.favorites || [];
}

// ============================================
// Checked Dishes (Top 50 tracker)
// ============================================

export async function toggleDishChecked(userId: string, dishRank: number): Promise<boolean> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  const checked: number[] = snap.data()?.checkedDishes || [];
  const isChecked = checked.includes(dishRank);

  if (isChecked) {
    await updateDoc(userRef, { checkedDishes: arrayRemove(dishRank) });
  } else {
    await updateDoc(userRef, { checkedDishes: arrayUnion(dishRank) });
    await awardPoints(userId, POINTS.DISH_CHECK, "dish_check");
  }
  return !isChecked;
}

// ============================================
// Rewards
// ============================================

export async function getRewards(): Promise<Reward[]> {
  const q = query(collection(db, "rewards"), where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reward[];
}

export async function redeemReward(rewardId: string): Promise<Redemption> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");

  const reward = await getDoc(doc(db, "rewards", rewardId));
  if (!reward.exists()) throw new Error("Reward not found");

  const rewardData = reward.data() as Reward;
  const userProfile = await getUserProfile(user.uid);
  if (!userProfile || userProfile.points < rewardData.pointsCost) {
    throw new Error("Not enough points");
  }

  // Deduct points
  await updateDoc(doc(db, "users", user.uid), { points: increment(-rewardData.pointsCost) });

  const redemptionData = {
    userId: user.uid,
    rewardId,
    businessId: rewardData.businessId || null,
    redeemedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "redemptions"), redemptionData);
  return { id: docRef.id, ...redemptionData } as Redemption;
}

export async function getUserRedemptions(userId: string): Promise<Redemption[]> {
  const q = query(collection(db, "redemptions"), where("userId", "==", userId), orderBy("redeemedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Redemption[];
}

// ============================================
// Points
// ============================================

async function awardPoints(userId: string, points: number, action: string, businessId?: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), { points: increment(points) });

  // Log in pointsLog (server-side collection, but we write from client for now)
  await addDoc(collection(db, "pointsLog"), {
    userId,
    action,
    points,
    businessId: businessId || null,
    timestamp: serverTimestamp(),
  });
}

// ============================================
// Top 50 Món Việt
// ============================================

// Infer dish section from rank when not stored in Firestore
function sectionFromRank(rank: number): DishSection {
  if (rank <= 10) return "noodle_soups";
  if (rank <= 15) return "dry_noodles";
  if (rank <= 20) return "rice";
  if (rank <= 29) return "banh";
  if (rank <= 34) return "rolls";
  if (rank <= 42) return "grilled";
  if (rank <= 46) return "sides";
  return "sweets";
}

// Maps Firestore foods doc fields to the web MonVietDish type
function mapFoodDoc(docId: string, data: any): MonVietDish {
  const rank = data.id ?? parseInt(docId);
  return {
    id: docId,
    rank,                                        // Firestore uses 'id' (Int) as the rank
    name: data.vietnameseName ?? data.name ?? "",
    englishName: data.englishName ?? "",
    section: data.section ?? sectionFromRank(rank),
    sectionTitle: data.sectionTitle ?? "",
    sectionTitleViet: data.sectionTitleViet ?? "",
    shortDescription: data.shortDescription ?? "",
    description: data.description ?? "",
    history: data.history ?? "",
    pronunciation: data.pronunciation ?? "",
    photoURL: data.imageURL ?? data.photoURL ?? null,
    searchQuery: data.searchQuery ?? "",
    isActive: data.isActive ?? true,
  };
}

export async function getDishes(): Promise<MonVietDish[]> {
  const snap = await getDocs(query(collection(db, "foods"), orderBy("id", "asc")));
  return snap.docs.map((d) => mapFoodDoc(d.id, d.data()));
}

export async function getDishByRank(rank: number): Promise<MonVietDish | null> {
  const q = query(collection(db, "foods"), where("id", "==", rank), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapFoodDoc(snap.docs[0].id, snap.docs[0].data());
}

// ============================================
// Geo Helpers
// ============================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
