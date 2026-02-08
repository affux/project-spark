import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Users, Video, Clock, Search, Filter } from 'lucide-react';
import { usePlatformSettings, VideoTutorial } from '@/hooks/usePlatformSettings';
import { format } from 'date-fns';

interface TutorialCompletionWithUser {
  id: string;
  user_id: string;
  video_id: string;
  completed_at: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export const TutorialCompletionViewer: React.FC = () => {
  const { settingsMap } = usePlatformSettings();
  const videoTutorials: VideoTutorial[] = settingsMap.video_tutorials || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  // Fetch all completions with user info
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['admin-tutorial-completions'],
    queryFn: async (): Promise<TutorialCompletionWithUser[]> => {
      // Fetch completions
      const { data: completionData, error: completionError } = await supabase
        .from('video_tutorial_completions')
        .select('*')
        .order('completed_at', { ascending: false });

      if (completionError) {
        console.error('Error fetching completions:', completionError);
        throw completionError;
      }

      // Fetch profiles to get user names
      const userIds = [...new Set((completionData || []).map((c: any) => c.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      }

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, { name: p.name, email: p.email }])
      );

      return (completionData || []).map((c: any) => ({
        ...c,
        user_name: profileMap.get(c.user_id)?.name || 'Unknown',
        user_email: profileMap.get(c.user_id)?.email || '',
      }));
    },
  });

  // Group completions by user
  const userCompletionStats = useMemo(() => {
    const stats: Record<string, { name: string; email: string; completed: string[]; lastActivity: string }> = {};
    
    completions.forEach((c) => {
      if (!stats[c.user_id]) {
        stats[c.user_id] = {
          name: c.user_name || 'Unknown',
          email: c.user_email || '',
          completed: [],
          lastActivity: c.completed_at,
        };
      }
      stats[c.user_id].completed.push(c.video_id);
      if (new Date(c.completed_at) > new Date(stats[c.user_id].lastActivity)) {
        stats[c.user_id].lastActivity = c.completed_at;
      }
    });

    return Object.entries(stats).map(([userId, data]) => ({
      userId,
      ...data,
      completedCount: data.completed.length,
      isAllCompleted: videoTutorials.length > 0 && data.completed.length >= videoTutorials.length,
    })).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [completions, videoTutorials.length]);

  // Filtered user stats
  const filteredUserStats = useMemo(() => {
    return userCompletionStats.filter((user) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'completed' && user.isAllCompleted) ||
        (statusFilter === 'in_progress' && !user.isAllCompleted);
      
      return matchesSearch && matchesStatus;
    });
  }, [userCompletionStats, searchQuery, statusFilter]);

  // Find video title by ID
  const getVideoTitle = (videoId: string) => {
    const video = videoTutorials.find((v) => v.id === videoId);
    return video?.title || videoId;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Tutorial Completions</CardTitle>
            <CardDescription>
              View which users have completed video tutorials
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{userCompletionStats.length}</div>
            <div className="text-xs text-muted-foreground">Users Started</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {userCompletionStats.filter((u) => u.isAllCompleted).length}
            </div>
            <div className="text-xs text-muted-foreground">Fully Completed</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{completions.length}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{videoTutorials.length}</div>
            <div className="text-xs text-muted-foreground">Tutorials Available</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="completed">Fully Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredUserStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{userCompletionStats.length === 0 ? 'No users have completed any tutorials yet' : 'No users match your filters'}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Completed Tutorials</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUserStats.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isAllCompleted ? (
                        <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          All Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {user.completedCount}/{videoTutorials.length}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.completed.slice(0, 3).map((videoId) => (
                          <Badge key={videoId} variant="outline" className="text-xs">
                            {getVideoTitle(videoId).slice(0, 20)}
                            {getVideoTitle(videoId).length > 20 ? '...' : ''}
                          </Badge>
                        ))}
                        {user.completed.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.completed.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(user.lastActivity), 'MMM d, yyyy h:mm a')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
