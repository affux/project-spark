import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VideoSettings } from '@/components/admin/VideoSettings';
import { VideoTutorialsSettings } from '@/components/admin/VideoTutorialsSettings';
import { TutorialCompletionViewer } from '@/components/admin/TutorialCompletionViewer';
import { Video } from 'lucide-react';

const AdminVideos: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Video Management
          </h1>
          <p className="text-muted-foreground">
            Manage video tutorials, dashboard videos, and view user progress
          </p>
        </div>

        {/* Dashboard Video Settings */}
        <VideoSettings />

        {/* Video Tutorials Settings */}
        <VideoTutorialsSettings />

        {/* Tutorial Completion Viewer */}
        <TutorialCompletionViewer />
      </div>
    </DashboardLayout>
  );
};

export default AdminVideos;
