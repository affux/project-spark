import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  FolderOpen,
  Share2,
  FileText,
  Megaphone,
  ShoppingCart,
  MoreHorizontal,
  Image,
  Video,
  Users,
  Star,
  Heart,
  Zap,
  Target,
  Globe,
  Mail,
  Phone,
  Palette,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useAllCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  WorkTypeCategory,
} from '@/hooks/useWorkTypeCategories';

const ICON_OPTIONS = [
  { value: 'folder', label: 'Folder', icon: FolderOpen },
  { value: 'share-2', label: 'Share', icon: Share2 },
  { value: 'file-text', label: 'Document', icon: FileText },
  { value: 'megaphone', label: 'Megaphone', icon: Megaphone },
  { value: 'shopping-cart', label: 'Shopping', icon: ShoppingCart },
  { value: 'more-horizontal', label: 'More', icon: MoreHorizontal },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
];

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ef4444', label: 'Red' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#06b6d4', label: 'Cyan' },
];

export const getIconComponent = (iconName: string | null) => {
  const found = ICON_OPTIONS.find((i) => i.value === iconName);
  return found?.icon || FolderOpen;
};

interface SortableCategoryRowProps {
  category: WorkTypeCategory;
  onEdit: (cat: WorkTypeCategory) => void;
  onDelete: (cat: WorkTypeCategory) => void;
  onToggle: (cat: WorkTypeCategory) => void;
}

const SortableCategoryRow: React.FC<SortableCategoryRowProps> = ({
  category,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(category.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg mb-2"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <IconComponent className="w-4 h-4" style={{ color: category.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{category.name}</span>
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: category.color }}
          />
        </div>
      </div>

      <Switch checked={category.is_active} onCheckedChange={() => onToggle(category)} />

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const WorkTypeCategorySettings: React.FC = () => {
  const { data: categories, isLoading } = useAllCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  const [orderedCategories, setOrderedCategories] = useState<WorkTypeCategory[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WorkTypeCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1', icon: 'folder' });

  useEffect(() => {
    if (categories) {
      setOrderedCategories(categories);
    }
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.findIndex((c) => c.id === active.id);
    const newIndex = orderedCategories.findIndex((c) => c.id === over.id);

    const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
    setOrderedCategories(newOrder);

    await reorderCategories.mutateAsync(newOrder.map((c) => c.id));
  };

  const handleAdd = () => {
    setFormData({ name: '', color: '#6366f1', icon: 'folder' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (category: WorkTypeCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon || 'folder',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (category: WorkTypeCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = async (category: WorkTypeCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  const submitAdd = async () => {
    if (!formData.name.trim()) return;
    await createCategory.mutateAsync({
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon,
    });
    setIsAddDialogOpen(false);
  };

  const submitEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) return;
    await updateCategory.mutateAsync({
      id: selectedCategory.id,
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon,
    });
    setIsEditDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;
    await deleteCategory.mutateAsync(selectedCategory.id);
    setIsDeleteDialogOpen(false);
  };

  const SelectedIcon = getIconComponent(formData.icon);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Work Type Categories</CardTitle>
              <CardDescription>
                Manage categories with custom colors and icons
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : orderedCategories.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedCategories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedCategories.map((category) => (
                <SortableCategoryRow
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggleActive}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No categories configured</p>
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new category for work types</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Social Media"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((iconOpt) => {
                  const IconComp = iconOpt.icon;
                  return (
                    <button
                      key={iconOpt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconOpt.value })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                        formData.icon === iconOpt.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      title={iconOpt.label}
                    >
                      <IconComp
                        className="w-5 h-5"
                        style={{
                          color: formData.icon === iconOpt.value ? formData.color : undefined,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <SelectedIcon className="w-5 h-5" style={{ color: formData.color }} />
                </div>
                <span className="font-medium">{formData.name || 'Category Name'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAdd}
              disabled={!formData.name.trim() || createCategory.isPending}
            >
              {createCategory.isPending ? 'Adding...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((iconOpt) => {
                  const IconComp = iconOpt.icon;
                  return (
                    <button
                      key={iconOpt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconOpt.value })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                        formData.icon === iconOpt.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      title={iconOpt.label}
                    >
                      <IconComp
                        className="w-5 h-5"
                        style={{
                          color: formData.icon === iconOpt.value ? formData.color : undefined,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <SelectedIcon className="w-5 h-5" style={{ color: formData.color }} />
                </div>
                <span className="font-medium">{formData.name || 'Category Name'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={!formData.name.trim() || updateCategory.isPending}
            >
              {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? Work types using this
              category will be set to "General".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
