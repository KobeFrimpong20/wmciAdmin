import React, { useState } from 'react';
import { User, Lock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await login({ email: username, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300">

        {/* Header Section */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-primary to-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 transform transition hover:scale-105">
            <User className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400">Sign in to the Member Binder</p>
        </div>

        {error && (
          <div className="mx-8 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center space-x-2 animate-pulse">
            <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
          <div className="space-y-1 group">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-1 group">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mt-2">
            <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 cursor-pointer group">
              <input type="checkbox" className="rounded bg-white dark:bg-black border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/50 h-4 w-4 transition-all" />
              <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Remember me</span>
            </label>
            <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
          </div>

          <div className="pt-4">
            <button
               type="submit"
               disabled={isSubmitting}
               className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-primary to-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-white dark:focus:ring-offset-black transform transition hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
             >
               {isSubmitting ? (
                 <>
                   <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                   Signing In...
                 </>
               ) : (
                 'Sign In'
               )}
            </button>
          </div>
        </form>

        {/* Guestbook/Intake Link */}
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-200 dark:border-slate-800">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-3">Not an admin?</p>
          <Link
            to="/intake"
            className="w-full flex items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary hover:text-primary transition-all group"
          >
            <span className="font-medium">Register Member Directly</span>
            <ExternalLink className="ml-2 w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-slate-500 text-sm z-10">
        <p>&copy; 2026 Member Binder. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Home;
