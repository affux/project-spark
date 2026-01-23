import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List, BarChart3 } from 'lucide-react';
import { SubmitProofForm } from '@/components/workspace/SubmitProofForm';
import { MyProofsList } from '@/components/workspace/MyProofsList';
import { UserProofAnalytics } from '@/components/workspace/UserProofAnalytics';

const STORAGE_KEY = 'user-workspace-tab';

const UserWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'submit';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace</h1>
          <p className="text-muted-foreground">
            Submit and track your proof of work submissions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="submit" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Submit
            </TabsTrigger>
            <TabsTrigger value="my-proofs" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              My Proofs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="mt-6">
            <SubmitProofForm />
          </TabsContent>

          <TabsContent value="my-proofs" className="mt-6">
            <MyProofsList />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <UserProofAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserWorkspace;
