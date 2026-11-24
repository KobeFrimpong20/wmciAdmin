import { Mail, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Member } from '../types/member';

interface MemberCardProps {
  member: Member;
}

const MemberCard = ({ member }: MemberCardProps) => {
  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Link
      to={`/members/${member.id}`}
      className="group block bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center space-x-4 mb-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all">
          {initials || '?'}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight truncate">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-1 truncate">{member.id}</p>
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
          Joined{' '}
          {new Date(member.joined_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>
    </Link>
  );
};

export default MemberCard;
