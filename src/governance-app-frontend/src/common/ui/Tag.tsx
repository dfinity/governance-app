import { Badge, BadgeWithButton, BadgeWithDot, BadgeWithImage } from "./Badge";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Tag API to match UntitledUi usage roughly, backed by Badge
export interface TagProps {
    children: ReactNode;
    size?: "sm" | "md" | "lg";
    count?: number;
    avatarSrc?: string;
    dot?: boolean;
    onClose?: (id?: string) => void;
    id?: string;
    className?: string; // Add className
    // selectionMode etc ignored for now - simpler implementation
}

export const Tag = ({
    children,
    size = "md",
    count,
    avatarSrc,
    dot,
    onClose,
    id,
    className
}: TagProps) => {
    // Map to Badge variants
    if (onClose) {
        return (
            <BadgeWithButton
                size={size}
                onButtonClick={() => onClose(id)}
                type="badge-modern" // Tag look
                className={className}
            >
                {children}
            </BadgeWithButton>
        );
    }

    if (avatarSrc) {
        return (
            <BadgeWithImage imgSrc={avatarSrc} size={size} type="badge-modern" className={className}>
                {children}
            </BadgeWithImage>
        );
    }

    if (dot) {
        return (
            <BadgeWithDot size={size} type="badge-modern" className={className}>
                {children}
            </BadgeWithDot>
        );
    }

    return (
        <Badge size={size} type="badge-modern" className={className}>
            {children}
            {count !== undefined && <span className="ml-1 opacity-60 text-xs">{count}</span>}
        </Badge>
    );
};

export const TagGroup = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
);

export const TagList = TagGroup; // Alias
