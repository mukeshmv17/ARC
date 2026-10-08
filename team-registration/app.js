// ---------- Supabase Configuration ----------
const SUPABASE_URL = "https://uuwosxozorvyosqrlwnf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jum4cbT8SNPUDo_tJazpHA_7NSizZb1";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let events=[], currentEvent=null, memberCount=2, currentUser=null, registrationOpen=true, contacts=[], paymentStarted=false;
const $=id=>document.getElementById(id);
const esc=s=>{const d=document.createElement('div');d.textContent=s??'';return d.innerHTML};
const escHtml=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,'');
async function loadEvents(){
  try{
    const [{data:ev,error:evError},{data:contactsRows,error:contactsError},{data:scheduleRows,error:scheduleError},{data:setting,error:settingError}] = await Promise.all([
      supabaseClient.from('events').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('contacts').select('*').order('id',{ascending:true}),
      supabaseClient.from('schedules').select('*').order('date',{ascending:true}),
      supabaseClient.from('settings').select('value').eq('key','registration_open').maybeSingle()
    ]);
    if(evError) throw evError;
    if(contactsError) throw contactsError;
    if(scheduleError) throw scheduleError;
    if(settingError) throw settingError;
    events=(ev||[]).map(e=>({
      ...e,
      registrationFee:Number(e.registration_fee||0),
      details:e.details_json||{},
      rules:e.rules_json||{}
    }));
    contacts=contactsRows||[];
    registrationOpen=setting ? (setting.value===true || setting.value==='true' || setting.value==='1') : true;
    $('eventCount').textContent=events.length;
    renderEvents();
    renderContacts();
    renderPublicScheduleRows(scheduleRows||[]);
    updateRegistrationBanner();
  }catch(e){
    console.error('Could not load public portal data:',e);
    $('eventsGrid').innerHTML='<div class="loading">Could not load events. Please refresh the registration portal.</div>';
    const el=$('publicSchedule');
    if(el)el.innerHTML='<div class="schedule-card"><div><b>Could not load schedule</b><span>Please refresh the registration portal.</span></div></div>';
  }
}
function renderPublicScheduleRows(rows){
  const el=$('publicSchedule'); if(!el)return;
  el.innerHTML=rows.length?rows.map(s=>{
    const d=s.date||s.schedule_date||'TBA';
    const eventName=s.event_name||s.eventName||'General';
    return '<div class="public-schedule-row"><div class="schedule-date-block"><strong>'+esc(d)+'</strong><span>'+esc(s.time||'')+'</span></div><div class="schedule-info"><span class="schedule-event">'+esc(eventName)+'</span><h3>'+esc(s.title||'Schedule item')+'</h3><p>'+esc([s.venue?('Venue: '+s.venue):'',s.description||''].filter(Boolean).join(' · '))+'</p></div></div>';
  }).join(''):'<div class="schedule-card"><div><b>Schedule coming soon</b><span>The Robotics Club coordinator hasn\'t published a schedule yet.</span></div></div>';
}
function updateRegistrationBanner(){const b=$('registrationBanner');if(b){b.textContent=registrationOpen?'OPEN':'CLOSED';b.className='registration-banner '+(registrationOpen?'open':'closed')}}
function formatPrize(value){const v=String(value||'').trim();if(!v)return 'TBA';if(v.includes('₹'))return v;if(/^([0-9][0-9,]*(?:\.[0-9]+)?)$/.test(v))return '₹'+v;return v;}
function renderEvents(){const q=$('search').value.toLowerCase();const list=events.filter(e=>!q||e.name.toLowerCase().includes(q));$('eventsGrid').innerHTML=list.length?list.map(e=>{const d=e.details||{};return `<article class="event event-clickable" onclick="openEventDetails(${e.id})">${e.image?`<div class="event-image-wrap"><img class="event-image" src="${e.image}" alt="${esc(e.name)}"></div>`:`<div class="event-image-wrap event-image-placeholder">ROBOTICS EVENT</div>`}<div class="event-content"><div class="event-meta"><span>${esc(d.date||'DATE TBA')}</span><span>${Number(e.registrationFee||0)>0?'₹'+Number(e.registrationFee).toFixed(0):'FREE'}</span></div><h3>${esc(e.name)}</h3><div class="event-bottom"><span class="fee">${Number(e.registrationFee||0)>0?'Entry fee ₹'+Number(e.registrationFee).toFixed(0):'Free registration'}</span><button class="btn primary" onclick="event.stopPropagation();openEventDetails(${e.id})">View details</button></div></div></article>`}).join(''):'<div class="loading">No matching events found.</div>'}
function renderContacts(){const wrap=$('publicContacts');if(!wrap)return;wrap.innerHTML=contacts.length?contacts.map(c=>`<div class="contact-box"><b>${esc(c.name)}</b><span>${esc(c.role||'Robotics Club')}</span>${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:''}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}</div>`).join(''):'<div class="contact-box"><b>Robotics Club</b><span>Contact details will be published soon.</span></div>'}
function openEventDetails(id){const e=events.find(x=>x.id===id);if(!e)return;currentEvent=e;const d=e.details||{},rules=e.rules||{};const defaultSections=[['general','General Guidelines'],['robot','Robot Specifications'],['track','Track Specifications'],['race','Race Rules'],['penalties','Penalties & Scoring'],['reset','Reset Rule'],['safety','Safety & Inspection Requirements'],['other','Other Important Information']];const customTitles=rules.__titles||{};const sections=Object.keys(customTitles).length?Object.entries(customTitles):defaultSections;$('eventDetailContent').innerHTML=`${e.image?`<img class="detail-poster" src="${e.image}" alt="${esc(e.name)}">`:''}<p class="eyebrow">EVENT DETAILS</p><h2>${esc(e.name)}</h2><div class="detail-description">${escHtml(e.description||'Event description will be published by the Robotics Club coordinator.')}</div><div class="registration-details"><div><span>DATE</span><b>${esc(d.date||'TBA')}</b></div><div><span>VENUE</span><b>${esc(d.venue||'TBA')}</b></div><div><span>TEAM SIZE</span><b>${esc(d.teamSize||'2–4 members')}</b></div><div><span>FEE</span><b>${Number(e.registrationFee||0)>0?'₹'+Number(e.registrationFee).toFixed(0):'FREE'}</b></div><div><span>PRIZE</span><b>${esc(formatPrize(d.prize))}</b></div><div><span>DEADLINE</span><b>${esc(d.deadline||'TBA')}</b></div></div><h3 class="detail-rules-title">Rules &amp; Guidelines</h3><div class="detail-rules">${sections.map(([k,l],i)=>rules[k]?`<details ${i===0?'open':''}><summary>${l}</summary><div class="rich-content">${escHtml(rules[k])}</div></details>`:'').join('') || '<p class="muted">Detailed rules will be published soon.</p>'}</div><div class="detail-register"><span class="registration-banner ${registrationOpen?'open':'closed'}">${registrationOpen?'REGISTRATION OPEN':'REGISTRATION CLOSED'}</span><button class="btn primary big" ${registrationOpen?'':'disabled'} onclick="openRegistration(${e.id});document.getElementById('eventDetailModal').classList.add('hidden')">${registrationOpen?'Register team':'Registration closed'}</button></div>`;openModal('eventDetailModal')}
window.openEventDetails=openEventDetails;

