// ---------- Supabase Configuration ----------
const SUPABASE_URL = "https://uuwosxozorvyosqrlwnf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jum4cbT8SNPUDo_tJazpHA_7NSizZb1";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let currentEvents = [];
let activeEvent = null;
let participants = [];
let timerInterval = null;
let loginMode = 'user';
let activeExpandedTeamId = null;
let memberRowCount = 2;

// ---------- Login mode switch ----------
const tabUser = document.getElementById('tabUser');
const tabAdmin = document.getElementById('tabAdmin');
const adminNotice = document.getElementById('adminNotice');
const adminLoginForm = document.getElementById('adminLoginForm');
const memberLoginForm = document.getElementById('memberLoginForm');

tabUser.addEventListener('click', () => setLoginMode('user'));
tabAdmin.addEventListener('click', () => setLoginMode('admin'));

function setLoginMode(mode) {
  loginMode = mode;
  tabAdmin.classList.toggle('active', mode === 'admin');
  tabUser.classList.toggle('active', mode === 'user');
  adminNotice.style.display = mode === 'admin' ? 'block' : 'none';
  adminLoginForm.classList.toggle('hidden', mode !== 'admin');
  memberLoginForm.classList.toggle('hidden', mode !== 'user');
}

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  loginMode = 'admin';
  tabAdmin.classList.add('active');
  tabUser.classList.remove('active');
  adminNotice.style.display = 'block';
  adminLoginForm.classList.remove('hidden');
  memberLoginForm.classList.add('hidden');

  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const err = document.getElementById('adminFormError');

  err.classList.remove('show');

  try {
    // Sign in through Supabase Auth
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (authError) {
      throw new Error(authError.message);
    }

    // Get the corresponding profile from public.users
    const { data: userData, error: userError } =
      await supabaseClient
        .from('users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

    if (userError || !userData) {
      await supabaseClient.auth.signOut();
      throw new Error('User profile not found.');
    }

    // Admin login only
    if (userData.role !== 'admin') {
      await supabaseClient.auth.signOut();
      throw new Error('Access denied. This account is not an admin.');
    }

    currentUser = userData;
    enterApp();

  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add('show');
  }
});

memberLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (loginMode !== 'user') return;
  const auid = document.getElementById('memberAuid').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const err = document.getElementById('memberFormError');
  try {
    const res = await fetch('/api/login-member', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auid, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    currentUser = data;
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
});

// ---------- Sign-up ----------
const viewLogin = document.getElementById('viewLogin');
const viewSignup = document.getElementById('viewSignup');
document.getElementById('showSignup').addEventListener('click', () => {
  viewLogin.classList.add('hidden'); viewSignup.classList.remove('hidden');
});
document.getElementById('backToLogin').addEventListener('click', () => {
  viewSignup.classList.add('hidden'); viewLogin.classList.remove('hidden');
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('suName').value.trim(),
    auid: document.getElementById('suAuid').value.trim(),
    usn: document.getElementById('suUsn').value.trim(),
    department: document.getElementById('suDept').value.trim(),
    college: document.getElementById('suCollege').value.trim(),
    phone: document.getElementById('suPhone').value.trim(),
    cycleCode: document.getElementById('suCycleCode').value.trim()
  };
  const err = document.getElementById('signupError');
  try {
    const res = await fetch('/api/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    currentUser = data;
    viewSignup.classList.add('hidden');
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
});

// ---------- App shell / sidebar navigation ----------
function enterApp() {
  viewLogin.classList.add('hidden');
  viewSignup.classList.add('hidden');
  document.getElementById('viewApp').classList.remove('hidden');
  document.getElementById('userNameLabel').textContent = currentUser.name;
  document.getElementById('roleBadge').textContent = currentUser.role;
  document.getElementById('roleBadge').classList.toggle('admin', currentUser.role === 'admin');

  const isAdmin = currentUser.role === 'admin';
  document.getElementById('addEventBtn').classList.toggle('hidden', !isAdmin);
  document.getElementById('exportAllBtn').classList.toggle('hidden', !isAdmin);
  document.getElementById('exportTeamTypeBtn').classList.toggle('hidden', !isAdmin);
  document.getElementById('navUsers').classList.toggle('hidden', !isAdmin);
  document.getElementById('navSettings').classList.toggle('hidden', !isAdmin);

  if (!document.getElementById('rCollege').value && currentUser.college) {
    document.getElementById('rCollege').value = currentUser.college;
  }

  buildMemberRows(2);
  loadEvents();
  goToPage('events');
}

document.getElementById('logoutBtn').addEventListener('click', () => location.reload());

// ---------- Responsive sidebar ----------
const appShell = document.getElementById('viewApp');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
function isMobileSidebar() { return window.matchMedia('(max-width: 860px)').matches; }
function setSidebarOpen(open) {
  if (isMobileSidebar()) {
    appShell.classList.toggle('sidebar-open', open);
    appShell.classList.remove('sidebar-closed');
  } else {
    appShell.classList.toggle('sidebar-closed', !open);
    appShell.classList.remove('sidebar-open');
  }
  sidebarToggle.setAttribute('aria-expanded', String(open));
}
sidebarToggle.addEventListener('click', () => {
  const open = isMobileSidebar() ? appShell.classList.contains('sidebar-open') : !appShell.classList.contains('sidebar-closed');
  setSidebarOpen(!open);
});
sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
window.addEventListener('resize', () => {
  if (isMobileSidebar()) setSidebarOpen(false);
});

const pages = ['events', 'schedule', 'register', 'timer', 'users', 'settings'];
const pageTitles = { events: 'Events', schedule: 'Schedule', register: 'Register Team', timer: 'Event', users: 'Manage Users', settings: 'Settings' };
function goToPage(name) {
  pages.forEach(p => document.getElementById('page' + p.charAt(0).toUpperCase() + p.slice(1)).classList.toggle('hidden', p !== name));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.getElementById('topbarTitle').textContent = pageTitles[name] || '';
  if (timerInterval && name !== 'timer') { clearInterval(timerInterval); timerInterval = null; }
  if (name === 'schedule') loadScheduleAdmin();
  if (name === 'register') { populateRegisterEventOptions(); loadRegisterTeamsList(); }
  if (name === 'users') loadUsersList();
  if (name === 'settings') { loadCycleCode(); loadRegistrationControl(); loadContacts(); }
}
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => { goToPage(btn.dataset.page); if (isMobileSidebar()) setSidebarOpen(false); });
});

// ---------- Events ----------
async function loadEvents() {
  try {
    const { data, error } = await supabaseClient
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentEvents = (data || []).map(ev => ({
      ...ev,
      registrationFee: ev.registration_fee,
      assignedUserIds: ev.assigned_user_ids || [],
      details: ev.details_json || {},
      rules: ev.rules_json || {}
    }));

    renderEvents();
  } catch (error) {
    console.error('Could not load events:', error);
    alert('Could not load events: ' + error.message);
  }
}

