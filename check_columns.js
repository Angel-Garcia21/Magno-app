
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkColumns() {
    console.log(`Checking columns in leads_prospectos...`);
    // Try to select the new columns
    const { data, error } = await supabase
        .from('leads_prospectos')
        .select('id, source, referred_by, operation_type')
        .limit(1);

    if (error) {
        console.error('Error fetching columns:', error);
        console.log('Likely cause: Migration migration_leads_opcionador.sql was not run.');
    } else {
        console.log('Columns exist! Sample data:', data);
    }
}

checkColumns();
