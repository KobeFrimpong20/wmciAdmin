import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CircleFadingPlus, Loader2 } from 'lucide-react';
import {
    getTagsByCategory,
    sortTagsByCatalog,
    TAG_CATEGORIES,
} from '../constants/tags';
import { membersApi } from '../api/members';
import type { Member } from '../types/member';
import { MemberLabel } from './MemberLabel';
import { Button } from './Button';

interface MemberLabelBarProps {
    memberId: string;
    savedTags: string[];
    onUpdated: (updatedMember: Member) => void;
}

export function MemberLabelBar({ memberId, savedTags, onUpdated }: MemberLabelBarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [draftTags, setDraftTags] = useState<string[]>(() => sortTagsByCatalog(savedTags));
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedSaved = useMemo(() => sortTagsByCatalog(savedTags), [savedTags]);

    const savedSet = useMemo(() => new Set(normalizedSaved), [normalizedSaved]);
    const draftSet = useMemo(() => new Set(draftTags), [draftTags]);

    const { toAdd, toRemove } = useMemo(() => {
        const add = draftTags.filter(tag => !savedSet.has(tag));
        const remove = normalizedSaved.filter(tag => !draftSet.has(tag));
        return { toAdd: add, toRemove: remove };
    }, [draftTags, normalizedSaved, savedSet, draftSet]);

    const hasChanges = toAdd.length > 0 || toRemove.length > 0;

    // Close dropdown on Escape or outside click (discarding unsaved changes)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSaving) {
                setDraftTags(normalizedSaved);
                setSaveError('');
                setIsOpen(false);
            }
        };

        const handlePointerDown = (event: MouseEvent) => {
            if (
                !isSaving &&
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setDraftTags(normalizedSaved);
                setSaveError('');
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isOpen, isSaving, normalizedSaved]);

    const handleToggleBank = () => {
        if (isSaving) return;
        if (isOpen) {
            setDraftTags(normalizedSaved);
            setSaveError('');
            setIsOpen(false);
        } else {
            setDraftTags(normalizedSaved);
            setSaveError('');
            setIsOpen(true);
        }
    };

    const handleToggleTag = (tagName: string) => {
        if (isSaving) return;
        setSaveError('');
        setDraftTags(prev => {
            const next = prev.includes(tagName)
                ? prev.filter(t => t !== tagName)
                : [...prev, tagName];
            return sortTagsByCatalog(next);
        });
    };

    const handleCancel = () => {
        if (isSaving) return;
        setDraftTags(normalizedSaved);
        setSaveError('');
        setIsOpen(false);
    };

    const handleApply = async () => {
        if (!hasChanges) {
            setIsOpen(false);
            return;
        }

        setIsSaving(true);
        setSaveError('');
        try {
            const updated = await membersApi.patchMemberTags(memberId, {
                ...(toAdd.length > 0 ? { add: toAdd } : {}),
                ...(toRemove.length > 0 ? { remove: toRemove } : {}),
            });
            onUpdated(updated);
            setDraftTags(sortTagsByCatalog(updated.tags || []));
            setIsOpen(false);
        } catch (err: unknown) {
            setSaveError(
                err instanceof Error ? err.message : 'Unable to save label changes. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    // Display draft selection live while the bank is open, or persisted tags when closed
    const visibleTags = isOpen ? draftTags : normalizedSaved;

    return (
        <div ref={containerRef} className="relative space-y-3">
            {/* Labels Line */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 border-t border-b border-border">
                <button
                    type="button"
                    onClick={handleToggleBank}
                    aria-expanded={isOpen}
                    aria-controls="member-label-bank"
                    className="font-body text-sm font-medium text-foreground transition-all duration-150 cursor-pointer hover:text-accent hover:[text-shadow:0_0_12px_var(--accent)] focus-visible:text-accent"
                >
                    Labels
                </button>

                <span className="text-border select-none" aria-hidden="true">
                    /
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleToggleBank}
                        aria-expanded={isOpen}
                        aria-controls="member-label-bank"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm border border-dashed border-tag-ghost-border bg-tag-ghost-bg text-tag-ghost-text font-body text-xs font-medium leading-5 label-pill-interactive cursor-pointer"
                    >
                        <CircleFadingPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Add Label</span>
                    </button>

                    {visibleTags.map(tag => (
                        <MemberLabel key={tag} tag={tag} onClick={handleToggleBank} />
                    ))}
                </div>
            </div>

            {/* Dropdown Label Bank */}
            {isOpen && (
                <section
                    id="member-label-bank"
                    aria-label="Select member labels"
                    className="bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-5"
                >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-border">
                        <h2 className="font-heading text-xl font-normal text-foreground">
                            Label Bank
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Select labels to preview, then click Apply to save.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {TAG_CATEGORIES.map(category => {
                            const Icon = category.icon;
                            const tagsInCategory = getTagsByCategory(category.id);

                            return (
                                <div key={category.id} className="space-y-2.5">
                                    <div
                                        className={`inline-flex items-center gap-2 font-body text-xs font-medium tracking-wide uppercase ${category.headerClass}`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        <span>{category.label}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {tagsInCategory.map(tag => {
                                            const isSelected = draftSet.has(tag.name);
                                            return (
                                                <button
                                                    key={tag.name}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() => handleToggleTag(tag.name)}
                                                    disabled={isSaving}
                                                    className={`px-3 py-1.5 rounded-sm border font-body text-xs transition-colors duration-150 cursor-pointer disabled:opacity-50 ${isSelected
                                                            ? category.selectedOptionClass
                                                            : category.unselectedOptionClass
                                                        }`}
                                                >
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {saveError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 pt-3 border-t border-border text-sm text-foreground"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-foreground" aria-hidden="true" />
                            <span>{saveError}</span>
                        </div>
                    )}

                    <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                        <span className="font-accent text-xs text-muted-foreground tabular-nums">
                            {hasChanges
                                ? `${toAdd.length > 0 ? `+${toAdd.length}` : ''}${toAdd.length > 0 && toRemove.length > 0 ? ', ' : ''
                                }${toRemove.length > 0 ? `-${toRemove.length}` : ''} pending`
                                : 'No pending changes'}
                        </span>

                        <div className="flex items-center gap-2.5">
                            <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApply}
                                disabled={isSaving || !hasChanges}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                        <span>Applying...</span>
                                    </>
                                ) : (
                                    <span>Apply Labels</span>
                                )}
                            </Button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
