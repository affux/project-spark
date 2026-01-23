import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { useIndianNames, IndianName } from '@/hooks/useIndianNames';
import { Plus, Pencil, Trash2, Users, Loader2, Search } from 'lucide-react';

export const IndianNamesSettings: React.FC = () => {
  const {
    names,
    isLoading,
    addName,
    isAdding,
    updateName,
    isUpdating,
    toggleActive,
    deleteName,
    isDeleting,
  } = useIndianNames();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState<IndianName | null>(null);
  const [deletingName, setDeletingName] = useState<IndianName | null>(null);

  const filteredNames = names.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddName = () => {
    if (!newName.trim()) return;
    addName(newName.trim());
    setNewName('');
    setIsAddDialogOpen(false);
  };

  const handleEditName = () => {
    if (!editingName || !newName.trim()) return;
    updateName({ id: editingName.id, name: newName.trim() });
    setNewName('');
    setEditingName(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteName = () => {
    if (!deletingName) return;
    deleteName(deletingName.id);
    setDeletingName(null);
    setIsDeleteDialogOpen(false);
  };

  const openEditDialog = (name: IndianName) => {
    setEditingName(name);
    setNewName(name.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (name: IndianName) => {
    setDeletingName(name);
    setIsDeleteDialogOpen(true);
  };

  const activeCount = names.filter((n) => n.is_active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <CardTitle>Indian Names Pool</CardTitle>
            <CardDescription>
              Manage the pool of Indian names used for customer chat identity
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {activeCount} active / {names.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Name
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNames.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {searchQuery ? 'No names found' : 'No names added yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNames.map((name) => (
                    <TableRow key={name.id}>
                      <TableCell className="font-medium">{name.name}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={name.is_active}
                          onCheckedChange={(checked) =>
                            toggleActive({ id: name.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(name)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Indian Name</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Enter full name (e.g., Rahul Sharma)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddName()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddName} disabled={isAdding || !newName.trim()}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Name</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Enter full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditName()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditName} disabled={isUpdating || !newName.trim()}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Name?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingName?.name}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteName}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
