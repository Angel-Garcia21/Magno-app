
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

const ADVISOR_ID = '83df94fc-2787-4589-add3-87583742447e';

async function checkLeads() {
    console.log(`Checking leads for advisor: ${ADVISOR_ID}`);
    const { data: leads, error } = await supabase
        .from('leads_prospectos')
        .select('id, full_name, assigned_to, status');

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Total leads found (with anon key): ${leads.length}`);
    const myLeads = leads.filter(l => l.assigned_to === ADVISOR_ID);
    console.log(`Leads assigned to this advisor:`, myLeads);

    if (leads.length > 0 && myLeads.length === 0) {
        console.log('Leads exist but none are assigned to this advisor.');
        console.log('First 3 leads assignments:', leads.slice(0, 3).map(l => ({ id: l.id, assigned: l.assigned_to })));
    }
}

checkLeads();
