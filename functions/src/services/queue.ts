/**
 * Firestore Queue Service
 * Instagram Automation - Sade Patisserie
 *
 * Manages the media queue for scheduled Instagram Stories
 * Collection: media-queue
 */

import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {Photo, ProductCategory} from "../types";

const COLLECTION_NAME = "media-queue";

/**
 * Queue Service for Firestore operations
 */
export class QueueService {
  private db: FirebaseFirestore.Firestore;

  /**
   * Create Queue Service
   */
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Get collection reference
   * @return {FirebaseFirestore.CollectionReference} Collection reference
   */
  private get collection(): FirebaseFirestore.CollectionReference {
    return this.db.collection(COLLECTION_NAME);
  }

  /**
   * Add new item to queue
   * @param {Partial<Photo>} data - Photo data
   * @return {Promise<Photo>} Created photo with ID
   */
  async addToQueue(data: Partial<Photo>): Promise<Photo> {
    const now = Date.now();

    // Build document without undefined values
    const docData: Record<string, unknown> = {
      filename: data.filename || "",
      originalUrl: data.originalUrl || "",
      caption: data.caption || "",
      uploadedAt: data.uploadedAt || now,
      processed: false,
      status: "pending",
      productCategory: data.productCategory || "chocolate",
      createdAt: FieldValue.serverTimestamp(),
      // AI Enhancement alanları
      aiModel: data.aiModel || "gemini-flash",
      styleVariant: data.styleVariant || "lifestyle-moments",
      faithfulness: data.faithfulness ?? 0.7,
    };

    // Only add optional fields if they have values
    if (data.productName) docData.productName = data.productName;
    if (data.productSubType) docData.productSubType = data.productSubType;
    if (data.targetAudience) docData.targetAudience = data.targetAudience;
    if (data.optimalTime) docData.optimalTime = data.optimalTime;
    if (data.dayPreference) docData.dayPreference = data.dayPreference;
    if (data.messageType) docData.messageType = data.messageType;

    const docRef = await this.collection.add(docData);

    console.log("[Queue] Added item:", docRef.id);

    const photo: Photo = {
      id: docRef.id,
      filename: docData.filename as string,
      originalUrl: docData.originalUrl as string,
      caption: docData.caption as string,
      uploadedAt: docData.uploadedAt as number,
      processed: false,
      status: "pending",
      productCategory: (docData.productCategory as ProductCategory) || "chocolate",
      productName: data.productName,
      productSubType: data.productSubType,
      targetAudience: data.targetAudience,
      optimalTime: data.optimalTime,
      dayPreference: data.dayPreference,
      messageType: data.messageType,
      // AI Enhancement alanları
      aiModel: (docData.aiModel as Photo["aiModel"]) || "gemini-flash",
      styleVariant: (docData.styleVariant as Photo["styleVariant"]) || "lifestyle-moments",
      faithfulness: (docData.faithfulness as number) ?? 0.7,
    };

    return photo;
  }

  /**
   * Get next pending item from queue
   * Returns the oldest pending item
   * @return {Promise<Photo | null>} Next pending photo or null
   */
  async getNextPending(): Promise<Photo | null> {
    const snapshot = await this.collection
      .where("status", "==", "pending")
      .orderBy("uploadedAt", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("[Queue] No pending items found");
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...this.mapDocToPhoto(data),
    };
  }

