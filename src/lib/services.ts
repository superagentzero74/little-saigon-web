import { db, auth, storage } from "./firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  DocumentSnapshot, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Business, BusinessPhoto, Review, MonVietDish, BusinessCategory,
  AppUser, CheckIn, Reward, Redemption, PhotoTag, DishSection, DishFeaturedEntry,
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
  // Only use orderBy when there's no category filter (composite index not available)
  if (!options?.category) {
    constraints.push(orderBy("rating", "desc"));
  }
  if (options?.category) constraints.push(where("category", "==", options.category));
  constraints.push(limit(options?.limitCount || 24));
  if (options?.startAfterDoc) constraints.push(startAfter(options.startAfterDoc));

  const q = query(collection(db, "businesses"), ...constraints);
  const snapshot = await getDocs(q);
  const businesses = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() })) as Business[];
  // Sort client-side when category filter is applied
  if (options?.category) businesses.sort((a, b) => b.rating - a.rating);
  return { businesses, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null };
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, "businesses", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Business;
}

export async function getBusinessesByCategory(category: BusinessCategory, limitCount = 100): Promise<Business[]> {
  const q = query(collection(db, "businesses"), where("category", "==", category), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function getTopRatedBusinesses(limitCount = 12): Promise<Business[]> {
  const q = query(collection(db, "businesses"), orderBy("rating", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function searchBusinesses(searchQuery: string): Promise<Business[]> {
  // Client-side filter for MVP. TODO: Algolia/Typesense
  const q = query(collection(db, "businesses"), orderBy("name"));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
  const needle = normalizeStr(searchQuery);
  return all.filter(
    (b) =>
      normalizeStr(b.name).includes(needle) ||
      normalizeStr(b.address || "").includes(needle) ||
      normalizeStr(b.category || "").includes(needle)
  );
}

// ============================================
// Business Photos
// ============================================

export async function getBusinessPhotos(businessId: string): Promise<BusinessPhoto[]> {
  const snap = await getDocs(collection(db, "businesses", businessId, "photos"));
  const photos = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BusinessPhoto[];
  // Sort by order field if present, otherwise by createdAt
  return photos.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ?? 0) * 1000;
    const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ?? 0) * 1000;
    return aMs - bMs;
  });
}

export async function deleteBusinessPhoto(businessId: string, photoId: string): Promise<void> {
  await deleteDoc(doc(db, "businesses", businessId, "photos", photoId));
}

export async function reorderBusinessPhotos(businessId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      updateDoc(doc(db, "businesses", businessId, "photos", id), { order: i })
    )
  );
}

export async function updateBusinessPhoto(businessId: string, photoId: string, data: Partial<BusinessPhoto>): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId, "photos", photoId), data as any);
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
  // No orderBy — avoids composite index requirement; sort client-side instead
  const q = query(collection(db, "reviews"), where("businessId", "==", businessId), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Review)
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ?? 0) * 1000;
      const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ?? 0) * 1000;
      return bMs - aMs;
    });
}

