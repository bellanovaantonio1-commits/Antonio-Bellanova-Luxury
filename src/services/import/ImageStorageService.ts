import { adminStorage } from "../../lib/firebase-admin.ts";
import firebaseConfig from "../../../firebase-applet-config.json";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class ImageStorageService {
  private get bucket() {
    const bucketName = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`;
    return adminStorage.bucket(bucketName);
  }

  /**
   * Downloads an image from a URL and uploads it to Firebase Storage.
   * Returns the public URL of the stored image.
   */
  async uploadFromUrl(url: string, destinationPath: string): Promise<string> {
    try {
      console.log(`Downloading image from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/jpeg";
      
      // Determine file extension
      const ext = path.extname(new URL(url).pathname) || ".jpg";
      const fileName = `${uuidv4()}${ext}`;
      const fullPath = path.join(destinationPath, fileName);
      
      // Bucket fallback strategy
      const dbId = firebaseConfig.firestoreDatabaseId;
      const bucketNames = [
        firebaseConfig.storageBucket,
        dbId && dbId.startsWith('ai-studio-') ? `${dbId}.firebasestorage.app` : null,
        dbId && dbId.startsWith('ai-studio-') ? `${dbId}.appspot.com` : null,
        dbId && dbId.startsWith('ai-studio-') ? dbId : null,
        `${firebaseConfig.projectId}.firebasestorage.app`,
        `${firebaseConfig.projectId}.appspot.com`,
        firebaseConfig.projectId
      ].filter(Boolean) as string[];

      // Deduplicate
      const uniqueBuckets = [...new Set(bucketNames)];
      
      let lastError = null;
      for (const bucketName of uniqueBuckets) {
        try {
          const currentBucket = adminStorage.bucket(bucketName);
          const file = currentBucket.file(fullPath);
          
          console.log(`Uploading to Firebase Storage (Bucket: ${bucketName}): ${fullPath}`);
          await file.save(buffer, {
            metadata: {
              contentType: contentType,
            },
          });
          
          const encodedPath = encodeURIComponent(fullPath);
          return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
        } catch (uploadError: any) {
          lastError = uploadError;
          console.warn(`Upload to bucket ${bucketName} failed: ${uploadError.message}`);
          // Continue to next bucket if this one fails
        }
      }

      console.error(`All upload attempts failed for ${url}. Last error: ${lastError?.message}`);
      return url; // Fallback to original URL
    } catch (error: any) {
      console.error(`Error in uploadFromUrl for ${url}:`, error);
      
      if (error.response) {
        console.error("Gaxios Response Data:", JSON.stringify(error.response.data, null, 2));
        console.error("Gaxios Response Status:", error.response.status);
      }
      
      if (error.errors) {
        console.error("Gaxios Detailed Errors:", JSON.stringify(error.errors, null, 2));
      }

      // Fallback to original URL if upload fails (or we could rethrow)
      return url;
    }
  }

  async processProductImages(urls: string[], sku: string): Promise<string[]> {
    const destinationPath = `products/${sku || 'unknown'}`;
    const uploadPromises = urls.map(url => this.uploadFromUrl(url, destinationPath));
    return Promise.all(uploadPromises);
  }

  /**
   * Deletes all images in a product's folder in Firebase Storage.
   */
  async deleteProductMedia(sku: string): Promise<void> {
    if (!sku || sku === 'unknown') return;
    
    try {
      const destinationPath = `products/${sku}`;
      const [files] = await this.bucket.getFiles({ prefix: destinationPath });
      
      if (files.length > 0) {
        console.log(`Deleting ${files.length} images from storage for SKU: ${sku}`);
        const deletePromises = files.map(file => file.delete());
        await Promise.all(deletePromises);
        console.log(`Successfully deleted storage folder for SKU: ${sku}`);
      }
    } catch (error: any) {
      console.warn(`Failed to delete storage files for SKU ${sku}: ${error.message}`);
      // Don't throw, just log it as a warning
    }
  }
}

export const imageStorageService = new ImageStorageService();