  /**
   * Get pending items by category
   * @param {ProductCategory} category - Product category
   * @return {Promise<Photo[]>} Pending photos in category
   */
  async getPendingByCategory(category: ProductCategory): Promise<Photo[]> {
    const snapshot = await this.collection
      .where("status", "==", "pending")
      .where("productCategory", "==", category)
      .orderBy("uploadedAt", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));
  }

  /**
   * Get all pending items
   * @return {Promise<Photo[]>} All pending photos
   */
  async getAllPending(): Promise<Photo[]> {
    const snapshot = await this.collection
      .where("status", "==", "pending")
      .orderBy("uploadedAt", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));
  }

  /**
   * Get all completed items (for archive)
   * Returns completed items sorted by completion date (newest first)
   * @param {number} limit - Maximum items to return
   * @return {Promise<Photo[]>} Completed photos
   */
  async getCompletedItems(limit: number = 50): Promise<Photo[]> {
    const snapshot = await this.collection
      .where("status", "==", "completed")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));
  }

  /**
   * Update item status to processing
   * @param {string} id - Document ID
   * @return {Promise<void>}
   */
  async markAsProcessing(id: string): Promise<void> {
    await this.collection.doc(id).update({
      status: "processing",
      processingStartedAt: FieldValue.serverTimestamp(),
    });
    console.log("[Queue] Marked as processing:", id);
  }

  /**
   * Update item as completed
   * @param {string} id - Document ID
   * @param {string} enhancedUrl - Enhanced image URL
   * @param {string} storyId - Instagram story ID
   * @return {Promise<void>}
   */
  async markAsCompleted(
    id: string,
    enhancedUrl: string,
    storyId: string
  ): Promise<void> {
    await this.collection.doc(id).update({
      status: "completed",
      processed: true,
      enhancedUrl: enhancedUrl,
      igPostId: storyId,
      completedAt: FieldValue.serverTimestamp(),
    });
    console.log("[Queue] Marked as completed:", id);
  }

  /**
   * Update item as failed
   * @param {string} id - Document ID
   * @param {string} error - Error message
   * @return {Promise<void>}
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    await this.collection.doc(id).update({
      status: "failed",
      error: error,
      failedAt: FieldValue.serverTimestamp(),
    });
    console.log("[Queue] Marked as failed:", id, error);
  }

  /**
   * Get item by ID
   * @param {string} id - Document ID
   * @return {Promise<Photo | null>} Photo or null
   */
  async getById(id: string): Promise<Photo | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()!),
    };
  }

  /**
   * Delete item from queue
   * @param {string} id - Document ID
   * @return {Promise<void>}
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
    console.log("[Queue] Deleted item:", id);
  }

  /**
   * Get queue statistics
   * @return {Promise<object>} Queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.collection.where("status", "==", "pending").count().get(),
      this.collection.where("status", "==", "processing").count().get(),
      this.collection.where("status", "==", "completed").count().get(),
      this.collection.where("status", "==", "failed").count().get(),
    ]);

    const stats = {
      pending: pending.data().count,
      processing: processing.data().count,
      completed: completed.data().count,
      failed: failed.data().count,
      total: 0,
    };

    stats.total = stats.pending + stats.processing +
      stats.completed + stats.failed;

    return stats;
  }

  /**
   * Update enhancement status
   * @param {string} id - Document ID
   * @param {boolean} isEnhanced - Whether AI enhancement was successful
   * @param {string} error - Error message if enhancement failed
   * @return {Promise<void>}
   */
  async updateEnhancementStatus(
    id: string,
    isEnhanced: boolean,
    error?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      isEnhanced,
    };
    if (error) {
      updateData.enhancementError = error;
    }
    await this.collection.doc(id).update(updateData);
    console.log("[Queue] Updated enhancement status:", id, isEnhanced);
  }

  /**
   * Reset failed items to pending
   * @return {Promise<number>} Number of items reset
   */
  async resetFailed(): Promise<number> {
    const snapshot = await this.collection
      .where("status", "==", "failed")
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "pending",
        error: FieldValue.delete(),
        failedAt: FieldValue.delete(),
      });
    });

    await batch.commit();
    console.log("[Queue] Reset failed items:", snapshot.size);
    return snapshot.size;
  }

  /**
   * Map Firestore document to Photo type
   * @param {FirebaseFirestore.DocumentData} data - Document data
   * @return {Omit<Photo, "id">} Photo without ID
   */
  private mapDocToPhoto(
    data: FirebaseFirestore.DocumentData
  ): Omit<Photo, "id"> {
    return {
      filename: data.filename || "",
      originalUrl: data.originalUrl || "",
      enhancedUrl: data.enhancedUrl,
      caption: data.caption || "",
      uploadedAt: data.uploadedAt instanceof Timestamp ?
        data.uploadedAt.toMillis() :
        data.uploadedAt || 0,
      scheduledTime: data.scheduledTime instanceof Timestamp ?
        data.scheduledTime.toMillis() :
        data.scheduledTime,
      processed: data.processed || false,
      status: data.status || "pending",
      igPostId: data.igPostId,
      error: data.error,
      productCategory: data.productCategory || "chocolate",
      productSubType: data.productSubType,
      productName: data.productName,
      targetAudience: data.targetAudience,
      optimalTime: data.optimalTime,
      dayPreference: data.dayPreference,
      messageType: data.messageType,
      analytics: data.analytics,
      // AI Enhancement alanları
      aiModel: data.aiModel || "gemini-flash",
      styleVariant: data.styleVariant || "lifestyle-moments",
      faithfulness: data.faithfulness ?? 0.7,
      isEnhanced: data.isEnhanced,
      enhancementError: data.enhancementError,
    };
  }
}
