const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ktqdzlhvdkerjajffgfi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1wm-eXETyu07vl61sY4mBQ_xwYZVOCj'; // wait this doesn't look like a valid anon key... it says sb_publishable.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log(await supabase.from('music_history').select('*').limit(1));
}
test();
