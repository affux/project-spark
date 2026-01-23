import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IPLogViewer } from '@/components/admin/IPLogViewer';

const AdminIPLogs: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IP Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor user IP addresses across login, logout, and critical actions.
          </p>
        </div>

        <IPLogViewer showUserColumn={true} />
      </div>
    </DashboardLayout>
  );
};

export default AdminIPLogs;
