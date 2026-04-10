import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Listing } from '../types';

/**
 * Notifies all affiliates who have clicked on a listing that it has been rented.
 */
export async function notifyAffiliatesOnClose(listing: Listing) {
  try {
    // 1. Get all unique affiliates who clicked this listing
    const clicksQuery = query(collection(db, 'affiliate_clicks'), where('listingId', '==', listing.id));
    const clicksSnapshot = await getDocs(clicksQuery);
    
    const affiliateIds = new Set<string>();
    clicksSnapshot.forEach(doc => {
      affiliateIds.add(doc.data().affiliateId);
    });

    if (affiliateIds.size === 0) return;

    // 2. Create notifications for each affiliate
    const notificationPromises = Array.from(affiliateIds).map(affiliateId => {
      return addDoc(collection(db, 'notifications'), {
        userId: affiliateId,
        title: "Logement Loué",
        message: `L'annonce "${listing.title}" à ${listing.neighborhood} vient d'être louée. La chasse est finie pour ce logement !`,
        type: "info",
        read: false,
        listingId: listing.id,
        createdAt: serverTimestamp()
      });
    });

    await Promise.all(notificationPromises);
    console.log(`Notified ${affiliateIds.size} affiliates for listing ${listing.id}`);
  } catch (error) {
    console.error("Error notifying affiliates:", error);
  }
}

/**
 * Closes a listing and triggers notifications.
 */
export async function closeListing(listingId: string, listing: Listing) {
  try {
    const listingRef = doc(db, 'listings', listingId);
    await updateDoc(listingRef, {
      status: "Loué"
    });
    
    // Trigger notifications
    await notifyAffiliatesOnClose({ ...listing, id: listingId, status: "Loué" });
  } catch (error) {
    console.error("Error closing listing:", error);
    throw error;
  }
}