function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '';
  document.getElementById('eventsEmpty').classList.toggle('hidden', currentEvents.length > 0);
  currentEvents.forEach(ev => {
    const card = document.createElement('div'); card.className = 'event-card';
    const d = ev.details || {};
    card.innerHTML = `${ev.image ? `<img class="portal-event-image" src="${ev.image}" alt="${esc(ev.name)}">` : `<div class="event-image-placeholder">ROBOTICS EVENT</div>`}
      <span class="event-tag">${esc(ev.type)}</span><h3>${esc(ev.name)}</h3>
      <div class="event-meta-line"><span>${esc(d.date || 'Date TBA')}</span><span>${Number(ev.registrationFee||0)>0 ? `₹${Number(ev.registrationFee).toFixed(0)}` : 'FREE'}</span></div>
      <div class="event-foot"><button class="btn btn-primary btn-sm" onclick="openEvent(${ev.id})">Open Event</button>${currentUser.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id})">Delete</button>` : ''}</div>`;
    grid.appendChild(card);
  });
}
function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;

  try {
    const { error } = await supabaseClient
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    await loadEvents();

  } catch (error) {
    console.error('Could not delete event:', error);
    alert('Could not delete event: ' + error.message);
  }
}

const addEventModal = document.getElementById('addEventModal');
document.getElementById('addEventBtn').addEventListener('click', () => { addEventModal.classList.remove('hidden'); loadAssignUsersList(); });
document.getElementById('cancelAddEvent').addEventListener('click', () => { addEventModal.classList.add('hidden'); resetRuleEditor(); });
document.getElementById('evImage').addEventListener('change', e => { const file=e.target.files[0]; const preview=document.getElementById('evImagePreview'); if(!file){preview.innerHTML='';return;} if(file.size>2*1024*1024){alert('Please choose an image under 2 MB.');e.target.value='';preview.innerHTML='';return;} const r=new FileReader(); r.onload=()=>preview.innerHTML='<img src="'+r.result+'" style="max-width:180px;max-height:100px;border-radius:8px;object-fit:cover;">'; r.readAsDataURL(file); });

async function loadAssignUsersList() {
  const wrap = document.getElementById('assignUsersList');

  wrap.innerHTML =
    '<p style="color:var(--slate);font-size:0.82rem;">Loading members…</p>';

  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, name, auid, role')
      .eq('role', 'member')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    if (!users || !users.length) {
      wrap.innerHTML =
        '<p style="color:var(--slate);font-size:0.82rem;">No self-registered members yet.</p>';
      return;
    }

    wrap.innerHTML = users.map(u => `
      <label class="assign-user-row">
        <input type="checkbox" value="${u.id}" class="assignUserCheck">
        <span>${esc(u.name)}${u.auid ? ` — ${esc(u.auid)}` : ''}</span>
      </label>
    `).join('');

  } catch (error) {
    console.error('Could not load members:', error);

    wrap.innerHTML =
      '<p style="color:#dc2626;font-size:0.82rem;">Could not load members.</p>';
  }
}

document.getElementById('addEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const imageFile = document.getElementById('evImage').files[0];

    let image = null;

    if (imageFile) {
      if (imageFile.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2 MB.');
        return;
      }

      image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }

    saveActiveRule();

    const rules = {};
    Object.keys(ruleEditors).forEach(k => {
      rules[k] = ruleEditors[k];
    });

    rules.__titles = Object.fromEntries(
      ruleKeys.map(([k, l]) => [k, l])
    );

    const details = {
      date: document.getElementById('evDate').value.trim(),
      venue: document.getElementById('evVenue').value.trim(),
      teamSize: document.getElementById('evTeamSize').value.trim(),
      prize: document.getElementById('evPrize').value.trim(),
      deadline: document.getElementById('evDeadline').value.trim(),
      paymentLink: document.getElementById('evPaymentLink').value.trim()
    };

    const eventData = {
      name: document.getElementById('evName').value.trim(),
      type: document.getElementById('evType').value,
      description: document.getElementById('evDesc').value.trim(),
      registration_fee: Number(
        document.getElementById('evFee').value || 0
      ),
      image: image,
      classes: null,
      assigned_user_ids: Array.from(
        document.querySelectorAll('.assignUserCheck:checked')
      ).map(c => Number(c.value)),
      details_json: details,
      rules_json: rules
    };

    const { error } = await supabaseClient
      .from('events')
      .insert([eventData]);

    if (error) {
      throw error;
    }

    alert('Event created successfully.');

    addEventModal.classList.add('hidden');
    document.getElementById('addEventForm').reset();
    resetRuleEditor();

    await loadEvents();

  } catch (error) {
    console.error('Event creation error:', error);
    alert('Could not create event: ' + error.message);
  }
});

// ---------- Rich event rules editor ----------
const DEFAULT_RULE_KEYS=[['general','General Guidelines'],['robot','Robot Specifications'],['track','Track Specifications'],['race','Race Rules'],['penalties','Penalties & Scoring'],['reset','Reset Rule'],['safety','Safety & Inspection Requirements'],['other','Other Important Information']];
let ruleKeys=DEFAULT_RULE_KEYS.map(x=>[...x]);
let ruleEditors={}, activeRuleKey='general';
function resetRuleEditor(){ruleKeys=DEFAULT_RULE_KEYS.map(x=>[...x]);ruleEditors={};activeRuleKey='general';const ed=document.getElementById('ruleEditor');if(ed)ed.innerHTML='';renderRuleTabs();}
function ruleTitle(){return (ruleKeys.find(x=>x[0]===activeRuleKey)||['','Section'])[1];}
function updateActiveRuleUI(){const title=document.getElementById('activeRuleTitle');if(title)title.textContent=ruleTitle();}
function renderRuleTabs(){
  const wrap=document.getElementById('rulesTabs');
  if(!wrap)return;
  wrap.innerHTML=ruleKeys.map(([k,l])=>{
    const hasContent=String(ruleEditors[k]||'').replace(/<[^>]*>/g,'').trim().length>0;
    return `<div class="rule-tab ${k===activeRuleKey?'active':''} ${hasContent?'has-content':''}" data-rule="${k}"><button type="button" class="rule-tab-main" data-rule-select="${k}" title="Select ${esc(l)}"><span class="rule-check">${hasContent?'✓':'○'}</span><span class="rule-tab-text">${esc(l)}</span>${k.startsWith('custom_')?'<span class="custom-badge">CUSTOM</span>':''}</button><button type="button" class="rule-remove" data-rule-remove="${k}" title="Remove section" aria-label="Remove ${esc(l)}">×</button></div>`;
  }).join('');
  wrap.querySelectorAll('[data-rule-select]').forEach(b=>b.onclick=()=>{
    saveActiveRule();
    activeRuleKey=b.dataset.ruleSelect;
    document.getElementById('ruleEditor').innerHTML=ruleEditors[activeRuleKey]||'';
    renderRuleTabs();
    updateActiveRuleUI();
    document.getElementById('ruleEditor').focus();
  });
  wrap.querySelectorAll('[data-rule-remove]').forEach(b=>b.onclick=(e)=>{
    e.stopPropagation();
    const key=b.dataset.ruleRemove;
    const item=ruleKeys.find(x=>x[0]===key);
    if(!item)return;
    if(ruleKeys.length===1){alert('Keep at least one section. You can rename it or add another section first.');return;}
    if(!confirm(`Remove the “${item[1]}” section? Any content in this section will be removed.`))return;
    saveActiveRule();
    const idx=ruleKeys.findIndex(x=>x[0]===key);
    ruleKeys=ruleKeys.filter(x=>x[0]!==key);
    delete ruleEditors[key];
    if(activeRuleKey===key){
      const next=ruleKeys[Math.min(idx,ruleKeys.length-1)];
      activeRuleKey=next[0];
      document.getElementById('ruleEditor').innerHTML=ruleEditors[activeRuleKey]||'';
    }
    renderRuleTabs();
    updateActiveRuleUI();
  });
  updateActiveRuleUI();
}
function saveActiveRule(){const ed=document.getElementById('ruleEditor'); if(ed) ruleEditors[activeRuleKey]=ed.innerHTML;}
function execRule(cmd,val=null){document.getElementById('ruleEditor').focus();document.execCommand(cmd,false,val);saveActiveRule();renderRuleTabs();}
document.getElementById('addRuleSection').onclick=()=>{const title=prompt('Enter the new section title:');if(!title||!title.trim())return;const key='custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);ruleKeys.push([key,title.trim()]);ruleEditors[key]='';activeRuleKey=key;document.getElementById('ruleEditor').innerHTML='';renderRuleTabs();document.getElementById('ruleEditor').focus();};
document.querySelectorAll('#editorToolbar [data-cmd]').forEach(el=>el.addEventListener('change',()=>execRule(el.dataset.cmd,el.value))); document.querySelectorAll('#editorToolbar button[data-cmd]').forEach(el=>el.addEventListener('click',()=>execRule(el.dataset.cmd)));
document.getElementById('insertRuleTable').onclick=()=>{const rows=Math.max(1,Number(prompt('Rows','3'))||3),cols=Math.max(1,Number(prompt('Columns','3'))||3);let html='<table><tbody>';for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<cols;c++)html+=`<td>Cell ${r+1}.${c+1}</td>`;html+='</tr>';}html+='</tbody></table><p></p>';execRule('insertHTML',html);};
document.getElementById('insertRuleLink').onclick=()=>{const url=prompt('Link URL');if(url)execRule('createLink',url);}; document.getElementById('clearRuleFormat').onclick=()=>execRule('removeFormat');
renderRuleTabs();

// ---------- Registration control ----------
async function loadRegistrationControl(){try{const r=await fetch('/api/settings/registration');const d=await r.json();const t=document.getElementById('registrationOpenToggle');t.checked=!!d.open;document.getElementById('registrationOpenLabel').textContent=d.open?'OPEN':'CLOSED';}catch(e){}}
document.getElementById('registrationOpenToggle').addEventListener('change',async e=>{const open=e.target.checked;await fetch('/api/settings/registration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({open})});document.getElementById('registrationOpenLabel').textContent=open?'OPEN':'CLOSED';});

// ---------- Contacts ----------
async function loadContacts(){const wrap=document.getElementById('contactsAdminList'); if(!wrap)return; try{const rows=await (await fetch('/api/contacts')).json();wrap.innerHTML=rows.map(c=>`<div class="contact-admin-row"><div><b>${esc(c.name)}</b><span>${esc(c.role||'')}</span><small>${esc(c.phone||'')} · ${esc(c.email||'')}</small></div><div><button class="btn btn-sm" onclick="editContact(${c.id})">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">Delete</button></div></div>`).join('')||'<p class="panel-hint">No contacts yet.</p>';window.contactRows=rows;}catch(e){wrap.innerHTML='<p class="error show">Could not load contacts.</p>';}}
document.getElementById('addContactBtn').onclick=()=>{document.getElementById('contactModalTitle').textContent='Add Contact';document.getElementById('contactForm').reset();document.getElementById('contactId').value='';document.getElementById('contactModal').classList.remove('hidden')}; document.getElementById('cancelContact').onclick=()=>document.getElementById('contactModal').classList.add('hidden');
window.editContact=id=>{const c=(window.contactRows||[]).find(x=>x.id===id);if(!c)return;document.getElementById('contactModalTitle').textContent='Edit Contact';document.getElementById('contactId').value=c.id;document.getElementById('contactName').value=c.name||'';document.getElementById('contactRole').value=c.role||'';document.getElementById('contactPhone').value=c.phone||'';document.getElementById('contactEmail').value=c.email||'';document.getElementById('contactModal').classList.remove('hidden')};
window.deleteContact=async id=>{if(!confirm('Delete this contact?'))return;await fetch('/api/contacts/'+id,{method:'DELETE'});loadContacts()};
document.getElementById('contactForm').onsubmit=async e=>{e.preventDefault();const id=document.getElementById('contactId').value;const body={name:document.getElementById('contactName').value.trim(),role:document.getElementById('contactRole').value.trim(),phone:document.getElementById('contactPhone').value.trim(),email:document.getElementById('contactEmail').value.trim()};const r=await fetch(id?'/api/contacts/'+id:'/api/contacts',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok){alert('Could not save contact.');return;}document.getElementById('contactModal').classList.add('hidden');loadContacts()};


// ---------- Schedule management ----------
let scheduleRows = [];

async function loadScheduleAdmin() {
  try {
    const { data: schedules, error: scheduleError } = await supabaseClient
      .from('schedules')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (scheduleError) {
      throw scheduleError;
    }

    const { data: evs, error: eventError } = await supabaseClient
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (eventError) {
      throw eventError;
    }

    const eventMap = Object.fromEntries(
      (evs || []).map(e => [Number(e.id), e.name])
    );

    scheduleRows = (schedules || []).map(r => ({
      ...r,
      eventId: r.event_id,
      eventName: r.event_id ? (eventMap[Number(r.event_id)] || '') : ''
    }));

    const sel = document.getElementById('scheduleEvent');

    sel.innerHTML =
      '<option value="">General / All Events</option>' +
      (evs || [])
        .map(e => `<option value="${e.id}">${esc(e.name)}</option>`)
        .join('');

    renderScheduleAdmin();

  } catch (e) {
    console.error('Could not load schedule:', e);

    document.getElementById('scheduleAdminList').innerHTML =
      `<p class="error show">Could not load schedule: ${esc(e.message)}</p>`;
  }
}

function formatScheduleDate(v) {
  if (!v) return 'Date TBA';

  const d = new Date(v + 'T00:00:00');

  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
}

function renderScheduleAdmin() {
  const wrap = document.getElementById('scheduleAdminList');

  if (!scheduleRows.length) {
    wrap.innerHTML =
      '<div class="empty-state">No schedule entries yet. Add the first slot for your event.</div>';
    return;
  }

  wrap.innerHTML = scheduleRows.map(r => `
    <div class="schedule-admin-row">
      <div class="schedule-admin-main">
        <div class="schedule-date">
          ${esc(formatScheduleDate(r.date))}
          ${r.time ? ` · ${esc(r.time)}` : ''}
        </div>

        <h3>${esc(r.title)}</h3>

        <p>
          ${r.eventName ? `<b>${esc(r.eventName)}</b> · ` : ''}
          ${esc(r.venue || 'Venue TBA')}
        </p>

        ${r.description ? `<small>${esc(r.description)}</small>` : ''}
      </div>

      <div class="schedule-admin-actions">
        <button class="btn btn-sm" onclick="editSchedule(${r.id})">
          Edit
        </button>

        <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${r.id})">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

const scheduleModal = document.getElementById('scheduleModal');

document.getElementById('addScheduleBtn').addEventListener('click', () => {
  document.getElementById('scheduleModalTitle').textContent = 'Add Schedule';
  document.getElementById('scheduleId').value = '';
  document.getElementById('scheduleForm').reset();
  scheduleModal.classList.remove('hidden');
});

document.getElementById('cancelSchedule').addEventListener('click', () => {
  scheduleModal.classList.add('hidden');
});

window.editSchedule = (id) => {
  const r = scheduleRows.find(x => Number(x.id) === Number(id));

  if (!r) return;

  document.getElementById('scheduleModalTitle').textContent = 'Edit Schedule';
  document.getElementById('scheduleId').value = r.id;
  document.getElementById('scheduleEvent').value = r.eventId || '';
  document.getElementById('scheduleTitle').value = r.title || '';
  document.getElementById('scheduleDate').value = r.date || '';
  document.getElementById('scheduleTime').value = r.time || '';
  document.getElementById('scheduleVenue').value = r.venue || '';
  document.getElementById('scheduleDescription').value = r.description || '';

  scheduleModal.classList.remove('hidden');
};

window.deleteSchedule = async (id) => {
  if (!confirm('Delete this schedule entry?')) return;

  try {
    const { error } = await supabaseClient
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    await loadScheduleAdmin();

  } catch (e) {
    console.error('Could not delete schedule:', e);
    alert('Could not delete schedule: ' + e.message);
  }
};

document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const id = document.getElementById('scheduleId').value;

    const body = {
      event_id: document.getElementById('scheduleEvent').value
        ? Number(document.getElementById('scheduleEvent').value)
        : null,

      title: document.getElementById('scheduleTitle').value.trim(),

      date: document.getElementById('scheduleDate').value,

      time: document.getElementById('scheduleTime').value,

      venue: document.getElementById('scheduleVenue').value.trim(),

      description: document.getElementById('scheduleDescription').value.trim()
    };

    let error;

    if (id) {
      const result = await supabaseClient
        .from('schedules')
        .update(body)
        .eq('id', id);

      error = result.error;

    } else {
      const result = await supabaseClient
        .from('schedules')
        .insert([body]);

      error = result.error;
    }

    if (error) {
      throw error;
    }

    alert(id ? 'Schedule updated successfully.' : 'Schedule added successfully.');

    scheduleModal.classList.add('hidden');

    await loadScheduleAdmin();

  } catch (e) {
    console.error('Could not save schedule:', e);
    alert('Could not save schedule: ' + e.message);
  }
});
// ---------- General Register page ----------
function populateRegisterEventOptions() {
  const sel = document.getElementById('rEvent');
  const open = currentEvents.filter(e => {
    if (e.type !== 'timed' && e.type !== 'score') return false;
    if (!e.assignedUserIds || !e.assignedUserIds.length) return true;
    return currentUser.role === 'admin' || e.assignedUserIds.includes(currentUser.id);
  });
  sel.innerHTML = open.length
    ? open.map(e => `<option value="${e.id}">${esc(e.name)}${e.type === 'score' ? ' (Score)' : ''}</option>`).join('')
    : '<option value="" disabled selected>No events open to you right now</option>';
}

async function loadRegisterTeamsList() {
  const wrap = document.getElementById('registerTeamsList');
  const count = document.getElementById('registerTeamCount');

  if (!wrap) return;

  try {
    const { data: registrations, error: registrationError } =
      await supabaseClient
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

    if (registrationError) {
      throw registrationError;
    }

    const { data: events, error: eventError } =
      await supabaseClient
        .from('events')
        .select('id, name');

    if (eventError) {
      throw eventError;
    }

    const eventMap = Object.fromEntries(
      (events || []).map(e => [Number(e.id), e.name])
    );

    const teams = (registrations || []).map(t => ({
      ...t,
      eventName: eventMap[Number(t.event_id)] || 'Event',
      teamName: t.name,
      members: Array.isArray(t.members_json)
        ? t.members_json
        : (t.members_json ? JSON.parse(t.members_json) : []),
      teamType: t.team_type,
      paymentStatus: t.payment_status,
      amountPaid: t.amount_paid,
      transactionId: t.transaction_id,
      paymentScreenshot: t.payment_screenshot,
      paymentScreenshotUrl: t.payment_screenshot_path
    }));

    count.textContent = teams.length;

    wrap.innerHTML = teams.map(t => {

      const members = Array.isArray(t.members) ? t.members : [];

      const paid =
        Number(t.amountPaid || 0) > 0
          ? `₹${Number(t.amountPaid).toFixed(0)}`
          : (
              t.paymentStatus === 'submitted_for_verification'
                ? 'Proof submitted'
                : (
                    t.paymentStatus === 'paid'
                      ? 'Paid'
                      : 'Not required'
                  )
            );

      const proof =
        (t.paymentScreenshotUrl || t.paymentScreenshot)
          ? `<button type="button"
                class="btn btn-sm btn-primary"
                onclick="viewPaymentProof(${Number(t.id)})">
                View Payment Proof
             </button>`
          : '<span class="payment-missing">No screenshot</span>';

      return `
        <div class="admin-row team-row-enhanced registered-team-card">
          <div class="registered-team-main">

            <div class="registered-team-title">
              <b>${esc(t.teamName || 'Unnamed team')}</b>
              <span class="team-id-badge">#${esc(t.id)}</span>
            </div>

            <span>
              ${esc(t.eventName || 'Event')} ·
              ${esc(t.college || 'College not provided')} ·
              ${t.teamType === 'external' ? 'External' : 'Internal'}
            </span>

            <small>
              ${esc(
                members.map((m, i) =>
                  `${i + 1}. ${m.name || 'Unnamed'}${m.email ? ' · ' + m.email : ''}${m.phone ? ' · ' + m.phone : ''}`
                ).join(' | ') || 'No member details'
              )}
            </small>

            <div class="payment-verification-card">

              <div>
                <label>PAYMENT STATUS</label>
                <strong>${esc(paid)}</strong>
              </div>

              <div>
                <label>TRANSACTION ID</label>
                <strong class="transaction-value">
                  ${esc(t.transactionId || 'Not provided')}
                </strong>
              </div>
              <div>
                <label>PAYMENT PROOF</label>
                <div>${proof}</div>
              </div>
              <div>
                <label>ACTIONS</label>
                <div>
                  <button type="button" class="btn btn-sm btn-danger" onclick="deleteRegisteredTeam(${Number(t.id)})">Remove Team</button>
                </div>
              </div>

            </div>

          </div>
        </div>
      `;
    }).join('') ||
      '<p class="empty-users">No teams have registered through the public portal yet.</p>';

  } catch (e) {

    console.error('Could not load registered teams:', e);

    count.textContent = '0';

    wrap.innerHTML =
      `<p class="empty-users">
        Could not load registered teams: ${esc(e.message)}
      </p>`;
  }
}

function memberRowHtml(i) {
  return `
    <div class="member-block" data-idx="${i}">
      <h4>Member ${i + 1}${i < 2 ? '' : ' (optional)'}</h4>
      <div class="reg-grid">
        <div class="field"><label>Name</label><input type="text" class="mName" ${i < 2 ? 'required' : ''}></div>
        <div class="field"><label>Department</label><input type="text" class="mDept" ${i < 2 ? 'required' : ''}></div>
        <div class="field"><label>Year / Sem</label>
          <select class="mYear" ${i < 2 ? 'required' : ''}>
            <option value="" disabled selected>Select…</option>
            <option>1st Year / Sem 1</option><option>1st Year / Sem 2</option>
            <option>2nd Year / Sem 3</option><option>2nd Year / Sem 4</option>
            <option>3rd Year / Sem 5</option><option>3rd Year / Sem 6</option>
            <option>4th Year / Sem 7</option><option>4th Year / Sem 8</option>
          </select>
        </div>
        <div class="field"><label>Contact number</label><input type="tel" class="mContact" ${i < 2 ? 'required' : ''}></div>
      </div>
    </div>`;
}

function buildMemberRows(count) {
  memberRowCount = Math.max(2, Math.min(4, count));
  const wrap = document.getElementById('membersWrap');
  wrap.innerHTML = '';
  for (let i = 0; i < memberRowCount; i++) wrap.insertAdjacentHTML('beforeend', memberRowHtml(i));
  document.getElementById('addMemberBtn').disabled = memberRowCount >= 4;
  document.getElementById('removeMemberBtn').disabled = memberRowCount <= 2;
}
document.getElementById('addMemberBtn').addEventListener('click', () => buildMemberRows(memberRowCount + 1));
document.getElementById('removeMemberBtn').addEventListener('click', () => buildMemberRows(memberRowCount - 1));

document.querySelectorAll('.team-type-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.team-type-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rTeamType').value = btn.dataset.type;
  });
});

document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('regFormError');
  const ok = document.getElementById('regFormSuccess');
  err.classList.remove('show'); ok.classList.add('hidden');

  const eventId = document.getElementById('rEvent').value;
  const teamName = document.getElementById('rTeamName').value.trim();
  const college = document.getElementById('rCollege').value.trim();
  if (!eventId) { err.textContent = 'Choose an event to register for.'; err.classList.add('show'); return; }
  const chosenEvent = currentEvents.find(ev => String(ev.id) === String(eventId));
  const autoClass = (chosenEvent && chosenEvent.classes && chosenEvent.classes.length) ? chosenEvent.classes[0] : 'General';

  const blocks = Array.from(document.querySelectorAll('#membersWrap .member-block'));
  const members = [];
  for (const b of blocks) {
    const name = b.querySelector('.mName').value.trim();
    const department = b.querySelector('.mDept').value.trim();
    const yearSem = b.querySelector('.mYear').value;
    const contact = b.querySelector('.mContact').value.trim();
    if (name || department || yearSem || contact) members.push({ name, department, yearSem, contact });
  }
  if (members.length < 2) { err.textContent = 'Enter at least 2 team members.'; err.classList.add('show'); return; }
  for (const m of members) {
    if (!m.name || !m.department || !m.yearSem || !m.contact) {
      err.textContent = 'Fill in every field for each member you added.'; err.classList.add('show'); return;
    }
  }

  const teamType = document.getElementById('rTeamType').value;
  const { error: registrationError } = await supabaseClient
  .from('participants')
  .insert([{
    event_id: Number(eventId),
    name: teamName,
    college: college,
    members_json: members,
    cls: autoClass,
    team_type: teamType
  }]);

if (registrationError) {
  console.error('Team registration error:', registrationError);
  err.textContent =
    registrationError.message || 'Could not register team.';
  err.classList.add('show');
  return;
}

  ok.classList.remove('hidden');
  document.getElementById('rTeamName').value = '';
  document.querySelectorAll('.team-type-opt').forEach(b => b.classList.toggle('active', b.dataset.type === 'internal'));
  document.getElementById('rTeamType').value = 'internal';
  buildMemberRows(2);
  if (currentUser.role === 'admin') loadEvents();
});

document.getElementById('exportTeamTypeBtn').addEventListener('click', () => {
  window.location.href = '/api/export/teams-by-type';
});

// ---------- Event timer / roster ----------
async function openEvent(id) {
  activeEvent = currentEvents.find(e => e.id === id);
  document.getElementById('timerEventName').textContent = activeEvent.name;
  document.getElementById('timerEventDesc').textContent = activeEvent.description;
  document.getElementById('valueColHeader').textContent = activeEvent.type === 'score' ? 'Score' : 'Time';
  goToPage('timer');
  await loadParticipants();
  if (timerInterval) clearInterval(timerInterval);
  if (activeEvent.type === 'timed') timerInterval = setInterval(tick, 100);
}
document.getElementById('backToEvents').addEventListener('click', () => goToPage('events'));

async function loadParticipants() {
  const res = await fetch(`/api/events/${activeEvent.id}/participants`);
  participants = await res.json();
  if (participants.length > 0 && !activeExpandedTeamId) activeExpandedTeamId = participants[0].id;
  renderRoster();
}

function formatTime(ms) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function tick() {
  participants.forEach(p => {
    if (p.state === 'running') {
      p.timeMs = Date.now() - p.startTs;
      const bigTimerEl = document.querySelector(`.big-timer-val[data-pid="${p.id}"]`);
      if (bigTimerEl) bigTimerEl.textContent = formatTime(p.timeMs);
      const el = document.querySelector(`tr[data-pid="${p.id}"] .timer-val`);
      if (el) el.textContent = formatTime(p.timeMs);
      const badgeEl = document.querySelector(`.list-timer-val[data-pid="${p.id}"]`);
      if (badgeEl) badgeEl.textContent = formatTime(p.timeMs);
    }
  });
}

function toggleTeamExpand(id) { activeExpandedTeamId = activeExpandedTeamId === id ? null : id; renderRoster(); }

function membersLine(p, sep) {
  const list = (p.members && p.members.length) ? p.members : [{ name: p.name, department: p.dept, yearSem: p.yearSem, contact: p.contact }];
  return list.map(m => `${m.name || ''} (${m.department || '—'}, ${m.yearSem || '—'}) — ${m.contact || m.phone || '—'}${m.email ? ` — ${m.email}` : ''}`).join(sep);
}

function statusOf(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? 'finished' : 'idle';
  return p.state;
}
function statusLabel(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? 'scored' : 'pending';
  return p.state;
}
function valueDisplay(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? String(p.score) : '—';
  return formatTime(p.timeMs || 0);
}

function controlsHtml(p, big) {
  const cls = big ? 'btn-touch' : 'btn-sm';
  if (activeEvent.type === 'score') {
    return `
      <div class="score-input-row">
        <input type="number" class="score-input ${big ? 'score-input-big' : ''}" id="score-${p.id}" value="${p.score ?? ''}" placeholder="Score">
        <button class="btn ${cls} btn-success" title="Save score" aria-label="Save score" onclick="saveScore(${p.id})">&#10003;</button>
      </div>`;
  }
  return `
    <button class="btn ${cls} btn-success" title="Start" aria-label="Start" onclick="startTimer(${p.id})">&#9654;</button>
    <button class="btn ${cls} btn-stop" title="Stop" aria-label="Stop" onclick="stopTimer(${p.id})">&#9632;</button>
    <button class="btn ${cls} btn-reset" title="Reset" aria-label="Reset" onclick="resetTimer(${p.id})">&#8635;</button>`;
}

function renderRoster() {
  document.getElementById('totalCount').textContent = participants.length;
  const container = document.getElementById('teamListContainer');
  container.innerHTML = '';

  participants.forEach((p, i) => {
    const isExpanded = p.id === activeExpandedTeamId;
    const members = (p.members && p.members.length) ? p.members : [{ name: p.name, department: p.dept, yearSem: p.yearSem, contact: p.contact }];
    const item = document.createElement('div');
    item.className = `team-card ${isExpanded ? 'expanded' : ''}`;
    item.innerHTML = `
      <div class="team-header" onclick="toggleTeamExpand(${p.id})">
        <div class="team-header-main">
          <span class="team-rank">#${i + 1}</span>
          <div>
            <div class="team-title">${esc(p.name)}</div>
            <div class="team-sub">${esc(p.college || 'N/A')} • ${members.length} member${members.length > 1 ? 's' : ''} • <span class="type-badge ${p.teamType === 'external' ? 'external' : 'internal'}">${p.teamType === 'external' ? 'External' : 'Internal'}</span></div>
          </div>
        </div>
        <div class="team-header-right">
          <span class="list-timer-val timer-val" data-pid="${p.id}">${valueDisplay(p)}</span>
          <span class="status-tag ${statusOf(p)}">${statusLabel(p)}</span>
          <span class="chevron">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      ${isExpanded ? `
        <div class="team-details-pane">
          <div class="timer-box">
            <span class="big-timer-val" data-pid="${p.id}">${valueDisplay(p)}</span>
            <div class="timer-touch-controls">${controlsHtml(p, true)}</div>
          </div>
          <div class="details-grid">
            ${members.map((m, mi) => `
              <div class="detail-item">
                <span class="detail-label">Member ${mi + 1}</span>
                <span class="detail-val">${esc(m.name)} — ${esc(m.department || '—')}, ${esc(m.yearSem || '—')}<br><a href="tel:${esc(m.contact || m.phone || '')}">${esc(m.contact || m.phone || '—')}</a>${m.email ? `<br><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}`;
    container.appendChild(item);
  });

  const body = document.getElementById('rosterBody');
  body.innerHTML = '';
  participants.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.dataset.pid = p.id;
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><b>${esc(p.name)}</b></td>
      <td>${esc(p.college || 'N/A')}</td>
      <td><span class="type-badge ${p.teamType === 'external' ? 'external' : 'internal'}">${p.teamType === 'external' ? 'External' : 'Internal'}</span></td>
      <td style="white-space:normal;">${membersLine(p, '<br>')}</td>
      <td class="timer-val">${valueDisplay(p)}</td>
      <td><span class="payment-badge ${p.paymentStatus === 'paid' ? 'paid' : 'pending'}">${p.paymentStatus === 'paid' ? `Paid ₹${Number(p.amountPaid || 0).toFixed(0)}` : (p.paymentStatus || 'Not required')}</span></td>
      <td><span class="status-tag ${statusOf(p)}">${statusLabel(p)}</span></td>
      <td class="row-actions">${controlsHtml(p, false)}</td>`;
    body.appendChild(tr);
  });
  renderPodium();
}

async function startTimer(id) {
  const p = participants.find(x => x.id === id);
  p.state = 'running'; p.startTs = Date.now() - (p.timeMs || 0);
  renderRoster();
}
async function stopTimer(id) {
  const p = participants.find(x => x.id === id);
  if (p.state === 'running') {
    p.state = 'finished';
    await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeMs: p.timeMs, state: 'finished' }) });
    renderRoster();
  }
}
async function resetTimer(id) {
  const p = participants.find(x => x.id === id);
  p.state = 'idle'; p.timeMs = 0;
  await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeMs: 0, state: 'idle' }) });
  renderRoster();
}
async function saveScore(id) {
  const p = participants.find(x => x.id === id);
  const input = document.getElementById(`score-${id}`);
  const val = input.value.trim();
  if (val === '') return;
  p.score = Number(val);
  await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: p.score }) });
  renderRoster();
}

