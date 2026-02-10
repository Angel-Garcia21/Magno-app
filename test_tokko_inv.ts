


const TOKKO_API_KEY = '88c781f0f233f2e3e39a727cfdced9c4a0b8267c';
const TOKKO_BASE_URL = 'https://www.tokkobroker.com/api/v1';

async function testTokkoFetch() {
    try {
        console.log("--- TEST SPECIFIC UNAVAILABLE PROPERTY (R10021) ---");

        // Strategy 1: Search by reference code with standard call - EXPECT FAIL
        const url1 = `${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&filters=[["reference_code","=","R10021"]]&lang=es`;
        await fetchAndLog(url1, "Ref R10021 (Standard)");

        // Strategy 2: Explicitly asking for inactive
        const url2 = `${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&filters=[["reference_code","=","R10021"],["is_active","=",false]]&lang=es`;
        await fetchAndLog(url2, "Ref R10021 + is_active=false");

        // Strategy 3: "show_deleted" or similar
        // Some APIs use "available" param
        const url3 = `${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&filters=[["reference_code","=","R10021"]]&available=false&lang=es`;
        await fetchAndLog(url3, "Ref R10021 + available=false param");

        // Strategy 4: Try just is_active=false without reference to see if we get ANY
        const url4 = `${TOKKO_BASE_URL}/property/?key=${TOKKO_API_KEY}&format=json&filters=[["is_active","=",false]]&limit=5&lang=es`;
        await fetchAndLog(url4, "Just is_active=false");

    } catch (error) {
        console.error("Test execution failed:", error);
    }
}

async function fetchAndLog(url: string, label: string) {
    console.log(`Fetching [${label}]...`);
    // console.log("URL:", url); 
    const response = await fetch(url);
    if (!response.ok) {
        console.log(`Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log("Body:", text);
        return;
    }
    const data = await response.json();
    console.log(`Count: ${data.meta.total_count}`);
    console.log(`Returned: ${data.objects.length}`);
    if (data.objects.length > 0) {
        console.log("Sample IDs:", data.objects.slice(0, 3).map((p: any) => p.id));
        console.log("Sample Statuses:", data.objects.slice(0, 3).map((p: any) => `Status: ${p.status}, Active: ${p.is_active}, Reference: ${p.reference_code}`));
    }
}

testTokkoFetch();
