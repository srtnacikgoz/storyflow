"use strict";
/**
 * Firestore Queue Service
 * Instagram Automation - Sade Patisserie
 *
 * Manages the media queue for scheduled Instagram Stories
 * Collection: media-queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const COLLECTION_NAME = "media-queue";
/**
 * Queue Service for Firestore operations
 */
class QueueService {
    /**
     * Create Queue Service
     */
    constructor() {
        this.db = (0, firestore_1.getFirestore)();
    }
    /**
     * Get collection reference
     * @return {FirebaseFirestore.CollectionReference} Collection reference
     */
    get collection() {
        return this.db.collection(COLLECTION_NAME);
    }
    /**
     * Add new item to queue
     * @param {Partial<Photo>} data - Photo data
     * @return {Promise<Photo>} Created photo with ID
     */
    async addToQueue(data) {
        const now = Date.now();
        // Build document without undefined values
        const docData = {
            filename: data.filename || "",
            originalUrl: data.originalUrl || "",
            caption: data.caption || "",
            uploadedAt: data.uploadedAt || now,
            processed: false,
            status: "pending",
            productCategory: data.productCategory || "chocolate",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            // AI Enhancement alanları
            aiModel: data.aiModel || "gemini-flash",
            styleVariant: data.styleVariant || "lifestyle-moments",
            faithfulness: data.faithfulness ?? 0.7,
        };
        // Only add optional fields if they have values
        if (data.productName)
            docData.productName = data.productName;
        if (data.productSubType)
            docData.productSubType = data.productSubType;
        if (data.targetAudience)
            docData.targetAudience = data.targetAudience;
        if (data.optimalTime)
            docData.optimalTime = data.optimalTime;
        if (data.dayPreference)
            docData.dayPreference = data.dayPreference;
        if (data.messageType)
            docData.messageType = data.messageType;
        // Caption template alanları
        if (data.captionTemplateId)
            docData.captionTemplateId = data.captionTemplateId;
        if (data.captionTemplateName) {
            docData.captionTemplateName = data.captionTemplateName;
        }
        if (data.captionVariables)
            docData.captionVariables = data.captionVariables;
        // Scheduling alanları
        docData.schedulingMode = data.schedulingMode || "immediate";
        if (data.scheduledFor)
            docData.scheduledFor = data.scheduledFor;
        if (data.scheduledDayHour)
            docData.scheduledDayHour = data.scheduledDayHour;
        const docRef = await this.collection.add(docData);
        console.log("[Queue] Added item:", docRef.id);
        const photo = {
            id: docRef.id,
            filename: docData.filename,
            originalUrl: docData.originalUrl,
            caption: docData.caption,
            uploadedAt: docData.uploadedAt,
            processed: false,
            status: "pending",
            productCategory: docData.productCategory || "chocolate",
            productName: data.productName,
            productSubType: data.productSubType,
            targetAudience: data.targetAudience,
            optimalTime: data.optimalTime,
            dayPreference: data.dayPreference,
            messageType: data.messageType,
            // AI Enhancement alanları
            aiModel: docData.aiModel || "gemini-flash",
            styleVariant: docData.styleVariant || "lifestyle-moments",
            faithfulness: docData.faithfulness ?? 0.7,
            // Caption template alanları
            captionTemplateId: data.captionTemplateId,
            captionTemplateName: data.captionTemplateName,
            captionVariables: data.captionVariables,
            // Scheduling alanları
            schedulingMode: docData.schedulingMode || "immediate",
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
    async getNextPending() {
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
    async getPendingByCategory(category) {
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
    async getAllPending() {
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
    async getCompletedItems(limit = 50) {
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
    async markAsProcessing(id) {
        await this.collection.doc(id).update({
            status: "processing",
            processingStartedAt: firestore_1.FieldValue.serverTimestamp(),
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
    async markAsCompleted(id, enhancedUrl, storyId) {
        await this.collection.doc(id).update({
            status: "completed",
            processed: true,
            enhancedUrl: enhancedUrl,
            igPostId: storyId,
            completedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        console.log("[Queue] Marked as completed:", id);
    }
    /**
     * Update item as failed
     * @param {string} id - Document ID
     * @param {string} error - Error message
     * @return {Promise<void>}
     */
    async markAsFailed(id, error) {
        await this.collection.doc(id).update({
            status: "failed",
            error: error,
            failedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        console.log("[Queue] Marked as failed:", id, error);
    }
    /**
     * Get item by ID
     * @param {string} id - Document ID
     * @return {Promise<Photo | null>} Photo or null
     */
    async getById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return {
            id: doc.id,
            ...this.mapDocToPhoto(doc.data()),
        };
    }
    /**
     * Delete item from queue
     * @param {string} id - Document ID
     * @return {Promise<void>}
     */
    async delete(id) {
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
    async update(id, data) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            console.log("[Queue] Update failed - item not found:", id);
            return null;
        }
        const currentData = doc.data();
        // Sadece pending, failed veya rejected durumundaki öğeler güncellenebilir
        const editableStatuses = ["pending", "failed", "rejected"];
        if (!editableStatuses.includes(currentData.status)) {
            console.log("[Queue] Update failed - item not editable:", id, currentData.status);
            throw new Error(`Bu öğe düzenlenemez. Mevcut durum: ${currentData.status}`);
        }
        // Güncellenebilir alanlar
        const updateData = {};
        if (data.productName !== undefined)
            updateData.productName = data.productName;
        if (data.productCategory !== undefined) {
            updateData.productCategory = data.productCategory;
        }
        if (data.caption !== undefined)
            updateData.caption = data.caption;
        if (data.aiModel !== undefined)
            updateData.aiModel = data.aiModel;
        if (data.styleVariant !== undefined)
            updateData.styleVariant = data.styleVariant;
        if (data.faithfulness !== undefined)
            updateData.faithfulness = data.faithfulness;
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
        if (data.scheduledFor !== undefined)
            updateData.scheduledFor = data.scheduledFor;
        if (data.scheduledDayHour !== undefined) {
            updateData.scheduledDayHour = data.scheduledDayHour;
        }
        // Failed/rejected durumundan pending'e çevir
        if (currentData.status !== "pending") {
            updateData.status = "pending";
            updateData.error = firestore_1.FieldValue.delete();
        }
        updateData.updatedAt = firestore_1.FieldValue.serverTimestamp();
        await this.collection.doc(id).update(updateData);
        console.log("[Queue] Updated item:", id);
        // Güncel veriyi döndür
        const updatedDoc = await this.collection.doc(id).get();
        return {
            id: updatedDoc.id,
            ...this.mapDocToPhoto(updatedDoc.data()),
        };
    }
    /**
     * Get queue statistics
     * @return {Promise<object>} Queue stats
     */
    async getStats() {
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
    async updateEnhancementStatus(id, isEnhanced, error) {
        const updateData = {
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
    async resetFailed() {
        const snapshot = await this.collection
            .where("status", "==", "failed")
            .get();
        const batch = this.db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: "pending",
                error: firestore_1.FieldValue.delete(),
                failedAt: firestore_1.FieldValue.delete(),
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
    async markAsAwaitingApproval(id, telegramMessageId, enhancedUrl) {
        const updateData = {
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
    async markAsApproved(id) {
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
    async markAsRejected(id, reason) {
        const updateData = {
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
    async markForRegeneration(id) {
        await this.collection.doc(id).update({
            status: "pending",
            approvalStatus: "none",
            approvalRequestedAt: firestore_1.FieldValue.delete(),
            approvalRespondedAt: firestore_1.FieldValue.delete(),
            telegramMessageId: firestore_1.FieldValue.delete(),
            enhancedUrl: firestore_1.FieldValue.delete(),
            isEnhanced: firestore_1.FieldValue.delete(),
            enhancementError: firestore_1.FieldValue.delete(),
        });
        console.log("[Queue] Marked for regeneration:", id);
    }
    /**
     * Mark item as timeout
     * Called when approval timeout is reached
     * @param {string} id - Document ID
     * @return {Promise<void>}
     */
    async markAsTimeout(id) {
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
    async getAwaitingApproval() {
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
    async getTimedOutItems(timeoutMinutes) {
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
     * Map Firestore document to Photo type
     * @param {FirebaseFirestore.DocumentData} data - Document data
     * @return {Omit<Photo, "id">} Photo without ID
     */
    mapDocToPhoto(data) {
        return {
            filename: data.filename || "",
            originalUrl: data.originalUrl || "",
            enhancedUrl: data.enhancedUrl,
            caption: data.caption || "",
            uploadedAt: data.uploadedAt instanceof firestore_1.Timestamp ?
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
    async markAsScheduled(id, scheduledFor) {
        await this.collection.doc(id).update({
            status: "scheduled",
            scheduledFor: scheduledFor,
        });
        console.log("[Queue] Marked as scheduled:", id, new Date(scheduledFor).toISOString());
    }
    /**
     * Get scheduled posts that are due (scheduledFor <= now)
     * SADECE "scheduled" status'ündeki (Telegram'dan onaylanmış) item'ları döndürür
     * CRITICAL: "pending" item'lar dahil edilmemeli - bunlar henüz onaylanmamış!
     * @return {Promise<Photo[]>} Due scheduled posts (only approved ones)
     */
    async getDueScheduledPosts() {
        const now = Date.now();
        // SADECE scheduled (onaylanmış) item'ları al
        // pending item'lar Telegram onayı bekliyor, otomatik paylaşılmamalı!
        const scheduledSnapshot = await this.collection
            .where("status", "==", "scheduled")
            .where("scheduledFor", "<=", now)
            .orderBy("scheduledFor", "asc")
            .limit(10)
            .get();
        const scheduledPosts = scheduledSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...this.mapDocToPhoto(doc.data()),
        }));
        return scheduledPosts;
    }
    /**
     * Get all scheduled posts (for display)
     * scheduledFor değeri olan tüm pending/scheduled item'ları döndürür
     * @return {Promise<Photo[]>} All scheduled posts
     */
    async getScheduledPosts() {
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
exports.QueueService = QueueService;
//# sourceMappingURL=queue.js.map