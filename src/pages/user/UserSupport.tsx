import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { LifeBuoy, Send, Loader2, MessageCircle, Clock, CheckCircle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const ticketCategories = [
  { value: 'order', label: 'Order Issue' },
  { value: 'payment', label: 'Payment Problem' },
  { value: 'kyc', label: 'KYC Verification' },
  { value: 'storefront', label: 'Storefront Help' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'other', label: 'Other' },
];

const UserSupport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const { tickets, isLoading, openTickets, resolvedTickets } = useSupportTickets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subject || !message) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Send the ticket as a chat message to admin
      const ticketMessage = `[SUPPORT TICKET]\nCategory: ${ticketCategories.find(c => c.value === category)?.label}\nSubject: ${subject}\n\n${message}`;
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          message: ticketMessage,
          sender_role: 'user',
          is_read: false,
        });

      if (error) throw error;

      // Send email notification to admin
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'support_ticket',
            userName: user?.name || user?.email,
            userEmail: user?.email,
            ticketCategory: ticketCategories.find(c => c.value === category)?.label,
            ticketSubject: subject,
            message: message,
          },
        });
      } catch (emailError) {
        console.log('Email notification failed (non-critical):', emailError);
      }

      toast({
        title: 'Ticket Submitted',
        description: 'Your support request has been sent. We will respond shortly.',
      });

      // Reset form
      setCategory('');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-primary" />
            Support Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Need help? Submit a support ticket and track your requests.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tickets.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openTickets}</p>
                  <p className="text-xs text-muted-foreground">Awaiting Reply</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedTickets}</p>
                  <p className="text-xs text-muted-foreground">Replied</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Support Ticket Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Submit New Ticket
              </CardTitle>
              <CardDescription>
                Describe your issue and our team will assist you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please provide details about your issue..."
                    rows={5}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Ticket
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Ticket History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Ticket History
              </CardTitle>
              <CardDescription>
                Track your previous support requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tickets yet</p>
                  <p className="text-sm">Submit a ticket to get started</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {tickets.map((ticket) => (
                    <AccordionItem key={ticket.id} value={ticket.id} className="border rounded-lg px-3">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-start gap-3 text-left w-full pr-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={ticket.hasReply ? 'default' : 'secondary'} className="text-xs">
                                {ticket.hasReply ? 'Replied' : 'Pending'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {ticket.category}
                              </Badge>
                            </div>
                            <p className="font-medium truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <div className="space-y-3">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Your message:</p>
                            <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                          </div>
                          {ticket.lastReply && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                              <p className="text-xs text-primary mb-1">Admin reply:</p>
                              <p className="text-sm whitespace-pre-wrap">{ticket.lastReply.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(ticket.lastReply.created_at), 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help Tips */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Quick Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Include order numbers when reporting order issues</li>
              <li>• Attach screenshots if reporting technical problems via chat</li>
              <li>• You'll receive a browser notification when we reply</li>
              <li>• You can also use the chat widget for quick questions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserSupport;
