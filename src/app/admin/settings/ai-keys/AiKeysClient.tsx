'use client';

import { useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Pencil, PlusCircle, Trash2 } from 'lucide-react';

interface AiKeyItem {
  id: number;
  provider: string;
  label: string;
  active: boolean;
  priority: number;
  last_used_at: string | null;
  success_count: number;
  error_count: number;
  created_at: string | null;
  updated_at: string | null;
}

type FormState = {
  provider: string;
  label: string;
  apiKeyPlain?: string;
  active: boolean;
  priority: number;
};

const emptyForm: FormState = {
  provider: 'gemini',
  label: '',
  apiKeyPlain: '',
  active: true,
  priority: 0,
};

export default function AiKeysClient() {
  const [items, setItems] = useState<AiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const title = useMemo(() => (editingId ? 'Update API Key' : 'Create API Key'), [editingId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/keys', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load API keys');
      const data = await res.json();
      setItems(Array.isArray(data.keys) ? data.keys : []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (item: AiKeyItem) => {
    setEditingId(item.id);
    setForm({ provider: item.provider, label: item.label, apiKeyPlain: '', active: item.active, priority: item.priority });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: any = { ...form, priority: Number(form.priority) || 0 };
    if (!payload.provider || !payload.label) {
      toast.error('Please fill in provider and label.');
      return;
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/ai/keys/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 409) {
            toast.error(err?.error || 'This API key already exists for the selected provider.');
          } else {
            toast.error(err?.error || 'Failed to update API key');
          }
          return;
        }
        toast.success('API key updated');
        const data = await res.json().catch(() => ({} as any));
        const updated: AiKeyItem | undefined = data?.key;
        if (updated) {
          setItems((prev) => prev.map((k) => (k.id === updated.id ? { ...k, ...updated } : k)));
        }
      } else {
        if (!payload.apiKeyPlain) {
          toast.error('API key is required to create');
          return;
        }
        const res = await fetch('/api/admin/ai/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 409) {
            toast.error(err?.error || 'This API key already exists for the selected provider.');
          } else {
            toast.error(err?.error || 'Failed to create API key');
          }
          return;
        }
        toast.success('API key created');
        const data = await res.json().catch(() => ({} as any));
        const created: AiKeyItem | undefined = data?.key;
        if (created) {
          setItems((prev) => [created, ...prev]);
        }
      }
      setIsDialogOpen(false);
      setForm(emptyForm);
      // small delay avoids flicker with DB commit
      setTimeout(() => {
        load();
      }, 150);
    } catch (e) {
      // handled by toast
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    // optimistic remove
    const prev = items;
    setItems((curr) => curr.filter((k) => k.id !== id));
    setIsDeleteOpen(false);
    setDeleteId(null);
    try {
      const res = await fetch(`/api/admin/ai/keys/${id}`, { method: 'DELETE', cache: 'no-store' });
      if (!res.ok) {
        // revert on failure
        setItems(prev);
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || 'Failed to delete API key');
        return;
      }
      toast.success('API key deleted');
      // background refresh to sync counters/order
      setTimeout(() => {
        load();
      }, 100);
    } catch (e) {
      setItems(prev);
      toast.error('Failed to delete API key');
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Keys are stored encrypted. <strong>Rotation Active:</strong> Multiple active keys are used in a round-robin (Round-Robin) strategy. Priority is ignored.
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openCreate}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[120px]">Provider</TableHead>
              <TableHead className="w-[240px]">Label</TableHead>
              <TableHead className="w-[100px]">Active</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[180px]">Last Used</TableHead>
              <TableHead className="w-[140px]">Success/Error</TableHead>
              <TableHead className="w-[180px]">Updated</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium capitalize">{k.provider}</TableCell>
                <TableCell>{k.label}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${k.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {k.active ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>{k.priority}</TableCell>
                <TableCell>{fmt(k.last_used_at)}</TableCell>
                <TableCell>
                  <span className="text-xs">{k.success_count} / {k.error_count}</span>
                </TableCell>
                <TableCell>{fmt(k.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="mr-2" onClick={() => openEdit(k)} title="Edit">
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => confirmDelete(k.id)} title="Delete">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">No API keys found. Click "Create New Key" to add one.</p>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  placeholder="gemini"
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value.toLowerCase() }))}
                />
              </div>
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="Primary Key"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="apiKeyPlain">API Key {editingId ? '(leave blank to keep unchanged)' : ''}</Label>
              <Input
                id="apiKeyPlain"
                placeholder={editingId ? '••••••••••••' : 'paste key here'}
                value={form.apiKeyPlain}
                onChange={(e) => setForm((f) => ({ ...f, apiKeyPlain: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
              {editingId ? 'Update Key' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleGuard>
  );
}
