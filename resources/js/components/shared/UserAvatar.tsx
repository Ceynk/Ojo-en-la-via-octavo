import { cn, getStorageUrl } from '@/lib/utils';

interface UserAvatarProps {
    id?: number;
    name?: string | null;
    profilePhoto?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const avatarColors = [
    'bg-blue-500/20 text-blue-200 ring-blue-400/20',
    'bg-violet-500/20 text-violet-200 ring-violet-400/20',
    'bg-emerald-500/20 text-emerald-200 ring-emerald-400/20',
    'bg-orange-500/20 text-orange-200 ring-orange-400/20',
    'bg-cyan-500/20 text-cyan-200 ring-cyan-400/20',
    'bg-rose-500/20 text-rose-200 ring-rose-400/20',
    'bg-indigo-500/20 text-indigo-200 ring-indigo-400/20',
];

const avatarSizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
};

function getAvatarColor(id: number | undefined, name: string) {
    const seed = id ?? Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
    return avatarColors[Math.abs(seed) % avatarColors.length];
}

export default function UserAvatar({ id, name, profilePhoto, size = 'md', className }: UserAvatarProps) {
    const displayName = name?.trim() || 'Usuario';
    const initials = displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    if (profilePhoto) {
        return (
            <img
                src={getStorageUrl(profilePhoto)}
                alt={displayName}
                className={cn('shrink-0 rounded-full object-cover ring-1', avatarSizes[size], className)}
            />
        );
    }

    return (
        <div
            aria-label={displayName}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset',
                avatarSizes[size],
                getAvatarColor(id, displayName),
                className,
            )}
        >
            {initials}
        </div>
    );
}
