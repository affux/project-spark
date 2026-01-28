import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackupMetadata {
  id: string;
  createdAt: string;
  type: 'manual' | 'auto_15min' | 'auto_daily';
  size: number;
  tablesIncluded: string[];
}

interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

const DB_NAME = 'AdminBackupsDB';
const STORE_NAME = 'backups';
const DB_VERSION = 1;

const BACKUP_TABLES = [
  'platform_settings',
  'products',
  'profiles',
  'orders',
  'indian_names',
  'work_types',
  'order_chat_quick_replies',
  'custom_payment_methods',
  'storefront_products',
  'wallet_transactions',
  'payout_requests',
];

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'metadata.id' });
        store.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        store.createIndex('type', 'metadata.type', { unique: false });
      }
    };
  });
};

// Save backup to IndexedDB
const saveBackupToDB = async (backup: BackupData): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(backup);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Get all backups metadata
const getAllBackups = async (): Promise<BackupMetadata[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const backups = request.result as BackupData[];
      resolve(backups.map(b => b.metadata).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    };
  });
};

// Get specific backup
const getBackup = async (id: string): Promise<BackupData | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

// Delete backup
const deleteBackupFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Cleanup old backups (keep last 10 of each type)
const cleanupOldBackups = async (): Promise<void> => {
  const allBackups = await getAllBackups();
  
  const byType: Record<string, BackupMetadata[]> = {};
  allBackups.forEach(b => {
    if (!byType[b.type]) byType[b.type] = [];
    byType[b.type].push(b);
  });
  
  for (const type of Object.keys(byType)) {
    const backups = byType[type];
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      for (const backup of toDelete) {
        await deleteBackupFromDB(backup.id);
      }
    }
  }
};

export const useLocalBackup = () => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    try {
      setIsLoading(true);
      const allBackups = await getAllBackups();
      setBackups(allBackups);
      
      // Find last auto backup
      const lastAuto = allBackups.find(b => b.type.startsWith('auto_'));
      if (lastAuto) {
        setLastAutoBackup(lastAuto.createdAt);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (
    type: 'manual' | 'auto_15min' | 'auto_daily' = 'manual'
  ): Promise<boolean> => {
    setIsCreatingBackup(true);
    
    try {
      const backupData: Record<string, any[]> = {};
      const tablesIncluded: string[] = [];
      
      for (const table of BACKUP_TABLES) {
        try {
          const { data, error } = await supabase
            .from(table as any)
            .select('*');
          
          if (!error && data) {
            backupData[table] = data;
            tablesIncluded.push(table);
          }
        } catch (err) {
          console.warn(`Could not backup table ${table}:`, err);
        }
      }
      
      const backup: BackupData = {
        metadata: {
          id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          type,
          size: JSON.stringify(backupData).length,
          tablesIncluded,
        },
        data: backupData,
      };
      
      await saveBackupToDB(backup);
      await cleanupOldBackups();
      await loadBackups();
      
      if (type === 'manual') {
        toast.success('Backup created successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      if (type === 'manual') {
        toast.error('Failed to create backup');
      }
      return false;
    } finally {
      setIsCreatingBackup(false);
    }
  }, [loadBackups]);

  const exportBackup = useCallback(async (id: string) => {
    try {
      const backup = await getBackup(id);
      if (!backup) {
        toast.error('Backup not found');
        return;
      }
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date(backup.metadata.createdAt).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup exported successfully');
    } catch (error) {
      toast.error('Failed to export backup');
    }
  }, []);

  const importBackup = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;
      
      if (!backup.metadata || !backup.data) {
        toast.error('Invalid backup file format');
        return false;
      }
      
      // Generate new ID for imported backup
      backup.metadata.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      backup.metadata.type = 'manual';
      
      await saveBackupToDB(backup);
      await loadBackups();
      
      toast.success('Backup imported successfully');
      return true;
    } catch (error) {
      toast.error('Failed to import backup');
      return false;
    }
  }, [loadBackups]);

  const restoreBackup = useCallback(async (id: string): Promise<boolean> => {
    try {
      const backup = await getBackup(id);
      if (!backup) {
        toast.error('Backup not found');
        return false;
      }
      
      // This returns the data for manual restoration
      // Full automatic restore would require admin privileges and careful handling
      const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restore-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup data exported for restoration. Use SQL editor to restore.');
      return true;
    } catch (error) {
      toast.error('Failed to prepare backup for restoration');
      return false;
    }
  }, []);

  const deleteBackup = useCallback(async (id: string) => {
    try {
      await deleteBackupFromDB(id);
      await loadBackups();
      toast.success('Backup deleted');
    } catch (error) {
      toast.error('Failed to delete backup');
    }
  }, [loadBackups]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Load backups on mount
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // Auto backup every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      createBackup('auto_15min');
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, [createBackup]);

  // Daily backup at midnight
  useEffect(() => {
    const checkDailyBackup = () => {
      const now = new Date();
      const lastDaily = backups.find(b => b.type === 'auto_daily');
      
      if (!lastDaily) {
        createBackup('auto_daily');
        return;
      }
      
      const lastDate = new Date(lastDaily.createdAt);
      const dayDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff >= 1) {
        createBackup('auto_daily');
      }
    };
    
    checkDailyBackup();
    
    // Check every hour
    const interval = setInterval(checkDailyBackup, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [backups, createBackup]);

  return {
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
  };
};
