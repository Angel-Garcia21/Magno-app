
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

const TARGET_ID = '83df94fc-2787-4589-add3-87583742447e';

async function checkRentalApps() {
    console.log(`Checking rental applications for ID: ${TARGET_ID}`);

    const { data: app } = await supabase
        .from('rental_applications')
        .select('*')
        .eq('id', TARGET_ID)
        .maybeSingle();

    console.log('Rental App found:', app);

    const { count } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true });

    console.log('Total rental applications (count):', count);

    if (count > 0 && !app) {
        const { data: first } = await supabase.from('rental_applications').select('id, full_name').limit(1);
        console.log('Example rental app:', first);
    }
}

checkRentalApps();