$('search').addEventListener('input',renderEvents);
function openModal(id){$(id).classList.remove('hidden')} function closeModals(){document.querySelectorAll('.modal').forEach(x=>x.classList.add('hidden'));$('accountMenu')?.classList.add('hidden')}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModals));document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')}));
$('signupBtn').onclick=()=>{setAuthMode('signup');openModal('authModal')};$('loginBtn').onclick=()=>{setAuthMode('login');openModal('authModal')};$('authSignupTab').onclick=()=>setAuthMode('signup');$('authLoginTab').onclick=()=>setAuthMode('login');
function setAuthMode(mode){$('authSignupTab').classList.toggle('active',mode==='signup');$('authLoginTab').classList.toggle('active',mode==='login');$('signupForm').classList.toggle('hidden',mode!=='signup');$('loginForm').classList.toggle('hidden',mode!=='login');$('authTitle').textContent=mode==='signup'?'Create your account':'Welcome back';$('authSubtitle').textContent=mode==='signup'?'Use your college email to register and manage team entries.':'Sign in with the college email you used for registration.'}
async function loadProfile(authUser){
  if(!authUser){currentUser=null;updateAuth();return null;}
  const {data:profile,error}=await supabaseClient.from('users').select('*').eq('auth_id',authUser.id).maybeSingle();
  if(error) throw error;
  if(!profile){
    currentUser={id:authUser.id,auth_id:authUser.id,email:authUser.email||'',name:authUser.user_metadata?.name||'',college:authUser.user_metadata?.college||'',phone:authUser.user_metadata?.phone||'',role:'member'};
  }else{
    currentUser=profile;
  }
  updateAuth();
  return currentUser;
}