function renderPodium() {
  const grid = document.getElementById('podiumGrid');
  grid.innerHTML = '';
  const isScore = activeEvent.type === 'score';
  const ranked = participants
    .filter(p => isScore ? (p.score !== null && p.score !== undefined) : p.state === 'finished')
    .sort((a, b) => isScore ? (b.score - a.score) : (a.timeMs - b.timeMs));
  const card = document.createElement('div');
  card.className = 'panel podium-card';
  card.innerHTML = `
    <h4>Rankings</h4>
    ${ranked.length ? ranked.map((p, i) => `
      <div class="podium-row">
        <span><b>Rank ${i + 1}:</b> ${esc(p.name)} <br><small style="color:var(--slate);">${esc(p.college || 'N/A')}</small></span>
        <span class="timer-val">${isScore ? p.score : formatTime(p.timeMs)}</span>
      </div>`).join('') : '<p style="color:var(--slate);font-size:0.84rem;margin-top:8px;">No completed entries yet.</p>'}`;
  grid.appendChild(card);
}

// ---------- Exports: the server builds a styled .xlsx (colors, borders, ranking) ----------
document.getElementById('exportExcelBtn').addEventListener('click', () => {
  if (!participants.length) return alert('No registered participants to export.');
  window.location.href = `/api/events/${activeEvent.id}/export`;
});
document.getElementById('exportAllBtn').addEventListener('click', () => { window.location.href = '/api/export/all'; });
document.getElementById('exportAllBtn2').addEventListener('click', () => { window.location.href = '/api/export/all'; });

