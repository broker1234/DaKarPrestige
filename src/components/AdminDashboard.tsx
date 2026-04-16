import { useState, useEffect, ReactNode } from 'react';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp, arrayUnion, addDoc, getDocs, writeBatch, where, increment } from 'firebase/firestore';
import { Listing, UserProfile, ServiceRequest, CommissionClaim, Transaction, LeadTransfer, HousingRequest } from '../types';
import AdminPaymentManagement from './AdminPaymentManagement';
import PromoCodeManager from './PromoCodeManager';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Rocket, Trash2, Calendar, User, Clock, CheckCircle, XCircle, ShieldCheck, ShieldAlert, Zap, Package, Mail, ExternalLink, DollarSign, Plus, Phone, Star, Settings, Landmark, Loader2, Timer, ArrowLeft, LayoutGrid, Activity, Tag, Video, Users, Home, MessageCircle, CheckCircle2, Bell } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatPrice, timeAgo } from '../lib/utils';

interface AdminDashboardProps {
  key?: string;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function AdminDashboard({ onClose, isAdmin: propIsAdmin }: AdminDashboardProps) {
  const [user] = useAuthState(auth);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [commissionClaims, setCommissionClaims] = useState<CommissionClaim[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [boostRequests, setBoostRequests] = useState<any[]>([]);
  const [leadTransfers, setLeadTransfers] = useState<LeadTransfer[]>([]);
  const [pendingRechargesCount, setPendingRechargesCount] = useState(0);
  const [videoAccessRequests, setVideoAccessRequests] = useState<any[]>([]);
  const [housingRequests, setHousingRequests] = useState<HousingRequest[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const markAlertAsRead = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'admin_alerts', alertId), {
        status: 'read',
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const markAllAlertsAsRead = async () => {
    try {
      const batch = writeBatch(db);
      adminAlerts.forEach(alert => {
        if (alert.status === 'unread') {
          batch.update(doc(db, 'admin_alerts', alert.id), {
            status: 'read',
            readAt: serverTimestamp()
          });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
    }
  };
  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'claims' | 'sales' | 'partners' | 'users' | 'withdrawals' | 'supervision' | 'maintenance' | 'payments' | 'boosts' | 'upcoming_boosts' | 'promos' | 'video_access' | 'housing_requests' | 'alerts'>('listings');
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
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
    if (!isAdmin || !user) return;

    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'listings');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      setServiceRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'service_requests');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'commission_claims'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionClaim));
      setCommissionClaims(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'commission_claims');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'withdrawal_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawalRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'withdrawal_requests');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user || !auth.currentUser) return;

    const q = query(collection(db, 'demandes_boost'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBoostRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'demandes_boost');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user || !auth.currentUser) return;

    const q = query(collection(db, 'lead_transfers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadTransfer));
      setLeadTransfers(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'lead_transfers');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'recharge_requests'), where('status', '==', 'en_attente'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingRechargesCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'recharge_requests');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'video_access_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideoAccessRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'video_access_requests');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'housing_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HousingRequest));
      setHousingRequests(data);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'housing_requests');
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin !== true || !user) return;

    const q = query(collection(db, 'admin_alerts'), where('status', '==', 'unread'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Play sound if new alert (not on initial load)
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const audio = document.createElement('audio');
            audio.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
            audio.play().catch(e => console.log("Audio play failed:", e));
          }
        });
      }

      setAdminAlerts(data);
      setIsInitialLoad(false);
    }, (error) => {
      console.error("Error listening to admin alerts:", error);
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

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

  const handleApproveBoost = async (request: any) => {
    setActionLoading(request.id);
    try {
      const batch = writeBatch(db);
      
      // 1. Update request status
      const requestRef = doc(db, 'demandes_boost', request.id);
      batch.update(requestRef, { status: 'approuve_programme' });
      
      // 2. Deduct from user balance
      const userRef = doc(db, 'users', request.courtierId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("Utilisateur introuvable");
      
      const currentBalance = userDoc.data().balance || 0;
      if (currentBalance < request.amount) throw new Error("Solde insuffisant");
      
      const transaction: Transaction = {
        id: Math.random().toString(36).substring(2, 15),
        type: 'purchase',
        amount: request.amount,
        description: `${request.serviceName || 'Boost'} - ${request.listingTitle}`,
        status: 'completed',
        createdAt: new Date()
      };
      
      batch.update(userRef, {
        balance: increment(-request.amount),
        transactions: arrayUnion(transaction)
      });
      
      // 3. Activate boost, verification or account pack
      if (request.serviceName === "PACK Agence") {
        batch.update(userRef, {
          plan: "Agence"
        });
        batch.update(requestRef, { status: 'valide' }); // Immediate for packs
      } else if (request.serviceName === "Badge VÉRIFIÉ") {
        batch.update(userRef, { isGoldVerified: true });
        if (request.listingId && request.listingId !== 'account_wide') {
          const listingRef = doc(db, 'listings', request.listingId);
          batch.update(listingRef, { isVerified: true });
        }
        batch.update(requestRef, { status: 'valide' }); // Immediate for verification
      }
      
      await batch.commit();
      alert(`${request.serviceName || 'Boost'} approuvé et programmé avec succès !`);
    } catch (error: any) {
      console.error("Error approving boost:", error);
      alert(error.message || "Erreur lors de l'approbation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRefundBoost = async (request: any) => {
    if (!confirm("Voulez-vous vraiment annuler ce boost et rembourser le courtier ?")) return;
    
    setActionLoading(request.id);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete request
      const requestRef = doc(db, 'demandes_boost', request.id);
      batch.delete(requestRef);
      
      // 2. Refund user
      const userRef = doc(db, 'users', request.courtierId);
      const transaction: Transaction = {
        id: Math.random().toString(36).substring(2, 15),
        type: 'deposit',
        amount: request.amount,
        description: `Remboursement Boost annulé - ${request.listingTitle}`,
        status: 'completed',
        createdAt: new Date()
      };
      
      batch.update(userRef, {
        balance: increment(request.amount),
        transactions: arrayUnion(transaction)
      });
      
      await batch.commit();
      alert("Boost annulé et courtier remboursé !");
    } catch (error: any) {
      console.error("Error cancelling boost:", error);
      alert("Erreur lors de l'annulation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBoost = async (requestId: string) => {
    if (!window.confirm("Rejeter cette demande de boost ?")) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'demandes_boost', requestId), { status: 'rejete' });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `demandes_boost/${requestId}`);
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
            balance: increment(claim.promisedCommission),
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

  const handleUpdateWithdrawalRequest = async (request: any, status: 'valide' | 'rejete') => {
    setActionLoading(request.id);
    try {
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data() as UserProfile;
      
      if (status === 'valide') {
        // Deduct from balance and add transaction
        const transaction: Transaction = {
          id: Math.random().toString(36).substring(2, 15),
          type: 'withdrawal',
          amount: request.amount,
          description: `Retrait ${request.method} validé`,
          status: 'completed',
          createdAt: new Date()
        };

        await updateDoc(userRef, {
          balance: increment(-request.amount),
          transactions: arrayUnion(transaction)
        });
      }

      await updateDoc(doc(db, 'withdrawal_requests', request.id), { status });
      
      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        title: status === 'valide' ? 'Retrait Validé' : 'Retrait Rejeté',
        message: status === 'valide' 
          ? `Votre retrait de ${request.amount.toLocaleString()} FCFA via ${request.method} a été validé.`
          : `Votre retrait de ${request.amount.toLocaleString()} FCFA via ${request.method} a été rejeté.`,
        type: status === 'valide' ? 'success' : 'warning',
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `withdrawal_requests/${request.id}`);
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

  const handleApproveVideoAccess = async (request: any) => {
    setActionLoading(request.id);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', request.userId);
      const requestRef = doc(db, 'video_access_requests', request.id);

      // 1. Update user profile
      if (request.type === 'business') {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 30);
        batch.update(userRef, {
          hasVideoAccess: true,
          videoAccessExpiration: expiration.toISOString()
        });
      } else {
        // Single access is handled per listing, but we can mark the user as having a pending single access
        // Actually, for single access, we should probably update the listing that was being created.
        // But the request doesn't have listingId yet if it was a new listing.
        // The user's request said: "Option Single (2 000 FCFA) : Débloquez l'upload vidéo pour l'annonce en cours de création uniquement."
        // In AddListingModal, we set hasVideoAccess to true on the listing if single access is purchased.
        // So for single access, we might need a different flow or just trust the client-side flag if it's paid.
        // However, the user said "après validation admin".
        // Let's assume for single access, we just approve the request and the user can then publish.
        batch.update(userRef, {
          hasVideoAccess: true // Temporary or specific flag
        });
      }

      // 2. Deduct balance
      batch.update(userRef, {
        balance: increment(-request.amount),
        transactions: arrayUnion({
          id: Math.random().toString(36).substring(2, 15),
          type: 'purchase',
          amount: request.amount,
          description: `Accès Vidéo - ${request.type === 'business' ? 'Pass Business' : 'Option Single'}`,
          status: 'completed',
          createdAt: new Date()
        })
      });

      // 3. Update request status
      batch.update(requestRef, { status: 'valide' });

      await batch.commit();
      alert("Accès vidéo approuvé !");
    } catch (error) {
      console.error("Error approving video access:", error);
      alert("Erreur lors de l'approbation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectVideoAccess = async (requestId: string) => {
    if (!window.confirm("Rejeter cette demande d'accès vidéo ?")) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'video_access_requests', requestId), { status: 'rejete' });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `video_access_requests/${requestId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteHousingRequest = async (requestId: string) => {
    if (!window.confirm("Supprimer cette demande de logement ?")) return;
    setActionLoading(requestId);
    try {
      await deleteDoc(doc(db, 'housing_requests', requestId));
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.DELETE, `housing_requests/${requestId}`);
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
        key="admin-dashboard-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-6xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            {viewMode === 'detail' && (
              <button 
                onClick={() => setViewMode('grid')}
                className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-600 mr-2"
                title="Retour au tableau de bord"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 bg-blue-600 rounded-xl text-white flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 truncate">
                {viewMode === 'grid' ? 'Tableau de Bord Admin' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('_', ' ')}
              </h2>
              <p className="text-gray-500 text-[10px] sm:text-sm font-medium truncate">
                {viewMode === 'grid' ? 'Gestion globale de Dakar Prestige' : 'Gestion détaillée de la section'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'detail' && (
              <button
                onClick={() => setViewMode('grid')}
                className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                <LayoutGrid className="w-4 h-4" />
                Tableau de bord
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            >
              <XCircle className="w-6 h-6 sm:w-8 h-8 text-gray-400" />
            </button>
          </div>
        </div>

        {viewMode === 'detail' && (
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
                onClick={() => setActiveTab('payments')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 flex items-center gap-2 ${activeTab === 'payments' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Paiements ({pendingRechargesCount})
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 flex items-center gap-2 ${activeTab === 'alerts' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-red-600'}`}
              >
                Alertes ({adminAlerts.length})
                {adminAlerts.length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Retraits ({withdrawalRequests.filter(w => w.status === 'en_attente').length})
              </button>
              <button
                onClick={() => setActiveTab('supervision')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'supervision' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Supervision Flux
              </button>
              <button
                onClick={() => setActiveTab('boosts')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'boosts' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Services ({boostRequests.filter(b => b.status === 'en_attente').length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming_boosts')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'upcoming_boosts' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Boosts à venir ({boostRequests.filter(b => b.status === 'approuve_programme').length})
              </button>
              <button
                onClick={() => setActiveTab('promos')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'promos' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Promos
              </button>
              <button
                onClick={() => setActiveTab('video_access')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'video_access' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Accès Vidéo ({videoAccessRequests.filter(r => r.status === 'en_attente').length})
              </button>
              <button
                onClick={() => setActiveTab('housing_requests')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex-shrink-0 ${activeTab === 'housing_requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-blue-600'}`}
              >
                Demandes Logement ({housingRequests.length})
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
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Finance Section - Green */}
              <DashboardTile 
                title="Paiements" 
                icon={<Landmark className="w-8 h-8" />} 
                count={pendingRechargesCount} 
                color="bg-emerald-600" 
                onClick={() => { setActiveTab('payments'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Retraits" 
                icon={<ExternalLink className="w-8 h-8" />} 
                count={withdrawalRequests.filter(w => w.status === 'en_attente').length} 
                color="bg-emerald-600" 
                onClick={() => { setActiveTab('withdrawals'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Ventes" 
                icon={<DollarSign className="w-8 h-8" />} 
                count={commissionClaims.filter(c => c.status === 'En attente' && c.type === 'declaration').length} 
                color="bg-emerald-600" 
                onClick={() => { setActiveTab('sales'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Litiges" 
                icon={<ShieldAlert className="w-8 h-8" />} 
                count={commissionClaims.filter(c => c.status === 'En attente' && c.type !== 'declaration').length} 
                color="bg-emerald-600" 
                onClick={() => { setActiveTab('claims'); setViewMode('detail'); }} 
              />

              {/* Operations Section - Deep Blue */}
              <DashboardTile 
                title="Annonces" 
                icon={<Package className="w-8 h-8" />} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('listings'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Services Pro" 
                icon={<Zap className="w-8 h-8" />} 
                count={serviceRequests.filter(r => r.status === 'En attente').length} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('requests'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Boosts" 
                icon={<Rocket className="w-8 h-8" />} 
                count={boostRequests.filter(b => b.status === 'en_attente').length} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('boosts'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Boosts à venir" 
                icon={<Timer className="w-8 h-8" />} 
                count={boostRequests.filter(b => b.status === 'approuve_programme').length} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('upcoming_boosts'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Accès Vidéo" 
                icon={<Video className="w-8 h-8" />} 
                count={videoAccessRequests.filter(r => r.status === 'en_attente').length} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('video_access'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Demandes Logement" 
                icon={<Home className="w-8 h-8" />} 
                count={housingRequests.length} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('housing_requests'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Partenaires" 
                icon={<Users className="w-8 h-8" />} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('partners'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Promos" 
                icon={<Tag className="w-8 h-8" />} 
                color="bg-[#002147]" 
                onClick={() => { setActiveTab('promos'); setViewMode('detail'); }} 
              />

              {/* Maintenance Section - Dark Gray */}
              <DashboardTile 
                title="Utilisateurs" 
                icon={<User className="w-8 h-8" />} 
                color="bg-slate-800" 
                onClick={() => { setActiveTab('users'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Supervision" 
                icon={<Activity className="w-8 h-8" />} 
                color="bg-slate-800" 
                onClick={() => { setActiveTab('supervision'); setViewMode('detail'); }} 
              />
              <DashboardTile 
                title="Maintenance" 
                icon={<Settings className="w-8 h-8" />} 
                color="bg-slate-800" 
                onClick={() => { setActiveTab('maintenance'); setViewMode('detail'); }} 
              />
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
                          {listing.createdAt?.toDate ? listing.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A'}
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
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-blue-600 font-black">{request.price.toLocaleString()} FCFA</div>
                              {request.paymentMethod && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                  request.paymentMethod === 'Wallet' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {request.paymentMethod}
                                </span>
                              )}
                            </div>
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
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A'}
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
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Détails de la demande</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawalRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex flex-col">
                          <div className="font-bold text-gray-900">
                            L'utilisateur <span className="text-blue-600">{request.userName}</span> ({request.firstName} {request.lastName}) demande un retrait de <span className="text-red-600">{request.amount.toLocaleString()} FCFA</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            sur le numéro <span className="font-bold text-gray-700">{request.phoneNumber}</span> ({request.method})
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-500">
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          request.status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'valide' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status === 'en_attente' ? 'EN ATTENTE' : request.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        {request.status === 'en_attente' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateWithdrawalRequest(request, 'valide')}
                              disabled={actionLoading === request.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                              title="Confirmer le transfert"
                            >
                              {actionLoading === request.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => handleUpdateWithdrawalRequest(request, 'rejete')}
                              disabled={actionLoading === request.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                              title="Rejeter le retrait"
                            >
                              {actionLoading === request.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {withdrawalRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-gray-400 font-medium">
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
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                                title="Valider la commission"
                              >
                                {actionLoading === claim.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                              </button>
                              <button 
                                onClick={() => handleUpdateClaimStatus(claim, 'Rejeté')}
                                disabled={actionLoading === claim.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                title="Rejeter la commission"
                              >
                                {actionLoading === claim.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
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
          ) : activeTab === 'boosts' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Annonce / Service</th>
                    <th className="pb-4">Courtier</th>
                    <th className="pb-4">Détails</th>
                    <th className="pb-4">Montant</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {boostRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-gray-900">{request.listingTitle}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {request.listingId}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-900 font-bold">{request.courtierName}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {request.courtierId}</div>
                      </td>
                      <td className="py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black mb-1">
                          <Timer className="w-3 h-3" />
                          {request.serviceName || 'BOOST'} {request.duration > 0 ? `(${request.duration} JOURS)` : ''}
                        </div>
                        {request.startDate && (
                          <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Début: {request.startDate} à {request.startTime}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="font-black text-blue-600">{request.amount.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        {request.status === 'en_attente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            EN ATTENTE
                          </span>
                        ) : request.status === 'approuve_programme' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
                            <Calendar className="w-3 h-3" />
                            PROGRAMMÉ
                          </span>
                        ) : request.status === 'actif' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black">
                            <Zap className="w-3 h-3" />
                            ACTIF
                          </span>
                        ) : request.status === 'valide' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                            <CheckCircle className="w-3 h-3" />
                            APPROUVÉ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            REJETÉ
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-2">
                        {request.status === 'en_attente' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleApproveBoost(request)}
                              disabled={actionLoading === request.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                            >
                              {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                              APPROUVER
                            </button>
                            <button 
                              onClick={() => handleRejectBoost(request.id)}
                              disabled={actionLoading === request.id}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-black transition-all"
                            >
                              REJETER
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {boostRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-400 font-medium">
                        Aucune demande de boost pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'upcoming_boosts' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Annonce</th>
                    <th className="pb-4">Courtier</th>
                    <th className="pb-4">Planning / Compte à rebours</th>
                    <th className="pb-4">Durée / Revenu</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {boostRequests.filter(r => r.status === 'approuve_programme').map((request) => {
                    const startTime = new Date(request.startDateTime).getTime();
                    const now = Date.now();
                    const diffMs = startTime - now;
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

                    return (
                      <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-2">
                          <div className="font-bold text-gray-900">{request.listingTitle}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {request.listingId}</div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm text-gray-900 font-bold">{request.courtierName}</div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-gray-900 mb-1">{request.startDate} à {request.startTime}</div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${diffMs > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <Clock className="w-3 h-3" />
                            {diffMs > 0 ? (
                              diffDays > 1 ? `Démarre dans ${diffDays} jours` : `Démarre dans ${diffHours}h`
                            ) : 'Prêt pour activation'}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-xs font-bold text-gray-500 mb-1">{request.duration} jours</div>
                          <div className="font-black text-emerald-600">{request.amount.toLocaleString()} FCFA</div>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <button 
                            onClick={() => handleCancelRefundBoost(request)}
                            disabled={actionLoading === request.id}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                            ANNULER & REMBOURSER
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {boostRequests.filter(r => r.status === 'approuve_programme').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                        Aucun boost programmé pour le moment.
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
          ) : activeTab === 'alerts' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Alertes Système</h2>
                  <p className="text-sm text-gray-500 font-medium">Alertes en temps réel sur les activités critiques.</p>
                </div>
                {adminAlerts.length > 0 && (
                  <button 
                    onClick={markAllAlertsAsRead}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {adminAlerts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900">Tout est en ordre</h3>
                    <p className="text-gray-500">Aucune alerte non lue pour le moment.</p>
                  </div>
                ) : (
                  adminAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 group"
                    >
                      <div className={`p-3 rounded-2xl ${
                        alert.type === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {alert.type === 'PAYMENT_RECEIVED' ? <DollarSign className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-gray-900">{alert.title}</h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            {alert.createdAt?.toDate ? timeAgo(alert.createdAt.toDate()) : 'Récemment'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{alert.message}</p>
                        <button
                          onClick={() => markAlertAsRead(alert.id)}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                        >
                          Marquer comme lu
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'payments' ? (
            <AdminPaymentManagement />
          ) : activeTab === 'promos' ? (
            <PromoCodeManager />
          ) : activeTab === 'video_access' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Utilisateur</th>
                    <th className="pb-4">Type d'accès</th>
                    <th className="pb-4">Montant</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {videoAccessRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-gray-900">{request.userEmail}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {request.userId}</div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          request.type === 'business' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {request.type === 'business' ? 'Pass Business (30j)' : 'Option Single'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-gray-900">{request.amount.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-500">
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          request.status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'valide' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        {request.status === 'en_attente' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleApproveVideoAccess(request)}
                              disabled={actionLoading === request.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-lg flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approuver
                            </button>
                            <button 
                              onClick={() => handleRejectVideoAccess(request.id)}
                              disabled={actionLoading === request.id}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              Rejeter
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'housing_requests' ? (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-2">Utilisateur</th>
                    <th className="pb-4">Demande</th>
                    <th className="pb-4">Budget</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {housingRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden border border-brand-100">
                            {request.userPhoto ? (
                              <img src={request.userPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-brand-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{request.userName}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {request.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase">
                              {request.type}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase">
                              {request.neighborhood}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-1 italic">"{request.description}"</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-emerald-600">{request.budget.toLocaleString()} FCFA</div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-500">
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={`https://wa.me/${request.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Contacter sur WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </a>
                          <button 
                            onClick={() => handleDeleteHousingRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer la demande"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {housingRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                        Aucune demande de logement pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

interface DashboardTileProps {
  title: string;
  icon: ReactNode;
  count?: number;
  color: string;
  onClick: () => void;
}

function DashboardTile({ title, icon, count, color, onClick }: DashboardTileProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${color} p-6 sm:p-8 rounded-[2rem] text-white flex flex-col items-center justify-center gap-4 shadow-xl relative group overflow-hidden`}
    >
      {/* Decorative Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
        {icon}
      </div>
      
      <span className="relative z-10 font-black text-sm sm:text-base uppercase tracking-wider text-center">
        {title}
      </span>

      {count !== undefined && count > 0 && (
        <div className="absolute top-4 right-4 bg-red-600 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-lg border-2 border-white animate-pulse">
          {count}
        </div>
      )}
    </motion.button>
  );
}
