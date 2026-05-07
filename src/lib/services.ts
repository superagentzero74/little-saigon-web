import { db, auth, storage } from "./firebase";
import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  DocumentSnapshot, arrayUnion, arrayRemove, getCountFromServer, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Business, BusinessPhoto, Review, MonVietDish, BusinessCategory,
  AppUser, CheckIn, Reward, Redemption, PhotoTag, DishSection, DishFeaturedEntry, ClaimRequest,
  SubcategoryInfo, CategoryInfo, PromoBanner, Promotion, UserOffer, OfferType, PromotionStatus, IssuanceTrigger,
  TicketEvent, Ticket, Notification, BlogPost, BlogAuthor, MenuSection,
} from "./types";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
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

  // Also query the categories array for multi-category support
  let extraDocs: Business[] = [];
  if (options?.category) {
    const q2 = query(collection(db, "businesses"), where("categories", "array-contains", options.category), limit(options?.limitCount || 24));
    const snap2 = await getDocs(q2);
    extraDocs = snap2.docs.map((d) => ({ id: d.id, ...d.data() }) as Business);
  }

  // Merge and deduplicate
  const seen = new Set<string>();
  const businesses: Business[] = [];
  for (const d of snapshot.docs) {
    const b = { id: d.id, ...d.data() } as Business;
    if (!seen.has(b.id)) { businesses.push(b); seen.add(b.id); }
  }
  for (const b of extraDocs) {
    if (!seen.has(b.id)) { businesses.push(b); seen.add(b.id); }
  }
  // Sort: featured first, then by totalRatings (popularity), then rating
  businesses.sort((a, b) => {
    const aFeat = (a as any).isFeatured === true ? 1 : 0;
    const bFeat = (b as any).isFeatured === true ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    if ((b.totalRatings || 0) !== (a.totalRatings || 0)) return (b.totalRatings || 0) - (a.totalRatings || 0);
    return (b.rating || 0) - (a.rating || 0);
  });
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
  const results = Array.from(map.values());
  results.sort((a, b) => {
    const aFeat = (a as any).isFeatured === true ? 1 : 0;
    const bFeat = (b as any).isFeatured === true ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    if ((b.totalRatings || 0) !== (a.totalRatings || 0)) return (b.totalRatings || 0) - (a.totalRatings || 0);
    return (b.rating || 0) - (a.rating || 0);
  });
  return results.slice(0, limitCount);
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
  return all
    .filter(
      (b) =>
        normalizeStr(b.name).includes(needle) ||
        normalizeStr(b.address || "").includes(needle) ||
        normalizeStr(b.category || "").includes(needle) ||
        (b.tags || []).some((t) => normalizeStr(t).includes(needle))
    )
    .sort((a, b) => {
      // Prioritize: featured > totalRatings (popularity) > rating
      const aFeat = (a as any).isFeatured === true ? 1 : 0;
      const bFeat = (b as any).isFeatured === true ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      if ((b.totalRatings || 0) !== (a.totalRatings || 0)) return (b.totalRatings || 0) - (a.totalRatings || 0);
      return (b.rating || 0) - (a.rating || 0);
    });
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

  // Fallback: if subcollection is empty, use the photos array from the business doc
  if (photos.length === 0) {
    const bizDoc = await getDoc(doc(db, "businesses", businessId));
    const urls: string[] = bizDoc.data()?.photos || [];
    return urls
      .filter((url) => url && url.trim())
      .map((url, i) => ({
        id: `array_${i}`,
        businessId,
        url,
        tag: "other" as const,
        order: i,
      }));
  }

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

  // Sync subcollection photos to document array for iOS compatibility
  await syncBusinessPhotos(businessId);

  return { id: docRef.id, ...photoData } as BusinessPhoto;
}

