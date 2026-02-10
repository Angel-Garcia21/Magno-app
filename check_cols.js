
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkColumns() {
    console.log('Fetching columns for leads_prospectos...');

    // Attempt to get one record and check keys
    const { data, error } = await supabase
        .from('leads_prospectos')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found in data:', Object.keys(data[0]));
    } else {
        console.log('No data found to inspect columns.');
    }

    // Try a manual update worth ONE column at a time to find the culprit
    const testLeadId = '00000000-0000-0000-0000-000000000000'; // Non-existent but valid UUID

    const columns = ['payment_status', 'payment_method', 'payment_date', 'payment_proof_url', 'investigation_link'];

    for (const col of columns) {
        const { error: updateError } = await supabase
            .from('leads_prospectos')
            .update({ [col]: null })
            .eq('id', testLeadId);

        if (updateError && updateError.code === '42703') { // undefined_column
            console.log(`❌ Column [${col}] does NOT exist.`);
        } else if (updateError) {
            console.log(`✅ Column [${col}] exists (returned error code ${updateError.code}: ${updateError.message})`);
        } else {
            console.log(`✅ Column [${col}] exists (no error).`);
        }
    }
}

checkColumns();
