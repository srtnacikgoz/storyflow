/**
 * Instagram Graph API Service
 * Instagram Automation - Sade Patisserie
 *
 * Story posting process:
 * 1. Create story container (upload image URL with media_type=STORIES)
 * 2. Publish story (make it live on Instagram)
 *
 * Note: Stories are 24-hour temporary content
 * Recommended dimensions: 1080x1920 (9:16 aspect ratio)
 */

import {InstagramPost} from "../types";
import {withRetry, createLogger} from "../utils";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";
const logger = createLogger("Instagram");

/**
 * Instagram API Error
 */
export class InstagramApiError extends Error {
  /** HTTP status code */
  public statusCode?: number;
  /** Instagram error code */
  public errorCode?: string;

  /**
   * Create Instagram API Error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Instagram error code
   */
  constructor(
    message: string,
    statusCode?: number,
    errorCode?: string
  ) {
    super(message);
    this.name = "InstagramApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/**
 * Instagram Graph API Service
 * Handles all Instagram API interactions (Stories)
 */
export class InstagramService {
  private accountId: string;
  private accessToken: string;

  /**
   * Create Instagram Service
   * @param {string} accountId - Instagram Business Account ID
   * @param {string} accessToken - Instagram Graph API access token
   */
  constructor(accountId: string, accessToken: string) {
    this.accountId = accountId;
    this.accessToken = accessToken;
  }

  /**
   * Create story container
   * Step 1: Upload image URL to Instagram as Story
   *
   * @param {string} imageUrl - Public URL of the image (1080x1920 recommended)
   * @return {Promise<string>} Container ID (creation_id) for publishing
   */
  private async createStoryContainer(imageUrl: string): Promise<string> {
    const url = `${INSTAGRAM_API_BASE}/${this.accountId}/media`;

    const params = new URLSearchParams({
      image_url: imageUrl,
      media_type: "STORIES",
      access_token: this.accessToken,
    });

    console.log("[Instagram] Creating story container...");

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || "Failed to create container";
      const errorCode = data.error?.code;

      console.error("[Instagram] Container creation failed:", errorMessage);

      // Handle specific error cases
      if (response.status === 400 && errorCode === 190) {
        throw new InstagramApiError(
          "Access token expired. Please refresh your token.",
          response.status,
          errorCode
        );
      }

      if (response.status === 429) {
        throw new InstagramApiError(
          "Rate limit exceeded. Please try again later.",
          response.status,
          "RATE_LIMIT"
        );
      }

      throw new InstagramApiError(errorMessage, response.status, errorCode);
    }

    console.log("[Instagram] Story container created:", data.id);
    return data.id;
  }

  /**
   * Publish story
   * Step 2: Make the story container live on Instagram
   *
   * @param {string} containerId - Container ID from createStoryContainer
   * @return {Promise<string>} Media ID (Instagram story ID)
   */
  private async publishStory(containerId: string): Promise<string> {
    const url = `${INSTAGRAM_API_BASE}/${this.accountId}/media_publish`;

    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken,
    });

    console.log("[Instagram] Publishing story...");

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || "Failed to publish story";
      const errorCode = data.error?.code;

      console.error("[Instagram] Publish failed:", errorMessage);

      // Container might not be ready yet
      if (errorCode === "9007") {
        throw new InstagramApiError(
          "Story container is not ready. Please wait and retry.",
          response.status,
          errorCode
        );
      }

      throw new InstagramApiError(errorMessage, response.status, errorCode);
    }

    console.log("[Instagram] Story published:", data.id);
    return data.id;
  }

  /**
   * Create and publish a story to Instagram
   * Main public method - combines container creation and publishing
   * Includes retry logic for transient failures
   *
   * @param {string} imageUrl - Public URL of the image (1080x1920 recommended)
   * @param {string} caption - Caption (for logging/tracking only, not shown)
   * @return {Promise<InstagramPost>} InstagramPost object with story details
   */
  async createStory(imageUrl: string, caption: string): Promise<InstagramPost> {
    logger.info("Starting story creation", {imageUrl, caption: caption.substring(0, 50)});

    // Step 1: Create story container
    const containerId = await this.createStoryContainer(imageUrl);

    // Small delay to ensure container is ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 2: Publish the story with retry logic
    // Container might not be ready immediately
    const mediaId = await withRetry(
      () => this.publishStory(containerId),
      {
        maxAttempts: 5,
        initialDelay: 3000,
        maxDelay: 15000,
        isRetryable: (error) => {
          if (error instanceof InstagramApiError) {
            // Retry on "container not ready" error
            return error.errorCode === "9007";
          }
          return false;
        },
        onRetry: (attempt, error, delay) => {
          logger.warn(`Publish retry ${attempt}`, {
            containerId,
            delay,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }
    );

    const story: InstagramPost = {
      id: mediaId,
      imageUrl: imageUrl,
      caption: caption,
      timestamp: Date.now(),
    };

    logger.success({storyId: mediaId});
    return story;
  }

  /**
   * Legacy method - redirects to createStory
   * Kept for backwards compatibility
   *
   * @param {string} imageUrl - Public URL of the image
   * @param {string} caption - Caption for tracking
   * @return {Promise<InstagramPost>} InstagramPost object
   */
  async createPost(imageUrl: string, caption: string): Promise<InstagramPost> {
    return this.createStory(imageUrl, caption);
  }

  /**
   * Get media info (optional, for debugging)
   * Retrieves details about a posted media
   *
   * @param {string} mediaId - Instagram media ID
   * @return {Promise<object>} Media details
   */
  async getMediaInfo(mediaId: string): Promise<{
    id: string;
    permalink?: string;
    timestamp?: string;
    caption?: string;
  }> {
    const url = `${INSTAGRAM_API_BASE}/${mediaId}`;

    const params = new URLSearchParams({
      fields: "id,permalink,timestamp,caption",
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramApiError(
        data.error?.message || "Failed to get media info",
        response.status,
        data.error?.code
      );
    }

    return data;
  }

  /**
   * Validate access token
   * Quick check to ensure token is still valid
   *
   * @return {Promise<object>} Account info if valid
   */
  async validateToken(): Promise<{id: string; name?: string}> {
    // Use the account ID to validate token
    const url = `${INSTAGRAM_API_BASE}/${this.accountId}`;

    const params = new URLSearchParams({
      fields: "id,name",
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramApiError(
        data.error?.message || "Invalid access token",
        response.status,
        data.error?.code
      );
    }

    return data;
  }
}
