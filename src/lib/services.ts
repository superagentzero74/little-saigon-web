import { db, auth, storage } from "./firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  DocumentSnapshot, arrayUnion, arrayRemove, getCountFromServer,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Business, BusinessPhoto, Review, MonVietDish, BusinessCategory,
  AppUser, CheckIn, Reward, Redemption, PhotoTag, DishSection, DishFeaturedEntry, ClaimRequest,
  SubcategoryInfo, CategoryInfo, PromoBanner, Promotion, UserOffer, OfferType, PromotionStatus, IssuanceTrigger,
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
  // Query both legacy `category` field and new `categories` array
  const [legacySnap, newSnap] = await Promise.all([
    getDocs(query(collection(db, "businesses"), where("category", "==", category), limit(limitCount))),
    getDocs(query(collection(db, "businesses"), where("categories", "array-contains", category), limit(limitCount))),
  ]);
  const map = new Map<string, Business>();
  for (const d of [...legacySnap.docs, ...newSnap.docs]) {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() } as Business);
  }
  return Array.from(map.values()).slice(0, limitCount);
}

export async function getTopRatedBusinesses(limitCount = 12): Promise<Business[]> {
  const q = query(collection(db, "businesses"), orderBy("rating", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const q = query(collection(db, "categories"), orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ slug: d.id, ...d.data() })) as CategoryInfo[];
}

export async function getSubcategories(parentSlug?: BusinessCategory): Promise<SubcategoryInfo[]> {
  const constraints: any[] = [orderBy("order")];
  if (parentSlug) constraints.push(where("parentSlug", "==", parentSlug));
  const q = query(collection(db, "subcategories"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ slug: d.id, ...d.data() })) as SubcategoryInfo[];
}

export async function saveCategory(slug: string, data: Partial<CategoryInfo>): Promise<void> {
  await setDoc(doc(db, "categories", slug), data, { merge: true });
}

export async function deleteCategory(slug: string): Promise<void> {
  await deleteDoc(doc(db, "categories", slug));
}

export async function saveSubcategory(slug: string, data: Partial<SubcategoryInfo>): Promise<void> {
  await setDoc(doc(db, "subcategories", slug), data, { merge: true });
}

export async function deleteSubcategory(slug: string): Promise<void> {
  await deleteDoc(doc(db, "subcategories", slug));
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

export async function getExistingPlaceIds(placeIds: string[]): Promise<Record<string, string>> {
  if (placeIds.length === 0) return {};
  // Firestore in() supports max 30 values
  const chunks: string[][] = [];
  for (let i = 0; i < placeIds.length; i += 30) chunks.push(placeIds.slice(i, i + 30));
  const result: Record<string, string> = {};
  for (const chunk of chunks) {
    const q = query(collection(db, "businesses"), where("placeId", "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.placeId) result[data.placeId] = d.id;
    });
  }
  return result;
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

async function optimizeImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadBusinessPhoto(
  businessId: string,
  file: File,
  tag: PhotoTag
): Promise<BusinessPhoto> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to upload photos");

  const optimized = await optimizeImage(file);
  const path = `businesses/${businessId}/photos/${user.uid}_${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, optimized, { contentType: "image/jpeg" });
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

  // Award points + increment check-in count (don't let failures here block the check-in)
  try {
    await Promise.all([
      awardPoints(user.uid, POINTS.CHECK_IN, "check_in", businessId),
      updateDoc(doc(db, "users", user.uid), { checkInCount: increment(1) }),
    ]);
  } catch (err) {
    console.error("Failed to award points after check-in:", err);
  }

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

export async function updateDishHeroImage(dishDocId: string, rank: number, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `foods/${rank}/hero.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "foods", dishDocId), { imageURL: url });
  return url;
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

