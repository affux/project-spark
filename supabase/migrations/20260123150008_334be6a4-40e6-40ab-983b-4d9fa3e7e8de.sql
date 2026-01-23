-- Drop the old constraint and add a new one with postpaid_repayment included
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text, 'order_value'::text, 'order_commission'::text, 'payout'::text, 'payout_approved'::text, 'admin_credit'::text, 'admin_debit'::text, 'reversal'::text, 'payment'::text, 'refund'::text, 'postpaid_repayment'::text]));