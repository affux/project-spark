import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Award } from 'lucide-react';

export type UserLevel = 'bronze' | 'silver' | 'gold';

interface UserLevelSelectProps {
  value: UserLevel;
  onValueChange: (value: UserLevel) => void;
  disabled?: boolean;
}

const levelConfig: Record<UserLevel, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: 'text-amber-700' },
  silver: { label: 'Silver', color: 'text-slate-500' },
  gold: { label: 'Gold', color: 'text-yellow-600' },
};

export const UserLevelSelect: React.FC<UserLevelSelectProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-32">
        <SelectValue>
          <span className={`flex items-center gap-1 ${levelConfig[value].color}`}>
            <Award className="w-3 h-3" />
            {levelConfig[value].label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="bronze">
          <span className="flex items-center gap-1 text-amber-700">
            <Award className="w-3 h-3" />
            Bronze
          </span>
        </SelectItem>
        <SelectItem value="silver">
          <span className="flex items-center gap-1 text-slate-500">
            <Award className="w-3 h-3" />
            Silver
          </span>
        </SelectItem>
        <SelectItem value="gold">
          <span className="flex items-center gap-1 text-yellow-600">
            <Award className="w-3 h-3" />
            Gold
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};