export async function addFood(data: {
  vietnameseName: string;
  englishName: string;
  rank: number;
  shortDescription?: string;
  description?: string;
  history?: string;
  pronunciation?: string;
  searchQuery?: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, "foods"), {
    id: data.rank,
    vietnameseName: data.vietnameseName,
    englishName: data.englishName,
    shortDescription: data.shortDescription || "",
    description: data.description || "",
    history: data.history || "",
    pronunciation: data.pronunciation || "",
    searchQuery: data.searchQuery || data.vietnameseName.toLowerCase(),
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateFood(docId: string, data: Partial<{
  vietnameseName: string;
  englishName: string;
  shortDescription: string;
  description: string;
  history: string;
  pronunciation: string;
  searchQuery: string;
  isActive: boolean;
}>): Promise<void> {
  await updateDoc(doc(db, "foods", docId), { ...data, updatedAt: serverTimestamp() });
}

export async function reorderFoods(orderedIds: { docId: string; rank: number }[]): Promise<void> {
  const batch = writeBatch(db);
  for (const { docId, rank } of orderedIds) {
    batch.update(doc(db, "foods", docId), { id: rank });
  }
  await batch.commit();
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

export async function setUserRole(userId: string, role: "user" | "admin" | "business_owner"): Promise<void> {
  await updateDoc(doc(db, "users", userId), { role });
}

// ============================================
// Business Claim Requests
// ============================================

export async function getUserClaimForBusiness(businessId: string, userId: string): Promise<ClaimRequest | null> {
  const q = query(
    collection(db, "claimRequests"),
    where("businessId", "==", businessId),
    where("userId", "==", userId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ClaimRequest;
}

export async function submitClaimRequest(businessId: string, businessName: string, note?: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");

  const existing = await getUserClaimForBusiness(businessId, user.uid);
  if (existing) throw new Error("You have already submitted a claim for this business");

  const userProfile = await getUserProfile(user.uid);
  const data = {
    businessId,
    businessName,
    userId: user.uid,
    userName: userProfile?.displayName || user.displayName || "Unknown",
    userEmail: userProfile?.email || user.email || "",
    status: "pending",
    note: note || "",
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "claimRequests"), data);
  return docRef.id;
}

export async function getClaimRequests(status?: "pending" | "approved" | "denied"): Promise<ClaimRequest[]> {
  const constraints: any[] = [];
  if (status) constraints.push(where("status", "==", status));
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(collection(db, "claimRequests"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClaimRequest[];
}

export async function approveClaimRequest(claimId: string): Promise<void> {
  const claimRef = doc(db, "claimRequests", claimId);
  const claimSnap = await getDoc(claimRef);
  if (!claimSnap.exists()) throw new Error("Claim not found");

  const claim = { id: claimSnap.id, ...claimSnap.data() } as ClaimRequest;

  await updateDoc(claimRef, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: auth.currentUser?.uid || null,
  });

  await updateDoc(doc(db, "businesses", claim.businessId), {
    ownerId: claim.userId,
    claimed: true,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", claim.userId), {
    role: "business_owner",
    ownedBusinessIds: arrayUnion(claim.businessId),
  });
}

export async function denyClaimRequest(claimId: string): Promise<void> {
  await updateDoc(doc(db, "claimRequests", claimId), {
    status: "denied",
    reviewedAt: serverTimestamp(),
    reviewedBy: auth.currentUser?.uid || null,
  });
}

export async function getOwnedBusinesses(userId: string): Promise<Business[]> {
  const q = query(collection(db, "businesses"), where("ownerId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function updateBusiness(businessId: string, data: Partial<Business>): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBusiness(businessId: string): Promise<void> {
  await deleteDoc(doc(db, "businesses", businessId));
}

/** Returns the existing business if a duplicate is found by placeId, else null. */
export async function findDuplicateBusiness(placeId: string | null, name: string, address: string): Promise<Business | null> {
  // Only match on placeId — prevents false positives for same-name chains at different locations
  if (placeId) {
    const q = query(collection(db, "businesses"), where("placeId", "==", placeId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as Business;
  }
  return null;
}

export async function getNewlyAddedBusinesses(limitCount = 5): Promise<Business[]> {
  const q = query(collection(db, "businesses"), orderBy("updatedAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

// ============================================
// Page Settings
// ============================================

export interface PageConfig {
  categories?: string[];     // category slugs visible on this page
  showIcons?: boolean;       // show emoji icons for categories
  tags?: string[];           // custom tags/labels for the page
}

export interface PageSettings {
  homeCategories?: string[];      // legacy — kept for backward compat
  exploreCategories?: string[];   // legacy — kept for backward compat
  home?: PageConfig;
  explore?: PageConfig;
  category?: PageConfig;
}

export async function getPageSettings(): Promise<PageSettings> {
  const snap = await getDoc(doc(db, "settings", "pages"));
  if (!snap.exists()) return {};
  return snap.data() as PageSettings;
}

export async function savePageSettings(data: Partial<PageSettings>): Promise<void> {
  await setDoc(doc(db, "settings", "pages"), data, { merge: true });
}

// ============================================
// Promo Banners
// ============================================

export async function getPromoBanners(): Promise<PromoBanner[]> {
  const snap = await getDocs(query(collection(db, "promoBanners"), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoBanner));
}

export async function createPromoBanner(data: Omit<PromoBanner, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "promoBanners"), data);
  return docRef.id;
}

export async function updatePromoBanner(id: string, data: Partial<PromoBanner>): Promise<void> {
  await updateDoc(doc(db, "promoBanners", id), data);
}

export async function deletePromoBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "promoBanners", id));
}

export async function uploadPromoBannerImage(file: File): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `promoBanners/${timestamp}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function reorderPromoBanners(banners: PromoBanner[]): Promise<void> {
  const batch = writeBatch(db);
  banners.forEach((b, i) => {
    batch.update(doc(db, "promoBanners", b.id), { order: i });
  });
  await batch.commit();
}

export async function getAdminStats(): Promise<{ businesses: number; users: number; reviews: number }> {
  const [bizCount, userCount, reviewCount] = await Promise.all([
    getCountFromServer(query(collection(db, "businesses"))),
    getCountFromServer(query(collection(db, "users"))),
    getCountFromServer(query(collection(db, "reviews"))),
  ]);
  return {
    businesses: bizCount.data().count,
    users: userCount.data().count,
    reviews: reviewCount.data().count,
  };
}

// ============================================
// Promotions
// ============================================

/** Fetch all businesses (lightweight, for admin dropdowns) */
export async function getAllBusinesses(): Promise<Business[]> {
  const snap = await getDocs(query(collection(db, "businesses"), limit(500)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Business);
  list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return list;
}

export async function getPromotions(): Promise<Promotion[]> {
  const snap = await getDocs(
    query(collection(db, "promotions"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion);
}

/** Fetch only active promotions (for public-facing pages) */
export async function getActivePromotions(): Promise<Promotion[]> {
  const snap = await getDocs(
    query(collection(db, "promotions"), where("status", "==", "active"))
  );
  const promos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion);
  const toMs = (ts: any) => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };
  promos.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return promos;
}

export async function getPromotion(id: string): Promise<Promotion | null> {
  const snap = await getDoc(doc(db, "promotions", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Promotion;
}

export async function createPromotion(data: Omit<Promotion, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "promotions"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePromotion(id: string, data: Partial<Promotion>): Promise<void> {
  await updateDoc(doc(db, "promotions", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePromotion(id: string): Promise<void> {
  await deleteDoc(doc(db, "promotions", id));
}

/** Manually issue an offer to a specific user */
export async function issueOfferToUser(
  userId: string,
  promotion: Promotion
): Promise<string> {
  const nonce = crypto.randomUUID();
  const userOfferRef = doc(collection(db, "userOffers"));

  const qrPayload = JSON.stringify({
    userId,
    userOfferId: userOfferRef.id,
    promotionId: promotion.id,
    nonce,
  });

  await setDoc(userOfferRef, {
    userOfferId: userOfferRef.id,
    userId,
    promotionId: promotion.id,
    businessId: promotion.businessId,
    businessName: promotion.businessName,
    title: promotion.title,
    description: promotion.description,
    type: promotion.type,
    status: "issued",
    issuedAt: serverTimestamp(),
    issuedBy: `admin:${auth.currentUser?.uid || "unknown"}`,
    expiresAt: promotion.validUntil || null,
    redeemedAt: null,
    redeemedAtBusinessId: null,
    scannedByOwnerId: null,
    qrPayload,
    qrNonce: nonce,
  });

  return userOfferRef.id;
}

/** Fetch offers for a specific user */
export async function getUserOffers(userId: string): Promise<UserOffer[]> {
  const snap = await getDocs(
    query(collection(db, "userOffers"), where("userId", "==", userId))
  );
  const offers = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserOffer);
  offers.sort((a, b) => {
    const toMs = (ts: any) => {
      if (!ts) return 0;
      if (ts.toMillis) return ts.toMillis();
      if (ts.seconds) return ts.seconds * 1000;
      return 0;
    };
    return toMs(b.issuedAt) - toMs(a.issuedAt);
  });
  return offers;
}

/** Fetch a single user by ID */
export async function getUserById(userId: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

/** Search users by name or email for manual issuance */
export async function searchUsers(searchTerm: string, maxResults = 10): Promise<AppUser[]> {
  // Firestore doesn't support full-text search, so we fetch and filter client-side
  const snap = await getDocs(query(collection(db, "users"), limit(200)));
  const term = searchTerm.toLowerCase();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as AppUser)
    .filter(
      (u) =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
    )
    .slice(0, maxResults);
}

/** Fetch all userOffers for a given promotion (for admin stats) */
export async function getOffersByPromotion(promotionId: string): Promise<UserOffer[]> {
  const snap = await getDocs(
    query(collection(db, "userOffers"), where("promotionId", "==", promotionId))
  );
  const offers = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserOffer);
  const toMs = (ts: any) => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };
  offers.sort((a, b) => toMs(b.issuedAt) - toMs(a.issuedAt));
  return offers;
}
