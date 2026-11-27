import { getTagDefinition, TAG_CATEGORY_MAP } from '../constants/tags';

interface MemberLabelProps {
  tag: string;
  onClick?: () => void;
}

export function MemberLabel({ tag, onClick }: MemberLabelProps) {
  const def = getTagDefinition(tag);
  const categoryMeta = TAG_CATEGORY_MAP[def.category];
  const baseClass = `inline-flex items-center px-2.5 py-0.5 rounded-sm border font-body text-xs font-medium leading-5 ${categoryMeta.chipClass}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} label-pill-interactive cursor-pointer`}
      >
        {def.label}
      </button>
    );
  }

  return <span className={baseClass}>{def.label}</span>;
}
