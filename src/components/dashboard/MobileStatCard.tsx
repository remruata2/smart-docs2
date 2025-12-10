interface MobileStatCardProps {
    label: string;
    value: string | number;
    color: "green" | "red" | "blue" | "purple";
    subtext?: string;
}

export function MobileStatCard({ label, value, color, subtext }: MobileStatCardProps) {
    const colorStyles = {
        green: "bg-green-50 border-green-100 text-green-700",
        red: "bg-red-50 border-red-100 text-red-700",
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        purple: "bg-purple-50 border-purple-100 text-purple-700",
    };

    const valueStyles = {
        green: "text-green-900",
        red: "text-red-900",
        blue: "text-blue-900",
        purple: "text-purple-900",
    };

    return (
        <div className={`flex flex-col justify-center p-4 rounded-xl border min-w-[140px] ${colorStyles[color]}`}>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</span>
            <span className={`text-2xl font-bold ${valueStyles[color]}`}>{value}</span>
            {subtext && <span className="text-xs mt-1 opacity-70">{subtext}</span>}
        </div>
    );
}