/** Sync the photos subcollection URLs to the business document's photos array */
export async function syncBusinessPhotos(businessId: string): Promise<void> {
  const snap = await getDocs(collection(db, "businesses", businessId, "photos"));
  const urls = snap.docs.map((d) => d.data().url).filter(Boolean);
  await updateDoc(doc(db, "businesses", businessId), { photos: urls });
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
    points: 100,
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

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const optimized = await optimizeImage(file);
  const path = `users/${userId}/images/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, optimized, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
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

const DAILY_POINTS_CAP = 500;

async function awardPoints(userId: string, points: number, action: string, businessId?: string): Promise<void> {
  // Check daily cap
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayLogs = await getDocs(
    query(
      collection(db, "pointsLog"),
      where("userId", "==", userId),
      where("timestamp", ">=", Timestamp.fromDate(startOfDay))
    )
  );
  const todayTotal = todayLogs.docs.reduce((sum, d) => sum + (d.data().points || 0), 0);
  if (todayTotal >= DAILY_POINTS_CAP) return; // Cap reached
  const awarded = Math.min(points, DAILY_POINTS_CAP - todayTotal);
  if (awarded <= 0) return;

  await updateDoc(doc(db, "users", userId), { points: increment(awarded) });

  await addDoc(collection(db, "pointsLog"), {
    userId,
    action,
    points: awarded,
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
  if (status === "pending") {
    constraints.push(where("status", "in", ["pending", "new"]));
  } else if (status) {
    constraints.push(where("status", "==", status));
  }
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

// ─── Ticketing ──────────────────────────────────────────

export async function getEvents(): Promise<TicketEvent[]> {
  const snap = await getDocs(collection(db, "events"));
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TicketEvent);
  const toMs = (ts: any) => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };
  events.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  return events;
}

export async function getEvent(id: string): Promise<TicketEvent | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TicketEvent;
}

export async function createTicketEvent(data: Omit<TicketEvent, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTicketEvent(id: string, data: Partial<TicketEvent>): Promise<void> {
  await updateDoc(doc(db, "events", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTicketEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, "events", id));
}

export async function uploadEventPhoto(eventId: string, file: File): Promise<string> {
  const optimized = await optimizeImage(file);
  const path = `events/${eventId}/photos/admin_${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, optimized, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
}

export async function getTickets(eventId?: string): Promise<Ticket[]> {
  let q;
  if (eventId) {
    q = query(collection(db, "tickets"), where("eventId", "==", eventId));
  } else {
    q = collection(db, "tickets");
  }
  const snap = await getDocs(q);
  const tickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket);
  const toMs = (ts: any) => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };
  tickets.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return tickets;
}

export async function getTicketStats() {
  const [events, tickets] = await Promise.all([getEvents(), getTickets()]);
  const totalRevenue = tickets.filter((t) => t.status === "active" || t.status === "used").reduce((s, t) => s + t.price, 0);
  const checkedIn = tickets.filter((t) => t.checkedIn).length;
  return { events: events.length, tickets: tickets.length, totalRevenue, checkedIn };
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

// ─── Notifications ──────────────────────────────────────

export async function getNotifications(max = 50): Promise<Notification[]> {
  const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
}

export async function sendAdminNotification(
  title: string,
  body: string,
  category: "community" | "events",
  targetType: "user" | "topic" | "all",
  targetValue?: string,
  imageUrl?: string,
  scheduledFor?: string,
  screen?: string
): Promise<{ success: boolean; message: string }> {
  const callable = httpsCallable(functions, "sendManualNotification");
  const result = await callable({ title, body, category, targetType, targetValue, imageUrl, scheduledFor, screen });
  return result.data as { success: boolean; message: string };
}

// ─── Search Terms / Keywords ─────────────────────────────

export async function getBusinessesByKeyword(keyword: string): Promise<Business[]> {
  const q = query(collection(db, "businesses"), where("keywords", "array-contains", keyword));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Business);
}

export async function addKeywordToBusiness(businessId: string, keyword: string): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId), {
    keywords: arrayUnion(keyword),
  });
}

export async function removeKeywordFromBusiness(businessId: string, keyword: string): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId), {
    keywords: arrayRemove(keyword),
  });
}

export async function searchBusinessesByName(name: string, max = 10): Promise<Business[]> {
  // Firestore doesn't support full-text search, so we fetch all and filter client-side
  // For production, consider Algolia or Typesense
  const snap = await getDocs(query(collection(db, "businesses"), limit(500)));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Business);
  const q = name.toLowerCase();
  return all.filter((b) => b.name.toLowerCase().includes(q)).slice(0, max);
}

