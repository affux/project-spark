import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Users, ShieldCheck, Target, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboardMessages, DashboardMessage } from '@/hooks/useDashboardMessages';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const DashboardMessageSettings = () => {
  const { user } = useAuth();
  const { messages, isLoading, createMessage, updateMessage, deleteMessage } = useDashboardMessages(true);
  const { dropshippers: users } = useAdminUsers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DashboardMessage | null>(null);
  const [searchUsers, setSearchUsers] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    message_type: 'info' as 'info' | 'warning' | 'alert',
    is_enabled: true,
    show_to_admins: true,
    show_to_users: true,
    starts_at: '',
    expires_at: '',
    target_type: 'all' as 'all' | 'specific_users' | 'by_role',
    target_roles: [] as string[],
    target_user_ids: [] as string[],
    priority: 0,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      message_type: 'info',
      is_enabled: true,
      show_to_admins: true,
      show_to_users: true,
      starts_at: '',
      expires_at: '',
      target_type: 'all',
      target_roles: [],
      target_user_ids: [],
      priority: 0,
    });
    setEditingMessage(null);
    setSearchUsers('');
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (msg: DashboardMessage) => {
    setEditingMessage(msg);
    setFormData({
      title: msg.title || '',
      message: msg.message,
      message_type: msg.message_type,
      is_enabled: msg.is_enabled,
      show_to_admins: msg.show_to_admins,
      show_to_users: msg.show_to_users,
      starts_at: msg.starts_at ? format(new Date(msg.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
      expires_at: msg.expires_at ? format(new Date(msg.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      target_type: msg.target_type || 'all',
      target_roles: msg.target_roles || [],
      target_user_ids: msg.target_user_ids || [],
      priority: msg.priority || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      created_by: user?.id,
    };

    if (editingMessage) {
      await updateMessage.mutateAsync({ id: editingMessage.id, ...payload });
    } else {
      await createMessage.mutateAsync(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage.mutateAsync(id);
    }
  };

  const toggleEnabled = async (msg: DashboardMessage) => {
    await updateMessage.mutateAsync({ id: msg.id, is_enabled: !msg.is_enabled });
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const toggleUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      target_user_ids: prev.target_user_ids.includes(userId)
        ? prev.target_user_ids.filter(id => id !== userId)
        : [...prev.target_user_ids, userId],
    }));
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'warning':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">Warning</Badge>;
      case 'alert':
        return <Badge variant="destructive">Alert</Badge>;
      default:
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Info</Badge>;
    }
  };

  const getTargetBadge = (msg: DashboardMessage) => {
    if (msg.target_type === 'all') {
      return <Badge variant="secondary" className="text-xs">All Users</Badge>;
    } else if (msg.target_type === 'specific_users') {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <UserCheck className="h-3 w-3" />
          {msg.target_user_ids?.length || 0} users
        </Badge>
      );
    } else if (msg.target_type === 'by_role') {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Target className="h-3 w-3" />
          {msg.target_roles?.join(', ') || 'No roles'}
        </Badge>
      );
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUsers.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Dashboard Messages</CardTitle>
          <CardDescription>Manage announcement banners shown on dashboards</CardDescription>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Message
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages created yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getTypeBadge(msg.message_type)}
                    {getTargetBadge(msg)}
                    {!msg.is_enabled && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                    {msg.priority > 0 && (
                      <Badge variant="outline" className="text-xs">Priority: {msg.priority}</Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {msg.show_to_admins && <ShieldCheck className="h-3 w-3" />}
                      {msg.show_to_users && <Users className="h-3 w-3" />}
                    </div>
                  </div>
                  {msg.title && (
                    <p className="font-medium text-sm">{msg.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                  {(msg.starts_at || msg.expires_at) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {msg.starts_at && `Starts: ${format(new Date(msg.starts_at), 'PPp')}`}
                      {msg.starts_at && msg.expires_at && ' • '}
                      {msg.expires_at && `Expires: ${format(new Date(msg.expires_at), 'PPp')}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleEnabled(msg)}
                    title={msg.is_enabled ? 'Disable' : 'Enable'}
                  >
                    {msg.is_enabled ? (
                      <Eye className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(msg)}
                  >
                    <Edit2 className="h-4 w-4" />
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
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? 'Edit Message' : 'Create Message'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Message title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your message..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select
                  value={formData.message_type}
                  onValueChange={(value: 'info' | 'warning' | 'alert') =>
                    setFormData({ ...formData, message_type: value })
                  }
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
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (higher = shown first)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Starts At (optional)</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At (optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>

            {/* Target Audience Section */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target Audience
              </Label>
              <Select
                value={formData.target_type}
                onValueChange={(value: 'all' | 'specific_users' | 'by_role') =>
                  setFormData({ ...formData, target_type: value, target_user_ids: [], target_roles: [] })
                }
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

              {formData.target_type === 'by_role' && (
                <div className="space-y-2 mt-3">
                  <Label className="text-xs text-muted-foreground">Select roles:</Label>
                  <div className="flex gap-3 flex-wrap">
                    {['admin', 'user'].map((role) => (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={formData.target_roles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        <Label htmlFor={`role-${role}`} className="text-sm capitalize cursor-pointer">
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.target_type === 'specific_users' && (
                <div className="space-y-2 mt-3">
                  <Label className="text-xs text-muted-foreground">
                    Select users ({formData.target_user_ids.length} selected):
                  </Label>
                  <Input
                    placeholder="Search users..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="space-y-1">
                      {filteredUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                      ) : (
                        filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleUser(u.user_id)}
                          >
                            <Checkbox
                              checked={formData.target_user_ids.includes(u.user_id)}
                              onCheckedChange={() => toggleUser(u.user_id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="show_to_admins" className="text-sm">Show to Admins</Label>
                <Switch
                  id="show_to_admins"
                  checked={formData.show_to_admins}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, show_to_admins: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="show_to_users" className="text-sm">Show to Users</Label>
                <Switch
                  id="show_to_users"
                  checked={formData.show_to_users}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, show_to_users: checked })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="is_enabled">Enabled</Label>
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_enabled: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.message.trim() || createMessage.isPending || updateMessage.isPending}
            >
              {editingMessage ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DashboardMessageSettings;
