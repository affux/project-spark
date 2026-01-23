import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Default support names to use if database is empty
const DEFAULT_SUPPORT_NAMES = [
  'Priya',
  'Rahul', 
  'Ananya',
  'Vikram',
  'Neha',
  'Arjun',
  'Kavya',
  'Rohan',
  'Isha',
  'Aditya',
];

const ROTATION_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SupportNameChange {
  previousName: string;
  newName: string;
  timestamp: Date;
}

export const useRotatingSupportName = () => {
  const [currentName, setCurrentName] = useState<string>('Support');
  const [previousName, setPreviousName] = useState<string | null>(null);
  const [nameChanges, setNameChanges] = useState<SupportNameChange[]>([]);
  const [availableNames, setAvailableNames] = useState<string[]>(DEFAULT_SUPPORT_NAMES);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available names from database
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const { data, error } = await supabase
          .from('indian_names')
          .select('name')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          setAvailableNames(data.map(n => n.name));
        }
      } catch (err) {
        console.error('Error fetching support names:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNames();
  }, []);

  // Get a random name different from the current one
  const getRandomName = useCallback((excludeName?: string) => {
    const filteredNames = availableNames.filter(name => name !== excludeName);
    if (filteredNames.length === 0) {
      return availableNames[0] || 'Support';
    }
    return filteredNames[Math.floor(Math.random() * filteredNames.length)];
  }, [availableNames]);

  // Initialize with a random name
  useEffect(() => {
    if (!isLoading && availableNames.length > 0) {
      const initialName = getRandomName();
      setCurrentName(initialName);
    }
  }, [isLoading, availableNames, getRandomName]);

  // Rotate name every 5 minutes
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      const oldName = currentName;
      const newName = getRandomName(currentName);
      
      setPreviousName(oldName);
      setCurrentName(newName);
      
      // Track the change
      setNameChanges(prev => [
        ...prev,
        {
          previousName: oldName,
          newName: newName,
          timestamp: new Date(),
        }
      ]);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [currentName, getRandomName, isLoading]);

  // Check if name changed recently (within last 10 seconds) for showing notification
  const hasRecentlyChanged = nameChanges.length > 0 && 
    (Date.now() - nameChanges[nameChanges.length - 1].timestamp.getTime()) < 10000;

  return {
    currentName,
    previousName,
    hasRecentlyChanged,
    nameChanges,
    isLoading,
  };
};