// ---------- Manage Users ----------
async function loadUsersList() {
  try {
    const [{ data: users, error: usersError }, { data: teams, error: teamsError }] =
      await Promise.all([
        supabaseClient.from('users').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('participants').select('*').order('created_at', { ascending: false })
      ]);

    if (usersError) throw usersError;
    if (teamsError) throw teamsError;

    const eventIds = [...new Set((teams || []).map(t => t.event_id).filter(Boolean))];
    let events = [];
    if (eventIds.length) {
      const { data, error } = await supabaseClient
        .from('events')
        .select('id, name')
        .in('id', eventIds);
      if (error) throw error;
      events = data || [];
    }

    const eventMap = Object.fromEntries(events.map(e => [Number(e.id), e.name]));

    const normalizedUsers = (users || []).map(u => ({
      ...u,
      authProvider: u.auth_provider,
      createdAt: u.created_at
    }));

    const normalizedTeams = (teams || []).map(t => ({
      ...t,
      teamName: t.name,
      eventName: eventMap[Number(t.event_id)] || 'Event',
      members: Array.isArray(t.members_json)
        ? t.members_json
        : (t.members_json ? JSON.parse(t.members_json) : []),
      teamType: t.team_type,
      paymentStatus: t.payment_status,
      amountPaid: t.amount_paid,
      transactionId: t.transaction_id,
      paymentScreenshot: t.payment_screenshot,
      paymentScreenshotUrl: t.payment_screenshot_path
    }));

    const members = normalizedUsers.filter(u => u.role === 'member');
    const teamAccounts = normalizedUsers.filter(u => u.role === 'external');

    const memberList = document.getElementById('clubMembersList');
    const accountList = document.getElementById('teamAccountsList');
    const teamList = document.getElementById('registeredTeamsList');

    document.getElementById('clubMemberCount').textContent = members.length;
    document.getElementById('registeredTeamCount').textContent = normalizedTeams.length;
    document.getElementById('teamAccountCount').textContent = teamAccounts.length;
    document.getElementById('registeredTeamListCount').textContent = normalizedTeams.length;

    memberList.innerHTML = members.map(u => `
      <div class="admin-row user-row-enhanced">
        <div>
          <b>${esc(u.name || '')}</b>
          <span>${u.auid ? `AUID ${esc(u.auid)} · ${esc(u.usn || '')}` : esc(u.email || '')}</span>
          <small>${esc(u.department || 'Department not set')} · ${esc(u.college || 'College not set')} · ${esc(u.phone || 'Phone not set')}</small>
        </div>
        ${u.id !== currentUser.id
          ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Remove</button>`
          : '<span class="current-user-badge">YOU</span>'}
      </div>`).join('') || '<p class="empty-users">No club members yet.</p>';

    accountList.innerHTML = teamAccounts.map(u => `
      <div class="admin-row user-row-enhanced">
        <div>
          <b>${esc(u.name || 'Unnamed account')}</b>
          <span>${esc(u.email || 'No email')} · ${u.authProvider === 'google' ? 'Google' : 'Email account'}</span>
          <small>${esc(u.college || 'College not set')} · ${esc(u.phone || 'Phone not set')} · Joined ${esc(u.createdAt || '')}</small>
        </div>
        <div class="user-row-actions">
          <span class="account-provider-badge ${u.authProvider === 'google' ? 'google' : ''}">
            ${u.authProvider === 'google' ? 'GOOGLE' : 'ACCOUNT'}
          </span>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Remove</button>
        </div>
      </div>`).join('') || '<p class="empty-users">No team-registration accounts yet.</p>';

    teamList.innerHTML = normalizedTeams.map(t => {
      const members = Array.isArray(t.members) ? t.members : [];
      const memberText = members.map((m, i) => `${i + 1}. ${m.name || 'Unnamed member'}`).join(', ');
      const paid = Number(t.amountPaid || 0) > 0
        ? `₹${Number(t.amountPaid).toFixed(0)}`
        : (t.paymentStatus === 'submitted_for_verification' ? 'Proof submitted' : (t.paymentStatus === 'paid' ? 'Paid' : 'Not required'));
      const tx = t.transactionId ? esc(t.transactionId) : 'Not provided';
      const proof = (t.paymentScreenshotUrl || t.paymentScreenshot)
        ? `<button type="button" class="btn btn-sm btn-primary" onclick="viewPaymentProof(${Number(t.id)})">View Screenshot</button>`
        : '<span class="payment-missing">No screenshot</span>';

      return `
        <div class="admin-row team-row-enhanced registered-team-card">
          <div class="registered-team-main">
            <div class="registered-team-title"><b>${esc(t.teamName || 'Unnamed team')}</b><span class="team-id-badge">#${esc(t.id)}</span></div>
            <span>${esc(t.eventName || 'Event')} · ${esc(t.college || 'College not provided')} · ${t.teamType === 'external' ? 'External' : 'Internal'}</span>
            <small>${esc(memberText || 'No member details')}</small>
            <div class="payment-verification-card">
              <div><label>PAYMENT STATUS</label><strong>${esc(paid)}</strong></div>
              <div><label>TRANSACTION ID</label><strong class="transaction-value">${tx}</strong></div>
              <div><label>PAYMENT PROOF</label><div>${proof}</div></div>
              <div><label>ACTIONS</label><div><button type="button" class="btn btn-sm btn-danger" onclick="deleteRegisteredTeam(${Number(t.id)})">Remove Team</button></div></div>
            </div>
          </div>
        </div>`;
    }).join('') || '<p class="empty-users">No teams have registered yet.</p>';

  } catch (e) {
    console.error('Could not load users:', e);
    document.getElementById('clubMembersList').innerHTML = `<p class="empty-users">Could not load users: ${esc(e.message)}</p>`;
    document.getElementById('teamAccountsList').innerHTML = '';
    document.getElementById('registeredTeamsList').innerHTML = '';
  }
}

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const password = document.getElementById('uPassword').value;
  const role = document.getElementById('uRole').value;

  if (!name || !email || !password) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const { data: created, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });

    if (authError) throw authError;

    if (!created.user) throw new Error('Could not create the user account.');

    const { error: profileError } = await supabaseClient
      .from('users')
      .update({ name, role })
      .eq('auth_user_id', created.user.id);

    if (profileError) throw profileError;

    document.getElementById('addUserForm').reset();
    alert('User account created successfully.');
    await loadUsersList();

  } catch (e) {
    console.error('Could not add user:', e);
    alert('Could not add user: ' + e.message);
  }
});

async function deleteUser(id) {
  if (!confirm('Remove this user account? This will revoke their portal sign-in access.')) return;

  try {
    const { data: user, error: lookupError } = await supabaseClient
      .from('users')
      .select('id, auth_user_id')
      .eq('id', id)
      .single();

    if (lookupError) throw lookupError;

    if (user.auth_user_id) {
      alert('The user profile can be removed here, but Supabase Auth account deletion requires the server-side Admin API. The profile will be removed now.');
    }

    const { error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadUsersList();

  } catch (e) {
    console.error('Could not remove user:', e);
    alert('Could not remove the user: ' + e.message);
  }
}

// ---------- Settings: cycle code ----------
async function getSetting(key, fallback = null) {
  const { data, error } = await supabaseClient
    .from('settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  if (!data) return fallback;

  const raw = data.value;
  if (raw === null || raw === undefined) return fallback;

  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }
  return raw;
}

async function setSetting(key, value) {
  const payload = {
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value)
  };

  const { error } = await supabaseClient
    .from('settings')
    .upsert(payload, { onConflict: 'key' });

  if (error) throw error;
}

async function loadCycleCode() {
  try {
    const code = await getSetting('cycle_code', '------');
    document.getElementById('cycleCodeDisplay').textContent = String(code || '------').split('').join(' ');
  } catch (e) {
    console.error('Could not load student registration code:', e);
    document.getElementById('cycleCodeDisplay').textContent = '------';
  }
}

document.getElementById('cycleNowBtn').addEventListener('click', async () => {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await setSetting('cycle_code', code);
    document.getElementById('cycleCodeDisplay').textContent = code.split('').join(' ');
    alert('Student registration code updated.');
  } catch (e) {
    console.error('Could not update student registration code:', e);
    alert('Could not update the registration code: ' + e.message);
  }
});

// ---------- Registration control ----------
async function loadRegistrationControl() {
  try {
    const open = await getSetting('registration_open', true);
    const toggle = document.getElementById('registrationOpenToggle');
    if (!toggle) return;
    toggle.checked = open === true || open === 'true';
    document.getElementById('registrationOpenLabel').textContent = toggle.checked ? 'OPEN' : 'CLOSED';
  } catch (e) {
    console.error('Could not load registration status:', e);
  }
}

document.getElementById('registrationOpenToggle').addEventListener('change', async e => {
  const open = e.target.checked;
  try {
    await setSetting('registration_open', open);
    document.getElementById('registrationOpenLabel').textContent = open ? 'OPEN' : 'CLOSED';
  } catch (err) {
    console.error('Could not update registration status:', err);
    e.target.checked = !open;
    alert('Could not update registration status: ' + err.message);
  }
});

// ---------- Contacts ----------
async function loadContacts() {
  const wrap = document.getElementById('contactsAdminList');
  if (!wrap) return;

  try {
    const { data: rows, error } = await supabaseClient
      .from('contacts')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    wrap.innerHTML = (rows || []).map(c => `
      <div class="contact-admin-row">
        <div>
          <b>${esc(c.name || '')}</b>
          <span>${esc(c.role || '')}</span>
          <small>${esc(c.phone || '')} · ${esc(c.email || '')}</small>
        </div>
        <div>
          <button class="btn btn-sm" onclick="editContact(${c.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">Delete</button>
        </div>
      </div>`
    ).join('') || '<p class="panel-hint">No contacts yet.</p>';

    window.contactRows = rows || [];
  } catch (e) {
    console.error('Could not load contacts:', e);
    wrap.innerHTML = `<p class="error show">Could not load contacts: ${esc(e.message)}</p>`;
  }
}

document.getElementById('addContactBtn').onclick = () => {
  document.getElementById('contactModalTitle').textContent = 'Add Contact';
  document.getElementById('contactForm').reset();
  document.getElementById('contactId').value = '';
  document.getElementById('contactModal').classList.remove('hidden');
};

document.getElementById('cancelContact').onclick = () =>
  document.getElementById('contactModal').classList.add('hidden');

window.editContact = id => {
  const c = (window.contactRows || []).find(x => x.id === id);
  if (!c) return;

  document.getElementById('contactModalTitle').textContent = 'Edit Contact';
  document.getElementById('contactId').value = c.id;
  document.getElementById('contactName').value = c.name || '';
  document.getElementById('contactRole').value = c.role || '';
  document.getElementById('contactPhone').value = c.phone || '';
  document.getElementById('contactEmail').value = c.email || '';
  document.getElementById('contactModal').classList.remove('hidden');
};

window.deleteContact = async id => {
  if (!confirm('Delete this contact?')) return;

  const { error } = await supabaseClient
    .from('contacts')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Could not delete contact: ' + error.message);
    return;
  }

  await loadContacts();
};

document.getElementById('contactForm').onsubmit = async e => {
  e.preventDefault();

  const id = document.getElementById('contactId').value;
  const body = {
    name: document.getElementById('contactName').value.trim(),
    role: document.getElementById('contactRole').value.trim(),
    phone: document.getElementById('contactPhone').value.trim(),
    email: document.getElementById('contactEmail').value.trim()
  };

  try {
    let error;

    if (id) {
      ({ error } = await supabaseClient
        .from('contacts')
        .update(body)
        .eq('id', id));
    } else {
      ({ error } = await supabaseClient
        .from('contacts')
        .insert([body]));
    }

    if (error) throw error;

    document.getElementById('contactModal').classList.add('hidden');
    await loadContacts();
  } catch (err) {
    console.error('Could not save contact:', err);
    alert('Could not save contact: ' + err.message);
  }
};

// ---------- Schedule management ----------
let scheduleRows = [];

async function loadScheduleAdmin() {
  try {
    const { data: schedules, error: scheduleError } = await supabaseClient
      .from('schedules')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (scheduleError) {
      throw scheduleError;
    }

    const { data: evs, error: eventError } = await supabaseClient
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (eventError) {
      throw eventError;
    }

    const eventMap = Object.fromEntries(
      (evs || []).map(e => [Number(e.id), e.name])
    );

    scheduleRows = (schedules || []).map(r => ({
      ...r,
      eventId: r.event_id,
      eventName: r.event_id ? (eventMap[Number(r.event_id)] || '') : ''
    }));

    const sel = document.getElementById('scheduleEvent');

    sel.innerHTML =
      '<option value="">General / All Events</option>' +
      (evs || [])
        .map(e => `<option value="${e.id}">${esc(e.name)}</option>`)
        .join('');

    renderScheduleAdmin();

  } catch (e) {
    console.error('Could not load schedule:', e);

    document.getElementById('scheduleAdminList').innerHTML =
      `<p class="error show">Could not load schedule: ${esc(e.message)}</p>`;
  }
}

function formatScheduleDate(v) {
  if (!v) return 'Date TBA';

  const d = new Date(v + 'T00:00:00');

  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
}

function renderScheduleAdmin() {
  const wrap = document.getElementById('scheduleAdminList');

  if (!scheduleRows.length) {
    wrap.innerHTML =
      '<div class="empty-state">No schedule entries yet. Add the first slot for your event.</div>';
    return;
  }

  wrap.innerHTML = scheduleRows.map(r => `
    <div class="schedule-admin-row">
      <div class="schedule-admin-main">
        <div class="schedule-date">
          ${esc(formatScheduleDate(r.date))}
          ${r.time ? ` · ${esc(r.time)}` : ''}
        </div>

        <h3>${esc(r.title)}</h3>

        <p>
          ${r.eventName ? `<b>${esc(r.eventName)}</b> · ` : ''}
          ${esc(r.venue || 'Venue TBA')}
        </p>

        ${r.description ? `<small>${esc(r.description)}</small>` : ''}
      </div>

      <div class="schedule-admin-actions">
        <button class="btn btn-sm" onclick="editSchedule(${r.id})">
          Edit
        </button>

        <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${r.id})">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

const scheduleModal = document.getElementById('scheduleModal');

document.getElementById('addScheduleBtn').addEventListener('click', () => {
  document.getElementById('scheduleModalTitle').textContent = 'Add Schedule';
  document.getElementById('scheduleId').value = '';
  document.getElementById('scheduleForm').reset();
  scheduleModal.classList.remove('hidden');
});

document.getElementById('cancelSchedule').addEventListener('click', () => {
  scheduleModal.classList.add('hidden');
});

window.editSchedule = (id) => {
  const r = scheduleRows.find(x => Number(x.id) === Number(id));

  if (!r) return;

  document.getElementById('scheduleModalTitle').textContent = 'Edit Schedule';
  document.getElementById('scheduleId').value = r.id;
  document.getElementById('scheduleEvent').value = r.eventId || '';
  document.getElementById('scheduleTitle').value = r.title || '';
  document.getElementById('scheduleDate').value = r.date || '';
  document.getElementById('scheduleTime').value = r.time || '';
  document.getElementById('scheduleVenue').value = r.venue || '';
  document.getElementById('scheduleDescription').value = r.description || '';

  scheduleModal.classList.remove('hidden');
};

window.deleteSchedule = async (id) => {
  if (!confirm('Delete this schedule entry?')) return;

  try {
    const { error } = await supabaseClient
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    await loadScheduleAdmin();

  } catch (e) {
    console.error('Could not delete schedule:', e);
    alert('Could not delete schedule: ' + e.message);
  }
};

document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const id = document.getElementById('scheduleId').value;

    const body = {
      event_id: document.getElementById('scheduleEvent').value
        ? Number(document.getElementById('scheduleEvent').value)
        : null,

      title: document.getElementById('scheduleTitle').value.trim(),

      date: document.getElementById('scheduleDate').value,

      time: document.getElementById('scheduleTime').value,

      venue: document.getElementById('scheduleVenue').value.trim(),

      description: document.getElementById('scheduleDescription').value.trim()
    };

    let error;

    if (id) {
      const result = await supabaseClient
        .from('schedules')
        .update(body)
        .eq('id', id);

      error = result.error;

    } else {
      const result = await supabaseClient
        .from('schedules')
        .insert([body]);

      error = result.error;
    }

    if (error) {
      throw error;
    }

    alert(id ? 'Schedule updated successfully.' : 'Schedule added successfully.');

    scheduleModal.classList.add('hidden');

    await loadScheduleAdmin();

  } catch (e) {
    console.error('Could not save schedule:', e);
    alert('Could not save schedule: ' + e.message);
  }
});
// ---------- General Register page ----------
function populateRegisterEventOptions() {
  const sel = document.getElementById('rEvent');
  const open = currentEvents.filter(e => {
    if (e.type !== 'timed' && e.type !== 'score') return false;
    if (!e.assignedUserIds || !e.assignedUserIds.length) return true;
    return currentUser.role === 'admin' || e.assignedUserIds.includes(currentUser.id);
  });
  sel.innerHTML = open.length
    ? open.map(e => `<option value="${e.id}">${esc(e.name)}${e.type === 'score' ? ' (Score)' : ''}</option>`).join('')
    : '<option value="" disabled selected>No events open to you right now</option>';
}

