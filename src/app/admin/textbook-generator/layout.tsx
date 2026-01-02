import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Textbook Generator | Admin',
    description: 'Generate MBSE Smart Textbooks using AI',
};

export default function TextbookGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
