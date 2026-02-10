
const TOKKO_API_KEY = '88c781f0f233f2e3e39a727cfdced9c4a0b8267c';
const TOKKO_BASE_URL = 'https://www.tokkobroker.com/api/v1';

async function testTokko() {
    console.log("Fetching properties from Tokko...");
    try {
        // Using the exact URL from the service
        const limit = 50;
        const url = `${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&limit=${limit}&lang=es`;
        console.log("URL:", url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Tokko API error: ${response.statusText}`);
        }
        const data = await response.json();
        const properties = data.objects;

        console.log(`Fetched ${properties.length} properties.`);

        properties.forEach((p: any) => {
            console.log(`ID: ${p.id} | Ref: ${p.reference_code} | Active: ${p.is_active} | Status: ${p.status} | Ops: ${p.operations.map((o: any) => o.operation_type)}`);
            // Check specific availability fields if key exists
            if ('is_active' in p) console.log(`   > is_active: ${p.is_active}`);
            if ('availability' in p) console.log(`   > availability: ${p.availability}`);
            if ('folder_status' in p) console.log(`   > folder_status: ${JSON.stringify(p.folder_status)}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

testTokko();
