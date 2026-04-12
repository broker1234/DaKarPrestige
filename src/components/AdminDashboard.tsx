import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp, arrayUnion, addDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Listing, UserProfile, ServiceRequest, CommissionClaim, Transaction, LeadTransfer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Rocket, Trash2, Calendar, User, Clock, CheckCircle, XCircle, ShieldCheck, ShieldAlert, Zap, Package, Mail, ExternalLink, DollarSign, Plus, Phone, Star, Settings } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AdminDashboardProps {
  onClose: () => void;
  isAdmin?: boolean;
}

export default function AdminDashboard({ onClose, isAdmin: propIsAdmin }: AdminDashboardProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [commissionClaims, setCommissionClaims] = useState<CommissionClaim[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [leadTransfers, setLeadTransfers] = useState<LeadTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'claims' | 'sales' | 'partners' | 'users' | 'withdrawals' | 'supervision' | 'maintenance'>('listings');
  const [loading, setLoading] = useState(true);
  const [boostDuration, setBoostDuration] = useState(7); // Default 7 days
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserProfile | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');

  // Use prop if provided, otherwise default to false (though App.tsx should handle this)
  const isAdmin = propIsAdmin ?? false;

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'listings');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      setServiceRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'service_requests');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, 'commission_claims'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionClaim));
      setCommissionClaims(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'commission_claims');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
      
      // Extract all withdrawal transactions from all users for the withdrawals tab
      const allWithdrawals: any[] = [];
      data.forEach(u => {
        if (u.transactions) {
          u.transactions.forEach(tx => {
            if (tx.type === 'withdrawal') {
              allWithdrawals.push({
                ...tx,
                userId: u.uid,
                userName: u.displayName || u.email,
                userPhone: u.phone
              });
            }
          });
        }
      });
      setWithdrawals(allWithdrawals.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, 'lead_transfers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadTransfer));
      setLeadTransfers(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'lead_transfers');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white p-6 text-center">
        <div className="max-w-md">
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-slate-900 mb-4">Accès Refusé</h2>
          <p className="text-slate-500 mb-8 font-medium">
            Vous n'avez pas les permissions nécessaires pour accéder au tableau de bord administratif.
          </p>
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all"
          >
            Retourner à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleBoost = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + boostDuration);
      
      await updateDoc(doc(db, 'listings', listing.id), {
        isBoosted: true,
        boostUntil: boostUntil.toISOString()
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveBoost = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        isBoosted: false,
        boostUntil: null
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTransferStatus = async (transfer: LeadTransfer, newStatus: 'En cours' | 'Vente Réussie' | 'Litige') => {
    setActionLoading(transfer.id);
    try {
      await updateDoc(doc(db, 'lead_transfers', transfer.id), {
        status: newStatus
      });

      if (newStatus === 'Vente Réussie') {
        const listingDoc = await getDoc(doc(db, 'listings', transfer.listingId));
        const commission = listingDoc.exists() ? (listingDoc.data() as Listing).commissionAideCourtier || 0 : 0;
        
        if (commission > 0 && transfer.affiliateId) {
          const affiliateRef = doc(db, 'users', transfer.affiliateId);
          const affiliateDoc = await getDoc(affiliateRef);
          
          if (affiliateDoc.exists()) {
            const currentBalance = (affiliateDoc.data() as UserProfile).balance || 0;
            const transaction: Transaction = {
              id: Math.random().toString(36).substring(2, 15),
              type: 'commission',
              amount: commission,
              description: `Commission Vente Réussie: ${transfer.listingTitle}`,
              status: 'completed',
              createdAt: new Date()
            };

            await updateDoc(affiliateRef, {
              balance: currentBalance + commission,
              transactions: arrayUnion(transaction)
            });
            alert(`Commission de ${commission.toLocaleString()} FCFA créditée à ${transfer.affiliateName}`);
          }
        }
      } else if (newStatus === 'Litige' && transfer.courtierId) {
        const brokerRef = doc(db, 'users', transfer.courtierId);
        await updateDoc(brokerRef, {
          isBlocked: true
        });
        alert(`Courtier ${transfer.courtierName} bloqué pour vérification.`);
      }
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `lead_transfers/${transfer.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVerify = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        isVerified: !listing.isVerified
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisited = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        isVisitedByTeam: !listing.isVisitedByTeam
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleExclusive = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        isExclusive: !listing.isExclusive
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlockListing = async (listing: Listing) => {
    setActionLoading(listing.id);
    try {
      const newStatus = listing.status === 'Bloqué' ? 'Disponible' : 'Bloqué';
      await updateDoc(doc(db, 'listings', listing.id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette annonce ?")) return;
    
    setActionLoading(listingId);
    try {
      await deleteDoc(doc(db, 'listings', listingId));
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.DELETE, `listings/${listingId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidateRequest = async (request: ServiceRequest) => {
    setActionLoading(request.id);
    try {
      await updateDoc(doc(db, 'service_requests', request.id), {
        status: 'Validé'
      });
      // Note: In a real app, you'd also update the listing or user profile here
      // depending on the serviceType.
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `service_requests/${request.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    setActionLoading(requestId);
    try {
      await deleteDoc(doc(db, 'service_requests', requestId));
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.DELETE, `service_requests/${requestId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateClaimStatus = async (claim: CommissionClaim, status: CommissionClaim['status']) => {
    setActionLoading(claim.id);
    try {
      await updateDoc(doc(db, 'commission_claims', claim.id), { status });
      
      if (status === 'Validé' && claim.affiliateId) {
        const userRef = doc(db, 'users', claim.affiliateId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const transactionId = Math.random().toString(36).substring(2, 15);
          const newTransaction: Transaction = {
            id: transactionId,
            type: 'commission',
            amount: claim.promisedCommission,
            description: `Commission: ${claim.listingTitle} (Client: ${claim.clientName})`,
            status: 'completed',
            createdAt: new Date()
          };

          await updateDoc(userRef, {
            balance: (userData.balance || 0) + claim.promisedCommission,
            transactions: arrayUnion(newTransaction)
          });

          // 3. Notify the Aide-Courtier
          await addDoc(collection(db, 'notifications'), {
            userId: claim.affiliateId,
            title: 'Commission Validée !',
            message: `Félicitations ! Ta commission pour "${claim.listingTitle}" a été validée par l'Admin et ajoutée à ton solde.`,
            type: 'commission',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `commission_claims/${claim.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlockUser = async (user: UserProfile) => {
    setActionLoading(user.uid);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: !user.isBlocked
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible dans la base de données.")) return;
    
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.DELETE, `users/${userId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateWithdrawalStatus = async (userId: string, txId: string, status: 'completed' | 'rejected') => {
    setActionLoading(txId);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data() as UserProfile;
      const updatedTransactions = (userData.transactions || []).map(tx => {
        if (tx.id === txId) {
          return { ...tx, status };
        }
        return tx;
      });

      // If rejected, refund the balance
      let newBalance = userData.balance || 0;
      if (status === 'rejected') {
        const tx = userData.transactions?.find(t => t.id === txId);
        if (tx) newBalance += tx.amount;
      }

      await updateDoc(doc(db, 'users', userId), {
        transactions: updatedTransactions,
        balance: newBalance
      });
    } catch (error) {
      console.error("Error updating withdrawal status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const canManageBalance = auth.currentUser?.email === "peter25ngouala@gmail.com";

  const handleAssignBroker = async (aideId: string, brokerId: string) => {
    setActionLoading(aideId);
    try {
      await updateDoc(doc(db, 'users', aideId), { brokerId });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `users/${aideId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustBalance = async (type: 'credit' | 'debit') => {
    if (!selectedUserForBalance || !balanceAdjustment || !adjustmentReason) return;
    const amount = parseInt(balanceAdjustment);
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading(selectedUserForBalance.uid);
    try {
      const userRef = doc(db, 'users', selectedUserForBalance.uid);
      const currentBalance = selectedUserForBalance.balance || 0;
      const finalAdjustment = type === 'credit' ? amount : -amount;
      const newBalance = Math.max(0, currentBalance + finalAdjustment);

      const newTransaction: Transaction = {
        id: Math.random().toString(36).substring(2, 15),
        type: type === 'credit' ? 'commission' : 'withdrawal',
        amount: amount,
        description: `Admin: ${adjustmentReason}`,
        status: 'completed',
        createdAt: new Date()
      };

      // 1. Update Aide-Courtier
      await updateDoc(userRef, {
        balance: newBalance,
        transactions: arrayUnion(newTransaction)
      });

      // 2. Update Broker if selected
      if (selectedUserForBalance.role === 'aide_courtier' && selectedBrokerId) {
        const brokerRef = doc(db, 'users', selectedBrokerId);
        const broker = users.find(u => u.uid === selectedBrokerId);
        if (broker) {
          const brokerCurrentBalance = broker.balance || 0;
          // Inverse adjustment for broker: if aide gets credit, broker gets debit
          const brokerAdjustment = type === 'credit' ? -amount : amount;
          const brokerNewBalance = Math.max(0, brokerCurrentBalance + brokerAdjustment);

          const brokerTransaction: Transaction = {
            id: Math.random().toString(36).substring(2, 15),
            type: type === 'credit' ? 'withdrawal' : 'commission',
            amount: amount,
            description: `Commission Aide-Courtier: ${selectedUserForBalance.displayName || selectedUserForBalance.email} - ${adjustmentReason}`,
            status: 'completed',
            createdAt: new Date()
          };

          await updateDoc(brokerRef, {
            balance: brokerNewBalance,
            transactions: arrayUnion(brokerTransaction)
          });
        }
      }

      setIsBalanceModalOpen(false);
      setSelectedUserForBalance(null);
      setBalanceAdjustment('');
      setAdjustmentReason('');
      setSelectedBrokerId('');
    } catch (error) {
      console.error("Error adjusting balance:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProductionReset = async () => {
    if (!window.confirm("⚠️ ATTENTION : Cette action va supprimer TOUTES les annonces, transactions et réinitialiser les soldes. Cette opération est irréversible. Voulez-vous continuer ?")) return;
    if (!window.confirm("⚠️ DERNIÈRE CONFIRMATION : Êtes-vous ABSOLUMENT sûr ?")) return;

    setActionLoading('reset');
    try {
      const batch = writeBatch(db);
      
      // 1. Delete Listings
      const listingsSnap = await getDocs(collection(db, 'listings'));
      listingsSnap.docs.forEach(d => batch.delete(d.ref));

      // 2. Delete Lead Transfers
      const transfersSnap = await getDocs(collection(db, 'lead_transfers'));
      transfersSnap.docs.forEach(d => batch.delete(d.ref));

      // 3. Delete Commission Claims
      const claimsSnap = await getDocs(collection(db, 'commission_claims'));
      claimsSnap.docs.forEach(d => batch.delete(d.ref));

      // 4. Delete Notifications
      const notifsSnap = await getDocs(collection(db, 'notifications'));
      notifsSnap.docs.forEach(d => batch.delete(d.ref));

      // 5. Delete Affiliate Clicks
      const clicksSnap = await getDocs(collection(db, 'affiliate_clicks'));
      clicksSnap.docs.forEach(d => batch.delete(d.ref));

      // 6. Delete Service Requests
      const serviceReqsSnap = await getDocs(collection(db, 'service_requests'));
      serviceReqsSnap.docs.forEach(d => batch.delete(d.ref));

      // 7. Delete Housing Requests
      const housingReqsSnap = await getDocs(collection(db, 'housing_requests'));
      housingReqsSnap.docs.forEach(d => batch.delete(d.ref));

      // 8. Delete Reviews
      const reviewsSnap = await getDocs(collection(db, 'reviews'));
      reviewsSnap.docs.forEach(d => batch.delete(d.ref));

      // 9. Reset User Balances & Transactions
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(d => {
        const userData = d.data();
        // Skip admin peter25ngouala@gmail.com
        if (userData.email !== "peter25ngouala@gmail.com") {
          batch.update(d.ref, {
            balance: 0,
            transactions: []
          });
        }
      });

      await batch.commit();
      alert("Nettoyage de production terminé avec succès !");
      setActiveTab('listings');
    } catch (error) {
      console.error("Error during production reset:", error);
      alert("Une erreur est survenue lors du nettoyage.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-6xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 truncate">Administration</h2>
              <p className="text-gray-500 text-[10px] sm:text-sm font-medium truncate">Gestion des annonces, boosts et vérifications</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          >
            <XCircle className="w-6 h-6 sm:w-8 h-8 text-gray-400" />
          </button>
        </div>

        <div className="p-4 sm:p-6 bg-blue-50 border-b border-blue-100 flex flex-col gap-4 overflow-hidden">
          <div className="flex bg-white p-1 rounded-xl border border-blue-200 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'listings' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Annonces
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Services Pro ({serviceRequests.filter(r => r.status === 'En attente').length})
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'claims' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Litiges ({commissionClaims.filter(c => c.status === 'En attente' && c.type !== 'declaration').length})
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Ventes ({commissionClaims.filter(c => c.status === 'En attente' && c.type === 'declaration').length})
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'partners' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Partenaires ({users.filter(u => u.role === 'aide_courtier').length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Utilisateurs
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Retraits ({withdrawals.filter(w => w.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('supervision')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'supervision' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
            >
              Supervision Flux
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'maintenance' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-red-600'}`}
            >
              Maintenance
            </button>
          </div>

          {activeTab === 'listings' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-bold text-gray-700">Durée du Boost :</span>
                <select 
                  value={boostDuration}
                  onChange={(e) => setBoostDuration(parseInt(e.target.value))}
                  className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 jour</option>
                  <option value={3}>3 jours</option>
                  <option value={7}>7 jours</option>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours</option>
                </select>
              </div>
              <div className="flex items-center gap-4 text-[10px] sm:text-sm font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                  <span>{listings.filter(l => l.isBoosted).length} Boostées</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>{listings.filter(l => l.isVerified).length} Vérifiées</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : activeTab === 'listings' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Annonce</th>
                    <th className="pb-4">Courtier</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {listing.images[0] ? (
                              <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Shield className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 line-clamp-1">{listing.title}</div>
                            <div className="text-xs text-blue-600 font-black">{listing.price.toLocaleString()} FCFA</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                          <User className="w-4 h-4" />
                          <span className="truncate max-w-[150px]">{listing.courtierId}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {listing.createdAt?.toDate ? listing.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          {listing.isBoosted ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black w-fit">
                              <Rocket className="w-3 h-3" />
                              BOOSTÉ
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold w-fit">
                              Standard
                            </div>
                          )}
                          {listing.isVerified && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black w-fit">
                              <ShieldCheck className="w-3 h-3" />
                              VÉRIFIÉ
                            </div>
                          )}
                          {listing.isVisitedByTeam && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black w-fit">
                              <CheckCircle className="w-3 h-3" />
                              VISITÉ
                            </div>
                          )}
                          {listing.isExclusive && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black w-fit">
                              <Star className="w-3 h-3" />
                              EXCLUSIF
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleToggleVerify(listing)}
                            disabled={actionLoading === listing.id}
                            className={`p-2 rounded-lg transition-all ${listing.isVerified ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title={listing.isVerified ? "Retirer la vérification" : "Vérifier l'annonce"}
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleToggleVisited(listing)}
                            disabled={actionLoading === listing.id}
                            className={`p-2 rounded-lg transition-all ${listing.isVisitedByTeam ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title={listing.isVisitedByTeam ? "Retirer le badge Visité" : "Marquer comme Visité"}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleToggleExclusive(listing)}
                            disabled={actionLoading === listing.id}
                            className={`p-2 rounded-lg transition-all ${listing.isExclusive ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title={listing.isExclusive ? "Retirer l'exclusivité" : "Marquer comme Exclusif"}
                          >
                            <Star className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleToggleBlockListing(listing)}
                            disabled={actionLoading === listing.id}
                            className={`p-2 rounded-lg transition-all ${listing.status === 'Bloqué' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title={listing.status === 'Bloqué' ? "Débloquer l'annonce" : "Bloquer l'annonce"}
                          >
                            <ShieldAlert className="w-5 h-5" />
                          </button>
                          {listing.isBoosted ? (
                            <button 
                              onClick={() => handleRemoveBoost(listing)}
                              disabled={actionLoading === listing.id}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="Retirer le boost"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleBoost(listing)}
                              disabled={actionLoading === listing.id}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-100"
                            >
                              <Rocket className="w-4 h-4" />
                              Booster
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(listing.id)}
                            disabled={actionLoading === listing.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer l'annonce"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'requests' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Service</th>
                    <th className="pb-4">Utilisateur</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {serviceRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            request.serviceType === 'Badge VÉRIFIÉ' ? 'bg-blue-100 text-blue-600' :
                            request.serviceType === 'PACK Agence' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {request.serviceType === 'Badge VÉRIFIÉ' ? <ShieldCheck className="w-5 h-5" /> :
                             request.serviceType === 'PACK Agence' ? <Package className="w-5 h-5" /> :
                             <Zap className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{request.serviceType}</div>
                            <div className="text-xs text-blue-600 font-black">{request.price.toLocaleString()} FCFA</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-gray-900 font-bold">
                            <User className="w-4 h-4 text-gray-400" />
                            {request.userId}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {request.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4">
                        {request.status === 'En attente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            EN ATTENTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                            <CheckCircle className="w-3 h-3" />
                            VALIDÉ
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === 'En attente' && (
                            <button 
                              onClick={() => handleValidateRequest(request)}
                              disabled={actionLoading === request.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-lg shadow-green-100 flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Valider
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {serviceRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                        Aucune demande de service pro pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'partners' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Nom du Partenaire</th>
                    <th className="pb-4">WhatsApp</th>
                    <th className="pb-4">Solde Actuel</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => u.role === 'aide_courtier').map((user) => (
                    <tr key={user.uid} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex flex-col">
                          <div className="font-bold text-gray-900">{user.displayName || 'Sans nom'}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                          <Phone className="w-4 h-4 text-blue-600" />
                          {user.phone || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg w-fit">
                          {(user.balance || 0).toLocaleString()} FCFA
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => {
                            setSelectedUserForBalance(user);
                            setSelectedBrokerId(user.brokerId || '');
                            setIsBalanceModalOpen(true);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg flex items-center gap-2 ml-auto"
                        >
                          <DollarSign className="w-4 h-4" />
                          Gérer Portefeuille
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.role === 'aide_courtier').length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-gray-400 font-medium">
                        Aucun Aide-Courtier trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Utilisateur</th>
                    <th className="pb-4">Rôle / Courtier</th>
                    <th className="pb-4">Solde</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.uid} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex flex-col">
                          <div className="font-bold text-gray-900">{user.displayName || 'Sans nom'}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-black uppercase w-fit">
                            {user.role}
                          </span>
                          {user.role === 'aide_courtier' && (
                            <select
                              value={user.brokerId || ''}
                              onChange={(e) => handleAssignBroker(user.uid, e.target.value)}
                              className="text-[10px] font-bold bg-white border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Assigner Courtier</option>
                              {users.filter(u => u.role === 'courtier').map(broker => (
                                <option key={broker.uid} value={broker.uid}>
                                  {broker.displayName || broker.email}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-slate-900">{(user.balance || 0).toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        {user.isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black">
                            <ShieldAlert className="w-3 h-3" />
                            BLOQUÉ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                            <ShieldCheck className="w-3 h-3" />
                            ACTIF
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {canManageBalance && user.role === 'aide_courtier' && (
                            <button
                              onClick={() => {
                                setSelectedUserForBalance(user);
                                setSelectedBrokerId(user.brokerId || '');
                                setIsBalanceModalOpen(true);
                              }}
                              className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-lg shadow-brand-100 flex items-center gap-1.5"
                            >
                              <DollarSign className="w-4 h-4" />
                              Solde
                            </button>
                          )}
                          <button 
                            onClick={() => handleToggleBlockUser(user)}
                            disabled={actionLoading === user.uid || user.role === 'admin'}
                            className={`p-2 rounded-lg transition-all ${user.isBlocked ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={user.isBlocked ? "Débloquer le compte" : "Bloquer le compte"}
                          >
                            <ShieldAlert className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.uid)}
                            disabled={actionLoading === user.uid || user.role === 'admin'}
                            className={`p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Supprimer le compte"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'withdrawals' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Utilisateur</th>
                    <th className="pb-4">Montant</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex flex-col">
                          <div className="font-bold text-gray-900">{w.userName}</div>
                          <div className="text-xs text-blue-600 font-black">Wave: {w.userPhone}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-slate-900">{w.amount.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-500">
                          {w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString() : 'Récemment'}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          w.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {w.status === 'pending' ? <Clock className="w-3 h-3" /> :
                           w.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                           <XCircle className="w-3 h-3" />}
                          {w.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateWithdrawalStatus(w.userId, w.id, 'completed')}
                              disabled={actionLoading === w.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Marquer comme payé"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateWithdrawalStatus(w.userId, w.id, 'rejected')}
                              disabled={actionLoading === w.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Rejeter et rembourser"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {withdrawals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                        Aucune demande de retrait pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'claims' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Aide-Courtier</th>
                    <th className="pb-4">Annonce / Client</th>
                    <th className="pb-4">Commission</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissionClaims.filter(c => c.type !== 'declaration').map((claim) => (
                    <tr key={claim.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex flex-col">
                          <div className="font-bold text-gray-900">{claim.affiliateName}</div>
                          <div className="text-xs text-gray-500">{claim.affiliateEmail}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900 line-clamp-1">{claim.listingTitle}</div>
                          <div className="text-xs text-blue-600 font-black">Client: {claim.clientName}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-gray-900">{claim.promisedCommission.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          claim.status === 'En attente' ? 'bg-amber-100 text-amber-700' :
                          claim.status === 'Validé' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {claim.status === 'En attente' ? <Clock className="w-3 h-3" /> :
                           claim.status === 'Validé' ? <CheckCircle className="w-3 h-3" /> :
                           <XCircle className="w-3 h-3" />}
                          {claim.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {claim.status === 'En attente' && (
                            <>
                              <button 
                                onClick={() => handleUpdateClaimStatus(claim, 'Validé')}
                                disabled={actionLoading === claim.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Valider la commission"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleUpdateClaimStatus(claim, 'Rejeté')}
                                disabled={actionLoading === claim.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Rejeter la commission"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={async () => {
                              if (window.confirm("Supprimer ce litige ?")) {
                                await deleteDoc(doc(db, 'commission_claims', claim.id));
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {commissionClaims.filter(c => c.type !== 'declaration').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                        Aucun litige de commission pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'supervision' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Aide-Courtier</th>
                    <th className="pb-4">Courtier Destinataire</th>
                    <th className="pb-4">Annonce</th>
                    <th className="pb-4">Heure / Alertes</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leadTransfers.map((transfer) => {
                    const transfersToThisBroker = leadTransfers.filter(t => t.affiliateId === transfer.affiliateId && t.courtierId === transfer.courtierId);
                    const successfulSalesToThisBroker = leadTransfers.filter(t => t.affiliateId === transfer.affiliateId && t.courtierId === transfer.courtierId && t.status === 'Vente Réussie');
                    const hasAlert = transfersToThisBroker.length > 5 && successfulSalesToThisBroker.length === 0;

                    return (
                      <tr key={transfer.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-2">
                          <div className="font-bold text-gray-900">{transfer.affiliateName}</div>
                        </td>
                        <td className="py-4">
                          <div className="font-bold text-blue-600">{transfer.courtierName}</div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm text-gray-900 font-medium">{transfer.listingTitle}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {transfer.listingId}</div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-500">
                              {transfer.createdAt?.toDate ? transfer.createdAt.toDate().toLocaleString() : 'Récemment'}
                            </div>
                            {hasAlert && (
                              <div className="p-1 bg-red-100 text-red-600 rounded-lg animate-pulse" title="Alerte: Plus de 5 transferts sans vente déclarée">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            transfer.status === 'Vente Réussie' ? 'bg-green-100 text-green-700' :
                            transfer.status === 'Litige' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {transfer.status || 'En cours'}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdateTransferStatus(transfer, 'En cours')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="En cours"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateTransferStatus(transfer, 'Vente Réussie')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Vente Réussie"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateTransferStatus(transfer, 'Litige')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Signaler Litige"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {leadTransfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-400 font-medium">
                        Aucun flux de mise en relation à superviser.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'sales' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Annonce & Courtier</th>
                    <th className="pb-4">Aide-Courtier</th>
                    <th className="pb-4">Preuve Wave</th>
                    <th className="pb-4">Commission</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissionClaims.filter(c => c.type === 'declaration').map((claim) => (
                    <tr key={claim.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-gray-900">{claim.listingTitle}</div>
                        <div className="text-xs text-blue-600 font-bold">Par: {claim.courtierName}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-900 font-bold">{claim.affiliateName || 'Direct'}</div>
                        <div className="text-xs text-gray-500">{claim.affiliateEmail}</div>
                      </td>
                      <td className="py-4">
                        {claim.proofImageUrl ? (
                          <a href={claim.proofImageUrl} target="_blank" rel="noopener noreferrer" className="relative block w-20 h-12 rounded-lg overflow-hidden border border-gray-200 group/img">
                            <img src={claim.proofImageUrl} alt="Preuve" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <ExternalLink className="w-4 h-4 text-white" />
                            </div>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Aucune preuve</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="font-black text-emerald-600">{claim.promisedCommission.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        {claim.status === 'En attente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            À VALIDER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                            <CheckCircle className="w-3 h-3" />
                            APPROUVÉ
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-2">
                        {claim.status === 'En attente' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateClaimStatus(claim, 'Validé')}
                              disabled={actionLoading === claim.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              APPROUVER
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {commissionClaims.filter(c => c.type === 'declaration').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-400 font-medium">
                        Aucune vente à valider pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'maintenance' ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4">Nettoyage de Production</h3>
              <p className="text-gray-500 max-w-md mb-8 font-medium">
                Cette action supprimera toutes les données de test (annonces, transactions, notifications) et réinitialisera les soldes des utilisateurs à 0 FCFA.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl mb-8 text-left max-w-lg">
                <h4 className="text-amber-800 font-black mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Actions qui seront effectuées :
                </h4>
                <ul className="text-amber-700 text-sm space-y-2 font-medium">
                  <li>• Suppression de toutes les <strong>Annonces</strong></li>
                  <li>• Suppression de toutes les <strong>Mises en Relation</strong></li>
                  <li>• Suppression de tous les <strong>Litiges et Ventes</strong></li>
                  <li>• Suppression de toutes les <strong>Notifications</strong></li>
                  <li>• Réinitialisation des <strong>Soldes Portefeuille</strong> à 0 FCFA</li>
                  <li>• Vidage de l'historique des <strong>Transactions</strong></li>
                </ul>
              </div>

              <button
                onClick={handleProductionReset}
                disabled={actionLoading === 'reset'}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-red-100 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {actionLoading === 'reset' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
                LANCER LE NETTOYAGE FINAL
              </button>
              
              <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
                Action irréversible • Réservé à l'administrateur
              </p>
            </div>
          ) : null}
        </div>

        {/* Balance Adjustment Modal */}
        <AnimatePresence>
          {isBalanceModalOpen && selectedUserForBalance && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !actionLoading && setIsBalanceModalOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Modifier Solde</h3>
                      <p className="text-xs text-slate-500 font-medium">{selectedUserForBalance.displayName || selectedUserForBalance.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsBalanceModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-300" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Solde Actuel</p>
                    <p className="text-2xl font-black text-slate-900">{(selectedUserForBalance.balance || 0).toLocaleString()} FCFA</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant de l'ajustement</label>
                    <input
                      type="number"
                      value={balanceAdjustment}
                      onChange={(e) => setBalanceAdjustment(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-black text-lg transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif de l'ajustement</label>
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Ex: Commission Vente Villa Almadies"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold text-sm transition-all"
                    />
                  </div>

                  {selectedUserForBalance.role === 'aide_courtier' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Courtier Concerné (Optionnel)</label>
                      <select
                        value={selectedBrokerId}
                        onChange={(e) => setSelectedBrokerId(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold text-sm transition-all"
                      >
                        <option value="">Aucun courtier (Ajustement direct)</option>
                        {users.filter(u => u.role === 'courtier').map(broker => (
                          <option key={broker.uid} value={broker.uid}>
                            {broker.displayName || broker.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium italic">
                        Si sélectionné, le solde du courtier sera ajusté inversement.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleAdjustBalance('credit')}
                      disabled={!!actionLoading || !balanceAdjustment || !adjustmentReason}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter Commission
                    </button>
                    <button
                      onClick={() => handleAdjustBalance('debit')}
                      disabled={!!actionLoading || !balanceAdjustment || !adjustmentReason}
                      className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                      Enregistrer Paiement
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
