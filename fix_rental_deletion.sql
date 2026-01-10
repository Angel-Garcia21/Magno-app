-- Allow admins to delete rental applications
CREATE POLICY "Admins can delete rental applications"
ON rental_applications FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Also ensure admins can update them (e.g. status)
CREATE POLICY "Admins can update rental applications"
ON rental_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
