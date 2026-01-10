-- ==========================================================
-- SISTEMA DE NOTIFICACIONES MULTI-DISPOSITIVO (MAGNO)
-- ==========================================================
-- Este script permite que Supabase envíe alertas instantáneas 
-- a tu Celular, Tablet y Computadora mediante un Bot de Telegram.

-- 1. Habilitar extensión HTTP si no existe
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Función Universal de Notificación (Telegram)
CREATE OR REPLACE FUNCTION public.send_telegram_notification(message TEXT)
RETURNS VOID AS $$
DECLARE
  bot_token TEXT := 'TU_BOT_TOKEN_AQUI'; -- <--- REEMPLAZAR
  chat_id TEXT := 'TU_CHAT_ID_AQUI';     -- <--- REEMPLAZAR
  telegram_url TEXT;
BEGIN
  telegram_url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage';
  
  PERFORM
    extensions.http_post(
      telegram_url,
      json_build_object(
        'chat_id', chat_id,
        'text', message,
        'parse_mode', 'Markdown'
      )::text,
      'application/json'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Triggers para diferentes eventos

-- A) NUEVO AVALÚO
CREATE OR REPLACE FUNCTION public.on_new_appraisal_notify()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_telegram_notification(
    '🏠 *NUEVO AVALÚO SOLICITADO*' || chr(10) ||
    '👤 Cliente: ' || NEW.first_name || ' ' || NEW.last_name_1 || chr(10) ||
    '📍 Ubicación: ' || NEW.location || chr(10) ||
    '📋 Tipo: ' || NEW.property_type || chr(10) ||
    '📅 Fecha: ' || to_char(NEW.created_at, 'DD/MM/YYYY HH24:MI')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_appraisal ON appraisals;
CREATE TRIGGER tr_notify_appraisal AFTER INSERT ON appraisals
FOR EACH ROW EXECUTE FUNCTION on_new_appraisal_notify();

-- B) CARGA DE PAGO (COMPROBANTE)
CREATE OR REPLACE FUNCTION public.on_new_payment_notify()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_telegram_notification(
    '💰 *NUEVO PAGO REGISTRADO*' || chr(10) ||
    '🏢 Propiedad ID: ' || NEW.property_id || chr(10) ||
    '📅 Mes: ' || NEW.month_year || chr(10) ||
    '💵 Monto: $' || NEW.amount || chr(10) ||
    '🔗 [Ver Comprobante](' || NEW.proof_url || ')'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_payment ON payment_proofs;
CREATE TRIGGER tr_notify_payment AFTER INSERT ON payment_proofs
FOR EACH ROW EXECUTE FUNCTION on_new_payment_notify();

-- C) NUEVO REPORTE / INCIDENCIA
CREATE OR REPLACE FUNCTION public.on_new_report_notify()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_telegram_notification(
    '🚨 *NUEVO REPORTE DE INCIDENCIA*' || chr(10) ||
    '📌 Título: ' || NEW.title || chr(10) ||
    '⚠️ Tipo: ' || NEW.report_type || chr(10) ||
    '📝 Descripción: ' || LEFT(NEW.description, 100) || '...'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_report ON reports;
CREATE TRIGGER tr_notify_report AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION on_new_report_notify();
