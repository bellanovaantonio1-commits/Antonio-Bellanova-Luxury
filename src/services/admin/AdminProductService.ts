import { auth } from "../../lib/firebase";

/**
 * Service for administrative product operations.
 * Handles communication with the backend API for persistent data management.
 */
export const adminProductService = {
  /**
   * Deletes a product and all its associated data (SQL, Firestore, Storage).
   * @param productId The ID of the product to delete (SQL numeric ID or Firestore string ID)
   */
  async deleteProduct(productId: string | number): Promise<void> {
    if (!productId) {
      throw new Error("Produkt-ID fehlt.");
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Nicht authentifiziert. Bitte melden Sie sich erneut an.");
      }

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Produkt konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.");
      }

      console.log(`Product ${productId} deleted successfully from all systems.`);
    } catch (error: any) {
      console.error(`Error in AdminProductService.deleteProduct(${productId}):`, error);
      throw error;
    }
  },

  /**
   * Deletes all products and associated media.
   */
  async deleteAllProducts(): Promise<void> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Nicht authentifiziert.");
      }

      const response = await fetch('/api/admin/products/all', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${idToken}` 
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Löschen der gesamten Datenbank.");
      }
    } catch (error: any) {
      console.error("Error in AdminProductService.deleteAllProducts():", error);
      throw error;
    }
  }
};
