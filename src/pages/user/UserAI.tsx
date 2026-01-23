import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, ServerOff } from 'lucide-react';

const UserAI: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-600" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered support assistant
          </p>
        </div>

        {/* Not Available Card */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <ServerOff className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>AI Assistant Not Available</CardTitle>
                <CardDescription>
                  This feature requires cloud AI services
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The AI Assistant feature is not available for self-hosted deployments as it requires 
              access to cloud AI services that are only available on the hosted platform.
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Alternative Support Options:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use <strong>Chat Support</strong> to talk with a real support agent</li>
                <li>• Check the <strong>FAQ & Help</strong> section for common questions</li>
                <li>• <strong>Raise a Ticket</strong> for complex issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserAI;
