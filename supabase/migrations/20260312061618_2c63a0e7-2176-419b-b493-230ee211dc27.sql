CREATE OR REPLACE FUNCTION public.sync_wallet_on_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  order_total NUMERIC;
  credited_amount NUMERIC;
BEGIN
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    SELECT amount INTO credited_amount
    FROM public.wallet_transactions
    WHERE order_id = NEW.id AND type = 'order_commission'
    LIMIT 1;
    
    IF credited_amount IS NOT NULL AND credited_amount > 0 THEN
      UPDATE public.profiles
      SET wallet_balance = ROUND((COALESCE(wallet_balance, 0) - credited_amount)::numeric, 2),
          updated_at = now()
      WHERE user_id = NEW.dropshipper_user_id;
      
      DELETE FROM public.wallet_transactions
      WHERE order_id = NEW.id AND type = 'order_commission';
      
      INSERT INTO public.wallet_transactions (user_id, order_id, type, amount, description)
      VALUES (
        NEW.dropshipper_user_id,
        NEW.id,
        'reversal',
        -credited_amount,
        'Order ' || NEW.order_number || ' status reverted from completed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;