# Configuración del Storage para Reportes

## Pasos para configurar el bucket de imágenes en Supabase

### 1. Crear el Bucket
1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Storage** en el menú lateral
3. Haz clic en **"Create a new bucket"**
4. Configura el bucket con los siguientes datos:
   - **Name**: `report-images`
   - **Public**: ✅ **SÍ** (marca como público para que las URLs sean accesibles)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/jpg`

### 2. Configurar Políticas de Seguridad (RLS)

Una vez creado el bucket, necesitas agregar las siguientes políticas:

#### Política 1: Permitir subida a usuarios autenticados
```sql
-- Policy name: "Authenticated users can upload"
-- Operation: INSERT
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');
```

#### Política 2: Permitir lectura pública
```sql
-- Policy name: "Public read access"
-- Operation: SELECT
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');
```

#### Política 3: Permitir actualización a usuarios autenticados
```sql
-- Policy name: "Users can update own uploads"
-- Operation: UPDATE
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'report-images' AND auth.uid() = owner);
```

#### Política 4: Permitir eliminación a usuarios autenticados
```sql
-- Policy name: "Users can delete own uploads"
-- Operation: DELETE
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-images' AND auth.uid() = owner);
```

### 3. Verificar la configuración

Para verificar que todo está configurado correctamente:

1. Ve a **Storage** > **Policies**
2. Selecciona el bucket `report-images`
3. Deberías ver las 4 políticas listadas arriba
4. Asegúrate de que el bucket esté marcado como **público**

### 4. Probar la funcionalidad

1. Inicia sesión como un usuario (tenant u owner)
2. Ve al Dashboard
3. Haz clic en "Reportar Falla" o "Incidencia"
4. Completa el formulario y sube una o más imágenes
5. Envía el reporte
6. Como admin, ve a la sección "Reportes" y verifica que las imágenes se muestren correctamente

## Notas Importantes

- Las imágenes se guardan con la estructura: `{user_id}/{timestamp}_{random}.{ext}`
- El tamaño máximo por imagen es de 5MB
- Solo se permiten formatos: JPEG, PNG, WEBP
- Las URLs son públicas pero solo los usuarios autenticados pueden subir
- Los admins pueden ver todos los reportes y sus imágenes
