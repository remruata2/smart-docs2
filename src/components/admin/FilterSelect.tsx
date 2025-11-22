'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface FilterSelectProps {
    name: string;
    options: { value: string; label: string }[];
    placeholder: string;
    className?: string;
}

export default function FilterSelect({ name, options, placeholder, className = "" }: FilterSelectProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentValue = searchParams.get(name) || "";

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());

        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }

        router.push(`?${params.toString()}`);
    }, [name, router, searchParams]);

    return (
        <select
            name={name}
            value={currentValue}
            onChange={handleChange}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${className}`}
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}