async function loadRegisterTeamsList() {
  const wrap = document.getElementById('registerTeamsList');
  const count = document.getElementById('registerTeamCount');

  if (!wrap) return;

  try {
    const { data: registrations, error: registrationError } =
      await supabaseClient
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

    if (registrationError) {
      throw registrationError;
    }

    const { data: events, error: eventError } =
      await supabaseClient
        .from('events')
        .select('id, name');

    if (eventError) {
      throw eventError;
    }

    const eventMap = Object.fromEntries(
      (events || []).map(e => [Number(e.id), e.name])
    );

    const teams = (registrations || []).map(t => ({
      ...t,
      eventName: eventMap[Number(t.event_id)] || 'Event',
      teamName: t.name,
      members: Array.isArray(t.members_json)
        ? t.members_json
        : (t.members_json ? JSON.parse(t.members_json) : []),
      teamType: t.team_type,
      paymentStatus: t.payment_status,
      amountPaid: t.amount_paid,
      transactionId: t.transaction_id,
      paymentScreenshot: t.payment_screenshot,
      paymentScreenshotUrl: t.payment_screenshot_path
    }));

    count.textContent = teams.length;

    wrap.innerHTML = teams.map(t => {

      const members = Array.isArray(t.members) ? t.members : [];

      const paid =
        Number(t.amountPaid || 0) > 0
          ? `₹${Number(t.amountPaid).toFixed(0)}`
          : (
              t.paymentStatus === 'submitted_for_verification'
                ? 'Proof submitted'
                : (
                    t.paymentStatus === 'paid'
                      ? 'Paid'
                      : 'Not required'
                  )
            );

      const proof =
        (t.paymentScreenshotUrl || t.paymentScreenshot)
          ? `<button type="button"
                class="btn btn-sm btn-primary"
                onclick="viewPaymentProof(${Number(t.id)})">
                View Payment Proof
             </button>`
          : '<span class="payment-missing">No screenshot</span>';

      return `
        <div class="admin-row team-row-enhanced registered-team-card">
          <div class="registered-team-main">

            <div class="registered-team-title">
              <b>${esc(t.teamName || 'Unnamed team')}</b>
              <span class="team-id-badge">#${esc(t.id)}</span>
            </div>

            <span>
              ${esc(t.eventName || 'Event')} ·
              ${esc(t.college || 'College not provided')} ·
              ${t.teamType === 'external' ? 'External' : 'Internal'}
            </span>

            <small>
              ${esc(
                members.map((m, i) =>
                  `${i + 1}. ${m.name || 'Unnamed'}${m.email ? ' · ' + m.email : ''}${m.phone ? ' · ' + m.phone : ''}`
                ).join(' | ') || 'No member details'
              )}
            </small>

            <div class="payment-verification-card">

              <div>
                <label>PAYMENT STATUS</label>
                <strong>${esc(paid)}</strong>
              </div>

              <div>
                <label>TRANSACTION ID</label>
                <strong class="transaction-value">
                  ${esc(t.transactionId || 'Not provided')}
                </strong>
              </div>
              <div>
                <label>PAYMENT PROOF</label>
                <div>${proof}</div>
              </div>
              <div>
                <label>ACTIONS</label>
                <div>
                  <button type="button" class="btn btn-sm btn-danger" onclick="deleteRegisteredTeam(${Number(t.id)})">Remove Team</button>
                </div>
              </div>

            </div>

          </div>
        </div>
      `;
    }).join('') ||
      '<p class="empty-users">No teams have registered through the public portal yet.</p>';

  } catch (e) {

    console.error('Could not load registered teams:', e);

    count.textContent = '0';

    wrap.innerHTML =
      `<p class="empty-users">
        Could not load registered teams: ${esc(e.message)}
      </p>`;
  }
}

