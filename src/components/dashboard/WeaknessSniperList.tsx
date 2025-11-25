import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WeaknessItem {
    id: string;
    title: string;
    subject: string;
    score: number;
}

interface WeaknessSniperListProps {
    items: WeaknessItem[];
}

export function WeaknessSniperList({ items }: WeaknessSniperListProps) {
    if (items.length === 0) return null;

    return (
        <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Focus Areas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="flex-1 min-w-0 mr-4">
                            <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                            <p className="text-xs text-gray-500">{item.subject}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="block text-sm font-bold text-orange-600">{item.score}%</span>
                                <span className="text-[10px] text-orange-400 uppercase">Avg Score</span>
                            </div>
                            <Link href={`/app/chapters/${item.id}`}>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full border-orange-200 hover:bg-orange-100 hover:text-orange-700">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
