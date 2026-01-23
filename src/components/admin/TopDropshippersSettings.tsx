import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Plus, Pencil, Trash2, Crown, Medal, Award, Users, GripVertical, Package, IndianRupee } from 'lucide-react';
import { useTopDropshippers, TopDropshipper } from '@/hooks/useTopDropshippers';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

const getRankIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-slate-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <Award className="w-5 h-5 text-primary" />;
  }
};

const getRankColor = (position: number) => {
  switch (position) {
    case 1:
      return 'bg-yellow-500/20 text-yellow-600';
    case 2:
      return 'bg-slate-400/20 text-slate-500';
    case 3:
      return 'bg-amber-600/20 text-amber-600';
    default:
      return 'bg-primary/20 text-primary';
  }
};

interface SortableDropshipperRowProps {
  entry: TopDropshipper;
  onEdit: (entry: TopDropshipper) => void;
  onDelete: (id: string) => void;
  onToggle: (params: { id: string; is_active: boolean }) => void;
}

const SortableDropshipperRow: React.FC<SortableDropshipperRowProps> = ({
  entry,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg transition-opacity ${
        !entry.is_active ? 'opacity-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Rank Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRankColor(entry.rank_position)}`}>
        {getRankIcon(entry.rank_position)}
      </div>

      {/* Name and Stats */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{entry.display_name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            #{entry.rank_position}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {entry.orders_count || 0} orders
          </span>
          <span className="flex items-center gap-1">
            <IndianRupee className="w-3 h-3" />
            {(entry.earnings_amount || 0).toLocaleString()}
          </span>
          {entry.badge_title && (
            <Badge 
              variant="outline" 
              className="bg-gradient-to-r from-amber-200/50 to-amber-300/50 text-amber-700 border-amber-400/50 text-xs"
            >
              {entry.badge_title}
            </Badge>
          )}
        </div>
      </div>

      {/* Toggle Active */}
      <Switch
        checked={entry.is_active}
        onCheckedChange={(checked) =>
          onToggle({ id: entry.id, is_active: checked })
        }
      />

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(entry)}
      >
        <Pencil className="w-4 h-4" />
      </Button>

      {/* Delete Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {entry.display_name} from the leaderboard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(entry.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const TopDropshippersSettings: React.FC = () => {
  const {
    allDropshippers,
    allUserRanks,
    isLoading,
    upsertDropshipper,
    deleteDropshipper,
    toggleActive,
    reorderDropshippers,
    setUserRank,
    isUpdating,
  } = useTopDropshippers();
  
  const { dropshippers } = useAdminUsers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TopDropshipper | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    display_name: '',
    rank_position: 1,
    badge_title: 'Top Performer',
    orders_count: 0,
    earnings_amount: 0,
    is_active: true,
  });

  const [userRankForm, setUserRankForm] = useState({
    user_id: '',
    position: 11,
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedDropshippers = [...allDropshippers].sort((a, b) => a.rank_position - b.rank_position);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedDropshippers.findIndex((d) => d.id === active.id);
      const newIndex = sortedDropshippers.findIndex((d) => d.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedDropshippers, oldIndex, newIndex);
        const updates = reordered.map((item, index) => ({
          id: item.id,
          rank_position: index + 1,
        }));
        reorderDropshippers(updates);
      }
    }
  };

  const getAvailablePositions = () => {
    const takenPositions = allDropshippers
      .filter((d) => d.id !== editingEntry?.id)
      .map((d) => d.rank_position);
    return Array.from({ length: 10 }, (_, i) => i + 1).filter(
      (pos) => !takenPositions.includes(pos)
    );
  };

  const handleOpenDialog = (entry?: TopDropshipper) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        user_id: entry.user_id || '',
        display_name: entry.display_name,
        rank_position: entry.rank_position,
        badge_title: entry.badge_title || 'Top Performer',
        orders_count: entry.orders_count || 0,
        earnings_amount: entry.earnings_amount || 0,
        is_active: entry.is_active,
      });
    } else {
      setEditingEntry(null);
      const availablePositions = getAvailablePositions();
      const nextPosition = availablePositions[0] || 1;
      setFormData({
        user_id: '',
        display_name: '',
        rank_position: nextPosition,
        badge_title: 'Top Performer',
        orders_count: 0,
        earnings_amount: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.display_name.trim()) return;
    
    upsertDropshipper({
      ...(editingEntry ? { id: editingEntry.id } : {}),
      user_id: formData.user_id || null,
      display_name: formData.display_name,
      rank_position: formData.rank_position,
      badge_title: formData.badge_title,
      orders_count: formData.orders_count,
      earnings_amount: formData.earnings_amount,
      is_active: formData.is_active,
    });
    setIsDialogOpen(false);
  };

  const handleUserSelect = (userId: string) => {
    if (userId === 'custom') {
      setFormData((prev) => ({
        ...prev,
        user_id: '',
      }));
    } else {
      const selectedUser = dropshippers?.find((u) => u.id === userId);
      setFormData((prev) => ({
        ...prev,
        user_id: userId,
        display_name: selectedUser?.name || prev.display_name,
      }));
    }
  };

  const handleSetUserRank = () => {
    if (!userRankForm.user_id) return;
    setUserRank({ userId: userRankForm.user_id, position: userRankForm.position });
    setUserRankForm({ user_id: '', position: 11 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Top Dropshippers Leaderboard</CardTitle>
            <CardDescription>
              Manually add names, positions, orders & earnings. Drag to reorder.
            </CardDescription>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-primary border-primary hover:bg-primary/10"
              onClick={() => handleOpenDialog()} 
              disabled={allDropshippers.length >= 10}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Dropshipper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Top Dropshipper' : 'Add Top Dropshipper'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Link to User (Optional)</Label>
                <Select
                  value={formData.user_id || 'custom'}
                  onValueChange={handleUserSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Enter custom name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">-- Enter Custom Name --</SelectItem>
                    {dropshippers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional: Link to existing user or enter a custom name below
                </p>
              </div>

              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, display_name: e.target.value }))
                  }
                  placeholder="e.g., Rahul Sharma"
                />
              </div>

              <div className="space-y-2">
                <Label>Position (1-10) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.rank_position}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setFormData((prev) => ({ 
                      ...prev, 
                      rank_position: Math.min(10, Math.max(1, value)) 
                    }));
                  }}
                  placeholder="Enter position (1-10)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Orders Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.orders_count}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, orders_count: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="e.g., 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Earnings (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.earnings_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, earnings_amount: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Badge Title</Label>
                <Input
                  value={formData.badge_title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, badge_title: e.target.value }))
                  }
                  placeholder="e.g., Top Performer, Elite Seller"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label className="cursor-pointer">Active on Leaderboard</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Preview</Label>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRankColor(formData.rank_position)}`}>
                      {getRankIcon(formData.rank_position)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formData.display_name || 'Dropshipper Name'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{formData.rank_position}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formData.orders_count} orders</span>
                        <span>₹{formData.earnings_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {formData.badge_title && (
                    <Badge variant="outline" className="mt-2 bg-gradient-to-r from-amber-200 to-amber-300 text-amber-800 border-amber-400">
                      {formData.badge_title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isUpdating || !formData.display_name.trim()}>
                {editingEntry ? 'Update' : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="top10" className="space-y-4">
          <TabsList>
            <TabsTrigger value="top10">Top 10 Management</TabsTrigger>
            <TabsTrigger value="user-ranks">User Rank Reference</TabsTrigger>
          </TabsList>

          <TabsContent value="top10" className="space-y-3">
            {sortedDropshippers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No dropshippers added yet</p>
                <p className="text-sm">Click "Add Dropshipper" to add your first entry</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedDropshippers.map((d) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sortedDropshippers.map((entry) => (
                      <SortableDropshipperRow
                        key={entry.id}
                        entry={entry}
                        onEdit={handleOpenDialog}
                        onDelete={deleteDropshipper}
                        onToggle={toggleActive}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {allDropshippers.length > 0 && allDropshippers.length < 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                {10 - allDropshippers.length} positions remaining
              </p>
            )}
          </TabsContent>

          <TabsContent value="user-ranks" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Set User Position Reference
                </CardTitle>
                <CardDescription>
                  Set the rank shown for users not in the Top 10 (displayed as their position)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Select User</Label>
                    <Select
                      value={userRankForm.user_id}
                      onValueChange={(v) => setUserRankForm((prev) => ({ ...prev, user_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {dropshippers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Position</Label>
                    <Input
                      type="number"
                      min={11}
                      value={userRankForm.position}
                      onChange={(e) =>
                        setUserRankForm((prev) => ({ ...prev, position: parseInt(e.target.value) || 11 }))
                      }
                    />
                  </div>
                  <Button onClick={handleSetUserRank} disabled={!userRankForm.user_id || isUpdating}>
                    Set Rank
                  </Button>
                </div>

                {allUserRanks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium mb-2">Current User Ranks</h4>
                    {allUserRanks.map((rank) => {
                      const user = dropshippers?.find((u) => u.id === rank.user_id);
                      return (
                        <div key={rank.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">{user?.name || rank.user_id}</span>
                          </div>
                          <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                            #{rank.admin_defined_position}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
