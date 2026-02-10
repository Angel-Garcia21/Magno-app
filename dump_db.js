
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://ogftoqebulwgrtdnfxcu.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZnRvcWVidWx3Z3J0ZG5meGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDcxOTQsImV4cCI6MjA4MjQyMzE5NH0.P0w8v-8JEIV7nzfMExn0BrAFuN84jiLjIkUTRjpQt_4';

const supabase = createClient(url, key);

async function dump() {
    const tables = ['leads_prospectos', 'appointments', 'rental_applications', 'profiles', 'internal_properties', 'appraisals', 'notifications'];

    for (const table of tables) {
        const { data, count } = await supabase.from(table).select('id', { count: 'exact' });
        console.log(`Table: ${table} | Count: ${count} | IDs:`, data?.map(d => d.id));
    }
}

dump();