async function restoreAuth(){
  try{
    const {data:{session},error}=await supabaseClient.auth.getSession();
    if(error)throw error;
    if(session?.user)await loadProfile(session.user);
    else updateAuth();
  }catch(e){console.error('Could not restore account session:',e);}
}

supabaseClient.auth.onAuthStateChange(async (_event,session)=>{
  try{ await loadProfile(session?.user||null); }catch(e){console.error('Could not load account profile:',e);}
});

$('googleSignInBtn').onclick=async()=>{
  $('authError').textContent=''; $('loginError').textContent='';
  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:window.location.href.split('#')[0]}
  });
  if(error)$('authError').textContent=error.message;
};

$('signupForm').onsubmit=async e=>{
  e.preventDefault(); $('authError').textContent='';
  try{
    const name=$('suName').value.trim(), email=$('suEmail').value.trim(), password=$('suPassword').value;
    const college=$('suCollege').value.trim(), phone=$('suPhone').value.trim();
    const {data,error}=await supabaseClient.auth.signUp({
      email,password,
      options:{data:{name,college,phone,role:'member',auth_provider:'email'}}
    });
    if(error)throw error;
    if(data.session && data.user){
      await loadProfile(data.user);
      closeModals();
      alert('Account created. You can now register your team.');
    }else{
      closeModals();
      alert('Account created. Please verify your college email, then sign in to register your team.');
    }
  }catch(x){$('authError').textContent=x.message||'Could not create the account.'}
};

$('loginForm').onsubmit=async e=>{
  e.preventDefault(); $('loginError').textContent='';
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({
      email:$('liEmail').value.trim(),password:$('liPassword').value
    });
    if(error)throw error;
    await loadProfile(data.user);
    closeModals();
  }catch(x){$('loginError').textContent=x.message||'Could not sign in.'}
};

