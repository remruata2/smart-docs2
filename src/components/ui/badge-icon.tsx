import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface BadgeIconProps extends LucideProps {
    name: string;
}

export function BadgeIcon({ name, ...props }: BadgeIconProps) {
    const IconComponent = (Icons as any)[name];

    if (!IconComponent) {
        // Fallback icon if name not found
        return <Icons.Award {...props} />;
    }

    return <IconComponent {...props} />;
}