export async function getUserReviewForBusiness(businessId: string, userId: string): Promise<Review | null> {
  const q = query(collection(db, "reviews"), where("businessId", "==", businessId), where("userId", "==", userId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Review;
}

export async function hasUserReviewed(businessId: string, userId: string): Promise<boolean> {
  return (await getUserReviewForBusiness(businessId, userId)) !== null;
}

export async function updateReview(reviewId: string, rating: number, text: string): Promise<void> {
  await updateDoc(doc(db, "reviews", reviewId), { rating, text, updatedAt: serverTimestamp() });
}

/**
 * Returns the deterministic review doc ID for a user+business pair.
 * Used by submitReview and the detail page to locate existing reviews.
 */
export function reviewDocId(businessId: string, userId: string): string {
  return `${businessId}_${userId}`;
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

  // Deterministic ID prevents duplicate reviews from the same user
  const reviewDocId = `${businessId}_${user.uid}`;
  const isNew = !(await getDoc(doc(db, "reviews", reviewDocId))).exists();

  await setDoc(doc(db, "reviews", reviewDocId), reviewData);

  // Only award points and increment count on first review
  if (isNew) {
    await awardPoints(user.uid, POINTS.REVIEW, "review", businessId);
    await updateDoc(doc(db, "users", user.uid), { reviewCount: increment(1) });
  }

  return { id: reviewDocId, ...reviewData } as Review;
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

export async function getUserReviews(userId: string): Promise<Review[]> {
  const q = query(collection(db, "reviews"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Review)
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ?? 0) * 1000;
      const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ?? 0) * 1000;
      return bMs - aMs;
    });
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `users/${userId}/avatar.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", userId), { photoURL: url, lastActive: serverTimestamp() });
  return url;
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
  const snap = await getDocs(collection(db, "foods"));
  return snap.docs
    .map((d) => mapFoodDoc(d.id, d.data()))
    .sort((a, b) => a.rank - b.rank);
}

export async function getDishByRank(rank: number): Promise<MonVietDish | null> {
  const q = query(collection(db, "foods"), where("id", "==", rank), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapFoodDoc(snap.docs[0].id, snap.docs[0].data());
}

// ============================================
// Dish Featured ("Best of Little Saigon")
// ============================================

export async function getDishFeatured(dishRank: number): Promise<Business[]> {
  const snap = await getDoc(doc(db, "dishFeatured", String(dishRank)));
  if (!snap.exists()) return [];
  const entries: DishFeaturedEntry[] = snap.data()?.entries || [];
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const businesses = await Promise.all(sorted.map((e) => getBusinessById(e.businessId)));
  return businesses.filter(Boolean) as Business[];
}

export async function setDishFeatured(dishRank: number, businessIds: string[]): Promise<void> {
  const entries: DishFeaturedEntry[] = businessIds.map((id, i) => ({ businessId: id, rank: i + 1 }));
  await setDoc(doc(db, "dishFeatured", String(dishRank)), {
    dishRank,
    entries,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
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

// ============================================
// Admin
// ============================================

export async function createBusiness(data: Omit<Business, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "businesses"), {
    ...data,
    photos: data.photos || [],
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAllUsers(limitCount = 50): Promise<AppUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[];
}

export async function getAllReviews(limitCount = 50): Promise<Review[]> {
  const q = query(collection(db, "reviews"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Review)
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ?? 0) * 1000;
      const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ?? 0) * 1000;
      return bMs - aMs;
    });
}

export async function setUserRole(userId: string, role: "user" | "admin"): Promise<void> {
  await updateDoc(doc(db, "users", userId), { role });
}

export async function updateBusiness(businessId: string, data: Partial<Business>): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBusiness(businessId: string): Promise<void> {
  await deleteDoc(doc(db, "businesses", businessId));
}

/** Returns the existing business if a duplicate is found (by placeId or exact name+address), else null. */
export async function findDuplicateBusiness(placeId: string | null, name: string, address: string): Promise<Business | null> {
  // Check by placeId first (most reliable)
  if (placeId) {
    const q = query(collection(db, "businesses"), where("placeId", "==", placeId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as Business;
  }
  // Fallback: exact name match
  const q2 = query(collection(db, "businesses"), where("name", "==", name.trim()), limit(5));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    // Also check address similarity
    const lower = address.toLowerCase();
    const match = snap2.docs.find((d) => {
      const a: string = d.data().address || "";
      return a.toLowerCase().includes(lower.slice(0, 20)) || lower.includes(a.slice(0, 20).toLowerCase());
    });
    if (match) return { id: match.id, ...match.data() } as Business;
  }
  return null;
}

export async function getNewlyAddedBusinesses(limitCount = 5): Promise<Business[]> {
  const q = query(collection(db, "businesses"), orderBy("updatedAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function getAdminStats(): Promise<{ businesses: number; users: number; reviews: number }> {
  const [bizSnap, userSnap, reviewSnap] = await Promise.all([
    getDocs(query(collection(db, "businesses"), limit(500))),
    getDocs(query(collection(db, "users"), limit(500))),
    getDocs(query(collection(db, "reviews"), limit(500))),
  ]);
  return {
    businesses: bizSnap.size,
    users: userSnap.size,
    reviews: reviewSnap.size,
  };
}
