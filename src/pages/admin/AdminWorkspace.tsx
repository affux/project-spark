import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, History, BarChart3 } from 'lucide-react';
import { ProofReviewQueue } from '@/components/workspace/ProofReviewQueue';
import { ProofHistory } from '@/components/workspace/ProofHistory';
import { ProofAnalyticsDashboard } from '@/components/workspace/ProofAnalyticsDashboard';

const STORAGE_KEY = 'admin-workspace-tab';

const AdminWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'queue';
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
            Review and manage proof of work submissions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Review Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6">
            <ProofReviewQueue />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ProofHistory />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ProofAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminWorkspace;