function updateAuth(){
  const logged=!!currentUser;
  $('loginBtn').classList.toggle('hidden',logged);
  $('signupBtn').classList.toggle('hidden',logged);
  $('accountWrap').classList.toggle('hidden',!logged);
  if(logged)$('accountBtn').textContent=(currentUser.name?.split(' ')[0]||'Account')+' ▾';
}
$('accountBtn').onclick=e=>{e.stopPropagation();$('accountMenu').classList.toggle('hidden')};
document.addEventListener('click',()=>$('accountMenu')?.classList.add('hidden'));
$('signoutBtn').onclick=async()=>{
  $('accountMenu').classList.add('hidden');
  const {error}=await supabaseClient.auth.signOut();
  if(error)console.error('Sign out failed:',error);
  currentUser=null; updateAuth();
};
$('enrolledBtn').onclick=async()=>{
  $('accountMenu').classList.add('hidden');
  openModal('enrolledModal');
  $('enrolledList').innerHTML='<div class="loading">Loading registrations…</div>';
  if(!currentUser?.auth_id){$('enrolledList').innerHTML='<div class="loading">Please sign in again.</div>';return;}
  try{
    const {data:rows,error}=await supabaseClient.from('participants').select('id,name,event_id,college,registration_fee,amount_paid,created_at').eq('user_id',currentUser.auth_id).order('created_at',{ascending:false});
    if(error)throw error;
    const byId=Object.fromEntries(events.map(e=>[String(e.id),e]));
    $('enrolledList').innerHTML=rows?.length?rows.map(r=>{
      const ev=byId[String(r.event_id)];
      const fee=Number(r.registration_fee??ev?.registrationFee??0);
      return '<div class="enrolled-card"><div><b>'+esc(r.name||'Team')+'</b><span>'+esc(ev?.name||'Event')+'</span></div><strong>'+ (fee>0?'₹'+fee.toFixed(0):'FREE')+'</strong></div>';
    }).join(''):'<div class="loading">No event registrations yet.</div>';
  }catch(e){console.error('Could not load registrations:',e);$('enrolledList').innerHTML='<div class="loading">Could not load registrations.</div>'}
};
function openRegistration(id){currentEvent=events.find(e=>e.id===id);if(!currentEvent)return;if(!registrationOpen){alert('Registration is currently closed by the Robotics Club coordinator.');return}if(!currentUser){setAuthMode('login');openModal('authModal');$('loginError').textContent='Sign in with your college email before registering a team.';return}$('regTitle').textContent='Register for '+currentEvent.name;$('regFee').textContent=Number(currentEvent.registrationFee||0)>0?'Registration fee: ₹'+Number(currentEvent.registrationFee).toFixed(0):'Registration is free';
const paymentBox=$('paymentProofBox'), paymentLink=$('makePaymentBtn'), submitBtn=$('teamForm').querySelector('button[type=submit]'); paymentStarted=false; if(Number(currentEvent.registrationFee||0)>0){paymentBox.classList.remove('hidden'); const configuredLink=currentEvent.details?.paymentLink||''; const link=configuredLink||'https://example.com/'; paymentLink.href=link; paymentLink.classList.remove('disabled-link'); paymentLink.textContent='Make Payment ↗'; $('paymentTransactionId').value=''; $('paymentScreenshot').value=''; $('paymentProofStatus').textContent=configuredLink?'1. Click Make Payment and complete the payment. 2. Return here, upload the payment screenshot and enter the transaction ID.':'Temporary demo payment link is active for testing. Replace it with the college payment link when available.'; if(submitBtn)submitBtn.disabled=true;}else{paymentBox.classList.add('hidden');if(submitBtn)submitBtn.disabled=false;}$('teamName').value='';$('teamError').textContent='';$('teamSuccess').textContent='';memberCount=2;renderMembers();openModal('registerModal')}
window.openRegistration=openRegistration;
$('addMember').onclick=()=>{if(memberCount<4){memberCount++;renderMembers()}};
function renderMembers(){const internal=currentUser?.role==='member';$('memberFields').innerHTML=Array.from({length:memberCount},(_,i)=>internal?`<div class="member"><div class="member-head"><b>Member ${i+1}</b></div><div class="member-grid"><label>Name<input data-k="name" data-i="${i}" required></label><label>AUID<input data-k="auid" data-i="${i}" required></label><label>USN<input data-k="usn" data-i="${i}" required></label><label>Department<input data-k="department" data-i="${i}" required></label><label>Year / Semester<input data-k="yearSem" data-i="${i}" placeholder="e.g. 2nd Year / Sem 4" required></label><label>College<input data-k="college" data-i="${i}" required value="${esc(currentUser?.college||'')}"></label><label>Phone number<input data-k="phone" data-i="${i}" required value="${esc(i===0?currentUser?.phone||'':'')}"></label></div></div>`:`<div class="member"><div class="member-head"><b>Member ${i+1}</b></div><div class="member-grid"><label>Name<input data-k="name" data-i="${i}" required></label><label>College email<input type="email" data-k="email" data-i="${i}" placeholder="name@college.edu.in" required value="${esc(i===0?currentUser?.email||'':'')}"></label><label>College<input data-k="college" data-i="${i}" required value="${esc(currentUser?.college||'')}"></label><label>Phone number<input data-k="phone" data-i="${i}" required value="${esc(i===0?currentUser?.phone||'':'')}"></label></div></div>`).join('')}
function updatePaymentSubmitState(){const fee=Number(currentEvent?.registrationFee||0);const btn=$('teamForm')?.querySelector('button[type=submit]');if(!btn)return;if(fee<=0){btn.disabled=false;return;}const tx=($('paymentTransactionId')?.value||'').trim();const file=$('paymentScreenshot')?.files?.[0];btn.disabled=!(paymentStarted&&tx&&file);}
$('makePaymentBtn').addEventListener('click',()=>{const href=$('makePaymentBtn').getAttribute('href');if(!href||href==='#'){event.preventDefault();return;}paymentStarted=true;$('paymentProofStatus').textContent='Payment page opened. Complete the payment there, then return here and upload the screenshot and transaction ID.';$('makePaymentBtn').textContent='Payment Page Opened ✓';updatePaymentSubmitState();});
$('paymentTransactionId').addEventListener('input',updatePaymentSubmitState);
$('paymentScreenshot').addEventListener('change',updatePaymentSubmitState);

