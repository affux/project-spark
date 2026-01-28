import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Upload, 
  Database, 
  Clock, 
  Trash2, 
  RefreshCw,
  FileJson,
  Calendar,
  Timer,
  CheckCircle2,
  Loader2,
  HardDrive,
  RotateCcw
} from 'lucide-react';
import { useLocalBackup } from '@/hooks/useLocalBackup';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DataBackupManager = () => {
  const {
    backups,
    isLoading,
    isCreatingBackup,
    lastAutoBackup,
    createBackup,
    exportBackup,
    importBackup,
    restoreBackup,
    deleteBackup,
    formatSize,
    loadBackups,
  } = useLocalBackup();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingFile, setImportingFile] = useState(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportingFile(true);
    await importBackup(file);
    setImportingFile(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'auto_15min':
        return <Timer className="h-3 w-3" />;
      case 'auto_daily':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Database className="h-3 w-3" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'auto_15min':
        return <Badge variant="secondary" className="text-xs"><Timer className="h-3 w-3 mr-1" />15min Auto</Badge>;
      case 'auto_daily':
        return <Badge variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Daily</Badge>;
      default:
        return <Badge className="text-xs"><Database className="h-3 w-3 mr-1" />Manual</Badge>;
    }
  };

  const manualBackups = backups.filter(b => b.type === 'manual');
  const autoBackups = backups.filter(b => b.type !== 'manual');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Data Backup Manager
            </CardTitle>
            <CardDescription>
              Automatic local backups every 15 minutes + daily. Manual backup & restore.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadBackups}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Last Auto Backup
            </div>
            <div className="font-medium">
              {lastAutoBackup 
                ? formatDistanceToNow(new Date(lastAutoBackup), { addSuffix: true })
                : 'No backups yet'}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Timer className="h-4 w-4" />
              Next 15min Backup
            </div>
            <div className="font-medium">
              {lastAutoBackup
                ? `~${15 - Math.floor((Date.now() - new Date(lastAutoBackup).getTime()) / 60000) % 15} min`
                : 'Starting soon...'}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Database className="h-4 w-4" />
              Total Backups
            </div>
            <div className="font-medium">{backups.length} stored locally</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => createBackup('manual')} 
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Create Manual Backup
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={importingFile}
          >
            {importingFile ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>

        {/* Backup List */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Backup History
          </h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No backups yet. Create your first backup or wait for auto-backup.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-4 space-y-3">
                {backups.map((backup) => (
                  <div 
                    key={backup.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getTypeIcon(backup.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {format(new Date(backup.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {getTypeBadge(backup.type)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatSize(backup.size)} • {backup.tablesIncluded.length} tables
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportBackup(backup.id)}
                        title="Download backup"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restoreBackup(backup.id)}
                        title="Export for restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Delete backup"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this backup. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteBackup(backup.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Auto-Backup Active
          </div>
          <p className="text-xs text-muted-foreground">
            • Backups run every <strong>15 minutes</strong> and once <strong>daily</strong><br />
            • Stored locally in your browser (IndexedDB)<br />
            • Last 10 backups of each type are kept automatically<br />
            • Export backups as JSON files for external storage
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataBackupManager;
