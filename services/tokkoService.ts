import { supabase } from './supabaseClient';
import { Property, PropertyStatus } from '../types';

const TOKKO_API_KEY = '88c781f0f233f2e3e39a727cfdced9c4a0b8267c';
const TOKKO_BASE_URL = 'https://www.tokkobroker.com/api/v1';

export const tokkoService = {
    async fetchProperties(limit = 50) {
        const response = await fetch(`${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&limit=${limit}&lang=es`);
        if (!response.ok) {
            throw new Error(`Tokko API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.objects;
    },

    async syncWithSupabase() {
        console.log('Starting Tokko sync...');
        const tokkoProperties = await this.fetchProperties(200); // Increased limit to ensure more properties are updated
        console.log(`Fetched ${tokkoProperties.length} properties from Tokko`);

        const results = {
            updated: 0,
            errors: 0,
            lastError: null as string | null
        };

        for (const tokkoProp of tokkoProperties) {
            try {
                // Map Tokko price
                const saleOperation = tokkoProp.operations.find((op: any) => op.operation_type === 'Sale');
                const rentOperation = tokkoProp.operations.find((op: any) => op.operation_type === 'Rent');

                const price = saleOperation?.prices[0]?.price || rentOperation?.prices[0]?.price || 0;
                const type = rentOperation ? 'rent' : 'sale';

                // Map specs
                // Final definitive mapping for R10066 and similar:
                // - Terreno (landArea) should be 172 (Tokko 'surface')
                // - Construcción (area) should be 106 (Tokko 'total_surface')
                // - Recámaras (beds) should be 2 (Tokko 'suite_amount')
                let beds = tokkoProp.suite_amount || 0;
                if (beds === 0 && (tokkoProp.room_amount || 0) > 0) {
                    beds = tokkoProp.room_amount;
                }

                const specs = {
                    beds: beds,
                    baths: tokkoProp.bathroom_amount || 0,
                    parking: tokkoProp.parking_lot_amount || 0,
                    area: parseFloat(tokkoProp.total_surface || 0),
                    landArea: parseFloat(tokkoProp.surface || 0),
                    age: tokkoProp.age || 0,
                    levels: tokkoProp.floors_amount || 1
                };

                const tags = tokkoProp.tags || [];
                const amenitiesList = tags.map((t: any) => t.name);

                const payload = {
                    tokko_id: tokkoProp.id.toString(),
                    ref: tokkoProp.reference_code || tokkoProp.reference || `TK-${tokkoProp.id}`,
                    title: tokkoProp.publication_title || tokkoProp.address,
                    address: tokkoProp.address,
                    description: tokkoProp.rich_description ? tokkoProp.rich_description.trim() : (tokkoProp.description || tokkoProp.description_only || ''),
                    price: price,
                    type: type,
                    status: PropertyStatus.AVAILABLE,
                    main_image: tokkoProp.photos?.find((p: any) => p.is_front_cover)?.image || tokkoProp.photos?.[0]?.image,
                    images: tokkoProp.photos?.map((p: any) => p.image) || [],
                    specs: specs,
                    amenities: amenitiesList,
                    services: [],
                    latitude: tokkoProp.geo_lat ? parseFloat(tokkoProp.geo_lat) : null,
                    longitude: tokkoProp.geo_long ? parseFloat(tokkoProp.geo_long) : null,
                    full_address: tokkoProp.location ? `${tokkoProp.location.name}, ${tokkoProp.address}` : tokkoProp.address,
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('properties')
                    .upsert(payload, { onConflict: 'tokko_id' });

                if (error) {
                    console.error(`Error syncing ${tokkoProp.reference_code}:`, error.message);
                    results.errors++;
                    results.lastError = error.message;
                } else {
                    results.updated++;
                }
            } catch (err: any) {
                console.error(`Failed to process property ${tokkoProp.id}:`, err);
                results.errors++;
                results.lastError = err.message;
            }
        }
        console.log('Sync completed with results:', results);
        return results;
    },

    async fetchLeads(maxResults = 100) {
        // SOLUTION: The first 500+ contacts are all deleted. We need to paginate
        // through the API to find non-deleted contacts.
        // We'll fetch in batches and filter out deleted ones until we have enough.

        const allOpportunities: any[] = [];
        let offset = 0;
        const batchSize = 200;
        const maxAttempts = 15; // Don't fetch more than 3000 contacts total

        for (let attempt = 0; attempt < maxAttempts && allOpportunities.length < maxResults; attempt++) {
            const response = await fetch(
                `${TOKKO_BASE_URL}/contact/?key=${TOKKO_API_KEY}&format=json&limit=${batchSize}&offset=${offset}&lang=es&order_by=-updated_at`
            );

            if (!response.ok) {
                throw new Error(`Tokko API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Filter for non-deleted contacts
            const activeContacts = data.objects.filter((contact: any) => !contact.deleted_at);

            allOpportunities.push(...activeContacts);

            // If we got fewer results than requested, we've reached the end
            if (data.objects.length < batchSize) break;

            offset += batchSize;
        }

        // Return up to maxResults
        return allOpportunities.slice(0, maxResults);
    },

    formatTokkoDate(dateStr: string) {
        if (!dateStr) return 'Sin fecha';
        // Tokko dates are often "YYYY-MM-DDTHH:mm:ss"
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                // Try manual split if Date constructor fails
                const parts = dateStr.split(' ');
                if (parts.length >= 1) return parts[0];
                return dateStr;
            }
            return d.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr || 'Error fecha';
        }
    },

    async fetchContactDetails(id: number) {
        const response = await fetch(`${TOKKO_BASE_URL}/contact/${id}/?key=${TOKKO_API_KEY}&format=json&lang=es`);
        if (!response.ok) {
            throw new Error(`Tokko API error: ${response.statusText}`);
        }
        return await response.json();
    },

    getLeadStatus(tags: { name: string }[]) {
        const statusTags = [
            'Pendiente contactar',
            'Esperando respuesta',
            'Evolucionando',
            'Tomar Accion',
            'Congelado'
        ];

        // Find the first tag that matches one of our statuses
        const found = tags.find(t => statusTags.includes(t.name));
        return found ? found.name : 'Pendiente contactar'; // Default
    }
};
