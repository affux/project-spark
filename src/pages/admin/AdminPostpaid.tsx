import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminPostpaidSettings } from '@/components/admin/AdminPostpaidSettings';
import { PostpaidAnalyticsDashboard } from '@/components/admin/PostpaidAnalyticsDashboard';

const AdminPostpaid = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Postpaid Management</h1>
          <p className="text-muted-foreground">
            Manage postpaid credit settings and view analytics
          </p>
        </div>

        <div className="space-y-6">
          {/* Postpaid Credit Management */}
          <AdminPostpaidSettings />

          {/* Postpaid Credit Analytics */}
          <PostpaidAnalyticsDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPostpaid;
