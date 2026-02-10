import { supabase } from './supabaseClient';
import { Lead, AdvisorProfile, Appointment } from '../types';

export const asesorService = {
    // --- Leads (Prospectos) ---
    async getLeads(assignedTo?: string): Promise<Lead[]> {
        let query = supabase.from('leads_prospectos').select('*').order('created_at', { ascending: false });
        if (assignedTo) {
            query = query.eq('assigned_to', assignedTo);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createLead(lead: Partial<Lead>): Promise<Lead> {
        const { data, error } = await supabase
            .from('leads_prospectos')
            .insert(lead)
            .select()
            .single();
        if (error) throw error;

        // Log activity for streak persistence
        if (data.assigned_to) {
            await supabase.from('advisor_activity_log').insert({
                advisor_id: data.assigned_to,
                activity_type: 'lead_registration',
                metadata: { lead_id: data.id }
            });
        } else if (data.referred_by) {
            await supabase.from('advisor_activity_log').insert({
                advisor_id: data.referred_by,
                activity_type: 'lead_registration',
                metadata: { lead_id: data.id }
            });
        }

        return data;
    },

    async getActivityLogs(advisorId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('advisor_activity_log')
            .select('*')
            .eq('advisor_id', advisorId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async updateLeadStatus(id: string, status: string, metadata?: Partial<Lead>): Promise<Lead> {
        console.log(`[asesorService] Updating lead ${id} to status ${status}`, metadata);

        const { data, error } = await supabase
            .from('leads_prospectos')
            .update({
                status,
                ...metadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            console.error('[asesorService] Supabase error updating lead:', error);
            throw error;
        }

        if (!data) {
            console.warn(`[asesorService] Lead ${id} not found in leads_prospectos`);
            throw new Error(`No se encontró el prospecto con ID ${id.slice(0, 8)}... en la base de datos de CRM. Si este cliente viene de una cita, asegúrate de que haya sido registrado como prospecto primero.`);
        }

        return data;
    },

    async uploadPaymentProof(leadId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${leadId}_${Math.random()}.${fileExt}`;
        const filePath = `leads/payments/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('media') // Assuming 'media' bucket exists
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('media').getPublicUrl(filePath);
        return data.publicUrl;
    },

    // --- Advisor Profiles ---
    async getAdvisorProfile(userId: string): Promise<AdvisorProfile | null> {
        const { data, error } = await supabase
            .from('asesor_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async updateAdvisorProfile(userId: string, profile: Partial<AdvisorProfile>): Promise<void> {
        const { error } = await supabase
            .from('asesor_profiles')
            .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() });
        if (error) throw error;
    },

    // --- Appointment Assignments ---
    async assignAppointment(appointmentId: string, advisorId: string): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update({ assigned_to: advisorId, status: 'assigned' })
            .eq('id', appointmentId);
        if (error) throw error;
    },

    async confirmAppointment(appointmentId: string): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', appointmentId);
        if (error) throw error;
    },

    async saveAppointmentFeedback(appointmentId: string, feedback: any, isRental: boolean = false): Promise<void> {
        const table = isRental ? 'rental_applications' : 'appointments';

        // Extract potential flag
        const isPotential = feedback.is_potential === true || feedback.is_potential === 'true' || feedback.is_potential === 'on';

        const { error, data } = await supabase
            .from(table)
            .update({
                feedback,
                status: 'completed',
                is_potential: isPotential
            })
            .eq('id', appointmentId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('No se pudo actualizar la cita. Verifica que tengas asignada esta cita y que la base de datos tenga las columnas y permisos necesarios.');
        }
    },

    // --- Performance Metrics ---
    async ensureProfileExists(userId: string): Promise<void> {
        const { data, error } = await supabase
            .from('asesor_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            await supabase.from('asesor_profiles').insert({ user_id: userId });
        }
    },

    async incrementAdvisorMetrics(userId: string, type: 'rent' | 'sale'): Promise<void> {
        await this.ensureProfileExists(userId);
        const field = type === 'rent' ? 'rented_count' : 'sold_count';

        const { data: current, error: fetchError } = await supabase
            .from('asesor_profiles')
            .select(field)
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        const newVal = ((current as any)[field] || 0) + 1;

        const { error: updateError } = await supabase
            .from('asesor_profiles')
            .update({
                [field]: newVal,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;
    },

    async assignRentalApplication(applicationId: string, advisorId: string): Promise<void> {
        const { error } = await supabase
            .from('rental_applications')
            .update({ assigned_to: advisorId, updated_at: new Date().toISOString() })
            .eq('id', applicationId);
        if (error) throw error;
    }
};
