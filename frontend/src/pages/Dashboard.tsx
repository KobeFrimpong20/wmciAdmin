import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import type { Member } from '../types/member';
import MemberCard from '../components/MemberCard';
import { LogOut, LayoutDashboard, Users, Loader2, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const fetchMembers = async () => {
      try {
        const data = await membersApi.getAllMembers();
        if (isMounted) {
          setMembers(data || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load members directory');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMembers();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <LayoutDashboard className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Authenticated as <span className="font-bold text-primary uppercase text-xs tracking-wider bg-primary/10 px-2 py-0.5 rounded-md ml-1">{user?.role || 'Guest'}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-sm font-medium transition shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div>
          <div className="flex items-center mb-6 pl-2">
            <Users className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Member Directory</h2>
            {!isLoading && !error && (
              <span className="ml-4 px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium">
                {members.length} Members
              </span>
            )}
          </div>

          {/* Dynamic Render Block */}
          {isLoading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4 text-slate-500">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="animate-pulse">Loading congregation directory...</p>
            </div>
          ) : error ? (
            <div className="min-h-[20vh] p-6 bg-red-500/5 dark:bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Unable to load data</h3>
              <p className="text-red-500/80 mt-1">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="min-h-[40vh] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex items-center justify-center">
              <p className="text-slate-500 dark:text-slate-400 text-lg">No members found in the system yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map(member => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
