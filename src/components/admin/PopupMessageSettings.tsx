import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Users, Shield, Clock, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePopupMessages, PopupMessage } from '@/hooks/usePopupMessages';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { format } from 'date-fns';

interface FormData {
  title: string;
  message: string;
  message_type: string;
  target_type: string;
  target_roles: string[];
  target_user_ids: string[];
  is_enabled: boolean;
  priority: number;
  starts_at: string;
  expires_at: string;
  re_acknowledgment_mode: string;
  re_ack_period_days: string;
  version: number;
}

const defaultFormData: FormData = {
  title: '',
  message: '',
  message_type: 'info',
  target_type: 'all',
  target_roles: [],
  target_user_ids: [],
  is_enabled: true,
  priority: 0,
  starts_at: '',
  expires_at: '',
  re_acknowledgment_mode: 'once',
  re_ack_period_days: '',
  version: 1
};

export function PopupMessageSettings() {
  const { messages, createMessage, updateMessage, deleteMessage, isCreating, isUpdating } = usePopupMessages();
  const { dropshippers = [] } = useAdminUsers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<PopupMessage | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [userSearch, setUserSearch] = useState('');

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingMessage(null);
    setUserSearch('');
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (msg: PopupMessage) => {
    setEditingMessage(msg);
    setFormData({
      title: msg.title || '',
      message: msg.message,
      message_type: msg.message_type,
      target_type: msg.target_type,
      target_roles: msg.target_roles || [],
      target_user_ids: msg.target_user_ids || [],
      is_enabled: msg.is_enabled,
      priority: msg.priority,
      starts_at: msg.starts_at ? format(new Date(msg.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
      expires_at: msg.expires_at ? format(new Date(msg.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      re_acknowledgment_mode: msg.re_acknowledgment_mode,
      re_ack_period_days: msg.re_ack_period_days?.toString() || '',
      version: msg.version
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: formData.title || null,
      message: formData.message,
      message_type: formData.message_type,
      target_type: formData.target_type,
      target_roles: formData.target_type === 'by_role' ? formData.target_roles : null,
      target_user_ids: formData.target_type === 'specific_users' ? formData.target_user_ids : [],
      is_enabled: formData.is_enabled,
      priority: formData.priority,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      re_acknowledgment_mode: formData.re_acknowledgment_mode,
      re_ack_period_days: formData.re_ack_period_days ? parseInt(formData.re_ack_period_days) : null,
      version: editingMessage ? formData.version : 1
    };

    if (editingMessage) {
      updateMessage({ id: editingMessage.id, ...payload });
    } else {
      createMessage(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this popup message?')) {
      deleteMessage(id);
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      target_user_ids: prev.target_user_ids.includes(userId)
        ? prev.target_user_ids.filter(id => id !== userId)
        : [...prev.target_user_ids, userId]
    }));
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return dropshippers;
    const search = userSearch.toLowerCase();
    return dropshippers.filter(u => 
      u.name?.toLowerCase().includes(search) || 
      u.email?.toLowerCase().includes(search)
    );
  }, [dropshippers, userSearch]);

  const getTargetBadge = (msg: PopupMessage) => {
    if (msg.target_type === 'all') {
      return <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />All Users</Badge>;
    }
    if (msg.target_type === 'by_role') {
      return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />{msg.target_roles?.join(', ')}</Badge>;
    }
    if (msg.target_type === 'specific_users') {
      return <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{msg.target_user_ids?.length || 0} users</Badge>;
    }
    return null;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Warning</Badge>;
      case 'alert':
        return <Badge variant="destructive">Alert</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Popup Messages</CardTitle>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Popup
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Create blocking popup messages that users must acknowledge before continuing.
        </p>

        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No popup messages configured
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {msg.title || 'Untitled Popup'}
                    </span>
                    {!msg.is_enabled && (
                      <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {msg.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {getTypeBadge(msg.message_type)}
                    {getTargetBadge(msg)}
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {msg.re_acknowledgment_mode === 'once' && 'Once'}
                      {msg.re_acknowledgment_mode === 'on_update' && 'On Update'}
                      {msg.re_acknowledgment_mode === 'periodic' && `Every ${msg.re_ack_period_days}d`}
                    </Badge>
                    <Badge variant="outline">
                      <Check className="h-3 w-3 mr-1" />
                      {msg.acknowledgment_count || 0} acks
                    </Badge>
                    {msg.starts_at && (
                      <span className="text-muted-foreground">
                        Starts: {format(new Date(msg.starts_at), 'MMM d, yyyy')}
                      </span>
                    )}
                    {msg.expires_at && (
                      <span className="text-muted-foreground">
                        Expires: {format(new Date(msg.expires_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(msg)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(msg.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMessage ? 'Edit Popup Message' : 'Create Popup Message'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Important Notice"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message_type">Message Type</Label>
                  <Select
                    value={formData.message_type}
                    onValueChange={(value) => setFormData({ ...formData, message_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message Content *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter the message content..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_type">Target Audience</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value) => setFormData({ ...formData, target_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="specific_users">Specific Users</SelectItem>
                      <SelectItem value="by_role">By Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (Higher = First)</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formData.target_type === 'by_role' && (
                <div className="space-y-2">
                  <Label>Target Roles</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.target_roles.includes('admin')}
                        onCheckedChange={() => handleRoleToggle('admin')}
                      />
                      <span>Admin</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.target_roles.includes('user')}
                        onCheckedChange={() => handleRoleToggle('user')}
                      />
                      <span>User</span>
                    </label>
                  </div>
                </div>
              )}

              {formData.target_type === 'specific_users' && (
                <div className="space-y-2">
                  <Label>Select Users ({formData.target_user_ids.length} selected)</Label>
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <ScrollArea className="h-48 border rounded-md p-2">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.user_id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={formData.target_user_ids.includes(user.user_id)}
                          onCheckedChange={() => handleUserToggle(user.user_id)}
                        />
                        <span className="text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </label>
                    ))}
                  </ScrollArea>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Starts At</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expires At</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="re_acknowledgment_mode">Re-acknowledgment Mode</Label>
                  <Select
                    value={formData.re_acknowledgment_mode}
                    onValueChange={(value) => setFormData({ ...formData, re_acknowledgment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Show Once Only</SelectItem>
                      <SelectItem value="on_update">Show Again After Update</SelectItem>
                      <SelectItem value="periodic">Show Periodically</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.re_acknowledgment_mode === 'periodic' && (
                  <div className="space-y-2">
                    <Label htmlFor="re_ack_period_days">Period (Days)</Label>
                    <Input
                      id="re_ack_period_days"
                      type="number"
                      min="1"
                      value={formData.re_ack_period_days}
                      onChange={(e) => setFormData({ ...formData, re_ack_period_days: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>
                )}
              </div>

              {editingMessage && (
                <div className="space-y-2">
                  <Label htmlFor="version">Version (Increment to trigger re-ack)</Label>
                  <Input
                    id="version"
                    type="number"
                    min="1"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                />
                <Label htmlFor="is_enabled">Enabled</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {editingMessage ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
