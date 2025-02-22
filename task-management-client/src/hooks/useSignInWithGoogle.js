import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../config/firebase.config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const useSignInWithGoogle = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Save user to database
      await axios.post('https://task-management-app-vert-seven.vercel.app/users', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, isLoading };
}; 