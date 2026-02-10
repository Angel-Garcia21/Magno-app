
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkColumns() {
    console.log(`Checking columns in property_submissions...`);
    // Try to select the new columns
    const { data, error } = await supabase
        .from('property_submissions')
        .select('id, referred_by')
        .limit(1);

    if (error) {
        console.error('Error fetching columns:', error);
    } else {
        console.log('Columns in property_submissions exist! Sample data:', data);
    }
}

checkColumns();
