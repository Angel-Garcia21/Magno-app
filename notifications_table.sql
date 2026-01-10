-- ==========================================================
-- SISTEMA DE NOTIFICACIONES INTERNAS (MAGNO)
-- ==========================================================

-- 1. Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('appraisal', 'payment', 'report')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Enlace opcional a la sección correspondiente
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política: Solo los administradores pueden ver y gestionar notificaciones
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Funciones de Disparo (Triggers)

-- A) NOTIFICAR NUEVO AVALÚO
CREATE OR REPLACE FUNCTION public.notify_new_appraisal_internal()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, link)
  VALUES (
    'appraisal',
    'Nueva Solicitud de Avalúo',
    'El cliente ' || NEW.first_name || ' ' || NEW.last_name_1 || ' ha solicitado un avalúo para su propiedad en ' || NEW.location,
    '/admin?tab=appraisals'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_appraisal_internal ON appraisals;
CREATE TRIGGER tr_notify_appraisal_internal
  AFTER INSERT ON appraisals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_appraisal_internal();

-- B) NOTIFICAR CARGA DE PAGO (COMPROBANTE)
CREATE OR REPLACE FUNCTION public.notify_new_payment_internal()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (type, title, message, link)
  VALUES (
    'payment',
    'Nuevo Comprobante de Pago',
    v_user_name || ' ha subido un pago por el monto de $' || NEW.amount || ' (Mes: ' || NEW.month_year || ')',
    '/admin?tab=comprobantes'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_payment_internal ON payment_proofs;
CREATE TRIGGER tr_notify_payment_internal
  AFTER INSERT ON payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_payment_internal();

-- C) NOTIFICAR NUEVO REPORTE / INCIDENCIA
CREATE OR REPLACE FUNCTION public.notify_new_report_internal()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (type, title, message, link)
  VALUES (
    'report',
    'Informe de Incidencia',
    'Se ha registrado un reporte de tipo ' || NEW.report_type || ': ' || NEW.title || ' (Por: ' || v_user_name || ')',
    '/admin?tab=reports'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_report_internal ON reports;
CREATE TRIGGER tr_notify_report_internal
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_report_internal();
