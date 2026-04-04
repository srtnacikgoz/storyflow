/**
 * Ideas Controller
 * Fikir Defteri CRUD endpoint'leri
 */

import { createHttpFunction, errorResponse, db } from "./shared";

const COLLECTION = "ideas";

/**
 * Fikirleri listele (en yeni en üstte)
 */
export const listIdeas = createHttpFunction(async (req, res) => {
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json({ success: true, data });
}, { timeoutSeconds: 10, minInstances: 0 });

/**
 * Yeni fikir oluştur
 */
export const createIdea = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { title, text, category } = req.body as {
    title?: string;
    text: string;
    category?: string;
  };

  if (!text?.trim()) {
    res.status(400).json({ success: false, error: "text is required" });
    return;
  }

  const idea = {
    title: title?.trim() || "",
    text: text.trim(),
    category: category || "genel",
    done: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const docRef = await db.collection(COLLECTION).add(idea);

  res.json({
    success: true,
    data: { id: docRef.id, ...idea },
  });
}, { timeoutSeconds: 10, minInstances: 0 });

/**
 * Fikir güncelle (done toggle vb.)
 */
export const updateIdea = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body as {
    id: string;
    done?: boolean;
    title?: string;
    text?: string;
    category?: string;
  };

  if (!id) {
    res.status(400).json({ success: false, error: "id is required" });
    return;
  }

  await db.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });

  res.json({ success: true });
}, { timeoutSeconds: 10, minInstances: 0 });

/**
 * Fikir sil
 */
export const deleteIdea = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id } = req.body as { id: string };

  if (!id) {
    res.status(400).json({ success: false, error: "id is required" });
    return;
  }

  await db.collection(COLLECTION).doc(id).delete();

  res.json({ success: true });
}, { timeoutSeconds: 10, minInstances: 0 });
