'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  DialogTrigger,
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

interface AiModelItem {
  id: number;
  provider: string;
  name: string;
  label: string;
  active: boolean;
  priority: number;
}

const emptyForm: Omit<AiModelItem, 'id'> = {
  provider: 'gemini',
  name: '',
  label: '',
  active: true,
  priority: 0,
};

export default function AiModelsClient() {
  const [items, setItems] = useState<AiModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<AiModelItem, 'id'>>(emptyForm);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const title = useMemo(() => (editingId ? 'Update Model' : 'Create Model'), [editingId]);

  const load = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/models?mode=admin', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load models');
      const data = await res.json();
      if (seq === loadSeq.current) {
        setItems(Array.isArray(data.models) ? data.models : []);
      }
    } catch (e: any) {
      console.error(e);
      if (seq === loadSeq.current) setError(e?.message || 'Failed to load models');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
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

  const openEdit = (item: AiModelItem) => {
    setEditingId(item.id);
    setForm({ provider: item.provider, name: item.name, label: item.label, active: item.active, priority: item.priority });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, priority: Number(form.priority) || 0 };
    if (!payload.provider || !payload.name || !payload.label) {
      toast.error('Please fill in provider, name and label.');
      return;
    }
    try {
      if (editingId) {
        const result = (await toast.promise(
          (async () => {
            const res = await fetch(`/api/admin/ai/models/${editingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err?.error || 'Failed to update model');
            }
            return res.json();
          })(),
          {
            loading: 'Updating model...',
            success: 'Model updated',
            error: 'Failed to update model',
          }
        )) as any;
        const updated: AiModelItem | undefined = result?.model;
        if (updated) {
          setItems((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        } else {
          // Fallback re-fetch if response shape differs
          await load();
        }
      } else {
        const result = (await toast.promise(
          (async () => {
            const res = await fetch('/api/admin/ai/models', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err?.error || 'Failed to create model');
            }
            return res.json();
          })(),
          {
            loading: 'Creating model...',
            success: 'Model created',
            error: 'Failed to create model',
          }
        )) as any;
        const created: AiModelItem | undefined = result?.model;
        if (created) {
          setItems((prev) => [created, ...prev]);
        } else {
          // Fallback re-fetch if response shape differs
          await load();
        }
      }
      setIsDialogOpen(false);
      // Background refresh to ensure ordering/consistency
      load();
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
    // Capture snapshot for rollback across try/catch scope
    let prevItems: AiModelItem[] | null = null;
    try {
      const idToDelete = deleteId as number;
      // Optimistically remove immediately; rollback on error
      prevItems = items;
      setItems((cur) => cur.filter((m) => m.id !== idToDelete));
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/admin/ai/models/${idToDelete}`, { method: 'DELETE' });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to delete model');
          }
          return { ok: true };
        })(),
        {
          loading: 'Deleting model...',
          success: 'Model deleted',
          error: 'Failed to delete model',
        }
      );
      setIsDeleteOpen(false);
      setDeleteId(null);
      // Background refresh to ensure consistency
      // small delay to avoid race with DB commit and avoid flicker
      setTimeout(() => {
        load();
      }, 150);
    } catch (e) {
      // Rollback optimistic change on failure
      if (prevItems) setItems(prevItems);
    }
  };

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
          <div className="text-sm text-gray-500">Manage available AI models per provider. Active models appear in selectors.</div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openCreate}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Model
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[120px]">Provider</TableHead>
              <TableHead className="w-[240px]">Label</TableHead>
              <TableHead className="w-[320px]">Model Name</TableHead>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium capitalize">{m.provider}</TableCell>
                <TableCell>{m.label}</TableCell>
                <TableCell><code className="text-xs bg-gray-50 px-2 py-0.5 rounded border">{m.name}</code></TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {m.active ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>{m.priority}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="mr-2" onClick={() => openEdit(m)} title="Edit">
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => confirmDelete(m.id)} title="Delete">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">No models found. Click "Create New Model" to add one.</p>
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
                <Label htmlFor="name">Model Name</Label>
                <Input
                  id="name"
                  placeholder="gemini-2.5-pro"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Gemini 2.5 Pro"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
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
              {editingId ? 'Update Model' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete model?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected model.
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
