'use client';

import React from 'react';

interface EntityActionsProps {
    children: React.ReactNode;
    className?: string;
}

export default function EntityActions({ children, className = "ml-2 flex-shrink-0 flex items-center gap-3" }: EntityActionsProps) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}
