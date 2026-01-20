/**
 * Firestore Queue Service
 * Instagram Automation - Sade Patisserie
 *
 * Manages the media queue for scheduled Instagram Stories
 * Collection: media-queue
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { Photo, ProductCategory } from "../types";

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
    // Caption template alanları
    if (data.captionTemplateId) docData.captionTemplateId = data.captionTemplateId;
    if (data.captionTemplateName) {
      docData.captionTemplateName = data.captionTemplateName;
    }
    if (data.captionVariables) docData.captionVariables = data.captionVariables;
    // Scheduling alanları
    docData.schedulingMode = data.schedulingMode || "immediate";
    if (data.scheduledFor) docData.scheduledFor = data.scheduledFor;
    if (data.scheduledDayHour) docData.scheduledDayHour = data.scheduledDayHour;

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
      // Caption template alanları
      captionTemplateId: data.captionTemplateId,
      captionTemplateName: data.captionTemplateName,
      captionVariables: data.captionVariables,
      // Scheduling alanları
      schedulingMode: (docData.schedulingMode as Photo["schedulingMode"]) || "immediate",
      scheduledFor: data.scheduledFor,
      scheduledDayHour: data.scheduledDayHour,
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
   * Update item in queue
   * Only allows updating pending items
   * @param {string} id - Document ID
   * @param {Partial<Photo>} data - Fields to update
   * @return {Promise<Photo | null>} Updated photo or null if not found
   */
  async update(id: string, data: Partial<Photo>): Promise<Photo | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      console.log("[Queue] Update failed - item not found:", id);
      return null;
    }

    const currentData = doc.data()!;

    // Sadece pending, failed veya rejected durumundaki öğeler güncellenebilir
    const editableStatuses = ["pending", "failed", "rejected"];
    if (!editableStatuses.includes(currentData.status)) {
      console.log("[Queue] Update failed - item not editable:", id, currentData.status);
      throw new Error(`Bu öğe düzenlenemez. Mevcut durum: ${currentData.status}`);
    }

    // Güncellenebilir alanlar
    const updateData: Record<string, unknown> = {};

    if (data.productName !== undefined) updateData.productName = data.productName;
    if (data.productCategory !== undefined) {
      updateData.productCategory = data.productCategory;
    }
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
    if (data.styleVariant !== undefined) updateData.styleVariant = data.styleVariant;
    if (data.faithfulness !== undefined) updateData.faithfulness = data.faithfulness;
    if (data.captionTemplateId !== undefined) {
      updateData.captionTemplateId = data.captionTemplateId;
    }
    if (data.captionTemplateName !== undefined) {
      updateData.captionTemplateName = data.captionTemplateName;
    }
    if (data.captionVariables !== undefined) {
      updateData.captionVariables = data.captionVariables;
    }
    if (data.schedulingMode !== undefined) {
      updateData.schedulingMode = data.schedulingMode;
    }
    if (data.scheduledFor !== undefined) updateData.scheduledFor = data.scheduledFor;
    if (data.scheduledDayHour !== undefined) {
      updateData.scheduledDayHour = data.scheduledDayHour;
    }

    // Failed/rejected durumundan pending'e çevir
    if (currentData.status !== "pending") {
      updateData.status = "pending";
      updateData.error = FieldValue.delete();
    }

    updateData.updatedAt = FieldValue.serverTimestamp();

    await this.collection.doc(id).update(updateData);
    console.log("[Queue] Updated item:", id);

    // Güncel veriyi döndür
    const updatedDoc = await this.collection.doc(id).get();
    return {
      id: updatedDoc.id,
      ...this.mapDocToPhoto(updatedDoc.data()!),
    };
  }

  /**
   * Get queue statistics
   * @return {Promise<object>} Queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    scheduled: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, scheduled, completed, failed] = await Promise.all([
      this.collection.where("status", "==", "pending").count().get(),
      this.collection.where("status", "==", "processing").count().get(),
      this.collection.where("status", "==", "scheduled").count().get(),
      this.collection.where("status", "==", "completed").count().get(),
      this.collection.where("status", "==", "failed").count().get(),
    ]);

    const stats = {
      pending: pending.data().count,
      processing: processing.data().count,
      scheduled: scheduled.data().count,
      completed: completed.data().count,
      failed: failed.data().count,
      total: 0,
    };

    stats.total = stats.pending + stats.processing + stats.scheduled +
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

  // ==========================================
  // TELEGRAM APPROVAL METHODS (Phase 6)
  // ==========================================

  /**
   * Mark item as awaiting approval
   * Called after Gemini processing, before sending to Telegram
   * @param {string} id - Document ID
   * @param {number} telegramMessageId - Telegram message ID
   * @param {string} enhancedUrl - Enhanced image URL
   * @return {Promise<void>}
   */
  async markAsAwaitingApproval(
    id: string,
    telegramMessageId: number,
    enhancedUrl?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status: "awaiting_approval",
      approvalStatus: "awaiting",
      approvalRequestedAt: Date.now(),
      telegramMessageId: telegramMessageId,
    };

    // Eğer enhanced URL varsa kaydet
    if (enhancedUrl) {
      updateData.enhancedUrl = enhancedUrl;
    }

    await this.collection.doc(id).update(updateData);
    console.log("[Queue] Marked as awaiting approval:", id);
  }

  /**
   * Mark item as approved
   * Called when user clicks approve button in Telegram
   * @param {string} id - Document ID
   * @return {Promise<void>}
   */
  async markAsApproved(id: string): Promise<void> {
    await this.collection.doc(id).update({
      approvalStatus: "approved",
      approvalRespondedAt: Date.now(),
    });
    console.log("[Queue] Marked as approved:", id);
  }

  /**
   * Mark item as rejected
   * Called when user clicks reject button in Telegram
   * @param {string} id - Document ID
   * @param {string} reason - Optional rejection reason
   * @return {Promise<void>}
   */
  async markAsRejected(id: string, reason?: string): Promise<void> {
    const updateData: Record<string, unknown> = {
      status: "rejected",
      approvalStatus: "rejected",
      approvalRespondedAt: Date.now(),
    };

    if (reason) {
      updateData.rejectionReason = reason;
    }

    await this.collection.doc(id).update(updateData);
    console.log("[Queue] Marked as rejected:", id);
  }

  /**
   * Mark item for regeneration
   * Resets to pending so it can be processed again
   * @param {string} id - Document ID
   * @return {Promise<void>}
   */
  async markForRegeneration(id: string): Promise<void> {
    await this.collection.doc(id).update({
      status: "pending",
      approvalStatus: "none",
      approvalRequestedAt: FieldValue.delete(),
      approvalRespondedAt: FieldValue.delete(),
      telegramMessageId: FieldValue.delete(),
      enhancedUrl: FieldValue.delete(),
      isEnhanced: FieldValue.delete(),
      enhancementError: FieldValue.delete(),
    });
    console.log("[Queue] Marked for regeneration:", id);
  }

  /**
   * Mark item as timeout
   * Called when approval timeout is reached
   * @param {string} id - Document ID
   * @return {Promise<void>}
   */
  async markAsTimeout(id: string): Promise<void> {
    await this.collection.doc(id).update({
      status: "rejected",
      approvalStatus: "timeout",
      approvalRespondedAt: Date.now(),
      rejectionReason: "Zaman aşımı - otomatik iptal",
    });
    console.log("[Queue] Marked as timeout:", id);
  }

  /**
   * Get items awaiting approval
   * @return {Promise<Photo[]>} Items awaiting approval
   */
  async getAwaitingApproval(): Promise<Photo[]> {
    const snapshot = await this.collection
      .where("status", "==", "awaiting_approval")
      .orderBy("approvalRequestedAt", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));
  }

  /**
   * Get timed out items (awaiting approval past timeout)
   * @param {number} timeoutMinutes - Timeout in minutes
   * @return {Promise<Photo[]>} Timed out items
   */
  async getTimedOutItems(timeoutMinutes: number): Promise<Photo[]> {
    const timeoutThreshold = Date.now() - (timeoutMinutes * 60 * 1000);

    const snapshot = await this.collection
      .where("status", "==", "awaiting_approval")
      .where("approvalRequestedAt", "<", timeoutThreshold)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));
  }

  /**
   * Helper to remove undefined values from object
   */
  private removeUndefined(obj: Record<string, any>): Record<string, any> {
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    return obj;
  }

  /**
   * Map Firestore document to Photo type
   * @param {FirebaseFirestore.DocumentData} data - Document data
   * @return {Omit<Photo, "id">} Photo without ID
   */
  private mapDocToPhoto(
    data: FirebaseFirestore.DocumentData
  ): Omit<Photo, "id"> {
    const photo = {
      filename: data.filename || "",
      originalUrl: data.originalUrl || "",
      enhancedUrl: data.enhancedUrl,
      caption: data.caption || "",
      uploadedAt: data.uploadedAt instanceof Timestamp ?
        data.uploadedAt.toMillis() :
        data.uploadedAt || 0,
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
      // Telegram approval alanları
      approvalStatus: data.approvalStatus,
      approvalRequestedAt: data.approvalRequestedAt,
      approvalRespondedAt: data.approvalRespondedAt,
      telegramMessageId: data.telegramMessageId,
      rejectionReason: data.rejectionReason,
      // Caption template alanları
      captionTemplateId: data.captionTemplateId,
      captionTemplateName: data.captionTemplateName,
      captionVariables: data.captionVariables,
      // Scheduling alanları
      schedulingMode: data.schedulingMode || "immediate",
      scheduledFor: data.scheduledFor,
      scheduledDayHour: data.scheduledDayHour,
    };

    return this.removeUndefined(photo) as Omit<Photo, "id">;
  }

  // ==========================================
  // SCHEDULING METHODS (Phase 8)
  // ==========================================

  /**
   * Mark item as scheduled (waiting for scheduled time)
   * @param {string} id - Document ID
   * @param {number} scheduledFor - Timestamp when to post
   * @return {Promise<void>}
   */
  async markAsScheduled(id: string, scheduledFor: number): Promise<void> {
    await this.collection.doc(id).update({
      status: "scheduled",
      scheduledFor: scheduledFor,
    });
    console.log("[Queue] Marked as scheduled:", id, new Date(scheduledFor).toISOString());
  }

  /**
   * Get scheduled posts that are due (scheduledFor <= now)
   * Hem "scheduled" hem "pending" status'ündeki zamanlanmış item'ları kontrol eder
   * @return {Promise<Photo[]>} Due scheduled posts
   */
  async getDueScheduledPosts(): Promise<Photo[]> {
    const now = Date.now();

    // Hem scheduled hem pending olanları kontrol et
    // (çünkü bazı item'lar pending olarak kalabilir)
    const [scheduledSnapshot, pendingSnapshot] = await Promise.all([
      this.collection
        .where("status", "==", "scheduled")
        .where("scheduledFor", "<=", now)
        .orderBy("scheduledFor", "asc")
        .limit(10)
        .get(),
      this.collection
        .where("status", "==", "pending")
        .where("scheduledFor", "<=", now)
        .orderBy("scheduledFor", "asc")
        .limit(10)
        .get(),
    ]);

    const scheduledPosts = scheduledSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));

    const pendingPosts = pendingSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));

    // Birleştir ve scheduledFor'a göre sırala
    return [...scheduledPosts, ...pendingPosts]
      .sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0))
      .slice(0, 10);
  }

  /**
   * Get all scheduled posts (for display)
   * scheduledFor değeri olan tüm pending/scheduled item'ları döndürür
   * @return {Promise<Photo[]>} All scheduled posts
   */
  async getScheduledPosts(): Promise<Photo[]> {
    // Hem scheduled hem pending + scheduledFor olanları çek
    const [scheduledSnapshot, pendingSnapshot] = await Promise.all([
      this.collection
        .where("status", "==", "scheduled")
        .orderBy("scheduledFor", "asc")
        .get(),
      this.collection
        .where("status", "==", "pending")
        .orderBy("scheduledFor", "asc")
        .get(),
    ]);

    const scheduledPosts = scheduledSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...this.mapDocToPhoto(doc.data()),
    }));

    // Sadece scheduledFor değeri olan pending item'ları dahil et
    const pendingPosts = pendingSnapshot.docs
      .filter((doc) => doc.data().scheduledFor)
      .map((doc) => ({
        id: doc.id,
        ...this.mapDocToPhoto(doc.data()),
      }));

    return [...scheduledPosts, ...pendingPosts]
      .sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0));
  }
}
