import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Application, Member } from '../types/member';
import MemberCard from '../components/MemberCard';
import {
  LayoutDashboard,
  Users,
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';

type ActiveTab = 'applications' | 'members';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const [appData, memberData] = await Promise.all([
          membersApi.getAllApplications(),
          membersApi.getAllMembers(),
        ]);
        if (isMounted) {
          setApplications(appData || []);
          setMembers(memberData || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load binder records');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  const countCommitments = (app: Application) =>
    [
      app.attendance_commitment,
      app.tithe_commitment,
      app.prayer_commitment,
      app.sober_commitment,
      app.respect_commitment,
      app.faith_commitment,
    ].filter(Boolean).length;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <LayoutDashboard className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Digital Binder
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Membership applications &amp; congregation directory
                </p>
              </div>
            </div>
            <Link
              to="/intake"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl hover:opacity-90 text-sm font-semibold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Application</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              activeTab === 'applications'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Applications</span>
            {!isLoading && !error && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'applications'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                {applications.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              activeTab === 'members'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary/40'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members</span>
            {!isLoading && !error && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'members'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                {members.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4 text-slate-500">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="animate-pulse">Loading binder records...</p>
          </div>
        ) : error ? (
          <div className="min-h-[20vh] p-6 bg-red-500/5 dark:bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Unable to load data
            </h3>
            <p className="text-red-500/80 mt-1">{error}</p>
          </div>
        ) : activeTab === 'applications' ? (
          applications.length === 0 ? (
            <div className="min-h-[40vh] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                No applications submitted yet.
              </p>
              <Link
                to="/intake"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
              >
                <Plus className="w-4 h-4" /> Submit First Application
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map(app => {
                const initials = `${app.first_name?.[0] || ''}${app.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <Link
                    key={app.id}
                    to={`/applications/${app.id}`}
                    className="group block bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-base font-bold text-slate-700 dark:text-slate-300 group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all">
                        {initials || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight truncate">
                          {app.first_name} {app.last_name}
                        </h3>
                        <span className="mt-1 inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {countCommitments(app)}/6 Commitments
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 mt-4">
                      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                        <Mail className="h-4 w-4 mr-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{app.email || 'No email provided'}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                        <Phone className="h-4 w-4 mr-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{app.phone || 'No phone provided'}</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                        <Clock className="h-3.5 w-3.5 mr-2" />
                        Submitted{' '}
                        {new Date(app.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : members.length === 0 ? (
          <div className="min-h-[40vh] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No members found in the system yet.
            </p>
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
  );
};

export default Dashboard;
