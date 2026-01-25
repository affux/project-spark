import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IPLogViewer } from '@/components/admin/IPLogViewer';
import { VisitorLogsPanel } from '@/components/admin/VisitorLogsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Globe } from 'lucide-react';

const AdminIPLogs: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IP Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor user IP addresses and visitor activity across your platform.
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              User Activity
            </TabsTrigger>
            <TabsTrigger value="visitors" className="gap-2">
              <Globe className="h-4 w-4" />
              Visitor Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-4">
            <IPLogViewer showUserColumn={true} />
          </TabsContent>
          
          <TabsContent value="visitors" className="mt-4">
            <VisitorLogsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminIPLogs;
