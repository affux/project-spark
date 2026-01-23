-- Add platform setting for wallet payment option for postpaid dues
INSERT INTO platform_settings (key, value, description)
VALUES ('postpaid_wallet_payment_enabled', 'true', 'Enable/disable wallet balance payment option for postpaid dues repayment')
ON CONFLICT (key) DO NOTHING;