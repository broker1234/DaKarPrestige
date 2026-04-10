import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    
    return {
      user: result.user,
      isNewUser: !userDoc.exists()
    };
  } catch (error: any) {
    if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
      console.error("Login error:", error);
    }
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return {
      user: result.user,
      isNewUser: true
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    return {
      user: result.user,
      isNewUser: !userDoc.exists()
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};
