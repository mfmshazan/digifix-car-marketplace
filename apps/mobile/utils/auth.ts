import { auth } from "../config/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from "firebase/auth";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Create a new user with email and password
 */
export const signUp = async (
  email: string, 
  password: string, 
  displayName?: string
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  return userCredential.user;
};

/**
 * Sign out the current user
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  displayName?: string, 
  photoURL?: string
): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, { displayName, photoURL });
  }
};

/**
 * Convert Firebase User to AuthUser
 */
export const toAuthUser = (user: User): AuthUser => {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
};
