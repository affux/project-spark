import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Plus, Pencil, Trash2, Loader2, Zap } from 'lucide-react';
import { useQuickReplies } from '@/hooks/useQuickReplies';

export const QuickReplySettings: React.FC = () => {
  const {
    quickReplies,
    isLoading,
    categories,
    addQuickReply,
    updateQuickReply,
    deleteQuickReply,
    isAdding,
    isDeleting,
  } = useQuickReplies();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [newReply, setNewReply] = useState({ title: '', message: '', category: 'general' });
  const [newCategory, setNewCategory] = useState('');

  const handleAddReply = () => {
    if (!newReply.title.trim() || !newReply.message.trim()) return;
    
    addQuickReply({
      title: newReply.title.trim(),
      message: newReply.message.trim(),
      category: newReply.category || 'general',
    });
    
    setNewReply({ title: '', message: '', category: 'general' });
    setIsAddDialogOpen(false);
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      const category = prompt('Enter new category name:');
      if (category) {
        setNewReply({ ...newReply, category: category.toLowerCase() });
      }
    } else {
      setNewReply({ ...newReply, category: value });
    }
  };

  const groupedReplies = quickReplies.reduce((acc, reply) => {
    const cat = reply.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(reply);
    return acc;
  }, {} as Record<string, typeof quickReplies>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Quick Reply Templates</CardTitle>
              <CardDescription>
                Create reusable message templates for faster order chat responses
              </CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Quick Reply Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Order Confirmation"
                    value={newReply.title}
                    onChange={(e) => setNewReply({ ...newReply, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newReply.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['general', 'greeting', 'shipping', 'payment', 'support', ...categories.filter(c => !['general', 'greeting', 'shipping', 'payment', 'support'].includes(c))].map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    placeholder="Enter your quick reply message..."
                    value={newReply.message}
                    onChange={(e) => setNewReply({ ...newReply, message: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use {'{customer}'} for customer name placeholder
                  </p>
                </div>
                <Button 
                  onClick={handleAddReply} 
                  disabled={isAdding || !newReply.title.trim() || !newReply.message.trim()}
                  className="w-full"
                >
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {quickReplies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No quick reply templates yet</p>
            <p className="text-sm">Add templates to speed up your order chat responses</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReplies).map(([category, replies]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                  {category}
                </h4>
                <div className="space-y-2">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{reply.title}</span>
                          {!reply.is_active && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reply.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Switch
                          checked={reply.is_active}
                          onCheckedChange={(checked) => 
                            updateQuickReply({ id: reply.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteQuickReply(reply.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
