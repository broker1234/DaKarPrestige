import { useEffect } from 'react';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, doc, writeBatch, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface BoostManagerProps {
  isAdmin: boolean;
}

export default function BoostManager({ isAdmin }: BoostManagerProps) {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!isAdmin || !user || !auth.currentUser) return;

    // Query for scheduled boosts that are ready to be activated
    const q = query(
      collection(db, 'demandes_boost'),
      where('status', '==', 'approuve_programme')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const now = new Date();
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const requestDoc of snapshot.docs) {
        const request = requestDoc.data();
        const startDateTime = new Date(request.startDateTime);

        if (now >= startDateTime) {
          try {
            // 1. Activate boost on listing
            if (request.listingId && request.listingId !== 'account_wide') {
              const listingRef = doc(db, 'listings', request.listingId);
              const listingDoc = await getDoc(listingRef);
              
              if (listingDoc.exists()) {
                batch.update(listingRef, {
                  isBoosted: true,
                  boostExpiresAt: new Date(now.getTime() + request.duration * 24 * 60 * 60 * 1000)
                });
                
                // 2. Update request status to 'actif'
                batch.update(requestDoc.ref, { status: 'actif' });
                hasChanges = true;
              } else {
                // Listing might have been deleted, mark request as invalid or just ignore
                console.warn(`Listing ${request.listingId} not found for boost activation`);
                batch.update(requestDoc.ref, { status: 'rejete' });
                hasChanges = true;
              }
            } else if (request.serviceName === "PACK Agence" || request.serviceName === "Badge VÉRIFIÉ") {
               // These are usually immediate, but handle just in case
               batch.update(requestDoc.ref, { status: 'valide' });
               hasChanges = true;
            }
          } catch (error) {
            console.error("Error activating scheduled boost:", error);
          }
        }
      }

      if (hasChanges) {
        try {
          await batch.commit();
          console.log("Scheduled boosts activated successfully");
        } catch (error) {
          console.error("Error committing boost activation batch:", error);
        }
      }
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'demandes_boost');
    });

    return () => unsubscribe();
  }, [isAdmin, user]);

  return null; // This component doesn't render anything
}
