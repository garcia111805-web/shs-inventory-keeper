const fs=require('fs');
const env=fs.readFileSync('.env','utf8');
const url=env.match(/VITE_SUPABASE_URL=(.+)/)[1];
const key=env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1];
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(url,key);
(async()=>{
  const {data:items}=await sb.from('items').select('*').eq('category','cleaning').limit(5);
  console.log('Cleaning items sample:', JSON.stringify(items, null, 2));
  const {count}=await sb.from('items').select('*',{count:'exact',head:true}).eq('category','cleaning');
  console.log('Total cleaning items:', count);
})();
