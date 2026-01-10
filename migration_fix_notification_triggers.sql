-- Migration: Fix "name" column mismatch in notification triggers
-- The "profiles" table uses "full_name", but some triggers were looking for "name".

-- A) FIX PAGO (COMPROBANTE) TRIGGER
CREATE OR REPLACE FUNCTION public.notify_new_payment_internal()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- CHANGED: name -> full_name
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (type, title, message, link)
  VALUES (
    'payment',
    'Nuevo Comprobante de Pago',
    COALESCE(v_user_name, 'Un usuario') || ' ha subido un pago por el monto de $' || NEW.amount || ' (Mes: ' || NEW.month_year || ')',
    '/admin?tab=comprobantes'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) FIX REPORTE / INCIDENCIA TRIGGER
CREATE OR REPLACE FUNCTION public.notify_new_report_internal()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- CHANGED: name -> full_name
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (type, title, message, link)
  VALUES (
    'report',
    'Informe de Incidencia',
    'Se ha registrado un reporte de tipo ' || NEW.report_type || ': ' || NEW.title || ' (Por: ' || COALESCE(v_user_name, 'Usuario') || ')',
    '/admin?tab=reports'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_new_payment_internal() IS 'Fixed trigger function using full_name instead of name';
COMMENT ON FUNCTION public.notify_new_report_internal() IS 'Fixed trigger function using full_name instead of name';
