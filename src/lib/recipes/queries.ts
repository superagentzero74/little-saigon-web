import { db } from "../firebase";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as firestoreLimit, serverTimestamp, Timestamp,
} from "firebase/firestore";
import type { Recipe, RecipeCategory, RecipeRegion } from "../types/recipe";

const RECIPES_COLLECTION = "recipes";

// ============================================
// Public queries
// ============================================

export async function getPublishedRecipes(options?: {
  category?: RecipeCategory;
  region?: RecipeRegion;
  limit?: number;
}): Promise<Recipe[]> {
  // Simple query — filter and sort client-side to avoid composite index requirements
  const q = query(
    collection(db, RECIPES_COLLECTION),
    where("status", "==", "published"),
    firestoreLimit(200),
  );
  const snapshot = await getDocs(q);
  let results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe);

  if (options?.category) {
    results = results.filter((r) => r.category === options.category);
  }
  if (options?.region) {
    results = results.filter((r) => r.region === options.region);
  }

  // Sort: featured first, then seedScore desc, then publishedAt desc
  results.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (a.seedScore !== b.seedScore) return b.seedScore - a.seedScore;
    return 0;
  });

  return results.slice(0, options?.limit || 24);
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const q = query(
    collection(db, RECIPES_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", "published"),
    firestoreLimit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Recipe;
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const docRef = doc(db, RECIPES_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Recipe;
}

// ============================================
// Admin queries
// ============================================

export async function getAllRecipesAdmin(options?: {
  limit?: number;
}): Promise<Recipe[]> {
  const q = query(
    collection(db, RECIPES_COLLECTION),
    firestoreLimit(options?.limit || 200),
  );
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe);
  // Sort client-side by updatedAt desc
  results.sort((a: any, b: any) => {
    const aTime = a.updatedAt?.seconds || 0;
    const bTime = b.updatedAt?.seconds || 0;
    return bTime - aTime;
  });
  return results.slice(0, options?.limit || 50);
}

// ============================================
// Write operations
// ============================================

export async function createRecipe(data: Omit<Recipe, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, RECIPES_COLLECTION), docData);
  return docRef.id;
}

export async function updateRecipe(id: string, data: Partial<Recipe>): Promise<void> {
  const docRef = doc(db, RECIPES_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  const docRef = doc(db, RECIPES_COLLECTION, id);
  await deleteDoc(docRef);
}
