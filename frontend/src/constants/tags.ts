import { Activity, Component, Lectern, type LucideIcon } from 'lucide-react';

export type TagCategory = 'status' | 'leadership' | 'ministry';

export interface TagCategoryMeta {
    id: TagCategory;
    label: string;
    icon: LucideIcon;
    headerClass: string;
    chipClass: string;
    selectedOptionClass: string;
    unselectedOptionClass: string;
}

export interface TagDefinition {
    name: string;
    label: string;
    category: TagCategory;
}

export const TAG_CATEGORIES: TagCategoryMeta[] = [
    {
        id: 'status',
        label: 'Status',
        icon: Activity,
        headerClass: 'text-tag-status-text',
        chipClass: 'bg-tag-status-bg text-tag-status-text border-tag-status-border',
        selectedOptionClass:
            'bg-tag-status-bg text-tag-status-text border-tag-status-text font-medium',
        unselectedOptionClass:
            'bg-paper text-muted-foreground border-border hover:border-tag-status-border hover:text-tag-status-text',
    },
    {
        id: 'leadership',
        label: 'Leadership',
        icon: Lectern,
        headerClass: 'text-tag-leadership-text',
        chipClass: 'bg-tag-leadership-bg text-tag-leadership-text border-tag-leadership-border',
        selectedOptionClass:
            'bg-tag-leadership-bg text-tag-leadership-text border-tag-leadership-text font-medium',
        unselectedOptionClass:
            'bg-paper text-muted-foreground border-border hover:border-tag-leadership-border hover:text-tag-leadership-text',
    },
    {
        id: 'ministry',
        label: 'Ministry',
        icon: Component,
        headerClass: 'text-tag-service-text',
        chipClass: 'bg-tag-service-bg text-tag-service-text border-tag-service-border',
        selectedOptionClass:
            'bg-tag-service-bg text-tag-service-text border-tag-service-text font-medium',
        unselectedOptionClass:
            'bg-paper text-muted-foreground border-border hover:border-tag-service-border hover:text-tag-service-text',
    },
];

export const TAG_CATEGORY_MAP: Record<TagCategory, TagCategoryMeta> = {
    status: TAG_CATEGORIES[0],
    leadership: TAG_CATEGORIES[1],
    ministry: TAG_CATEGORIES[2],
};

// Mirrors backend/internal/binder/tags.go (16 fixed tags across 3 categories).
export const TAG_CATALOG: TagDefinition[] = [
    // Status
    { name: 'active', label: 'Active', category: 'status' },
    { name: 'inactive', label: 'Inactive', category: 'status' },
    { name: 'ex-communicated', label: 'Ex-Communicated', category: 'status' },
    { name: 'out of state', label: 'Out of State', category: 'status' },
    { name: 'out of country', label: 'Out of Country', category: 'status' },
    { name: 'suspended', label: 'Suspended', category: 'status' },
    { name: 'deceased', label: 'Deceased', category: 'status' },

    // Leadership
    { name: 'board', label: 'Board', category: 'leadership' },
    { name: 'trustee', label: 'Trustee', category: 'leadership' },
    { name: 'minister', label: 'Minister', category: 'leadership' },
    { name: 'pastor', label: 'Pastor', category: 'leadership' },

    // Ministry
    { name: 'women', label: 'Women', category: 'ministry' },
    { name: 'men', label: 'Men', category: 'ministry' },
    { name: 'media', label: 'Media', category: 'ministry' },
    { name: 'cleaning', label: 'Cleaning', category: 'ministry' },
    { name: 'usher', label: 'Usher', category: 'ministry' },
];

export const TAG_MAP: Record<string, TagDefinition> = Object.fromEntries(
    TAG_CATALOG.map(tag => [tag.name, tag])
);

const TAG_ORDER_INDEX: Record<string, number> = Object.fromEntries(
    TAG_CATALOG.map((tag, index) => [tag.name, index])
);

export function getTagDefinition(tagName: string): TagDefinition {
    const normalized = tagName.trim().toLowerCase();
    const known = TAG_MAP[normalized];
    if (known) return known;
    return {
        name: normalized,
        label: tagName,
        category: 'ministry',
    };
}

export function sortTagsByCatalog(tags: string[]): string[] {
    return [...tags].sort((a, b) => {
        const idxA = TAG_ORDER_INDEX[a] ?? Number.MAX_SAFE_INTEGER;
        const idxB = TAG_ORDER_INDEX[b] ?? Number.MAX_SAFE_INTEGER;
        if (idxA !== idxB) return idxA - idxB;
        return a.localeCompare(b);
    });
}

export function getTagsByCategory(category: TagCategory): TagDefinition[] {
    return TAG_CATALOG.filter(tag => tag.category === category);
}