function memberRowHtml(i) {
  return `
    <div class="member-block" data-idx="${i}">
      <h4>Member ${i + 1}${i < 2 ? '' : ' (optional)'}</h4>
      <div class="reg-grid">
        <div class="field"><label>Name</label><input type="text" class="mName" ${i < 2 ? 'required' : ''}></div>
        <div class="field"><label>Department</label><input type="text" class="mDept" ${i < 2 ? 'required' : ''}></div>
        <div class="field"><label>Year / Sem</label>
          <select class="mYear" ${i < 2 ? 'required' : ''}>
            <option value="" disabled selected>Select…</option>
            <option>1st Year / Sem 1</option><option>1st Year / Sem 2</option>
            <option>2nd Year / Sem 3</option><option>2nd Year / Sem 4</option>
            <option>3rd Year / Sem 5</option><option>3rd Year / Sem 6</option>
            <option>4th Year / Sem 7</option><option>4th Year / Sem 8</option>
          </select>
        </div>
        <div class="field"><label>Contact number</label><input type="tel" class="mContact" ${i < 2 ? 'required' : ''}></div>
      </div>
    </div>`;
}

function buildMemberRows(count) {
  memberRowCount = Math.max(2, Math.min(4, count));
  const wrap = document.getElementById('membersWrap');
  wrap.innerHTML = '';
  for (let i = 0; i < memberRowCount; i++) wrap.insertAdjacentHTML('beforeend', memberRowHtml(i));
  document.getElementById('addMemberBtn').disabled = memberRowCount >= 4;
  document.getElementById('removeMemberBtn').disabled = memberRowCount <= 2;
}
document.getElementById('addMemberBtn').addEventListener('click', () => buildMemberRows(memberRowCount + 1));
document.getElementById('removeMemberBtn').addEventListener('click', () => buildMemberRows(memberRowCount - 1));

