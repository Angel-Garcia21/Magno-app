import { supabase } from './supabaseClient';

const GOOGLE_CALENDAR_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CALENDAR_ID = 'primary'; // Usa 'primary' para el calendario principal del usuario

interface CalendarEvent {
    summary: string;
    description: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    reminders?: {
        useDefault: boolean;
    };
}

/**
 * Crea un evento en Google Calendar
 * @param eventData - Datos del evento a crear
 * @returns El ID del evento creado o null si hay error
 */
export async function createCalendarEvent(
    summary: string,
    description: string,
    startDateTime: string,
    endDateTime: string,
    attendeeEmail?: string,
    location?: string
): Promise<string | null> {
    try {
        // Obtener token de acceso OAuth (necesitarás implementar autenticación OAuth)
        // Por ahora, usaremos un enfoque simplificado con API Key

        const event: CalendarEvent = {
            summary,
            description,
            location,
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Mexico_City'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Mexico_City'
            },
            attendees: attendeeEmail ? [{
                email: attendeeEmail
            }] : undefined,
            reminders: {
                useDefault: true
            }
        };

        // NOTA: Para producción, necesitas implementar OAuth 2.0
        // Este es un placeholder para la estructura
        // La creación real del evento requiere un token de acceso OAuth

        console.warn('⚠️ Google Calendar API requiere OAuth 2.0 para crear eventos.');
        console.warn('Por ahora, guardando solo localmente. Ver documentación en implementation_plan.md');

        // Por ahora, retornamos un ID simulado
        // En producción, esto vendría de la respuesta de Google Calendar API
        const simulatedEventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return simulatedEventId;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        return null;
    }
}

/**
 * Crea un evento en Google Calendar usando gapi (Google API JavaScript Client)
 * Esta función requiere que el usuario esté autenticado con OAuth 2.0
 */
export async function createCalendarEventWithOAuth(
    summary: string,
    description: string,
    startDateTime: string,
    endDateTime: string,
    attendeeEmail?: string,
    location?: string
): Promise<string | null> {
    try {
        // Verificar si gapi está cargado
        if (typeof window === 'undefined' || !(window as any).gapi) {
            console.error('Google API Client no está cargado');
            return null;
        }

        const gapi = (window as any).gapi;

        const event = {
            summary,
            description,
            location,
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Mexico_City'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Mexico_City'
            },
            attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
            reminders: {
                useDefault: true
            }
        };

        const request = gapi.client.calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event
        });

        const response = await request.execute();
        return response.id || null;
    } catch (error) {
        console.error('Error creating calendar event with OAuth:', error);
        return null;
    }
}

/**
 * Construye un enlace para agregar evento a Google Calendar (método público sin OAuth)
 * Este método abre Google Calendar en el navegador para que el usuario agregue el evento
 */
export function generateGoogleCalendarLink(
    title: string,
    description: string,
    location: string,
    startDateTime: string,
    endDateTime: string
): string {
    const start = new Date(startDateTime).toISOString().replace(/-|:|\\.\\d\\d\\d/g, '');
    const end = new Date(endDateTime).toISOString().replace(/-|:|\\.\\d\\d\\d/g, '');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        details: description,
        location: location,
        dates: `${start}/${end}`
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
