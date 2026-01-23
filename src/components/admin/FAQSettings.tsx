import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  HelpCircle, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  GripVertical 
} from 'lucide-react';
import { usePlatformSettings, FAQItem } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const FAQSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSettingAsync, isUpdating } = usePlatformSettings();
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized && settingsMap.faq_items) {
      setFaqItems(settingsMap.faq_items);
      setHasInitialized(true);
    }
  }, [settingsMap.faq_items, hasInitialized]);

  const addFAQItem = () => {
    const newItem: FAQItem = {
      id: crypto.randomUUID(),
      question: '',
      answer: '',
    };
    setFaqItems([...faqItems, newItem]);
  };

  const updateFAQItem = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqItems(faqItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeFAQItem = (id: string) => {
    setFaqItems(faqItems.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    // Validate that all items have question and answer
    const emptyItems = faqItems.filter(item => !item.question.trim() || !item.answer.trim());
    if (emptyItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all FAQ questions and answers.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettingAsync({
        key: 'faq_items',
        value: JSON.stringify(faqItems),
        oldValue: JSON.stringify(settingsMap.faq_items),
      });
      toast({
        title: "FAQ Settings Saved",
        description: "Your FAQ items have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving FAQ settings:', error);
      toast({
        title: "Error",
        description: "Failed to save FAQ settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle>FAQ Settings</CardTitle>
            <CardDescription>
              Manage frequently asked questions displayed on the landing page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {faqItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No FAQ items yet. Click the button below to add one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 border rounded-lg bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      FAQ #{index + 1}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFAQItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid gap-2">
                  <Label>Question</Label>
                  <Input
                    value={item.question}
                    onChange={(e) => updateFAQItem(item.id, 'question', e.target.value)}
                    placeholder="Enter the frequently asked question..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Answer</Label>
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateFAQItem(item.id, 'answer', e.target.value)}
                    placeholder="Enter the answer..."
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={addFAQItem} className="gap-2">
            <Plus className="w-4 h-4" />
            Add FAQ Item
          </Button>
          
          {faqItems.length > 0 && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isUpdating}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save FAQ Settings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};