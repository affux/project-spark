import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IndianName {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export const useIndianNames = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: names = [], isLoading } = useQuery({
    queryKey: ['indian-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indian_names')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as IndianName[];
    },
  });

  const addNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('indian_names')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indian-names'] });
      toast({
        title: 'Name added',
        description: 'The name has been added to the pool.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add name',
        description: error.message.includes('duplicate') 
          ? 'This name already exists' 
          : error.message,
        variant: 'destructive',
      });
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('indian_names')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indian-names'] });
      toast({
        title: 'Name updated',
        description: 'The name has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update name',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('indian_names')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['indian-names'] });
      toast({
        title: data.is_active ? 'Name activated' : 'Name deactivated',
        description: `"${data.name}" has been ${data.is_active ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteNameMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('indian_names')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indian-names'] });
      toast({
        title: 'Name deleted',
        description: 'The name has been removed from the pool.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete name',
        description: error.message.includes('foreign key') 
          ? 'This name is in use and cannot be deleted' 
          : error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    names,
    isLoading,
    addName: addNameMutation.mutate,
    isAdding: addNameMutation.isPending,
    updateName: updateNameMutation.mutate,
    isUpdating: updateNameMutation.isPending,
    toggleActive: toggleActiveMutation.mutate,
    deleteName: deleteNameMutation.mutate,
    isDeleting: deleteNameMutation.isPending,
  };
};
