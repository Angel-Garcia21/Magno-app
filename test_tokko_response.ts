
import { tokkoService } from './services/tokkoService';

async function testTokko() {
    console.log("Fetching properties from Tokko...");
    try {
        const properties = await tokkoService.fetchProperties(50);
        console.log(`Fetched ${properties.length} properties.`);

        properties.forEach(p => {
            console.log(`ID: ${p.id} | Ref: ${p.reference_code} | Status: ${p.status} | Availability: ${JSON.stringify(p.availability)} | Operations: ${JSON.stringify(p.operations.map(o => o.operation_type))}`);
            // Check for any field that indicates availability
            if (p.is_active !== undefined) console.log(`  is_active: ${p.is_active}`);
            if (p.current_localization_status !== undefined) console.log(`  current_localization_status: ${p.current_localization_status}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

testTokko();
