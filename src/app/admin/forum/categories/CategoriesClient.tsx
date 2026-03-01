"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Plus } from "lucide-react"
import {
    createCategory,
    updateCategory,
    deleteCategory
} from "./actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
    const router = useRouter()
    const [categories, setCategories] = useState(initialCategories)

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [order, setOrder] = useState(0)
    const [isActive, setIsActive] = useState(true)

    const resetForm = () => {
        setEditingId(null)
        setName("")
        setDescription("")
        setOrder(0)
        setIsActive(true)
    }

    const openEditDialog = (category: any) => {
        setEditingId(category.id)
        setName(category.name)
        setDescription(category.description || "")
        setOrder(category.order)
        setIsActive(category.is_active)
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Category name is required.")
            return
        }

        setIsSubmitting(true)
        const payload = {
            name: name.trim(),
            description: description.trim(),
            order,
            is_active: isActive
        }

        try {
            if (editingId) {
                const res = await updateCategory(editingId, payload)
                if (res.success) {
                    toast.success("Category updated.")
                    setCategories(categories.map(c => c.id === editingId ? { ...c, ...res.category } : c))
                    setIsDialogOpen(false)
                } else {
                    toast.error(res.error)
                }
            } else {
                const res = await createCategory(payload)
                if (res.success) {
                    toast.success("Category created.")
                    // Refetch or optimistically add (optimistic add here without topic count for simplicity, real app might just refresh)
                    setCategories([...categories, { ...res.category, _count: { topics: 0 } }].sort((a, b) => a.order - b.order))
                    setIsDialogOpen(false)
                } else {
                    toast.error(res.error)
                }
            }
        } catch (error) {
            toast.error("An unexpected error occurred.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this category?")) return

        try {
            const res = await deleteCategory(id)
            if (res.success) {
                toast.success("Category deleted.")
                setCategories(categories.filter(c => c.id !== id))
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Failed to delete category.")
        }
    }

    return (
        <div className="bg-white rounded-lg shadow min-h-[500px]">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">All Categories</h2>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" />
                            New Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Category' : 'Create Category'}</DialogTitle>
                            <DialogDescription>
                                {editingId ? 'Update the details of this forum category.' : 'Add a new category to organize forum topics.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="col-span-3"
                                    placeholder="e.g. General Discussion"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="description" className="text-right mt-2">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Brief description of what belongs here"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="order" className="text-right">Display Order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="active" className="text-right">Active</Label>
                                <div className="col-span-3 flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                    <Label htmlFor="active">{isActive ? 'Yes (Visible)' : 'No (Hidden)'}</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="button" onClick={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Topics
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                                    No categories found. Create your first category above.
                                </td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {category.order}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                        <div className="text-sm text-gray-500 max-w-xs truncate">{category.description || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {category._count?.topics || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full p-1 border ${category.is_active
                                                ? 'bg-green-100 text-green-800 border-green-200'
                                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}>
                                            {category.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(category)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(category.id)}
                                            className="text-red-600 hover:text-red-900"
                                            disabled={category._count?.topics > 0}
                                            title={category._count?.topics > 0 ? "Cannot delete category containing topics" : "Delete category"}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
