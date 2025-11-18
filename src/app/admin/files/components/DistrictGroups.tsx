import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type FileItem = {
  id: number;
  category: string;
  title: string;
  district: string | null;
  entry_date_real: string | null;
  created_at: string | null;
  doc1: string | null;
};

type DistrictGroup = {
  district: string | null;
  count: number;
  latestDate: string | null;
  files: FileItem[];
};

type DistrictGroupsProps = {
  searchParams?: {
    q?: string;
    category?: string;
    year?: string;
  };
};

export function DistrictGroups({ searchParams = {} }: DistrictGroupsProps) {
  const [groups, setGroups] = useState<DistrictGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchDistrictGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchParams.q && { q: searchParams.q }),
        ...(searchParams.category && { category: searchParams.category }),
        ...(searchParams.year && { year: searchParams.year }),
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(`/api/admin/files/district-stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch district groups');
      }

      const data = await response.json();
      setGroups(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching district groups:', err);
      setError('Failed to load district data');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistrictGroups();
  }, [page, searchParams]);

  const toggleDistrict = (district: string | null) => {
    const districtKey = district || 'null';
    setExpandedDistricts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(districtKey)) {
        newSet.delete(districtKey);
      } else {
        newSet.add(districtKey);
      }
      return newSet;
    });
  };

  if (loading && groups.length === 0) {
    return <div className="py-8 text-center text-gray-500">Loading district data...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="py-8 text-center text-gray-500">No district data found</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const districtKey = group.district || 'Uncategorized';
        const isExpanded = expandedDistricts.has(districtKey);
        
        return (
          <Card 
            key={districtKey} 
            className="overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleDistrict(group.district)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {districtKey} 
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({group.count} {group.count === 1 ? 'case' : 'cases'})
                  </span>
                </CardTitle>
                <div className="p-1 -mr-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              {group.latestDate && (
                <div className="text-sm text-gray-500">
                  Latest: {format(new Date(group.latestDate), 'MMM d, yyyy')}
                </div>
              )}
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 border-t">
                <ul className="divide-y">
                  {group.files.map((file) => (
                    <li key={file.id} className="py-2">
                      <Link 
                        href={`/admin/files/${file.id}`}
                        className="flex items-center hover:bg-gray-50 p-2 rounded-md transition-colors"
                      >
                        <FileText className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.title || 'Untitled'}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                            <span>{file.category || 'No category'}</span>
                            {file.entry_date_real && (
                              <span>• {format(new Date(file.entry_date_real), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-center">
                  <Link 
                    href={`/admin/files?district=${encodeURIComponent(group.district || '')}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View all {group.count} {group.count === 1 ? 'case' : 'cases'} in {districtKey}
                  </Link>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-500">
          Page {page} of {Math.ceil(total / pageSize)}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(p => p + 1)}
          disabled={page * pageSize >= total}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
