
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

const COLLIDING_ID = '83df94fc-2787-4589-add3-87583742447e';

async function checkCollision() {
    console.log(`Checking ID: ${COLLIDING_ID}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', COLLIDING_ID)
        .maybeSingle();

    console.log('Profile found:', profile);

    const { data: lead } = await supabase
        .from('leads_prospectos')
        .select('id, full_name, assigned_to')
        .eq('id', COLLIDING_ID)
        .maybeSingle();

    console.log('Lead found with target ID:', lead);

    // Check if there are ANY leads
    const { count } = await supabase
        .from('leads_prospectos')
        .select('*', { count: 'exact', head: true });

    console.log('Total leads in table (count):', count);
}

checkCollision();
