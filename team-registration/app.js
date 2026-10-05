// ---------- Supabase Configuration ----------
const SUPABASE_URL = "https://uuwosxozorvyosqrlwnf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jum4cbT8SNPUDo_tJazpHA_7NSizZb1";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const API = localStorage.getItem('ROBOTICS_API') || 'http://localhost:3000';
let events=[], currentEvent=null, memberCount=2, currentUser=null, registrationOpen=true, contacts=[], paymentStarted=false;
const $=id=>document.getElementById(id);
const esc=s=>{const d=document.createElement('div');d.textContent=s??'';return d.innerHTML};
const escHtml=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,'');
async function get(path,opts={}){const r=await fetch(API+path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
async function loadEvents(){try{const [ev,st,cs]=await Promise.all([get('/api/public/events'),get('/api/public/registration-status'),get('/api/public/contacts')]);events=ev;registrationOpen=!!st.open;contacts=cs;$('eventCount').textContent=events.length;renderEvents();renderContacts();loadPublicSchedule();updateRegistrationBanner()}catch(e){$('eventsGrid').innerHTML='<div class="loading">Could not load events. Start the Robotics Portal server first.</div>';loadPublicSchedule()}}
function updateRegistrationBanner(){const b=$('registrationBanner');if(b){b.textContent=registrationOpen?'OPEN':'CLOSED';b.className='registration-banner '+(registrationOpen?'open':'closed')}}
async function loadPublicSchedule(){const el=$('publicSchedule');if(!el)return;try{const rows=await get('/api/public/schedules');el.innerHTML=rows.length?rows.map(s=>`<div class="public-schedule-row"><div class="schedule-date-block"><strong>${esc(s.date||'TBA')}</strong><span>${esc(s.time||'')}</span></div><div class="schedule-info"><span class="schedule-event">${esc(s.eventName||'General')}</span><h3>${esc(s.title||'Schedule item')}</h3><p>${esc([s.venue?('Venue: '+s.venue):'',s.description||''].filter(Boolean).join(' · '))}</p></div></div>`).join(''):'<div class="schedule-card"><div><b>Schedule coming soon</b><span>The Robotics Club coordinator hasn\'t published a schedule yet.</span></div></div>'}catch(e){el.innerHTML='<div class="schedule-card"><div><b>Could not load schedule</b><span>Check the Robotics Portal connection.</span></div></div>'}}
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
let googleClientId='';
async function initGoogleSignIn(){
  try{
    const cfg=await get('/api/public/google-config');
    googleClientId=cfg.clientId||'';
    const btn=$('googleSignInBtn');
    if(!googleClientId){btn.title='Google Sign-In will be available after the admin configures GOOGLE_CLIENT_ID.';return;}
    const ready=()=>{
      if(window.google?.accounts?.id){
        google.accounts.id.initialize({client_id:googleClientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:true});
        return true;
      }
      return false;
    };
    if(!ready()){let tries=0;const timer=setInterval(()=>{if(ready()||++tries>30)clearInterval(timer)},250);}
  }catch(e){}
}
async function handleGoogleCredential(response){
  $('authError').textContent=''; $('loginError').textContent='';
  try{
    currentUser=await get('/api/public/google-login',{method:'POST',body:JSON.stringify({credential:response.credential})});
    closeModals(); updateAuth();
  }catch(x){$('authError').textContent=x.message;$('loginError').textContent=x.message;}
}
$('googleSignInBtn').onclick=()=>{
  if(!googleClientId){$('authError').textContent='Google Sign-In is not configured yet. Ask the portal administrator to add GOOGLE_CLIENT_ID.';return;}
  if(window.google?.accounts?.id){window.google.accounts.id.prompt();}
  else $('authError').textContent='Google Sign-In is still loading. Please try again.';
};
initGoogleSignIn();
$('signupForm').onsubmit=async e=>{e.preventDefault();$('authError').textContent='';try{currentUser=await get('/api/public/signup',{method:'POST',body:JSON.stringify({name:$('suName').value,email:$('suEmail').value,password:$('suPassword').value,college:$('suCollege').value,phone:$('suPhone').value})});closeModals();updateAuth();alert('Account created. You can now register your team.')}catch(x){$('authError').textContent=x.message}};
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';try{currentUser=await get('/api/public/login',{method:'POST',body:JSON.stringify({email:$('liEmail').value,password:$('liPassword').value})});closeModals();updateAuth()}catch(x){$('loginError').textContent=x.message}};
function updateAuth(){const logged=!!currentUser;$('loginBtn').classList.toggle('hidden',logged);$('signupBtn').classList.toggle('hidden',logged);$('accountWrap').classList.toggle('hidden',!logged);if(logged)$('accountBtn').textContent=(currentUser.name?.split(' ')[0]||'Account')+' ▾'}
$('accountBtn').onclick=e=>{e.stopPropagation();$('accountMenu').classList.toggle('hidden')};document.addEventListener('click',()=>$('accountMenu')?.classList.add('hidden'));
$('signoutBtn').onclick=()=>{currentUser=null;updateAuth();$('accountMenu').classList.add('hidden')};$('enrolledBtn').onclick=async()=>{$('accountMenu').classList.add('hidden');openModal('enrolledModal');$('enrolledList').innerHTML='<div class="loading">Loading registrations…</div>';try{const rows=await get('/api/public/users/'+currentUser.id+'/registrations');$('enrolledList').innerHTML=rows.length?rows.map(r=>`<div class="enrolled-card"><div><b>${esc(r.teamName)}</b><span>${esc(r.eventName)}</span></div><strong>${Number(r.registrationFee||0)>0?'₹'+Number(r.registrationFee).toFixed(0):'FREE'}</strong></div>`).join(''):'<div class="loading">No event registrations yet.</div>'}catch(e){$('enrolledList').innerHTML='<div class="loading">Could not load registrations.</div>'}};
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
 for(let i=0;i<memberCount;i++){const m={};document.querySelectorAll(`[data-i="${i}"]`).forEach(x=>m[x.dataset.k]=x.value.trim());members.push(m)}
 const payload={userId:currentUser.id,teamName:$('teamName').value.trim(),teamType:type,members};
 if(!payload.teamName){$('teamError').textContent='Enter a team name.';return}
 try{
   const fee=Number(currentEvent.registrationFee||0);
   let paymentProof=null;
   if(fee>0){
     const transactionId=$('paymentTransactionId').value.trim();
     const file=$('paymentScreenshot').files[0];
     if(!paymentStarted) throw new Error('Click Make Payment and complete the payment before submitting the team.');
     if(!transactionId) throw new Error('Enter the payment transaction ID.');
     if(!file) throw new Error('Upload the payment screenshot.');
     if(file.size>3*1024*1024) throw new Error('Payment screenshot must be under 3 MB.');
     if(!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Upload a PNG, JPG or WebP payment screenshot.');
     $('teamError').textContent='Preparing payment proof…';
     const screenshot=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
     paymentProof={transactionId,screenshot,paymentStarted:true};
   }
   $('teamError').textContent='';
   const result=await get('/api/public/events/'+currentEvent.id+'/register',{method:'POST',body:JSON.stringify({...payload,paymentProof})});
   $('teamSuccess').textContent=result.amountPaid>0?`Registration submitted. Payment proof and transaction ID have been received for verification.`:'Team registered successfully. The Robotics Club coordinator can now see it in the event roster.';
   $('teamForm').querySelectorAll('input').forEach(x=>x.disabled=true); $('teamForm').querySelector('button[type="submit"]').disabled=true;
   loadEvents();
 }catch(x){$('teamError').textContent=x.message||'Could not complete registration.'}
};
loadEvents();

setTimeout(()=>document.getElementById('siteLoader')?.classList.add('hidden'),1300);