document.querySelectorAll('.team-type-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.team-type-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rTeamType').value = btn.dataset.type;
  });
});

document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('regFormError');
  const ok = document.getElementById('regFormSuccess');
  err.classList.remove('show'); ok.classList.add('hidden');

  const eventId = document.getElementById('rEvent').value;
  const teamName = document.getElementById('rTeamName').value.trim();
  const college = document.getElementById('rCollege').value.trim();
  if (!eventId) { err.textContent = 'Choose an event to register for.'; err.classList.add('show'); return; }
  const chosenEvent = currentEvents.find(ev => String(ev.id) === String(eventId));
  const autoClass = (chosenEvent && chosenEvent.classes && chosenEvent.classes.length) ? chosenEvent.classes[0] : 'General';

  const blocks = Array.from(document.querySelectorAll('#membersWrap .member-block'));
  const members = [];
  for (const b of blocks) {
    const name = b.querySelector('.mName').value.trim();
    const department = b.querySelector('.mDept').value.trim();
    const yearSem = b.querySelector('.mYear').value;
    const contact = b.querySelector('.mContact').value.trim();
    if (name || department || yearSem || contact) members.push({ name, department, yearSem, contact });
  }
  if (members.length < 2) { err.textContent = 'Enter at least 2 team members.'; err.classList.add('show'); return; }
  for (const m of members) {
    if (!m.name || !m.department || !m.yearSem || !m.contact) {
      err.textContent = 'Fill in every field for each member you added.'; err.classList.add('show'); return;
    }
  }

  const teamType = document.getElementById('rTeamType').value;
  const { error: registrationError } = await supabaseClient
  .from('participants')
  .insert([{
    event_id: Number(eventId),
    name: teamName,
    college: college,
    members_json: members,
    cls: autoClass,
    team_type: teamType
  }]);

if (registrationError) {
  console.error('Team registration error:', registrationError);
  err.textContent =
    registrationError.message || 'Could not register team.';
  err.classList.add('show');
  return;
}

  ok.classList.remove('hidden');
  document.getElementById('rTeamName').value = '';
  document.querySelectorAll('.team-type-opt').forEach(b => b.classList.toggle('active', b.dataset.type === 'internal'));
  document.getElementById('rTeamType').value = 'internal';
  buildMemberRows(2);
  if (currentUser.role === 'admin') loadEvents();
});

document.getElementById('exportTeamTypeBtn').addEventListener('click', () => {
  window.location.href = '/api/export/teams-by-type';
});

// ---------- Event timer / roster ----------
async function openEvent(id) {
  activeEvent = currentEvents.find(e => e.id === id);
  document.getElementById('timerEventName').textContent = activeEvent.name;
  document.getElementById('timerEventDesc').textContent = activeEvent.description;
  document.getElementById('valueColHeader').textContent = activeEvent.type === 'score' ? 'Score' : 'Time';
  goToPage('timer');
  await loadParticipants();
  if (timerInterval) clearInterval(timerInterval);
  if (activeEvent.type === 'timed') timerInterval = setInterval(tick, 100);
}
document.getElementById('backToEvents').addEventListener('click', () => goToPage('events'));

async function loadParticipants() {
  const res = await fetch(`/api/events/${activeEvent.id}/participants`);
  participants = await res.json();
  if (participants.length > 0 && !activeExpandedTeamId) activeExpandedTeamId = participants[0].id;
  renderRoster();
}

function formatTime(ms) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function tick() {
  participants.forEach(p => {
    if (p.state === 'running') {
      p.timeMs = Date.now() - p.startTs;
      const bigTimerEl = document.querySelector(`.big-timer-val[data-pid="${p.id}"]`);
      if (bigTimerEl) bigTimerEl.textContent = formatTime(p.timeMs);
      const el = document.querySelector(`tr[data-pid="${p.id}"] .timer-val`);
      if (el) el.textContent = formatTime(p.timeMs);
      const badgeEl = document.querySelector(`.list-timer-val[data-pid="${p.id}"]`);
      if (badgeEl) badgeEl.textContent = formatTime(p.timeMs);
    }
  });
}

function toggleTeamExpand(id) { activeExpandedTeamId = activeExpandedTeamId === id ? null : id; renderRoster(); }

function membersLine(p, sep) {
  const list = (p.members && p.members.length) ? p.members : [{ name: p.name, department: p.dept, yearSem: p.yearSem, contact: p.contact }];
  return list.map(m => `${m.name || ''} (${m.department || '—'}, ${m.yearSem || '—'}) — ${m.contact || m.phone || '—'}${m.email ? ` — ${m.email}` : ''}`).join(sep);
}

function statusOf(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? 'finished' : 'idle';
  return p.state;
}
function statusLabel(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? 'scored' : 'pending';
  return p.state;
}
function valueDisplay(p) {
  if (activeEvent.type === 'score') return (p.score !== null && p.score !== undefined) ? String(p.score) : '—';
  return formatTime(p.timeMs || 0);
}

function controlsHtml(p, big) {
  const cls = big ? 'btn-touch' : 'btn-sm';
  if (activeEvent.type === 'score') {
    return `
      <div class="score-input-row">
        <input type="number" class="score-input ${big ? 'score-input-big' : ''}" id="score-${p.id}" value="${p.score ?? ''}" placeholder="Score">
        <button class="btn ${cls} btn-success" title="Save score" aria-label="Save score" onclick="saveScore(${p.id})">&#10003;</button>
      </div>`;
  }
  return `
    <button class="btn ${cls} btn-success" title="Start" aria-label="Start" onclick="startTimer(${p.id})">&#9654;</button>
    <button class="btn ${cls} btn-stop" title="Stop" aria-label="Stop" onclick="stopTimer(${p.id})">&#9632;</button>
    <button class="btn ${cls} btn-reset" title="Reset" aria-label="Reset" onclick="resetTimer(${p.id})">&#8635;</button>`;
}

