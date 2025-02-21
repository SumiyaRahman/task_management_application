import React, { useContext, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { AuthContext } from "../provider/AuthContext";
import axios from "axios";

const Login = () => {
  const { googleSignIn } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await googleSignIn();
      
      // Save user to database
      const userInfo = {
        name: result.user?.displayName,
        email: result.user?.email,
        uid: result.user?.uid,
        photoURL: result.user?.photoURL
      };

      await axios.post('http://localhost:5000/users', userInfo);
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Login now!</h1>
          <p className="py-6">
            Sign in to access your tasks and manage them efficiently.
          </p>
        </div>
        <div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
          <div className="card-body">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="btn btn-outline"
            >
              <FcGoogle className="text-2xl" />
              {isLoading ? "Loading..." : "Continue with Google"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