export async function uploadNotificationImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `notifications/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function searchUserByEmail(email: string): Promise<AppUser[]> {
  const q = query(collection(db, "users"), where("email", "==", email), limit(5));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser);
}

// ─── Rewards Stats ──────────────────────────────────

export async function getDongStats() {
  const [usersSnap, checkInsSnap, redemptionsSnap, pointsLogSnap, promotionsSnap, offersSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "checkIns")),
    getDocs(collection(db, "redemptions")),
    getDocs(collection(db, "pointsLog")),
    getDocs(collection(db, "promotions")),
    getDocs(collection(db, "userOffers")),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const checkIns = checkInsSnap.docs.map(d => d.data());
  const redemptions = redemptionsSnap.docs.map(d => d.data());
  const pointsLog = pointsLogSnap.docs.map(d => d.data());
  const promotions = promotionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const offers = offersSnap.docs.map(d => d.data());

  // Total dong in circulation (sum of all user points)
  const totalInCirculation = users.reduce((s: number, u: any) => s + (u.points || 0), 0);

  // Total dong ever issued (sum of all pointsLog entries)
  const totalIssued = pointsLog.reduce((s: number, p: any) => s + (p.points || 0), 0);

  // Total dong redeemed/spent
  const totalRedeemed = redemptions.length;

  // Breakdown by action type
  const byAction: Record<string, { count: number; total: number }> = {};
  pointsLog.forEach((p: any) => {
    const action = p.action || "unknown";
    if (!byAction[action]) byAction[action] = { count: 0, total: 0 };
    byAction[action].count++;
    byAction[action].total += p.points || 0;
  });

  // Top earners
  const topEarners = [...users]
    .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
    .slice(0, 10)
    .map((u: any) => ({ id: u.id, name: u.displayName, email: u.email, points: u.points || 0, checkIns: u.checkInCount || 0, reviews: u.reviewCount || 0 }));

  // Active users (have points > 0)
  const activeUsers = users.filter((u: any) => (u.points || 0) > 0).length;

  // Offers stats
  const offersIssued = offers.length;
  const offersRedeemed = offers.filter((o: any) => o.status === "redeemed").length;
  const activePromotions = promotions.filter((p: any) => p.status === "active").length;

  // Recent activity (last 20 pointsLog entries)
  const recentActivity = pointsLog
    .sort((a: any, b: any) => {
      const tsA = a.timestamp?.seconds || 0;
      const tsB = b.timestamp?.seconds || 0;
      return tsB - tsA;
    })
    .slice(0, 20);

  // Daily & weekly stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const weekStart = todayStart - (6 * 86400); // 7 days ago

  const todayLog = pointsLog.filter((p: any) => (p.timestamp?.seconds || 0) >= todayStart);
  const weekLog = pointsLog.filter((p: any) => (p.timestamp?.seconds || 0) >= weekStart);
  const todayCheckIns = checkIns.filter((c: any) => (c.timestamp?.seconds || c.createdAt?.seconds || 0) >= todayStart);
  const weekCheckIns = checkIns.filter((c: any) => (c.timestamp?.seconds || c.createdAt?.seconds || 0) >= weekStart);

  const todayDong = todayLog.reduce((s: number, p: any) => s + (p.points || 0), 0);
  const weekDong = weekLog.reduce((s: number, p: any) => s + (p.points || 0), 0);

  // Unique active users today/week
  const todayActiveUsers = new Set(todayLog.map((p: any) => p.userId)).size;
  const weekActiveUsers = new Set(weekLog.map((p: any) => p.userId)).size;

  // Daily breakdown by action
  const todayByAction: Record<string, { count: number; total: number }> = {};
  todayLog.forEach((p: any) => {
    const action = p.action || "unknown";
    if (!todayByAction[action]) todayByAction[action] = { count: 0, total: 0 };
    todayByAction[action].count++;
    todayByAction[action].total += p.points || 0;
  });

  const weekByAction: Record<string, { count: number; total: number }> = {};
  weekLog.forEach((p: any) => {
    const action = p.action || "unknown";
    if (!weekByAction[action]) weekByAction[action] = { count: 0, total: 0 };
    weekByAction[action].count++;
    weekByAction[action].total += p.points || 0;
  });

  return {
    totalInCirculation,
    totalIssued,
    totalRedeemed,
    totalUsers: users.length,
    activeUsers,
    totalCheckIns: checkIns.length,
    byAction,
    topEarners,
    activePromotions,
    totalPromotions: promotions.length,
    offersIssued,
    offersRedeemed,
    recentActivity,
    // Daily
    todayDong,
    todayActions: todayLog.length,
    todayCheckIns: todayCheckIns.length,
    todayActiveUsers,
    todayByAction,
    // Weekly
    weekDong,
    weekActions: weekLog.length,
    weekCheckIns: weekCheckIns.length,
    weekActiveUsers,
    weekByAction,
  };
}

// ============================================
// Featured / Active Users (for explore page)
// ============================================

export async function getActiveUsers(limitCount = 6): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), limit(100)));
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser);
  // Sort by activity: reviews + check-ins + favorite spots
  users.sort((a, b) => {
    const aScore = (a.reviewCount || 0) + (a.checkInCount || 0) + Object.values(a.favoriteSpots || {}).flat().length;
    const bScore = (b.reviewCount || 0) + (b.checkInCount || 0) + Object.values(b.favoriteSpots || {}).flat().length;
    return bScore - aScore;
  });
  // Only return users with at least some activity
  return users.filter((u) => (u.reviewCount || 0) + (u.checkInCount || 0) > 0).slice(0, limitCount);
}

// ============================================
// User Photos (collection group query across all business photo subcollections)
// ============================================

export async function getUserPhotos(userId: string, limitCount = 20): Promise<BusinessPhoto[]> {
  const q = query(
    collectionGroup(db, "photos"),
    where("userId", "==", userId),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BusinessPhoto);
}

// ============================================
// Follows
// ============================================

export async function toggleFollow(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (currentUserId === targetUserId) return false;
  const followId = `${currentUserId}_${targetUserId}`;
  const followRef = doc(db, "follows", followId);
  const snap = await getDoc(followRef);
  const batch = writeBatch(db);

  if (snap.exists()) {
    batch.delete(followRef);
    batch.update(doc(db, "users", targetUserId), { followerCount: increment(-1) });
    batch.update(doc(db, "users", currentUserId), { followingCount: increment(-1) });
    await batch.commit();
    return false;
  } else {
    batch.set(followRef, {
      followerId: currentUserId,
      followeeId: targetUserId,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, "users", targetUserId), { followerCount: increment(1) });
    batch.update(doc(db, "users", currentUserId), { followingCount: increment(1) });
    await batch.commit();
    return true;
  }
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "follows", `${currentUserId}_${targetUserId}`));
  return snap.exists();
}

// ============================================
// Public User Profile (for share pages)
// ============================================

export async function getPublicUserProfile(userId: string): Promise<{
  displayName: string;
  photoURL?: string;
  headline?: string;
  city?: string;
  state?: string;
  profileImages?: string[];
  reviewCount: number;
  checkInCount: number;
  followerCount: number;
  followingCount: number;
  favoriteSpots?: Record<string, string[]>;
} | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    displayName: d.displayName || "Little Saigon User",
    photoURL: d.photoURL,
    headline: d.headline,
    city: d.city,
    state: d.state,
    profileImages: d.profileImages,
    reviewCount: d.reviewCount || 0,
    checkInCount: d.checkInCount || 0,
    followerCount: d.followerCount || 0,
    followingCount: d.followingCount || 0,
    favoriteSpots: d.favoriteSpots,
  };
}

// ============================================
// Blog Authors
// ============================================

export async function getBlogAuthor(slug: string): Promise<BlogAuthor | null> {
  const snap = await getDoc(doc(db, "blogAuthors", slug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BlogAuthor;
}

export async function getBlogAuthors(): Promise<BlogAuthor[]> {
  const snap = await getDocs(collection(db, "blogAuthors"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogAuthor);
}

// ============================================
// Blog Posts
// ============================================

export async function getBlogPosts(opts?: { status?: string; limitCount?: number }): Promise<BlogPost[]> {
  const constraints: any[] = [];
  if (opts?.status) constraints.push(where("status", "==", opts.status));
  const q = query(collection(db, "blogPosts"), ...constraints);
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
  posts.sort((a, b) => {
    const aTime = a.publishedAt?.seconds || a.createdAt?.seconds || 0;
    const bTime = b.publishedAt?.seconds || b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
  return opts?.limitCount ? posts.slice(0, opts.limitCount) : posts;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const q = query(collection(db, "blogPosts"), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as BlogPost;
}

export async function createBlogPost(data: Partial<BlogPost>): Promise<string> {
  const docRef = await addDoc(collection(db, "blogPosts"), {
    ...data,
    images: data.images || [],
    tags: data.tags || [],
    status: data.status || "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBlogPost(id: string, data: Partial<BlogPost>): Promise<void> {
  await updateDoc(doc(db, "blogPosts", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await deleteDoc(doc(db, "blogPosts", id));
}

export async function uploadBlogImage(postId: string, file: File): Promise<string> {
  const optimized = await optimizeImage(file);
  const path = `blog/${postId}/images/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, optimized, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
}

// ============================================
// Menu
// ============================================

export async function getMenuSections(businessId: string): Promise<MenuSection[]> {
  const q = query(
    collection(db, "businesses", businessId, "menuSections"),
    orderBy("order", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuSection);
}

export async function createMenuSection(businessId: string, data: Omit<MenuSection, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "businesses", businessId, "menuSections"), data);
  return docRef.id;
}

export async function updateMenuSection(businessId: string, sectionId: string, data: Partial<Omit<MenuSection, "id">>): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId, "menuSections", sectionId), data);
}

export async function deleteMenuSection(businessId: string, sectionId: string): Promise<void> {
  await deleteDoc(doc(db, "businesses", businessId, "menuSections", sectionId));
}

export async function updateMenuImage(businessId: string, url: string | null): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId), { menuImageUrl: url });
}