$('teamForm').onsubmit=async e=>{
 e.preventDefault(); $('teamError').textContent=''; $('teamSuccess').textContent='';
 const type=currentUser?.role==='member'?'internal':'external',members=[];
 for(let i=0;i<memberCount;i++){const m={};document.querySelectorAll('[data-i="'+i+'"]').forEach(x=>m[x.dataset.k]=x.value.trim());members.push(m)}
 const payload={teamName:$('teamName').value.trim(),teamType:type,members};
 if(!payload.teamName){$('teamError').textContent='Enter a team name.';return}
 if(!currentUser?.auth_id){$('teamError').textContent='Your session has expired. Please sign in again.';return}
 try{
   const fee=Number(currentEvent.registrationFee||0);
   let transactionId=null, paymentPath=null;
   if(fee>0){
     const tx=$('paymentTransactionId').value.trim(), file=$('paymentScreenshot').files[0];
     if(!paymentStarted)throw new Error('Click Make Payment and complete the payment before submitting the team.');
     if(!tx)throw new Error('Enter the payment transaction ID.');
     if(!file)throw new Error('Upload the payment screenshot.');
     if(file.size>3*1024*1024)throw new Error('Payment screenshot must be under 3 MB.');
     if(!/^image\/(png|jpe?g|webp)$/i.test(file.type))throw new Error('Upload a PNG, JPG or WebP payment screenshot.');
     $('teamError').textContent='Uploading payment proof…';
     const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'')||'png';
     const path=currentUser.auth_id+'/'+Number(currentEvent.id)+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;
     const {error:uploadError}=await supabaseClient.storage.from('payment-screenshots').upload(path,file,{contentType:file.type,upsert:false});
     if(uploadError)throw uploadError;
     transactionId=tx; paymentPath=path;
   }
   const row={
     event_id:Number(currentEvent.id),
     user_id:currentUser.auth_id,
     name:payload.teamName,
     college:currentUser.college||members[0]?.college||'',
     members_json:members,
     cls:(currentEvent.classes&&currentEvent.classes.length)?currentEvent.classes[0]:'General',
     team_type:type,
     registration_fee:fee,
     amount_paid:fee,
     payment_status:fee>0?'Pending verification':'Not required',
     transaction_id:transactionId,
     payment_screenshot_path:paymentPath,
     payment_screenshot:null
   };
   const {error:registrationError}=await supabaseClient.from('participants').insert([row]);
   if(registrationError){
     if(paymentPath)await supabaseClient.storage.from('payment-screenshots').remove([paymentPath]);
     throw registrationError;
   }
   $('teamSuccess').textContent=fee>0?'Registration submitted. Payment proof and transaction ID have been received for verification.':'Team registered successfully. The Robotics Club coordinator can now see it in the event roster.';
   $('teamForm').querySelectorAll('input').forEach(x=>x.disabled=true);
   $('teamForm').querySelector('button[type="submit"]').disabled=true;
   await loadEvents();
 }catch(x){console.error('Team registration error:',x);$('teamError').textContent=x.message||'Could not complete registration.'}
};
restoreAuth();
loadEvents();

setTimeout(()=>document.getElementById('siteLoader')?.classList.add('hidden'),1300);
