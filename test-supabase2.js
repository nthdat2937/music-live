const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ktqdzlhvdkerjajffgfi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1wm-eXETyu07vl61sY4mBQ_xwYZVOCj'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log(await supabase.rpc('get_tables'));
}
test();
