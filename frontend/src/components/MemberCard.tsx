import { ArrowRight, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Member } from '../types/member';
import { sortTagsByCatalog } from '../constants/tags';
import { MemberLabel } from './MemberLabel';

interface MemberCardProps {
  member: Member;
}

function formatDate(value: string): string {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const MemberCard = ({ member }: MemberCardProps) => {
  const fullName = member.full_name?.trim() || 'Unnamed Member';
  const sortedTags = sortTagsByCatalog(member.tags || []);

  return (
    <article className="bg-surface border border-border rounded-lg p-6 transition-colors duration-150 hover:border-accent flex flex-col justify-between gap-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-2xl font-normal text-foreground leading-snug min-w-0">
            <Link
              to={`/members/${member.id}`}
              className="hover:text-accent transition-colors duration-150"
            >
              {fullName}
            </Link>
          </h3>
          <span className="shrink-0 font-accent text-xs text-muted-foreground tabular-nums pt-1.5">
            Joined {formatDate(member.joined_at)}
          </span>
        </div>

        {sortedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Member labels">
            {sortedTags.map(tag => (
              <MemberLabel key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground min-w-0">
            <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="truncate text-foreground hover:text-accent hover:underline transition-colors duration-150"
              >
                {member.email}
              </a>
            ) : (
              <span>No email on file</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-muted-foreground min-w-0">
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            {member.phone ? (
              <a
                href={toTelHref(member.phone)}
                className="truncate text-foreground hover:text-accent hover:underline transition-colors duration-150 tabular-nums"
              >
                {member.phone}
              </a>
            ) : (
              <span>No phone on file</span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground truncate">
          {member.address || 'No address on file'}
        </span>
        <Link
          to={`/members/${member.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors duration-150"
        >
          <span>Open Profile</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default MemberCard;