function renderRoster() {
  document.getElementById('totalCount').textContent = participants.length;
  const container = document.getElementById('teamListContainer');
  container.innerHTML = '';

  participants.forEach((p, i) => {
    const isExpanded = p.id === activeExpandedTeamId;
    const members = (p.members && p.members.length) ? p.members : [{ name: p.name, department: p.dept, yearSem: p.yearSem, contact: p.contact }];
    const item = document.createElement('div');
    item.className = `team-card ${isExpanded ? 'expanded' : ''}`;
    item.innerHTML = `
      <div class="team-header" onclick="toggleTeamExpand(${p.id})">
        <div class="team-header-main">
          <span class="team-rank">#${i + 1}</span>
          <div>
            <div class="team-title">${esc(p.name)}</div>
            <div class="team-sub">${esc(p.college || 'N/A')} • ${members.length} member${members.length > 1 ? 's' : ''} • <span class="type-badge ${p.teamType === 'external' ? 'external' : 'internal'}">${p.teamType === 'external' ? 'External' : 'Internal'}</span></div>
          </div>
        </div>
        <div class="team-header-right">
          <span class="list-timer-val timer-val" data-pid="${p.id}">${valueDisplay(p)}</span>
          <span class="status-tag ${statusOf(p)}">${statusLabel(p)}</span>
          <span class="chevron">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      ${isExpanded ? `
        <div class="team-details-pane">
          <div class="timer-box">
            <span class="big-timer-val" data-pid="${p.id}">${valueDisplay(p)}</span>
            <div class="timer-touch-controls">${controlsHtml(p, true)}</div>
          </div>
          <div class="details-grid">
            ${members.map((m, mi) => `
              <div class="detail-item">
                <span class="detail-label">Member ${mi + 1}</span>
                <span class="detail-val">${esc(m.name)} — ${esc(m.department || '—')}, ${esc(m.yearSem || '—')}<br><a href="tel:${esc(m.contact || m.phone || '')}">${esc(m.contact || m.phone || '—')}</a>${m.email ? `<br><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}`;
    container.appendChild(item);
  });

  const body = document.getElementById('rosterBody');
  body.innerHTML = '';
  participants.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.dataset.pid = p.id;
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><b>${esc(p.name)}</b></td>
      <td>${esc(p.college || 'N/A')}</td>
      <td><span class="type-badge ${p.teamType === 'external' ? 'external' : 'internal'}">${p.teamType === 'external' ? 'External' : 'Internal'}</span></td>
      <td style="white-space:normal;">${membersLine(p, '<br>')}</td>
      <td class="timer-val">${valueDisplay(p)}</td>
      <td><span class="payment-badge ${p.paymentStatus === 'paid' ? 'paid' : 'pending'}">${p.paymentStatus === 'paid' ? `Paid ₹${Number(p.amountPaid || 0).toFixed(0)}` : (p.paymentStatus || 'Not required')}</span></td>
      <td><span class="status-tag ${statusOf(p)}">${statusLabel(p)}</span></td>
      <td class="row-actions">${controlsHtml(p, false)}</td>`;
    body.appendChild(tr);
  });
  renderPodium();
}

async function startTimer(id) {
  const p = participants.find(x => x.id === id);
  p.state = 'running'; p.startTs = Date.now() - (p.timeMs || 0);
  renderRoster();
}
async function stopTimer(id) {
  const p = participants.find(x => x.id === id);
  if (p.state === 'running') {
    p.state = 'finished';
    await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeMs: p.timeMs, state: 'finished' }) });
    renderRoster();
  }
}
async function resetTimer(id) {
  const p = participants.find(x => x.id === id);
  p.state = 'idle'; p.timeMs = 0;
  await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeMs: 0, state: 'idle' }) });
  renderRoster();
}
async function saveScore(id) {
  const p = participants.find(x => x.id === id);
  const input = document.getElementById(`score-${id}`);
  const val = input.value.trim();
  if (val === '') return;
  p.score = Number(val);
  await fetch(`/api/participants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: p.score }) });
  renderRoster();
}

function renderPodium() {
  const grid = document.getElementById('podiumGrid');
  grid.innerHTML = '';
  const isScore = activeEvent.type === 'score';
  const ranked = participants
    .filter(p => isScore ? (p.score !== null && p.score !== undefined) : p.state === 'finished')
    .sort((a, b) => isScore ? (b.score - a.score) : (a.timeMs - b.timeMs));
  const card = document.createElement('div');
  card.className = 'panel podium-card';
  card.innerHTML = `
    <h4>Rankings</h4>
    ${ranked.length ? ranked.map((p, i) => `
      <div class="podium-row">
        <span><b>Rank ${i + 1}:</b> ${esc(p.name)} <br><small style="color:var(--slate);">${esc(p.college || 'N/A')}</small></span>
        <span class="timer-val">${isScore ? p.score : formatTime(p.timeMs)}</span>
      </div>`).join('') : '<p style="color:var(--slate);font-size:0.84rem;margin-top:8px;">No completed entries yet.</p>'}`;
  grid.appendChild(card);
}

// ---------- Exports: the server builds a styled .xlsx (colors, borders, ranking) ----------
document.getElementById('exportExcelBtn').addEventListener('click', () => {
  if (!participants.length) return alert('No registered participants to export.');
  window.location.href = `/api/events/${activeEvent.id}/export`;
});
document.getElementById('exportAllBtn').addEventListener('click', () => { window.location.href = '/api/export/all'; });
document.getElementById('exportAllBtn2').addEventListener('click', () => { window.location.href = '/api/export/all'; });

// ---------- Manage Users ----------
async function loadUsersList() {
  try {
    const [{ data: users, error: usersError }, { data: teams, error: teamsError }] =
      await Promise.all([
        supabaseClient.from('users').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('participants').select('*').order('created_at', { ascending: false })
      ]);

    if (usersError) throw usersError;
    if (teamsError) throw teamsError;

    const eventIds = [...new Set((teams || []).map(t => t.event_id).filter(Boolean))];
    let events = [];
    if (eventIds.length) {
      const { data, error } = await supabaseClient
        .from('events')
        .select('id, name')
        .in('id', eventIds);
      if (error) throw error;
      events = data || [];
    }

    const eventMap = Object.fromEntries(events.map(e => [Number(e.id), e.name]));

    const normalizedUsers = (users || []).map(u => ({
      ...u,
      authProvider: u.auth_provider,
      createdAt: u.created_at
    }));

    const normalizedTeams = (teams || []).map(t => ({
      ...t,
      teamName: t.name,
      eventName: eventMap[Number(t.event_id)] || 'Event',
      members: Array.isArray(t.members_json)
        ? t.members_json
        : (t.members_json ? JSON.parse(t.members_json) : []),
      teamType: t.team_type,
      paymentStatus: t.payment_status,
      amountPaid: t.amount_paid,
      transactionId: t.transaction_id,
      paymentScreenshot: t.payment_screenshot,
      paymentScreenshotUrl: t.payment_screenshot_path
    }));

    const members = normalizedUsers.filter(u => u.role === 'member');
    const teamAccounts = normalizedUsers.filter(u => u.role === 'external');

    const memberList = document.getElementById('clubMembersList');
    const accountList = document.getElementById('teamAccountsList');
    const teamList = document.getElementById('registeredTeamsList');

    document.getElementById('clubMemberCount').textContent = members.length;
    document.getElementById('registeredTeamCount').textContent = normalizedTeams.length;
    document.getElementById('teamAccountCount').textContent = teamAccounts.length;
    document.getElementById('registeredTeamListCount').textContent = normalizedTeams.length;

    memberList.innerHTML = members.map(u => `
      <div class="admin-row user-row-enhanced">
        <div>
          <b>${esc(u.name || '')}</b>
          <span>${u.auid ? `AUID ${esc(u.auid)} · ${esc(u.usn || '')}` : esc(u.email || '')}</span>
          <small>${esc(u.department || 'Department not set')} · ${esc(u.college || 'College not set')} · ${esc(u.phone || 'Phone not set')}</small>
        </div>
        ${u.id !== currentUser.id
          ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Remove</button>`
          : '<span class="current-user-badge">YOU</span>'}
      </div>`).join('') || '<p class="empty-users">No club members yet.</p>';

    accountList.innerHTML = teamAccounts.map(u => `
      <div class="admin-row user-row-enhanced">
        <div>
          <b>${esc(u.name || 'Unnamed account')}</b>
          <span>${esc(u.email || 'No email')} · ${u.authProvider === 'google' ? 'Google' : 'Email account'}</span>
          <small>${esc(u.college || 'College not set')} · ${esc(u.phone || 'Phone not set')} · Joined ${esc(u.createdAt || '')}</small>
        </div>
        <div class="user-row-actions">
          <span class="account-provider-badge ${u.authProvider === 'google' ? 'google' : ''}">
            ${u.authProvider === 'google' ? 'GOOGLE' : 'ACCOUNT'}
          </span>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Remove</button>
        </div>
      </div>`).join('') || '<p class="empty-users">No team-registration accounts yet.</p>';

    teamList.innerHTML = normalizedTeams.map(t => {
      const members = Array.isArray(t.members) ? t.members : [];
      const memberText = members.map((m, i) => `${i + 1}. ${m.name || 'Unnamed member'}`).join(', ');
      const paid = Number(t.amountPaid || 0) > 0
        ? `₹${Number(t.amountPaid).toFixed(0)}`
        : (t.paymentStatus === 'submitted_for_verification' ? 'Proof submitted' : (t.paymentStatus === 'paid' ? 'Paid' : 'Not required'));
      const tx = t.transactionId ? esc(t.transactionId) : 'Not provided';
      const proof = (t.paymentScreenshotUrl || t.paymentScreenshot)
        ? `<button type="button" class="btn btn-sm btn-primary" onclick="viewPaymentProof(${Number(t.id)})">View Screenshot</button>`
        : '<span class="payment-missing">No screenshot</span>';

      return `
        <div class="admin-row team-row-enhanced registered-team-card">
          <div class="registered-team-main">
            <div class="registered-team-title"><b>${esc(t.teamName || 'Unnamed team')}</b><span class="team-id-badge">#${esc(t.id)}</span></div>
            <span>${esc(t.eventName || 'Event')} · ${esc(t.college || 'College not provided')} · ${t.teamType === 'external' ? 'External' : 'Internal'}</span>
            <small>${esc(memberText || 'No member details')}</small>
            <div class="payment-verification-card">
              <div><label>PAYMENT STATUS</label><strong>${esc(paid)}</strong></div>
              <div><label>TRANSACTION ID</label><strong class="transaction-value">${tx}</strong></div>
              <div><label>PAYMENT PROOF</label><div>${proof}</div></div>
              <div><label>ACTIONS</label><div><button type="button" class="btn btn-sm btn-danger" onclick="deleteRegisteredTeam(${Number(t.id)})">Remove Team</button></div></div>
            </div>
          </div>
        </div>`;
    }).join('') || '<p class="empty-users">No teams have registered yet.</p>';

  } catch (e) {
    console.error('Could not load users:', e);
    document.getElementById('clubMembersList').innerHTML = `<p class="empty-users">Could not load users: ${esc(e.message)}</p>`;
    document.getElementById('teamAccountsList').innerHTML = '';
    document.getElementById('registeredTeamsList').innerHTML = '';
  }
}

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const password = document.getElementById('uPassword').value;
  const role = document.getElementById('uRole').value;

  if (!name || !email || !password) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const { data: created, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });

    if (authError) throw authError;

    if (!created.user) throw new Error('Could not create the user account.');

    const { error: profileError } = await supabaseClient
      .from('users')
      .update({ name, role })
      .eq('auth_user_id', created.user.id);

    if (profileError) throw profileError;

    document.getElementById('addUserForm').reset();
    alert('User account created successfully.');
    await loadUsersList();

  } catch (e) {
    console.error('Could not add user:', e);
    alert('Could not add user: ' + e.message);
  }
});

async function deleteUser(id) {
  if (!confirm('Remove this user account? This will revoke their portal sign-in access.')) return;

  try {
    const { data: user, error: lookupError } = await supabaseClient
      .from('users')
      .select('id, auth_user_id')
      .eq('id', id)
      .single();

    if (lookupError) throw lookupError;

    if (user.auth_user_id) {
      alert('The user profile can be removed here, but Supabase Auth account deletion requires the server-side Admin API. The profile will be removed now.');
    }

    const { error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadUsersList();

  } catch (e) {
    console.error('Could not remove user:', e);
    alert('Could not remove the user: ' + e.message);
  }
}


