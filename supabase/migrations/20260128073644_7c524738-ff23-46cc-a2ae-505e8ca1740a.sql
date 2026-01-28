-- Drop the existing check constraint and add a new one with 'order_payment' type
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- Create new constraint with order_payment included
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('credit', 'debit', 'admin_credit', 'admin_debit', 'order_value', 'order_commission', 'payout_approved', 'payout_deducted', 'reversal', 'order_payment', 'wallet_refund', 'postpaid_repayment'));