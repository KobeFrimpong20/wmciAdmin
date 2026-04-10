import { Mail, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Member } from '../types/member';

interface MemberCardProps {
  member: Member;
}

const MemberCard = ({ member }: MemberCardProps) => {
  // Determine avatar initials based on name segments
  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();

  // Status mapping for conditional color classes
  const safeStatus = (member.status || '').toLowerCase();
  let statusClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  
  if (safeStatus === 'active') {
    statusClasses = 'bg-green-100/80 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 shadow-sm';
  } else if (safeStatus === 'inactive' || safeStatus === 'suspended') {
    statusClasses = 'bg-red-100/80 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 shadow-sm';
  }

  return (
    <Link 
      to={`/members/${member.id}`}
      className="group block bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all">
            {initials || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight">
              {member.first_name} {member.last_name}
            </h3>
            <div className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusClasses}`}>
              {member.status || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-5">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
          <Mail className="h-4 w-4 mr-3 flex-shrink-0 text-slate-400" />
          <span className="truncate">{member.email || 'No email provided'}</span>
        </div>
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
          <Phone className="h-4 w-4 mr-3 flex-shrink-0 text-slate-400" />
          <span className="truncate">{member.phone || 'No phone provided'}</span>
        </div>
        <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
          <Clock className="h-3.5 w-3.5 mr-2" />
          Joined {new Date(member.joined_at).toLocaleDateString(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric' 
          })}
        </div>
      </div>
    </Link>
  );
};

export default MemberCard;
