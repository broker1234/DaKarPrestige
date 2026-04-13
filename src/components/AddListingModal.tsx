import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, MapPin, Home, Phone, DollarSign, Video, GraduationCap, Sparkles, Zap, ArrowRight, Rocket } from 'lucide-react';
import { NEIGHBORHOODS, PROPERTY_TYPES, PROXIMITY_ZONES, Neighborhood, PropertyType, StayType } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Listing } from '../types';

interface AddListingModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  listingToEdit?: Listing | null;
}

export default function AddListingModal({ isOpen, onClose, listingToEdit }: AddListingModalProps) {
  const [user] = useAuthState(auth);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormData = {
    title: '',
    description: '',
    price: '',
    neighborhood: '' as Neighborhood,
    type: 'Appartement' as PropertyType,
    stayType: 'Location Longue Durée' as StayType,
    bedrooms: '1',
    bathrooms: '1',
    whatsapp: '',
    visitFee: '',
    proximity: [] as string[],
    commissionAideCourtier: '',
    images: [] as string[],
    videos: [] as string[],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when editing
  React.useEffect(() => {
    if (listingToEdit && isOpen) {
      setFormData({
        title: listingToEdit.title,
        description: listingToEdit.description,
        price: listingToEdit.price.toString(),
        neighborhood: listingToEdit.neighborhood,
        type: listingToEdit.type,
        stayType: listingToEdit.stayType || 'Location Longue Durée',
        bedrooms: listingToEdit.bedrooms.toString(),
        bathrooms: listingToEdit.bathrooms.toString(),
        whatsapp: listingToEdit.whatsapp,
        visitFee: listingToEdit.visitFee?.toString() || '',
        proximity: listingToEdit.proximity || [],
        commissionAideCourtier: listingToEdit.commissionAideCourtier?.toString() || '',
        images: listingToEdit.images || [],
        videos: listingToEdit.videos || [],
      });
    } else if (!isOpen) {
      setFormData(initialFormData);
      setStep(1);
      setError(null);
    }
  }, [listingToEdit, isOpen]);

  const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 600, quality = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setError(null);
    const newImages: string[] = [];
    
    const readFiles = Array.from(files).map((file: File) => {
      return new Promise<void>((resolve) => {
        if (file.size > 10 * 1024 * 1024) {
          setError(`L'image ${file.name} est trop lourde (max 10MB)`);
          resolve();
          return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          newImages.push(compressed);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(readFiles);
    
    if (newImages.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 6)
      }));
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files[0];
    if (!file) return;

    setError(null);
    // Validate format
    if (!file.type.startsWith('video/')) {
      setError("Format non supporté. Veuillez sélectionner une vidéo (MP4, etc.).");
      return;
    }

    // New limit: 10MB for Cloudinary
    if (file.size > 10 * 1024 * 1024) {
      setError("La vidéo est trop lourde (max 10MB).");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError("Configuration Cloudinary manquante. Veuillez configurer VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET.");
      return;
    }

    setIsUploading(true);
    try {
      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', file);
      formDataCloudinary.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        {
          method: 'POST',
          body: formDataCloudinary,
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi vers Cloudinary");
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, videos: [data.secure_url] }));
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setError("Échec de l'envoi de la vidéo. Vérifiez votre connexion et la configuration Cloudinary.");
    } finally {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      nextStep();
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      const listingData = {
        ...formData,
        price: parseInt(formData.price) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        visitFee: parseInt(formData.visitFee) || 0,
        commissionAideCourtier: parseInt(formData.commissionAideCourtier) || 0,
        courtierId: user.uid,
        courtierName: user.displayName || 'Courtier',
        courtierPhoto: user.photoURL || '',
        updatedAt: serverTimestamp(),
      };

      if (listingToEdit) {
        await updateDoc(doc(db, 'listings', listingToEdit.id), listingData);
      } else {
        await addDoc(collection(db, 'listings'), {
          ...listingData,
          createdAt: serverTimestamp(),
          isVerified: false,
          isBoosted: false,
          status: 'Disponible' as const,
          views: 0,
          favorites: 0,
        });
      }
      
      onClose();
      setStep(1);
      if (!listingToEdit) {
        setFormData(initialFormData);
      }
    } catch (error) {
      handleFirestoreError(auth, error, listingToEdit ? OperationType.UPDATE : OperationType.CREATE, 'listings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleProximity = (zone: string) => {
    setFormData(prev => ({
      ...prev,
      proximity: prev.proximity.includes(zone) 
        ? prev.proximity.filter(z => z !== zone)
        : [...prev.proximity, zone]
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Quel type de bien publiez-vous ?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center ${
                      formData.type === t
                        ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-lg shadow-brand-100'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-brand-200'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${formData.type === t ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                      {t === 'Appartement' ? <Home className="w-6 h-6" /> :
                       t === 'Villa' ? <Sparkles className="w-6 h-6" /> :
                       t === 'Chambre étudiant' ? <GraduationCap className="w-6 h-6" /> :
                       <Zap className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] font-black uppercase leading-tight">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Photos & Vidéos</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Photos ({formData.images.length}/6)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                        <img src={src} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {formData.images.length < 6 && (
                      <label className={`aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isUploading ? 'bg-slate-50 border-slate-200' : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50 text-slate-400'
                      }`}>
                        {isUploading ? <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Video */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vidéo (Optionnel)</span>
                  <div className="aspect-video relative rounded-xl overflow-hidden border-2 border-dashed border-slate-200 group">
                    {formData.videos.length > 0 ? (
                      <>
                        <video src={formData.videos[0]} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, videos: [] }))}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50 transition-colors text-slate-400 hover:text-brand-600">
                        <Video className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-black uppercase">Ajouter une vidéo</span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={isUploading} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900">Localisation & Détails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Quartier</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      required
                      className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all appearance-none"
                      value={formData.neighborhood}
                      onChange={e => setFormData({ ...formData, neighborhood: e.target.value as Neighborhood })}
                    >
                      <option value="">Sélectionner un quartier</option>
                      {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Titre de l'annonce</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Studio moderne aux Almadies"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nombre de chambres</label>
                  <input
                    type="number"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                    value={formData.bedrooms}
                    onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Salles de bain</label>
                  <input
                    type="number"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                    value={formData.bathrooms}
                    onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Proximité</label>
                <div className="flex flex-wrap gap-2">
                  {PROXIMITY_ZONES.map(zone => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleProximity(zone)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
                        formData.proximity.includes(zone)
                          ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-100'
                          : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-brand-200'
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900">Prix & Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Prix (FCFA / mois)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Type de séjour</label>
                  <select
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all appearance-none"
                    value={formData.stayType}
                    onChange={e => setFormData({ ...formData, stayType: e.target.value as StayType })}
                  >
                    <option value="Location Longue Durée">Location Longue Durée</option>
                    <option value="Location Courte Durée">Location Courte Durée</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Description détaillée</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Loyer, caution, commodités, charges comprises..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">WhatsApp</label>
                  <input
                    required
                    type="tel"
                    placeholder="22177..."
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                    value={formData.whatsapp}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Frais de visite</label>
                  <input
                    type="number"
                    placeholder="2000"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold transition-all"
                    value={formData.visitFee}
                    onChange={e => setFormData({ ...formData, visitFee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    Commission <Zap className="w-3 h-3 text-brand-500" />
                  </label>
                  <input
                    type="number"
                    placeholder="5000"
                    className="w-full px-5 py-4 rounded-2xl bg-brand-50 border border-brand-100 focus:border-brand-500 outline-none font-bold transition-all text-brand-900"
                    value={formData.commissionAideCourtier}
                    onChange={e => setFormData({ ...formData, commissionAideCourtier: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        key="add-listing-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <motion.div
        key="add-listing-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
            {/* Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Publier un logement</h2>
                <p className="text-slate-500 text-sm font-medium">Étape {step} sur 3</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(step / 3) * 100}%` }}
                className="h-full bg-brand-500"
              />
            </div>

            {error && (
              <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <X className="w-4 h-4" />
                {error}
              </div>
            )}

            <form 
              onSubmit={handleSubmit} 
              className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && step < 3) {
                  e.preventDefault();
                  nextStep();
                }
              }}
            >
              <div className="min-h-[400px]">
                {renderStep()}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1}
                  className={`px-8 py-4 rounded-2xl font-black transition-all ${
                    step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Précédent
                </button>
                
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-10 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black shadow-xl shadow-brand-600/20 transition-all flex items-center gap-2"
                  >
                    Suivant
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-10 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black shadow-xl shadow-brand-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Publication...' : 'Publier l\'annonce'}
                    <Rocket className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
    </div>
  );
}
