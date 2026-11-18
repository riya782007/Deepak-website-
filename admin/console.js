// Soft Binomials operations console. Rendering and workflows live here;
// storage comes from a backend: store-demo.js (browser only) or store-aws.js (live).
import {RESOURCE_KINDS,ACCEPT,embedUrl,thumbUrl,kindForType,fileSize,safeHttp} from '../src/media.js';
let BACKEND;
export function startConsole(backend){
BACKEND=backend;

/* ---------- constants ---------- */
const COLS = ['enquiries','students','programmes','batches','trainers','payments','payouts','engagements','resources'];
const WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ST = {
  enquiries:['New','Contacted','Counselling','Converted','Lost'],
  trainers:['Applied','Screening','Demo session','Approved','Active','Inactive'],
  students:['Active','On hold','Completed','Dropped'],
  batches:['Upcoming','Running','Completed','Cancelled'],
  engagements:['Proposal sent','Confirmed','Delivered','Invoiced','Paid','Lost'],
  payouts:['Due','Paid']
};
const SK = {enquiries:'stage',trainers:'stage',students:'status',batches:'status',engagements:'status',payouts:'status'};
const TRACKS = ['IT course','Corporate workshop','Student service','Personal development','HR consulting'];
const KINDS = ['Student course','Corporate training','Student services','Personal development','HR consulting','Technology project','Trainer application'];
const SOURCES = ['Website','Walk-in','Phone call','WhatsApp','Referral','JustDial','Social media','Corporate client','Other'];
const MODES = ['UPI','Cash','Bank transfer','Cheque','Card'];
const TONE = {New:'info',Contacted:'acc',Counselling:'peach',Converted:'good',Lost:'',
  Applied:'info','Demo session':'peach',Screening:'acc',Approved:'warn',Active:'good',Inactive:'',
  'On hold':'warn',Completed:'info',Dropped:'',Upcoming:'info',Running:'good',Cancelled:'',
  'Proposal sent':'info',Confirmed:'acc',Delivered:'peach',Invoiced:'warn',Paid:'good',Due:'warn',Overdue:'bad'};
const STAGE_COLOR = ['var(--sky-ink)','var(--accent)','var(--peach-ink)','var(--amber-ink)','var(--good)','var(--faint)'];
const TRAINER_DOCS = ['CV','PAN','Aadhaar','Bank details','Signed agreement','Demo video'];
const STUDENT_DOCS = ['Admission form','ID proof','Photo','Marksheet'];

const F = {
  resources:[
    {k:'title',l:'Title',req:1,wide:1},{k:'kind',l:'Type',t:'select',o:RESOURCE_KINDS},{k:'category',l:'Category',hint:'e.g. Brochures, Workshops, News, Student guides',list:'rcats'},
    {k:'summary',l:'Short description',t:'textarea',wide:1,hint:'One or two lines shown on the website card.'},
    {k:'file',l:'File',t:'file',wide:1},
    {k:'url',l:'Or a link',t:'url',wide:1,hint:'YouTube or Vimeo link for videos, or any web page.'},
    {k:'body',l:'Full text (for updates)',t:'textarea',wide:1,rows:5},
    {k:'date',l:'Date shown',t:'date'},{k:'published',l:'Show on the website',t:'toggle'},{k:'pinned',l:'Pin to the top',t:'toggle'}],
  enquiries:[
    {k:'name',l:'Full name',req:1},{k:'phone',l:'Mobile',t:'tel',req:1},{k:'email',l:'Email',t:'email'},
    {k:'kind',l:'Enquiry for',t:'select',o:KINDS},{k:'programmeId',l:'Programme of interest',t:'programme'},
    {k:'source',l:'Source',t:'select',o:SOURCES},{k:'stage',l:'Stage',t:'select',o:ST.enquiries},
    {k:'centre',l:'Centre',t:'centre'},{k:'followUp',l:'Next follow-up',t:'date'},
    {k:'notes',l:'Notes',t:'textarea'}],
  students:[
    {k:'name',l:'Student name',req:1},{k:'phone',l:'Mobile',t:'tel',req:1},{k:'email',l:'Email',t:'email'},
    {k:'education',l:'School / college / qualification'},{k:'guardian',l:'Parent or guardian'},{k:'guardianPhone',l:'Parent mobile',t:'tel'},
    {k:'programmeId',l:'Programme',t:'programme',req:1},{k:'batchId',l:'Batch',t:'batch'},
    {k:'centre',l:'Centre',t:'centre'},{k:'joinedOn',l:'Admission date',t:'date'},
    {k:'feeTotal',l:'Course fee (₹)',t:'number'},{k:'discount',l:'Discount (₹)',t:'number'},
    {k:'nextDue',l:'Next instalment due',t:'date'},{k:'status',l:'Status',t:'select',o:ST.students},
    {k:'docs',l:'Documents received',t:'checks',o:STUDENT_DOCS},{k:'notes',l:'Notes',t:'textarea'}],
  trainers:[
    {k:'name',l:'Trainer name',req:1},{k:'phone',l:'Mobile',t:'tel',req:1},{k:'email',l:'Email',t:'email'},
    {k:'city',l:'City'},{k:'expertise',l:'Topics they teach',t:'tags',hint:'Separate with commas, e.g. Tally, Leadership, Public speaking'},
    {k:'experience',l:'Years of experience',t:'number'},{k:'rateType',l:'Paid',t:'select',o:['Per day','Per hour','Per session','Per batch']},
    {k:'rate',l:'Rate (₹)',t:'number'},{k:'stage',l:'Stage',t:'select',o:ST.trainers},{k:'rating',l:'Rating out of 5',t:'number',step:'0.1'},
    {k:'docs',l:'Documents received',t:'checks',o:TRAINER_DOCS},{k:'notes',l:'Notes (demo feedback, availability)',t:'textarea'}],
  programmes:[
    {k:'name',l:'Programme name',req:1,wide:1},{k:'track',l:'Track',t:'select',o:TRACKS},{k:'duration',l:'Duration',hint:'e.g. 3 months, 2 days'},
    {k:'fee',l:'Standard fee (₹)',t:'number'},{k:'mode',l:'Mode',t:'select',o:['Classroom','Online','On-site at client','Hybrid']},
    {k:'description',l:'Short description',t:'textarea'}],
  batches:[
    {k:'code',l:'Batch name',req:1,hint:'e.g. MSCIT-NOV26-MORNING'},{k:'programmeId',l:'Programme',t:'programme',req:1},
    {k:'trainerId',l:'Trainer',t:'trainer'},{k:'centre',l:'Centre',t:'centre'},
    {k:'start',l:'Start date',t:'date'},{k:'end',l:'End date',t:'date'},
    {k:'days',l:'Class days',t:'days'},{k:'time',l:'Timing',hint:'e.g. 10:00–12:00'},
    {k:'capacity',l:'Seats',t:'number'},{k:'status',l:'Status',t:'select',o:ST.batches}],
  engagements:[
    {k:'client',l:'Company / institution',req:1},{k:'contact',l:'Contact person'},{k:'contactPhone',l:'Contact mobile',t:'tel'},
    {k:'programmeId',l:'Workshop',t:'programme'},{k:'trainerId',l:'Trainer',t:'trainer'},{k:'start',l:'First day',t:'date'},
    {k:'days',l:'Number of days',t:'number'},{k:'participants',l:'Participants',t:'number'},{k:'venue',l:'Venue'},
    {k:'fee',l:'Fee before GST (₹)',t:'number'},{k:'gst',l:'GST %',t:'number'},{k:'status',l:'Status',t:'select',o:ST.engagements},
    {k:'invoiceNo',l:'Invoice number'},{k:'feedback',l:'Average feedback out of 5',t:'number',step:'0.1'},{k:'notes',l:'Notes (pre/post test, action plans)',t:'textarea'}],
  payments:[
    {k:'studentId',l:'Student',t:'student',req:1,wide:1},{k:'amount',l:'Amount (₹)',t:'number',req:1},{k:'date',l:'Date',t:'date',req:1},
    {k:'mode',l:'Paid by',t:'select',o:MODES},{k:'ref',l:'UPI / cheque reference'},{k:'note',l:'Note',t:'textarea'}],
  payouts:[
    {k:'trainerId',l:'Trainer',t:'trainer',req:1,wide:1},{k:'forWhat',l:'For',wide:1,hint:'Batch or workshop'},
    {k:'amount',l:'Amount (₹)',t:'number',req:1},{k:'date',l:'Date',t:'date'},{k:'status',l:'Status',t:'select',o:ST.payouts},{k:'ref',l:'Payment reference'}]
};
const NOUN = {resources:'resource',enquiries:'enquiry',students:'student',programmes:'programme',batches:'batch',trainers:'trainer',payments:'payment',payouts:'trainer payout',engagements:'corporate workshop'};

// [key, title, tagline, icon, menu group, eyebrow]. Menu groups run from daily work to occasional setup.
const VIEWS = [
  ['home','Today','What needs attention right now',ic('M3 11.5 12 4l9 7.5M5 10v10h14V10'),'Daily work','Your daily pulse'],
  ['enquiries','Enquiries','Every lead from first call to admission',ic('M4 5h16v11H8l-4 4zM8 9h8M8 12h5'),'Daily work','From first call to admission'],
  ['students','Students','Admissions, fees, attendance and documents',ic('M12 4 2 9l10 5 10-5zM6 11v5c3 3 9 3 12 0v-5'),'Daily work','Learners and their progress'],
  ['batches','Batches','Classes, trainers and attendance',ic('M4 6h16v14H4zM4 10h16M9 3v5M15 3v5'),'Daily work','Classes in session'],
  ['fees','Fees & payouts','Collections, dues and trainer payments',ic('M3 7h18v12H3zM16 13h2M3 10h18'),'Money & people','Money in, money out'],
  ['trainers','Trainers','Onboarding pipeline, documents and payouts',ic('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6'),'Money & people','The people who teach'],
  ['corporate','Corporate','Workshops sold to companies and institutions',ic('M3 8h18v12H3zM9 8V5h6v3M3 13h18'),'Money & people','Training for organisations'],
  ['resources','Resources','PDFs, videos, images and updates shown on the website',ic('M4 4h10l6 6v10H4zM14 4v6h6M8 14h8M8 17h5'),'Website','Shared on your website'],
  ['reports','Reports','Collections, conversions and trends',ic('M4 20V10M10 20V4M16 20v-7M22 20H2'),'Insights & setup','How the business is doing'],
  ['programmes','Programmes','Courses, workshops and services you offer',ic('M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4'),'Insights & setup','What you offer'],
  ['setup','Setup','Organisation details, team and data',ic('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 7 7 6 5 10l2 1v2l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4-2-1z'),'Insights & setup','Your organisation']
];
const GROUPS=['Daily work','Money & people','Website','Insights & setup'];
const ICON={
  bell:'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  cal:'M4 6h16v14H4zM4 10h16M9 3v5M15 3v5',rupee:'M6 4h12M6 9h12M14 20 7 13h2a4 4 0 0 0 0-9',due:'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  brief:'M3 8h18v12H3zM9 8V5h6v3M3 13h18',spark:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  ext:'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon:'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  out:'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',chev:'m6 9 6 6 6-6'};
const svgI=k=>ic(ICON[k]);
function ic(d){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`}

/* ---------- state ---------- */
const S = {config:{orgName:'Soft Binomials India',centres:['Nagpur','Mumbai','Online','Client site']}};
COLS.forEach(c=>S[c]=[]);
const M = {};
let DB=null, RO=false, LOADED=false, CONNECTED=null, MODE='demo', ROLE='owner';
let view='home', Q='';
const FL = {resources:{kind:'All'},students:{status:'Active',fee:'All',prog:''},enquiries:{kind:'All'},batches:{status:'Open'},corporate:{status:'All'},fees:{tab:'collections',month:'All'}};
let D=null;            // drawer state {mode,kind,id,...}
let ATT=null;          // attendance draft {batchId,date,set:Set}
let IMP=null;          // import state

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inr=n=>'₹'+Math.round(+n||0).toLocaleString('en-IN');
const isoOf=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>isoOf(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return isoOf(d)};
const fmtD=s=>s?new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const fmtS=s=>s?new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—';
const mon=s=>s?s.slice(0,7):'';
const monLabel=k=>new Date(k+'-01T00:00:00').toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
const digits=p=>String(p||'').replace(/\D/g,'');
const last10=p=>digits(p).slice(-10);
const rnd=n=>Array.from({length:n},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const pill=(t,tone)=>`<span class="pill ${tone??TONE[t]??''}">${esc(t)}</span>`;
const smp=d=>d&&d.sample?'<span class="sample">Sample</span>':'';
const prog=id=>M.programmes?.get(id), trn=id=>M.trainers?.get(id), bat=id=>M.batches?.get(id), stu=id=>M.students?.get(id);
const pname=id=>prog(id)?.name||'—';
const match=(o,...keys)=>{if(!Q)return true;const q=Q.toLowerCase();return keys.some(k=>String(Array.isArray(o[k])?o[k].join(' '):o[k]??'').toLowerCase().includes(q))||digits(Q)&&digits(Q).length>3&&digits(o.phone).includes(digits(Q))};
function wa(phone,msg){let d=digits(phone);if(d.length===10)d='91'+d;return d?`https://wa.me/${d}?text=${encodeURIComponent(msg)}`:null}
function waBtn(phone,msg,label='WhatsApp'){const u=wa(phone,msg);return u?`<a class="btn sm wa" href="${esc(u)}" target="_blank" rel="noopener">${ic('M4 20l1.3-4A8 8 0 1 1 8 18.7z')}${label}</a>`:''}
const org=()=>S.config.orgName||'Soft Binomials India';

function fin(s){
  const net=Math.max(0,(+s.feeTotal||0)-(+s.discount||0));
  const paid=S.payments.filter(p=>p.studentId===s.id).reduce((a,p)=>a+(+p.amount||0),0);
  const due=Math.max(0,net-paid);
  const state=due<=0?'Paid':(s.nextDue&&s.nextDue<today()?'Overdue':'Due');
  const now_=due>0&&!!s.nextDue&&s.nextDue<=today();
  return {net,paid,due,state,now:now_};
}
function attOf(s){
  const b=bat(s.batchId);const days=Object.keys(b?.attendance||{});
  if(!days.length)return null;
  const present=days.filter(d=>(b.attendance[d]||[]).includes(s.id)).length;
  return {present,total:days.length,pct:Math.round(present*100/days.length)};
}
const engTotal=e=>(+e.fee||0)*(1+(+e.gst||0)/100);
function enrolled(b){return S.students.filter(s=>s.batchId===b.id&&s.status!=='Dropped')}

function words(n){
  n=Math.round(n);if(!n)return 'Zero';
  const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:'');
  const three=x=>(x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');
  const out=[];const cr=Math.floor(n/1e7);n%=1e7;const la=Math.floor(n/1e5);n%=1e5;const th=Math.floor(n/1e3);n%=1e3;
  if(cr)out.push(words(cr)+' Crore');if(la)out.push(two(la)+' Lakh');if(th)out.push(two(th)+' Thousand');if(n)out.push(three(n));
  return out.join(' ');
}

let toastT;
function toast(msg,kind){const t=$('#toast');t.textContent=msg;t.className=kind||'';t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
function errMsg(e){const c=e&&e.code;return c==='invalid_argument'?'Your role doesn’t allow this change. Ask the owner to update your role in Setup.':c==='quota_exceeded'?'Storage is full. Remove old records, then try again.':c==='resource_exhausted'?'Too many changes at once. Wait a moment and try again.':'Couldn’t save. Check your connection and try again.'}
async function W(fn,ok){
  if(!DB){toast('Not connected to the database yet.','bad');return false}
  try{await fn();if(ok)toast(ok);return true}catch(e){console.error(e);toast(errMsg(e),'bad');return false}
}
const now=()=>Date.now();
const add=(c,d)=>DB.collection(c).add({...d,createdAt:now(),updatedAt:now()});
const upd=(c,id,d)=>DB.collection(c).doc(id).update({...d,updatedAt:now()});
const del=(c,id)=>DB.collection(c).doc(id).delete();

/* ---------- data connection ---------- */
async function connect(){
  const b=BACKEND;DB=b.db;CONNECTED=true;MODE=b.mode;ROLE=b.role||'owner';
  const nm=b.review?'Reviewer':b.mode==='demo'?'Demo user':(b.me&&b.me.name)||'Signed in';
  const ini=nm.split(/[\s@.]+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')||'SB';
  $('#me').innerHTML=`<details class="menu"><summary class="me" aria-label="Account menu"><span class="avatar">${esc(ini)}</span><span class="who"><b>${esc(nm)}</b><small>${esc(b.review?'Review copy':b.mode==='demo'?'Demo':ROLE[0].toUpperCase()+ROLE.slice(1))}</small></span>${ic(ICON.chev).replace('<svg','<svg style="width:14px;height:14px;color:var(--faint)"')}</summary>
    <div class="pop"><div class="lbl">${esc(b.me&&b.me.email||nm)}</div><button data-a="theme">${svgI('moon')}<span>Switch theme</span></button><a href="${esc(siteUrl())}" target="_blank" rel="noopener">${svgI('globe')}<span>Visit website</span></a>${b.signOut?`<hr><button data-a="signout">${svgI('out')}<span>Sign out</span></button>`:''}</div></details>`;
  $('#liveDot').className='live'+(b.mode==='demo'?' demo':'');$('#liveDot').title=b.mode==='demo'?'Sample data in this browser':'Connected';
  $('#footNote').textContent=b.mode==='demo'?'Sample data · saved in this browser only':'Changes save automatically';
  if(ROLE==='viewer'){RO=true;document.body.classList.add('ro')}
  if(!['admin','owner'].includes(ROLE))document.body.classList.add('nodel');
  const db=DB;
  let pending=COLS.length+1;
  const done=()=>{if(--pending===0){LOADED=true}schedule()};
  COLS.forEach(c=>{let first=true;db.collection(c).onSnapshot(snap=>{S[c]=snap.docs.map(d=>({id:d.id,...d.data()}));if(first){first=false;done()}else schedule()},e=>{console.error(c,e);if(first){first=false;done()}})});
  let first=true;
  db.doc('config/main').onSnapshot(d=>{if(d.exists)S.config={...S.config,...d.data()};if(first){first=false;done()}else schedule()},()=>{if(first){first=false;done()}});
}
let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;COLS.forEach(c=>M[c]=new Map(S[c].map(d=>[d.id,d])));render();if(D&&D.mode==='detail')drawDetail()})}

/* ---------- shell ---------- */
function siteUrl(){return S.config.websiteUrl||(location.origin+'/')}
function nav(){
  const fu=S.enquiries.filter(e=>e.followUp&&e.followUp<=today()&&!['Converted','Lost'].includes(e.stage)).length;
  const live=(S.resources||[]).filter(r=>r.published).length;
  $('#nav').innerHTML=GROUPS.map(g=>`<div class="grp">${g}</div>`+VIEWS.filter(v=>v[4]===g).map(([k,t,,svg])=>`<a href="#${k}" ${k===view?'aria-current="page"':''}>${svg}<span>${t}</span>${k==='enquiries'&&fu?`<span class="cnt" title="Follow-ups due">${fu}</span>`:''}${k==='resources'&&live?`<span class="cnt" style="background:var(--mint);color:var(--mint-ink)" title="Published on the website">${live}</span>`:''}</a>`).join('')
    +(g==='Website'?`<a href="${esc(siteUrl())}" target="_blank" rel="noopener" data-a="extlink">${svgI('globe')}<span>Visit website</span>${ic(ICON.ext).replace('<svg','<svg class="ext"')}</a>`:'')).join('');
}
function banners(){
  const out=[];
  const strip=$('#strip');
  if(MODE==='demo'){strip.hidden=false;strip.innerHTML=BACKEND.review
    ?`<span class="live demo" style="margin:0"></span><span><b>Review copy.</b> Every name and number is sample data, saved only in your browser. Try anything; nothing is sent anywhere.</span><span class="sp"></span><button class="btn sm" data-a="resetdemo">Start over</button>`
    :`<span class="live demo" style="margin:0"></span><span><b>Demo mode.</b> Example records kept only in this browser.</span><span class="sp"></span><button class="btn sm" data-a="resetdemo">Reset demo data</button>`}
  else strip.hidden=true;
  if(CONNECTED&&!LOADED)out.push(`<div class="banner info">Loading records…</div>`);
  if(RO)out.push(`<div class="banner info">You can view records but not change them. Ask the owner to change your role in Setup.</div>`);
  const ns=COLS.reduce((a,c)=>a+S[c].filter(d=>d.sample).length,0);
  if(ns&&!BACKEND.review)out.push(`<div class="banner"><span>${ns} records marked <span class="sample">Sample</span> are examples to show how the console works. Remove them from Setup before you start entering real data.</span><a class="btn sm w" href="#setup">Go to Setup</a></div>`);
  $('#banners').innerHTML=out.join('');
}
function render(){
  const v=VIEWS.find(x=>x[0]===view)||VIEWS[0];
  $('#vt').textContent=v[1];$('#crumb span').textContent=v[4];$('#eyebrow').textContent=v[5];
  if(view==='home'){const h=new Date().getHours();const first=((BACKEND.me&&BACKEND.me.name)||'').split(/[\s@]/)[0];
    $('#vh').textContent=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}${first&&!BACKEND.review&&MODE!=='demo'?', '+first:''}.`;
    $('#vs').textContent=`${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · Here’s what needs you today.`}
  else{$('#vh').textContent=v[1];$('#vs').textContent=v[2]}
  document.title=`${v[1]} · ${BACKEND.review?'Admin console (review copy)':'Soft Binomials Console'}`;
  if(S.config.orgName)$('#orgName').textContent=S.config.orgName;
  const cen=(S.config.centres||[]).filter(c=>!/online|client/i.test(c));if(cen.length)$('#orgSub').textContent=cen.slice(0,3).join(' · ');
  nav();banners();
  const fn={resources:vResources,home:vHome,enquiries:vEnquiries,students:vStudents,batches:vBatches,trainers:vTrainers,corporate:vCorporate,fees:vFees,programmes:vProgrammes,reports:vReports,setup:vSetup}[view]||vHome;
  $('#view').innerHTML=fn();
  if(view==='setup'&&BACKEND.team)loadTeam();
  if(view==='setup'&&BACKEND.audit)loadAudit();
}
const ACT={insert:'added',update:'changed',delete:'deleted'};
function auditLabel(e){
  let d={};try{d=JSON.parse(e.after||e.before||'{}')}catch{}
  const noun=NOUN[e.coll]||e.coll;
  const what=e.coll==='payments'||e.coll==='payouts'?[d.amount&&inr(d.amount),d.receiptNo].filter(Boolean).join(' · '):d.name||d.client||d.title||'';
  return `${ACT[e.action]||e.action} ${noun}${what?` <b>${esc(String(what))}</b>`:''}`;
}
async function loadAudit(){
  const box=$('#auditList');if(!box)return;
  try{
    const rows=(await BACKEND.audit.list()).slice(0,40);
    box.innerHTML=rows.length?`<div class="list">${rows.map(e=>`<div class="row"><div class="main"><span style="color:var(--ink)">${auditLabel(e)}</span><span>${esc(e.email||'Website')} · ${esc(new Date(e.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}))}</span></div></div>`).join('')}</div>`:'<p class="empty">No changes yet. Edits to students, fees, payouts, trainers and corporate workshops will be listed here.</p>';
  }catch(e){console.error(e);box.innerHTML='<p class="empty">Couldn’t load recent changes.</p>'}
}
const ROLE_LABEL={pending:'No access',viewer:'Viewer',staff:'Staff',admin:'Admin',owner:'Owner'};
async function loadTeam(){
  const box=$('#teamList');if(!box)return;
  try{
    const rows=await BACKEND.team.list();const owner=ROLE==='owner';
    const invite=owner&&BACKEND.team.invite?`<form id="inviteForm" class="invite" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;align-items:end;margin-top:14px">
      <label class="fld"><span>Email</span><input name="email" type="email" required autocomplete="off"></label>
      <label class="fld"><span>Name</span><input name="name" type="text" autocomplete="off"></label>
      <label class="fld"><span>Role</span><select name="role">${['staff','viewer','admin','owner'].map(x=>`<option value="${x}">${ROLE_LABEL[x]}</option>`).join('')}</select></label>
      <button class="btn pri" type="submit">Invite</button></form>
      <p style="margin:8px 0 0;font-size:12.5px;color:var(--muted)">They get an email with a temporary password and choose their own when they first sign in. Pick <b>No access</b> to switch someone off.</p>`:'';
    box.innerHTML=`<div class="list">${rows.map(r=>`<div class="row"><div class="main"><b>${esc(r.name||r.email)}</b><span>${esc(r.email)}${r.invited?' · invited, not signed in yet':''}</span></div><div class="side-act">${owner&&r.user_id!==BACKEND.me.id?`<select class="inline" data-a="setrole" data-id="${esc(r.user_id)}" aria-label="Role for ${esc(r.email)}">${['pending','viewer','staff','admin','owner'].map(x=>`<option value="${x}" ${r.role===x?'selected':''}>${ROLE_LABEL[x]}</option>`).join('')}</select>`:pill(ROLE_LABEL[r.role]||r.role,r.role==='pending'?'warn':'acc')}</div></div>`).join('')}</div>${invite}`;
    const f=$('#inviteForm');
    if(f)f.addEventListener('submit',async ev=>{ev.preventDefault();const btn=f.querySelector('button');btn.disabled=true;const v=Object.fromEntries(new FormData(f));
      try{const r=await BACKEND.team.invite(v.email.trim(),v.name.trim(),v.role);if(r&&r.ok===false){toast(r.error,'bad');btn.disabled=false;return}toast(`Invitation sent to ${v.email.trim()}`);loadTeam()}
      catch(e){toast(e&&e.message?e.message:'Couldn’t send the invitation.','bad');btn.disabled=false}});
  }catch(e){console.error(e);box.innerHTML='<p class="empty">Couldn’t load the team list.</p>'}
}
function route(){const h=location.hash.slice(1);view=VIEWS.some(v=>v[0]===h)?h:'home';Q='';$('#q').value='';render();window.scrollTo(0,0)}

/* ---------- views ---------- */
function kpi(l,v,s,href,alert,icon){return `<a class="kpi ${alert?'alert':''}" href="#${href}"><span class="l">${l}${icon?`<span class="ic">${svgI(icon)}</span>`:''}</span><span class="v">${v}</span><span class="s">${s}</span></a>`}
const TOUR=[
  ['enquiries','Follow up a lead','Open Enquiries, move a card to the next stage, then convert one into an admission.'],
  ['students','Collect a fee','Open a student, record a payment and download the PDF receipt.'],
  ['batches','Take attendance','Open a running batch, tick who came today and save.'],
  ['trainers','Onboard a trainer','Move a trainer through the pipeline and tick off their documents.'],
  ['corporate','Bill a workshop','Open a corporate workshop and download its proforma invoice.'],
  ['fees','Chase dues','See who owes what, copy the reminder list, record a trainer payout.'],
  ['reports','Check the numbers','Monthly collections, enquiry conversions and outstanding fees.'],
  ['setup','Bring in your Excel','Use Import on Enquiries, Students or Trainers with one of your own sheets.']];
const TOUR_KEY='sb-review-tour-hidden';
function tourHidden(){try{return localStorage.getItem(TOUR_KEY)==='1'}catch{return false}}
function tourCard(){if(tourHidden())return '';return `<section class="card" id="tour"><div class="card-h"><h2>Try these, about 10 minutes</h2><button class="btn sm ghost" data-a="hidetour">Hide</button></div><p style="margin:0 0 12px;color:var(--muted)">This copy is filled with sample students, trainers and workshops so you can see a normal working day. Each step opens the right page.</p>
  <ol style="margin:0;padding-left:20px;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${TOUR.map(([v,t,d])=>`<li><a href="#${v}" style="font-weight:700">${t}</a><br><span style="color:var(--muted);font-size:13px">${d}</span></li>`).join('')}</ol></section>`}
function vHome(){
  const t=today();
  const fu=S.enquiries.filter(e=>e.followUp&&e.followUp<=t&&!['Converted','Lost'].includes(e.stage)).sort((a,b)=>a.followUp.localeCompare(b.followUp));
  const openEnq=S.enquiries.filter(e=>!['Converted','Lost'].includes(e.stage)).length;
  const active=S.students.filter(s=>s.status==='Active');
  const running=S.batches.filter(b=>b.status==='Running');
  const m=mon(t);
  const coll=S.payments.filter(p=>mon(p.date)===m).reduce((a,p)=>a+(+p.amount||0),0);
  const dues=S.students.filter(s=>['Active','On hold'].includes(s.status)).map(s=>({s,f:fin(s)})).filter(x=>x.f.due>0);
  const outstanding=dues.reduce((a,x)=>a+x.f.due,0);
  const overdue=dues.filter(x=>x.f.now).sort((a,b)=>(a.s.nextDue||'').localeCompare(b.s.nextDue||''));
  const ws=S.engagements.filter(e=>e.start&&e.start>=t&&e.start<=addDays(t,30)&&!['Lost'].includes(e.status)).sort((a,b)=>a.start.localeCompare(b.start));
  const dow=DOW[new Date().getDay()];
  const todays=running.filter(b=>(b.days||[]).includes(dow));
  const pipe=ST.trainers.slice(0,4).map(st=>[st,S.trainers.filter(x=>x.stage===st).length]);
  const docsPending=S.trainers.filter(x=>['Approved','Active'].includes(x.stage)&&TRAINER_DOCS.filter(d=>!(x.docs||[]).includes(d)).length);
  const recent=[...S.payments].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5);
  const tr=S.trainers.length;
  const focus=[];
  if(fu.length)focus.push(`<b>${fu.length} follow-up${fu.length===1?'':'s'}</b> waiting${fu[0]?`, starting with ${esc(fu[0].name)}`:''}`);
  if(overdue.length)focus.push(`<b>${inr(overdue.reduce((a,x)=>a+x.f.due,0))}</b> in fees due from ${overdue.length} student${overdue.length===1?'':'s'}`);
  if(todays.length)focus.push(`<b>${todays.length} class${todays.length===1?'':'es'}</b> to mark attendance for`);
  if(ws[0])focus.push(`next workshop is <b>${esc(ws[0].client)}</b> on ${fmtS(ws[0].start)}`);
  const focusText=focus.length?focus.slice(0,3).join(' · ')+'.':'Nothing urgent today. A good moment to call last month’s enquiries or import your Excel sheets.';
  return `<div class="grid" style="gap:20px">${BACKEND.review?tourCard():''}
  <section class="insight"><span class="spark">${svgI('spark')}</span><div><small>Today’s focus</small><p>${focusText}</p></div></section>
  <div class="kpis">
    ${kpi('Follow-ups due',fu.length,`${openEnq} open enquiries`,'enquiries',fu.length>0,'bell')}
    ${kpi('Active students',active.length,`${S.students.length} on record`,'students',false,'users')}
    ${kpi('Running batches',running.length,`${todays.length} class${todays.length===1?'':'es'} today`,'batches',false,'cal')}
    ${kpi('Collected',inr(coll),`${new Date().toLocaleDateString('en-IN',{month:'long'})} so far`,'fees',false,'rupee')}
    ${kpi('Fees outstanding',inr(outstanding),`${overdue.length} due now`,'fees',overdue.length>0,'due')}
    ${kpi('Workshops ahead',ws.length,`next 30 days · ${S.engagements.filter(e=>['Confirmed','Proposal sent'].includes(e.status)).length} in pipeline`,'corporate',false,'brief')}
  </div>
  <div class="toolbar w" style="gap:10px"><span style="font-size:12px;color:var(--faint);margin-right:4px">Make it happen</span>
    <button class="btn" data-a="new" data-k="enquiries">+ Enquiry</button><button class="btn" data-a="new" data-k="students">+ Admission</button><button class="btn" data-a="new" data-k="resources">+ Website resource</button><span class="sp"></span><button class="btn pri" data-a="new" data-k="payments">Record fee payment</button></div>
  <div class="grid g2">
    <section class="card"><div class="card-h"><h2>Follow-ups due</h2><a class="more" href="#enquiries">All enquiries</a></div>
      <div class="list">${fu.slice(0,6).map(e=>`<div class="row"><button class="linkrow" data-a="open" data-k="enquiries" data-id="${e.id}"><div class="main"><b>${esc(e.name)}${smp(e)}</b><span>${esc(pname(e.programmeId)!=='—'?pname(e.programmeId):e.kind||'')} · ${esc(e.source||'')} · <span class="${e.followUp<t?'late':''}">${e.followUp<t?'Overdue since '+fmtS(e.followUp):'Today'}</span></span></div></button><div class="side-act">${waBtn(e.phone,followMsg(e),'Message')}<button class="btn sm w" data-a="contacted" data-id="${e.id}">Done</button></div></div>`).join('')||`<p class="empty">No follow-ups due. New enquiries from the website, calls and walk-ins appear in Enquiries.</p>`}</div></section>
    <section class="card"><div class="card-h"><h2>Fees due today or overdue</h2><a class="more" href="#fees" data-a="feestab" data-v="dues">All dues</a></div>
      <div class="list">${overdue.slice(0,6).map(({s,f})=>`<div class="row"><button class="linkrow" data-a="open" data-k="students" data-id="${s.id}"><div class="main"><b>${esc(s.name)}${smp(s)}</b><span>${esc(pname(s.programmeId))} · due ${fmtS(s.nextDue)}</span></div></button><div class="side-act"><b class="money">${inr(f.due)}</b>${waBtn(s.phone,feeMsg(s,f),'Remind')}</div></div>`).join('')||`<p class="empty">No fees due right now. Set “Next instalment due” on a student to track their instalments here.</p>`}</div></section>
    <section class="card"><div class="card-h"><h2>Today’s classes</h2><a class="more" href="#batches">All batches</a></div>
      <div class="list">${todays.map(b=>`<div class="row"><button class="linkrow" data-a="open" data-k="batches" data-id="${b.id}"><div class="main"><b>${esc(b.code)}${smp(b)}</b><span>${esc(b.time||'')} · ${esc(trn(b.trainerId)?.name||'No trainer')} · ${esc(b.centre||'')}</span></div></button><div class="side-act">${(b.attendance||{})[t]?pill('Marked','good'):`<button class="btn sm w" data-a="open" data-k="batches" data-id="${b.id}">Take attendance</button>`}</div></div>`).join('')||`<p class="empty">No classes scheduled for ${dow}. Batches with ${dow} in their class days show here.</p>`}</div></section>
    <section class="card"><div class="card-h"><h2>Trainer onboarding</h2><a class="more" href="#trainers">Pipeline</a></div>
      ${tr?`<div class="stagebar">${pipe.map(([st,n],i)=>n?`<i style="width:${n*100/Math.max(1,pipe.reduce((a,x)=>a+x[1],0))}%;background:${STAGE_COLOR[i]}" title="${st}: ${n}"></i>`:'').join('')}</div>
      <div class="legend">${pipe.map(([st,n],i)=>`<span><i style="background:${STAGE_COLOR[i]}"></i>${st} ${n}</span>`).join('')}</div>`:''}
      <div class="list" style="margin-top:8px">${docsPending.slice(0,4).map(x=>`<div class="row"><button class="linkrow" data-a="open" data-k="trainers" data-id="${x.id}"><div class="main"><b>${esc(x.name)}${smp(x)}</b><span>Missing: ${TRAINER_DOCS.filter(d=>!(x.docs||[]).includes(d)).join(', ')}</span></div></button></div>`).join('')||`<p class="empty">${tr?'Every approved trainer has all documents on file.':'Add trainer applications to track screening, demo sessions and documents.'}</p>`}</div></section>
    <section class="card"><div class="card-h"><h2>Corporate workshops, next 30 days</h2><a class="more" href="#corporate">All workshops</a></div>
      <div class="list">${ws.map(e=>`<div class="row"><button class="linkrow" data-a="open" data-k="engagements" data-id="${e.id}"><div class="main"><b>${esc(e.client)}${smp(e)}</b><span>${esc(pname(e.programmeId))} · ${fmtS(e.start)} · ${esc(trn(e.trainerId)?.name||'Trainer not assigned')}</span></div></button><div class="side-act">${pill(e.status)}</div></div>`).join('')||`<p class="empty">No workshops in the next 30 days.</p>`}</div></section>
    <section class="card"><div class="card-h"><h2>Latest payments</h2><a class="more" href="#fees">Collections</a></div>
      <div class="list">${recent.map(p=>{const s=stu(p.studentId);return `<div class="row"><button class="linkrow" data-a="open" data-k="students" data-id="${p.studentId}"><div class="main"><b>${esc(s?.name||'Unknown student')}${smp(p)}</b><span>${fmtS(p.date)} · ${esc(p.mode||'')} · <span class="mono">${esc(p.receiptNo||'')}</span></span></div></button><div class="side-act"><b class="money">${inr(p.amount)}</b></div></div>`}).join('')||`<p class="empty">No payments yet. Use “Record fee payment” to log one and download its receipt.</p>`}</div></section>
  </div></div>`;
}
function followMsg(e){return `Hello ${e.name?.split(' ')[0]||''}, thank you for your interest in ${pname(e.programmeId)!=='—'?pname(e.programmeId):'our programmes'} at ${org()}. When would be a good time to talk about batch timings and fees?`}
function feeMsg(s,f){return `Dear ${s.name}, this is a gentle reminder that ${inr(f.due)} is pending for ${pname(s.programmeId)} at ${org()}${s.nextDue?`, due on ${fmtD(s.nextDue)}`:''}. You can pay by UPI or at the centre. Thank you.`}

function chips(group,key,opts,counts){return `<div class="chips" role="group">${opts.map(o=>`<button class="chip" data-a="filter" data-g="${group}" data-f="${key}" data-v="${esc(o)}" aria-pressed="${FL[group][key]===o}">${esc(o)}${counts?` <span class="c">${counts[o]??0}</span>`:''}</button>`).join('')}</div>`}
function ioBtns(k){return `<button class="btn sm w" data-a="import" data-k="${k}">${ic('M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3')}Import from Excel</button><button class="btn sm" data-a="export" data-k="${k}">${ic('M12 15V3m0 0-4 4m4-4 4 4M4 17v3h16v-3')}Export</button>`}

function vEnquiries(){
  const kinds=['All',...KINDS];
  const list=S.enquiries.filter(e=>(FL.enquiries.kind==='All'||e.kind===FL.enquiries.kind)&&match(e,'name','phone','email','notes','source','kind'));
  const t=today();
  const counts={All:S.enquiries.length};KINDS.forEach(k=>counts[k]=S.enquiries.filter(e=>e.kind===k).length);
  if(!S.enquiries.length&&LOADED)return emptyBig('No enquiries yet','Log calls, walk-ins and website enquiries here, or import your existing enquiry sheet from Excel.','enquiries');
  return `<div class="grid" style="gap:14px"><div class="toolbar">${chips('enquiries','kind',kinds,counts)}<span class="sp"></span>${ioBtns('enquiries')}<button class="btn sm pri w" data-a="new" data-k="enquiries">+ Enquiry</button></div>
  <div class="board">${ST.enquiries.map(st=>{const items=list.filter(e=>(e.stage||'New')===st).sort((a,b)=>(a.followUp||'9').localeCompare(b.followUp||'9'));return `<section class="col" aria-label="${st}"><div class="col-h">${pill(st)}<span class="c">${items.length}</span></div>
    ${items.map(e=>`<button class="tcard" data-a="open" data-k="enquiries" data-id="${e.id}"><b>${esc(e.name)}${smp(e)}</b><span class="meta">${esc(pname(e.programmeId)!=='—'?pname(e.programmeId):e.kind||'')}</span><span class="foot"><span class="tag">${esc(e.source||'—')}</span>${e.followUp&&!['Converted','Lost'].includes(st)?`<span class="meta ${e.followUp<t?'late':''}">Follow up ${e.followUp===t?'today':fmtS(e.followUp)}</span>`:''}</span></button>`).join('')||'<p class="empty" style="padding:6px">None</p>'}</section>`}).join('')}</div></div>`;
}
function emptyBig(title,text,k){return `<div class="empty-big"><b>${title}</b><p style="margin:0;max-width:56ch">${text}</p><div class="acts w"><button class="btn pri" data-a="new" data-k="${k}">+ Add ${NOUN[k]}</button>${['students','enquiries','trainers'].includes(k)?`<button class="btn" data-a="import" data-k="${k}">Import from Excel</button>`:''}</div></div>`}

function vStudents(){
  if(!S.students.length&&LOADED)return emptyBig('No students yet','Add admissions one by one, convert them from Enquiries, or import your current student register from Excel.','students');
  const f=FL.students;
  const rows=S.students.map(s=>({s,f:fin(s),a:attOf(s)})).filter(({s,f:fi})=>(f.status==='All'||s.status===f.status)&&(f.fee==='All'||fi.state===f.fee)&&(!f.prog||s.programmeId===f.prog)&&match(s,'name','phone','email','code','guardian','education'));
  const sc={All:S.students.length};ST.students.forEach(x=>sc[x]=S.students.filter(s=>s.status===x).length);
  const tot=rows.reduce((a,r)=>({net:a.net+r.f.net,paid:a.paid+r.f.paid,due:a.due+r.f.due}),{net:0,paid:0,due:0});
  return `<div class="grid" style="gap:14px"><div class="toolbar">${chips('students','status',[...ST.students,'All'],sc)}<span class="sp"></span>${ioBtns('students')}<button class="btn sm pri w" data-a="new" data-k="students">+ Admission</button></div>
  <div class="toolbar">${chips('students','fee',['All','Due','Overdue','Paid'])}<select class="inline" data-a="progfilter" aria-label="Programme"><option value="">All programmes</option>${S.programmes.map(p=>`<option value="${p.id}" ${f.prog===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><span class="sp"></span><span style="color:var(--muted);font-size:13px">${rows.length} student${rows.length===1?'':'s'}</span></div>
  <div class="tbl"><table><thead><tr><th>Student</th><th>Programme · batch</th><th>Status</th><th class="n">Fee</th><th class="n">Paid</th><th class="n">Balance</th><th>Attendance</th></tr></thead><tbody>
  ${rows.map(({s,f:fi,a})=>`<tr data-a="open" data-k="students" data-id="${s.id}"><td><b>${esc(s.name)}</b>${smp(s)}<span class="sub mono">${esc(s.code||'')} · ${esc(s.phone||'')}</span></td><td>${esc(pname(s.programmeId))}<span class="sub">${esc(bat(s.batchId)?.code||'No batch')}</span></td><td>${pill(s.status||'Active')}</td><td class="n">${inr(fi.net)}</td><td class="n">${inr(fi.paid)}</td><td class="n">${fi.due>0?`${inr(fi.due)}<span class="sub">${pill(fi.state)}</span>`:pill('Paid')}</td><td>${a?`${a.pct}%<span class="sub">${a.present}/${a.total} classes</span>`:'<span class="sub">—</span>'}</td></tr>`).join('')||`<tr><td colspan="7" class="empty">No students match these filters.</td></tr>`}
  </tbody>${rows.length?`<tfoot><tr><td colspan="3">Total</td><td class="n">${inr(tot.net)}</td><td class="n">${inr(tot.paid)}</td><td class="n">${inr(tot.due)}</td><td></td></tr></tfoot>`:''}</table></div></div>`;
}

function vBatches(){
  if(!S.batches.length&&LOADED)return emptyBig('No batches yet','Create a batch for each class group: programme, trainer, days, timing and seats. Then take attendance in one tap per class.','batches');
  const f=FL.batches.status;
  const list=S.batches.filter(b=>(f==='All'||(f==='Open'?['Upcoming','Running'].includes(b.status):b.status===f))&&match(b,'code','centre','time')).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  return `<div class="grid" style="gap:14px"><div class="toolbar">${chips('batches','status',['Open','Running','Upcoming','Completed','All'])}<span class="sp"></span><button class="btn sm" data-a="export" data-k="batches">Export</button><button class="btn sm pri w" data-a="new" data-k="batches">+ Batch</button></div>
  <div class="bcards">${list.map(b=>{const n=enrolled(b).length,cap=+b.capacity||0;const sess=Object.keys(b.attendance||{}).length;return `<button class="bcard" data-a="open" data-k="batches" data-id="${b.id}">
    <div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;min-width:0"><h3>${esc(b.code)}${smp(b)}</h3><span style="color:var(--muted);font-size:13px">${esc(pname(b.programmeId))}</span></div>${pill(b.status||'Upcoming')}</div>
    <dl class="kv"><dt>Trainer</dt><dd>${esc(trn(b.trainerId)?.name||'Not assigned')}</dd><dt>When</dt><dd>${esc((b.days||[]).join(', ')||'—')} · ${esc(b.time||'')}</dd><dt>Dates</dt><dd>${fmtS(b.start)} – ${fmtD(b.end)}</dd><dt>Centre</dt><dd>${esc(b.centre||'—')}</dd></dl>
    <div><div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-bottom:5px"><span>${n}${cap?` of ${cap}`:''} seats filled</span><span>${sess} class${sess===1?'':'es'} held</span></div><div class="bar"><i style="width:${cap?Math.min(100,n*100/cap):n?100:0}%"></i></div></div></button>`}).join('')||'<p class="empty">No batches match.</p>'}</div></div>`;
}

function vTrainers(){
  if(!S.trainers.length&&LOADED)return emptyBig('No trainers yet','Add trainer applications as they come in. Move each one from screening to a demo session to approval, and track their documents and payouts.','trainers');
  const list=S.trainers.filter(x=>match(x,'name','phone','email','city','expertise','notes'));
  return `<div class="grid" style="gap:14px"><div class="toolbar"><span style="color:var(--muted)">Search by topic to find who can teach it, e.g. “Tally” or “Leadership”.</span><span class="sp"></span>${ioBtns('trainers')}<button class="btn sm pri w" data-a="new" data-k="trainers">+ Trainer</button></div>
  <div class="board">${ST.trainers.map(st=>{const items=list.filter(x=>(x.stage||'Applied')===st);return `<section class="col" aria-label="${st}"><div class="col-h">${pill(st)}<span class="c">${items.length}</span></div>
  ${items.map(x=>{const have=(x.docs||[]).length;return `<button class="tcard" data-a="open" data-k="trainers" data-id="${x.id}"><b>${esc(x.name)}${smp(x)}</b><span class="meta">${(x.expertise||[]).slice(0,3).map(e=>`<span class="tag">${esc(e)}</span>`).join('')}</span><span class="foot"><span class="meta">${x.rate?`${inr(x.rate)} ${esc((x.rateType||'').toLowerCase())}`:'Rate not set'}</span><span class="meta" style="margin-left:auto">${have}/${TRAINER_DOCS.length} docs</span></span></button>`}).join('')||'<p class="empty" style="padding:6px">None</p>'}</section>`}).join('')}</div></div>`;
}

function vCorporate(){
  if(!S.engagements.length&&LOADED)return emptyBig('No corporate workshops yet','Track each workshop from proposal to payment: client, programme, trainer, days, participants, fee and feedback. Download a proforma invoice in one click.','engagements');
  const f=FL.corporate.status;
  const list=S.engagements.filter(e=>(f==='All'||e.status===f)&&match(e,'client','contact','venue','invoiceNo')).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
  const y=today().slice(0,4);
  const pipeline=S.engagements.filter(e=>['Proposal sent','Confirmed'].includes(e.status)).reduce((a,e)=>a+engTotal(e),0);
  const delivered=S.engagements.filter(e=>['Delivered','Invoiced','Paid'].includes(e.status)&&(e.start||'').startsWith(y)).reduce((a,e)=>a+engTotal(e),0);
  const unpaid=S.engagements.filter(e=>['Delivered','Invoiced'].includes(e.status)).reduce((a,e)=>a+engTotal(e),0);
  const fb=S.engagements.filter(e=>+e.feedback);const avg=fb.length?(fb.reduce((a,e)=>a+(+e.feedback),0)/fb.length).toFixed(1):'—';
  return `<div class="grid" style="gap:14px"><div class="kpis k4">
    <div class="kpi"><span class="l">Pipeline (incl. GST)</span><span class="v">${inr(pipeline)}</span><span class="s">Proposals and confirmed</span></div>
    <div class="kpi"><span class="l">Delivered in ${y}</span><span class="v">${inr(delivered)}</span><span class="s">Delivered, invoiced or paid</span></div>
    <div class="kpi ${unpaid?'alert':''}"><span class="l">Awaiting payment</span><span class="v">${inr(unpaid)}</span><span class="s">Delivered or invoiced</span></div>
    <div class="kpi"><span class="l">Average feedback</span><span class="v">${avg}</span><span class="s">out of 5, ${fb.length} workshop${fb.length===1?'':'s'}</span></div></div>
  <div class="toolbar">${chips('corporate','status',['All',...ST.engagements])}<span class="sp"></span><button class="btn sm" data-a="export" data-k="engagements">Export</button><button class="btn sm pri w" data-a="new" data-k="engagements">+ Workshop</button></div>
  <div class="tbl"><table><thead><tr><th>Client</th><th>Workshop</th><th>Dates</th><th>Trainer</th><th class="n">People</th><th class="n">Value incl. GST</th><th>Status</th></tr></thead><tbody>
  ${list.map(e=>`<tr data-a="open" data-k="engagements" data-id="${e.id}"><td><b>${esc(e.client)}</b>${smp(e)}<span class="sub">${esc(e.contact||'')}</span></td><td>${esc(pname(e.programmeId))}</td><td>${fmtS(e.start)}<span class="sub">${e.days?`${e.days} day${+e.days===1?'':'s'}`:''}</span></td><td>${esc(trn(e.trainerId)?.name||'—')}</td><td class="n">${esc(e.participants||'—')}</td><td class="n">${inr(engTotal(e))}</td><td>${pill(e.status||'Proposal sent')}</td></tr>`).join('')||`<tr><td colspan="7" class="empty">No workshops match.</td></tr>`}
  </tbody></table></div></div>`;
}

function vFees(){
  const tab=FL.fees.tab;
  const tabs=`<div class="tabs" role="tablist">${[['collections','Collections'],['dues','Dues'],['payouts','Trainer payouts']].map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" data-a="feestab" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body='';
  if(tab==='collections'){
    const months=[...new Set(S.payments.map(p=>mon(p.date)).filter(Boolean))].sort().reverse();
    const m=FL.fees.month;
    const list=S.payments.filter(p=>(m==='All'||mon(p.date)===m)).filter(p=>{const s=stu(p.studentId)||{};return match({...p,name:s.name,phone:s.phone},'name','phone','receiptNo','ref','mode')}).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const total=list.reduce((a,p)=>a+(+p.amount||0),0);
    const byMode=MODES.map(md=>[md,list.filter(p=>p.mode===md).reduce((a,p)=>a+(+p.amount||0),0)]).filter(x=>x[1]);
    body=`<div class="toolbar"><select class="inline" data-a="monthfilter" aria-label="Month"><option value="All">All months</option>${months.map(k=>`<option value="${k}" ${m===k?'selected':''}>${monLabel(k)}</option>`).join('')}</select><span style="font-weight:700">${inr(total)}</span><span style="color:var(--muted);font-size:13px">${byMode.map(([md,v])=>`${md} ${inr(v)}`).join(' · ')}</span><span class="sp"></span><button class="btn sm" data-a="export" data-k="payments">Export</button><button class="btn sm pri w" data-a="new" data-k="payments">Record payment</button></div>
    <div class="tbl"><table><thead><tr><th>Date</th><th>Receipt</th><th>Student</th><th>Paid by</th><th class="n">Amount</th><th></th></tr></thead><tbody>
    ${list.map(p=>{const s=stu(p.studentId);return `<tr data-a="open" data-k="students" data-id="${p.studentId}"><td>${fmtD(p.date)}</td><td class="mono">${esc(p.receiptNo||'')}${smp(p)}</td><td>${esc(s?.name||'Unknown')}<span class="sub">${esc(pname(s?.programmeId))}</span></td><td>${esc(p.mode||'')}<span class="sub mono">${esc(p.ref||'')}</span></td><td class="n">${inr(p.amount)}</td><td><button class="btn sm" data-a="receipt" data-id="${p.id}">Receipt PDF</button></td></tr>`}).join('')||`<tr><td colspan="6" class="empty">No payments recorded${m!=='All'?' this month':''}.</td></tr>`}</tbody></table></div>`;
  } else if(tab==='dues'){
    const list=S.students.filter(s=>['Active','On hold'].includes(s.status)).map(s=>({s,f:fin(s)})).filter(x=>x.f.due>0&&match(x.s,'name','phone')).sort((a,b)=>(a.s.nextDue||'9').localeCompare(b.s.nextDue||'9'));
    const total=list.reduce((a,x)=>a+x.f.due,0);
    body=`<div class="toolbar"><span style="font-weight:700">${inr(total)} outstanding from ${list.length} student${list.length===1?'':'s'}</span><span class="sp"></span><button class="btn sm" data-a="copydues">Copy dues list</button></div>
    <div class="tbl"><table><thead><tr><th>Student</th><th>Programme</th><th>Due date</th><th class="n">Balance</th><th></th></tr></thead><tbody>
    ${list.map(({s,f})=>`<tr data-a="open" data-k="students" data-id="${s.id}"><td><b>${esc(s.name)}</b>${smp(s)}<span class="sub">${esc(s.phone||'')}</span></td><td>${esc(pname(s.programmeId))}</td><td>${s.nextDue?fmtD(s.nextDue):'Not set'}<span class="sub">${pill(f.state)}</span></td><td class="n">${inr(f.due)}</td><td><div class="acts">${waBtn(s.phone,feeMsg(s,f),'Remind')}<button class="btn sm w" data-a="pay" data-id="${s.id}">Record payment</button></div></td></tr>`).join('')||`<tr><td colspan="5" class="empty">Nobody owes fees right now.</td></tr>`}</tbody></table></div>`;
  } else {
    const list=S.payouts.filter(p=>match({...p,name:trn(p.trainerId)?.name},'name','forWhat','ref')).sort((a,b)=>(a.status==='Due'?0:1)-(b.status==='Due'?0:1)||(b.date||'').localeCompare(a.date||''));
    const due=list.filter(p=>p.status!=='Paid').reduce((a,p)=>a+(+p.amount||0),0);
    body=`<div class="toolbar"><span style="font-weight:700">${inr(due)} due to trainers</span><span class="sp"></span><button class="btn sm" data-a="export" data-k="payouts">Export</button><button class="btn sm pri w" data-a="new" data-k="payouts">+ Payout</button></div>
    <div class="tbl"><table><thead><tr><th>Trainer</th><th>For</th><th>Date</th><th class="n">Amount</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map(p=>`<tr data-a="open" data-k="payouts" data-id="${p.id}"><td><b>${esc(trn(p.trainerId)?.name||'Unknown')}</b>${smp(p)}</td><td>${esc(p.forWhat||'')}</td><td>${fmtD(p.date)}</td><td class="n">${inr(p.amount)}</td><td>${pill(p.status||'Due')}</td><td>${p.status!=='Paid'?`<button class="btn sm w" data-a="payoutpaid" data-id="${p.id}">Mark paid</button>`:''}</td></tr>`).join('')||`<tr><td colspan="6" class="empty">No trainer payouts yet. Create one from a batch or workshop.</td></tr>`}</tbody></table></div>`;
  }
  return `<div class="grid" style="gap:14px">${tabs}${body}</div>`;
}

/* ---------- website resources ---------- */
const RICON={Update:'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',PDF:'M6 3h9l5 5v13H6zM14 3v6h6M9 14h6M9 17h4',Video:'M3 6h13v12H3zM16 10l5-3v10l-5-3',Image:'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',Link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'};
const rUrl=r=>safeHttp((r.file&&r.file.url)||r.url||'');
const rView=r=>({...r,url:rUrl(r)});
function rThumb(r){const t=thumbUrl(rView(r));return `<div class="rthumb ${t?'':'plain'}" data-kind="${esc(r.kind)}">${t?`<img src="${esc(t)}" alt="" loading="lazy">`:ic(RICON[r.kind]||RICON.Update)}<span class="k">${pill(r.published?'Live':'Draft',r.published?'good':'')}${r.pinned?pill('Pinned','peach'):''}</span></div>`}
function vResources(){
  const all=S.resources;
  if(!all.length&&LOADED)return emptyBig('Nothing shared yet','Add brochures, workshop photos, videos, programme PDFs and news updates. Anything you mark “Show on the website” appears on the website’s Resources page within a minute.','resources');
  const f=FL.resources.kind;
  const counts={All:all.length,Live:all.filter(r=>r.published).length,Drafts:all.filter(r=>!r.published).length};RESOURCE_KINDS.forEach(k=>counts[k]=all.filter(r=>r.kind===k).length);
  const list=all.filter(r=>f==='All'||(f==='Live'?r.published:f==='Drafts'?!r.published:r.kind===f)).filter(r=>match(r,'title','summary','category','body','kind'))
    .sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.date||'').localeCompare(a.date||''));
  return `<div class="grid" style="gap:16px"><div class="toolbar">${chips('resources','kind',['All','Live','Drafts',...RESOURCE_KINDS],counts)}<span class="sp"></span><a class="btn sm" href="${esc(siteUrl())}resources/" target="_blank" rel="noopener">${svgI('globe')}See it on the website</a><button class="btn sm pri w" data-a="new" data-k="resources">+ Resource</button></div>
  ${list.length?`<div class="rgrid">${list.map(r=>`<button class="rcard" data-a="open" data-k="resources" data-id="${r.id}">${rThumb(r)}<div class="rbody"><b>${esc(r.title)}${smp(r)}</b><span>${esc(r.summary||r.body||'').slice(0,110)}</span><div class="foot">${pill(r.kind,'acc')}${r.category?`<span class="tag">${esc(r.category)}</span>`:''}<span style="margin-left:auto;font-size:11.5px;color:var(--faint)">${r.date?fmtS(r.date):''}</span></div></div></button>`).join('')}</div>`:`<p class="empty">Nothing matches this filter.</p>`}</div>`;
}
function dResource(r){
  const url=rUrl(r);const emb=embedUrl(url);
  const media=r.kind==='Image'&&url?`<img src="${esc(url)}" alt="${esc(r.title)}">`
    :r.kind==='Video'&&emb?`<iframe src="${esc(emb)}" title="${esc(r.title)}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
    :r.kind==='Video'&&url?`<video src="${esc(url)}" controls preload="metadata"></video>`:'';
  return dHead(esc(r.title)+smp(r),`${pill(r.published?'Live on website':'Draft',r.published?'good':'warn')}${pill(r.kind,'acc')}${r.pinned?pill('Pinned','peach'):''}`)+`<div class="db">
  <div class="acts w"><button class="btn sm ${r.published?'':'pri'}" data-a="rpublish" data-id="${r.id}">${r.published?'Hide from website':'Publish on website'}</button><button class="btn sm" data-a="rpin" data-id="${r.id}">${r.pinned?'Unpin':'Pin to top'}</button><button class="btn sm" data-a="edit" data-k="resources" data-id="${r.id}">Edit</button>${url?`<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">Open ${r.kind==='PDF'?'PDF':r.kind==='Link'?'link':'file'}</a>`:''}</div>
  ${media?`<div class="preview-media">${media}</div>`:''}
  <div class="sect"><h3>Details</h3>${facts([['Type',esc(r.kind)],['Category',esc(r.category)],['Date shown',r.date?fmtS(r.date):''],['File',r.file&&r.file.name?`${esc(r.file.name)} · ${fileSize(r.file.size)}`:''],['Link',r.url?`<a href="${esc(safeHttp(r.url))}" target="_blank" rel="noopener">${esc(r.url)}</a>`:'']])}</div>
  ${r.summary||r.body?`<div class="sect"><h3>Text</h3>${r.summary?`<p style="margin:0 0 8px;font-weight:500">${esc(r.summary)}</p>`:''}${r.body?`<p style="margin:0;white-space:pre-wrap;color:var(--muted)">${esc(r.body)}</p>`:''}</div>`:''}
  <p style="margin:0;font-size:12.5px;color:var(--faint)">${r.published?'Visitors see this on the website’s Resources page. Changes appear within a minute.':'Only your team can see this until you publish it.'}</p>
  ${delBtn('resources',r.id)}</div>`;
}

function vProgrammes(){
  if(!S.programmes.length&&LOADED)return emptyBig('No programmes yet','List the courses, corporate workshops, student services and consulting packages you offer, with standard fees. Admissions and batches pick from this list.','programmes');
  const list=S.programmes.filter(p=>match(p,'name','track','description'));
  return `<div class="grid" style="gap:14px"><div class="toolbar"><span class="sp"></span><button class="btn sm" data-a="export" data-k="programmes">Export</button><button class="btn sm pri w" data-a="new" data-k="programmes">+ Programme</button></div>
  ${TRACKS.map(t=>{const items=list.filter(p=>p.track===t);if(!items.length)return '';return `<section class="card"><div class="card-h"><h2>${t}</h2><span class="pill">${items.length}</span></div><div class="list">${items.map(p=>{const act=S.students.filter(s=>s.programmeId===p.id&&s.status==='Active').length;const eng=S.engagements.filter(e=>e.programmeId===p.id).length;return `<div class="row"><button class="linkrow" data-a="edit" data-k="programmes" data-id="${p.id}"><div class="main"><b>${esc(p.name)}${smp(p)}</b><span>${esc(p.duration||'')} · ${esc(p.mode||'')}${t==='Corporate workshop'||t==='HR consulting'?` · ${eng} engagement${eng===1?'':'s'}`:` · ${act} active student${act===1?'':'s'}`}</span></div></button><div class="side-act"><b class="money">${p.fee?inr(p.fee):'Fee not set'}</b></div></div>`}).join('')}</div></section>`}).join('')}</div>`;
}

function hbars(items,fmt=v=>v){const mx=Math.max(1,...items.map(i=>i[1]));return items.length?`<div class="chart">${items.map(([l,v])=>`<div class="hb"><span class="lab" title="${esc(l)}">${esc(l)}</span><span class="track"><i style="width:${v*100/mx}%"></i></span><span class="val">${fmt(v)}</span></div>`).join('')}</div>`:'<p class="empty">No data yet.</p>'}
function vReports(){
  const t=today();const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);months.push(isoOf(d).slice(0,7))}
  const coll=months.map(k=>[k,S.payments.filter(p=>mon(p.date)===k).reduce((a,p)=>a+(+p.amount||0),0)]);
  const mx=Math.max(1,...coll.map(c=>c[1]));
  const src=SOURCES.map(s=>[s,S.enquiries.filter(e=>e.source===s).length]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
  const conv=S.enquiries.filter(e=>e.stage==='Converted').length, closed=S.enquiries.filter(e=>['Converted','Lost'].includes(e.stage)).length;
  const byProg=S.programmes.map(p=>[p.name,S.students.filter(s=>s.programmeId===p.id&&s.status!=='Dropped').length]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const clients={};S.engagements.filter(e=>['Delivered','Invoiced','Paid'].includes(e.status)).forEach(e=>clients[e.client]=(clients[e.client]||0)+engTotal(e));
  const util=S.trainers.filter(x=>x.stage==='Active').map(x=>[x.name,S.batches.filter(b=>b.trainerId===x.id&&['Running','Upcoming'].includes(b.status)).length+S.engagements.filter(e=>e.trainerId===x.id&&e.start>=t).length]).sort((a,b)=>b[1]-a[1]);
  return `<div class="grid" style="gap:16px"><div class="toolbar"><span style="color:var(--muted)">Figures update live as your team records data.</span><span class="sp"></span><button class="btn sm" data-a="backup">${ic('M12 15V3m0 0-4 4m4-4 4 4M4 17v3h16v-3')}Download all data (Excel)</button></div>
  <div class="grid g2">
  <section class="card"><div class="card-h"><h2>Fee collections, last 6 months</h2></div><div class="cols">${coll.map(([k,v])=>`<div class="c ${k===mon(t)?'now':''}"><span>${v?inr(v):''}</span><i style="height:${v*100/mx}%"></i></div>`).join('')}</div><div class="cols-x">${coll.map(([k])=>`<span>${monLabel(k)}</span>`).join('')}</div></section>
  <section class="card"><div class="card-h"><h2>Where enquiries come from</h2><span class="pill acc" style="margin-left:auto">${closed?Math.round(conv*100/closed):0}% of closed enquiries converted</span></div>${hbars(src)}</section>
  <section class="card"><div class="card-h"><h2>Students by programme</h2></div>${hbars(byProg)}</section>
  <section class="card"><div class="card-h"><h2>Corporate revenue by client</h2></div>${hbars(Object.entries(clients).sort((a,b)=>b[1]-a[1]).slice(0,8),inr)}</section>
  <section class="card"><div class="card-h"><h2>Active trainers: current and upcoming assignments</h2></div>${hbars(util)}</section>
  <section class="card"><div class="card-h"><h2>Admissions by month</h2></div>${hbars(months.map(k=>[monLabel(k),S.students.filter(s=>mon(s.joinedOn)===k).length]))}</section>
  </div></div>`;
}

function vSetup(){
  const c=S.config;const ns=COLS.reduce((a,k)=>a+S[k].filter(d=>d.sample).length,0);
  return `<div class="grid g2" style="align-items:start">
  <section class="card"><div class="card-h"><h2>Organisation details</h2></div><p style="margin:0 0 12px;color:var(--muted)">Printed on receipts, certificates and invoices.</p>
  <form class="f" data-kind="config">
    <label class="fld wide"><span>Organisation name</span><input id="c_org" name="orgName" value="${esc(c.orgName||'')}" required></label>
    <label class="fld wide"><span>Address</span><textarea id="c_addr" name="address" rows="2">${esc(c.address||'')}</textarea></label>
    <label class="fld"><span>Phone</span><input id="c_ph" name="phone" value="${esc(c.phone||'')}"></label>
    <label class="fld"><span>Email</span><input id="c_em" name="email" value="${esc(c.email||'')}"></label>
    <label class="fld wide"><span>Website address</span><input id="c_web" name="websiteUrl" type="url" value="${esc(c.websiteUrl||'')}" placeholder="${esc(location.origin)}/"><span class="hint">Used by “Visit website” in the menu. Leave empty to use this site.</span></label>
    <label class="fld"><span>GSTIN</span><input id="c_gst" name="gstin" value="${esc(c.gstin||'')}"></label>
    <label class="fld"><span>Receipt signatory</span><input id="c_sig" name="signatory" value="${esc(c.signatory||'')}" placeholder="e.g. Accounts, Soft Binomials India"></label>
    <label class="fld wide"><span>Centres, one per line</span><textarea id="c_cen" name="centres" rows="4">${esc((c.centres||[]).join('\n'))}</textarea></label>
    <div class="f-acts w"><button class="btn pri" type="submit">Save details</button></div>
  </form></section>
  <div class="grid">
  <section class="card"><div class="card-h"><h2>Sample data</h2></div>${ns?`<p style="margin:0 0 12px">${ns} sample records are loaded so you can see how each module works. Remove them before entering real admissions, fees and trainers.</p><div class="acts w" id="sampleActs"><button class="btn danger" data-a="rmsamples">Remove sample data</button></div>`:`<p style="margin:0;color:var(--muted)">No sample records. Everything here is your own data.</p>`}</section>
  <section class="card"><div class="card-h"><h2>Team and roles</h2></div>${BACKEND.team?`<div id="teamList"><p class="empty">Loading team…</p></div>`:`<p style="margin:0;color:var(--muted)">In the live console the owner invites each person by email and picks their role here.</p>`}
  <dl class="kv" style="margin-top:12px;font-size:12.5px"><dt>Owner</dt><dd>Everything, including roles</dd><dt>Admin</dt><dd>Add, edit and delete records</dd><dt>Staff</dt><dd>Add and edit records; cannot delete</dd><dt>Viewer</dt><dd>Read only</dd></dl></section>
  ${BACKEND.audit?`<section class="card"><div class="card-h"><h2>Recent changes</h2></div><p style="margin:0 0 10px;color:var(--muted);font-size:13px">Who changed students, fees, payouts, trainers and corporate workshops. Only admins and the owner see this.</p><div id="auditList"><p class="empty">Loading…</p></div></section>`:''}
  <section class="card"><div class="card-h"><h2>Records</h2></div><dl class="kv">${COLS.map(k=>`<dt>${NOUN[k][0].toUpperCase()+NOUN[k].slice(1)}s</dt><dd class="num">${S[k].length}</dd>`).join('')}</dl><div class="acts" style="margin-top:12px"><button class="btn sm" data-a="backup">Download all data (Excel)</button></div></section>
  </div></div>`;
}

/* ---------- drawer ---------- */
function openDrawer(){ $('#scrim').hidden=false; $('#drawer').hidden=false; document.body.style.overflow='hidden'; }
function closeDrawer(){ D=null; ATT=null; IMP=null; $('#scrim').hidden=true; $('#drawer').hidden=true; $('#drawer').innerHTML=''; document.body.style.overflow=''; }
function dHead(title,sub){return `<div class="dh"><div style="min-width:0"><h2 id="dtitle">${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}</div><button class="btn ghost sm x" data-a="close" aria-label="Close">${ic('M6 6l12 12M18 6 6 18')}</button></div>`}
function stageSel(k,d){const key=SK[k];return `<label class="w" style="display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:13px">Move to <select class="inline" data-a="stage" data-k="${k}" data-id="${d.id}">${ST[k].map(s=>`<option ${d[key]===s?'selected':''}>${s}</option>`).join('')}</select></label>`}
function docToggles(k,d,list){return `<div class="checks">${list.map(x=>`<label class="chk"><input type="checkbox" data-a="doc" data-k="${k}" data-id="${d.id}" value="${esc(x)}" ${(d.docs||[]).includes(x)?'checked':''} ${RO?'disabled':''}><span>${esc(x)}</span></label>`).join('')}</div>`}
function delBtn(k,id){return `<div class="acts w" style="margin-top:6px"><button class="btn sm danger" data-a="del" data-k="${k}" data-id="${id}">Delete ${NOUN[k]}</button></div>`}
function facts(pairs){return `<dl class="kv">${pairs.filter(p=>p[1]!==undefined&&p[1]!==null&&p[1]!=='').map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`}
function phoneFact(p){return p?`<span class="mono">${esc(p)}</span> <button class="btn ghost sm" style="height:24px;padding:0 6px" data-a="copy" data-text="${esc(p)}">Copy</button>`:''}

function openDetail(k,id){if(k==='programmes'||k==='payments'){openForm(k,id);return}D={mode:'detail',kind:k,id};openDrawer();drawDetail()}
function drawDetail(){
  const {kind:k,id}=D;const d=M[k]?.get(id);
  if(!d){$('#drawer').innerHTML=dHead('Record removed')+`<div class="db"><p class="empty">This record no longer exists.</p></div>`;return}
  const html={enquiries:dEnquiry,students:dStudent,trainers:dTrainer,batches:dBatch,engagements:dEngagement,payouts:dPayout,resources:dResource}[k](d);
  const sc=$('#drawer .db')?.scrollTop||0;
  $('#drawer').innerHTML=html;const b=$('#drawer .db');if(b)b.scrollTop=sc;
}
function dEnquiry(e){
  const trainerApp=e.kind==='Trainer application';
  return dHead(esc(e.name)+smp(e),`${pill(e.stage||'New')}<span>${esc(e.kind||'')}</span>`)+`<div class="db">
  <div class="acts">${waBtn(e.phone,followMsg(e))}<button class="btn sm w" data-a="contacted" data-id="${e.id}">Contacted · follow up in 2 days</button>${trainerApp?`<button class="btn sm pri w" data-a="totrainer" data-id="${e.id}">Add to trainer pipeline</button>`:`<button class="btn sm pri w" data-a="convert" data-id="${e.id}">Convert to admission</button>`}<button class="btn sm w" data-a="edit" data-k="enquiries" data-id="${e.id}">Edit</button></div>
  <div class="sect"><h3>Details</h3>${facts([['Mobile',phoneFact(e.phone)],['Email',esc(e.email)],['Interested in',esc(pname(e.programmeId))],['Source',esc(e.source)],['Centre',esc(e.centre)],['Next follow-up',e.followUp?`<span class="${e.followUp<today()&&!['Converted','Lost'].includes(e.stage)?'late':''}">${fmtD(e.followUp)}</span>`:''],['Received',e.createdAt?fmtD(isoOf(new Date(e.createdAt))):'']])}</div>
  ${e.notes?`<div class="sect"><h3>Notes</h3><p style="margin:0;white-space:pre-wrap">${esc(e.notes)}</p></div>`:''}
  <div>${stageSel('enquiries',e)}</div>${delBtn('enquiries',e.id)}</div>`;
}
function dStudent(s){
  const f=fin(s),a=attOf(s),b=bat(s.batchId),pays=S.payments.filter(p=>p.studentId===s.id).sort((x,y)=>(y.date||'').localeCompare(x.date||''));
  return dHead(esc(s.name)+smp(s),`<span class="mono">${esc(s.code||'')}</span>${pill(s.status||'Active')}<span>${esc(pname(s.programmeId))}</span>`)+`<div class="db">
  <div class="acts"><button class="btn sm pri w" data-a="pay" data-id="${s.id}">Record payment</button>${f.due>0?waBtn(s.phone,feeMsg(s,f),'Fee reminder'):''}<button class="btn sm" data-a="cert" data-id="${s.id}">Certificate PDF</button><button class="btn sm w" data-a="edit" data-k="students" data-id="${s.id}">Edit</button></div>
  <div class="sect"><h3>Fees</h3><div class="fin"><div><span>Fee after discount</span><b>${inr(f.net)}</b></div><div><span>Paid</span><b>${inr(f.paid)}</b></div><div><span>Balance</span><b style="color:${f.due>0?'var(--bad)':'var(--good)'}">${inr(f.due)}</b></div></div>
   ${f.due>0?`<p style="margin:10px 0 0;font-size:13px">${pill(f.state)} ${s.nextDue?`Next instalment due ${fmtD(s.nextDue)}`:'No due date set'}</p>`:''}
   <div class="list" style="margin-top:8px">${pays.map(p=>`<div class="row"><div class="main"><b class="money">${inr(p.amount)}${smp(p)}</b><span>${fmtD(p.date)} · ${esc(p.mode||'')} · <span class="mono">${esc(p.receiptNo||'')}</span></span></div><div class="side-act"><button class="btn sm" data-a="receipt" data-id="${p.id}">Receipt</button><button class="btn sm ghost w" data-a="edit" data-k="payments" data-id="${p.id}">Edit</button></div></div>`).join('')||'<p class="empty">No payments yet.</p>'}</div></div>
  <div class="sect"><h3>Course</h3>${facts([['Programme',esc(pname(s.programmeId))],['Batch',b?`<button class="btn ghost sm" style="height:24px;padding:0 6px" data-a="open" data-k="batches" data-id="${b.id}">${esc(b.code)}</button>`:'Not assigned'],['Trainer',esc(trn(b?.trainerId)?.name||'')],['Schedule',b?esc(`${(b.days||[]).join(', ')} ${b.time||''}`):''],['Centre',esc(s.centre)],['Admission',fmtD(s.joinedOn)],['Attendance',a?`${a.pct}% (${a.present} of ${a.total} classes)`:'No classes marked yet']])}</div>
  <div class="sect"><h3>Contact</h3>${facts([['Mobile',phoneFact(s.phone)],['Email',esc(s.email)],['Education',esc(s.education)],['Parent / guardian',esc(s.guardian)],['Parent mobile',phoneFact(s.guardianPhone)]])}</div>
  <div class="sect"><h3>Documents received</h3>${docToggles('students',s,STUDENT_DOCS)}</div>
  ${s.notes?`<div class="sect"><h3>Notes</h3><p style="margin:0;white-space:pre-wrap">${esc(s.notes)}</p></div>`:''}
  <div>${stageSel('students',s)}</div>${delBtn('students',s.id)}</div>`;
}
function dTrainer(x){
  const bs=S.batches.filter(b=>b.trainerId===x.id),es=S.engagements.filter(e=>e.trainerId===x.id),po=S.payouts.filter(p=>p.trainerId===x.id);
  const due=po.filter(p=>p.status!=='Paid').reduce((a,p)=>a+(+p.amount||0),0),paid=po.filter(p=>p.status==='Paid').reduce((a,p)=>a+(+p.amount||0),0);
  return dHead(esc(x.name)+smp(x),`${pill(x.stage||'Applied')}<span>${esc(x.city||'')}</span>${x.rating?`<span>★ ${esc(x.rating)}</span>`:''}`)+`<div class="db">
  <div class="acts">${waBtn(x.phone,`Hello ${x.name?.split(' ')[0]||''}, this is ${org()}. `)}<button class="btn sm w" data-a="newpayout" data-id="${x.id}">+ Payout</button><button class="btn sm w" data-a="edit" data-k="trainers" data-id="${x.id}">Edit</button></div>
  <div class="sect"><h3>Profile</h3>${facts([['Mobile',phoneFact(x.phone)],['Email',esc(x.email)],['Teaches',(x.expertise||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')],['Experience',x.experience?esc(x.experience)+' years':''],['Rate',x.rate?`${inr(x.rate)} ${esc((x.rateType||'').toLowerCase())}`:'']])}</div>
  <div class="sect"><h3>Documents ${(x.docs||[]).length}/${TRAINER_DOCS.length}</h3>${docToggles('trainers',x,TRAINER_DOCS)}</div>
  <div class="sect"><h3>Assignments</h3><div class="list">${bs.map(b=>`<div class="row"><button class="linkrow" data-a="open" data-k="batches" data-id="${b.id}"><div class="main"><b>${esc(b.code)}</b><span>${esc(pname(b.programmeId))} · ${fmtS(b.start)} – ${fmtS(b.end)}</span></div></button>${pill(b.status)}</div>`).join('')}${es.map(e=>`<div class="row"><button class="linkrow" data-a="open" data-k="engagements" data-id="${e.id}"><div class="main"><b>${esc(e.client)}</b><span>${esc(pname(e.programmeId))} · ${fmtS(e.start)}</span></div></button>${pill(e.status)}</div>`).join('')||(!bs.length?'<p class="empty">Not assigned to any batch or workshop.</p>':'')}</div></div>
  <div class="sect"><h3>Payouts</h3><div class="fin" style="grid-template-columns:1fr 1fr"><div><span>Due</span><b>${inr(due)}</b></div><div><span>Paid so far</span><b>${inr(paid)}</b></div></div>
  <div class="list" style="margin-top:8px">${po.map(p=>`<div class="row"><div class="main"><b class="money">${inr(p.amount)}</b><span>${esc(p.forWhat||'')} · ${fmtD(p.date)}</span></div><div class="side-act">${pill(p.status||'Due')}${p.status!=='Paid'?`<button class="btn sm w" data-a="payoutpaid" data-id="${p.id}">Mark paid</button>`:''}</div></div>`).join('')}</div></div>
  ${x.notes?`<div class="sect"><h3>Notes</h3><p style="margin:0;white-space:pre-wrap">${esc(x.notes)}</p></div>`:''}
  <div>${stageSel('trainers',x)}</div>${delBtn('trainers',x.id)}</div>`;
}
function dBatch(b){
  const roster=enrolled(b).sort((a,c)=>a.name.localeCompare(c.name));
  const sess=Object.keys(b.attendance||{}).sort().reverse();
  if(!ATT||ATT.batchId!==b.id){const dt=today();ATT={batchId:b.id,date:dt,set:new Set((b.attendance||{})[dt]||[])}}
  const tr=trn(b.trainerId);
  return dHead(esc(b.code)+smp(b),`${pill(b.status||'Upcoming')}<span>${esc(pname(b.programmeId))}</span>`)+`<div class="db">
  <div class="acts"><button class="btn sm w" data-a="addstudent" data-id="${b.id}">+ Add student</button>${tr?`<button class="btn sm w" data-a="batchpayout" data-id="${b.id}">Trainer payout</button>`:''}<button class="btn sm" data-a="exportroster" data-id="${b.id}">Export roster</button><button class="btn sm w" data-a="edit" data-k="batches" data-id="${b.id}">Edit</button></div>
  <div class="sect"><h3>Schedule</h3>${facts([['Trainer',esc(tr?.name||'Not assigned')],['Class days',esc((b.days||[]).join(', '))],['Timing',esc(b.time)],['Dates',`${fmtD(b.start)} – ${fmtD(b.end)}`],['Centre',esc(b.centre)],['Seats',`${roster.length}${b.capacity?` of ${b.capacity}`:''}`]])}</div>
  <div class="sect"><h3>Attendance</h3>${roster.length?`<div class="toolbar" style="margin-bottom:10px"><label style="display:inline-flex;gap:8px;align-items:center;font-weight:600;font-size:13px">Class on <input type="date" id="attdate" value="${ATT.date}" data-a="attdate" class="inline" style="height:32px;border:1px solid var(--line-2);border-radius:9px;padding:0 8px;background:var(--surface)" ${RO?'disabled':''}></label><span class="sp"></span><button class="btn sm w" data-a="attall">${ATT.set.size===roster.length?'Clear all':'Mark all present'}</button></div>
  <div class="att">${roster.map(s=>{const a=attOf(s);return `<label><input type="checkbox" data-a="atttick" value="${s.id}" ${ATT.set.has(s.id)?'checked':''} ${RO?'disabled':''}><span>${esc(s.name)}</span><span class="pct">${a?a.pct+'% overall':''}</span></label>`}).join('')}</div>
  <div class="toolbar w" style="margin-top:10px"><span style="color:var(--muted);font-size:13px">${ATT.set.size} of ${roster.length} present</span><span class="sp"></span><button class="btn sm pri" data-a="attsave">${(b.attendance||{})[ATT.date]?'Update attendance':'Save attendance'}</button></div>
  ${sess.length?`<p style="margin:12px 0 6px;font-size:12.5px;color:var(--muted);font-weight:600">Classes held</p><div class="sess">${sess.map(d=>`<button class="chip" data-a="attpick" data-v="${d}" aria-pressed="${d===ATT.date}">${fmtS(d)} · ${(b.attendance[d]||[]).length}/${roster.length}</button>`).join('')}</div>`:''}`:'<p class="empty">No students in this batch yet. Add students, or set this batch on their admission.</p>'}</div>
  <div>${stageSel('batches',b)}</div>${delBtn('batches',b.id)}</div>`;
}
function dEngagement(e){
  const tr=trn(e.trainerId);const tot=engTotal(e);
  return dHead(esc(e.client)+smp(e),`${pill(e.status||'Proposal sent')}<span>${esc(pname(e.programmeId))}</span>`)+`<div class="db">
  <div class="acts"><button class="btn sm" data-a="invoice" data-id="${e.id}">Proforma invoice PDF</button>${waBtn(e.contactPhone,`Hello ${e.contact?.split(' ')[0]||''}, this is ${org()} regarding the ${pname(e.programmeId)} workshop${e.start?` on ${fmtD(e.start)}`:''}.`)}${tr?`<button class="btn sm w" data-a="engpayout" data-id="${e.id}">Trainer payout</button>`:''}<button class="btn sm w" data-a="edit" data-k="engagements" data-id="${e.id}">Edit</button></div>
  <div class="sect"><h3>Value</h3><div class="fin"><div><span>Fee</span><b>${inr(e.fee)}</b></div><div><span>GST ${esc(e.gst||0)}%</span><b>${inr(tot-(+e.fee||0))}</b></div><div><span>Total</span><b>${inr(tot)}</b></div></div></div>
  <div class="sect"><h3>Workshop</h3>${facts([['Programme',esc(pname(e.programmeId))],['First day',fmtD(e.start)],['Days',esc(e.days)],['Participants',esc(e.participants)],['Venue',esc(e.venue)],['Trainer',esc(tr?.name||'Not assigned')],['Invoice no.',esc(e.invoiceNo)],['Feedback',e.feedback?`${esc(e.feedback)} / 5`:'']])}</div>
  <div class="sect"><h3>Client contact</h3>${facts([['Name',esc(e.contact)],['Mobile',phoneFact(e.contactPhone)]])}</div>
  ${e.notes?`<div class="sect"><h3>Notes</h3><p style="margin:0;white-space:pre-wrap">${esc(e.notes)}</p></div>`:''}
  <div>${stageSel('engagements',e)}</div>${delBtn('engagements',e.id)}</div>`;
}
function dPayout(p){return dHead(`${inr(p.amount)} to ${esc(trn(p.trainerId)?.name||'trainer')}`,`${pill(p.status||'Due')}<span>${esc(p.forWhat||'')}</span>`)+`<div class="db"><div class="acts">${p.status!=='Paid'?`<button class="btn sm pri w" data-a="payoutpaid" data-id="${p.id}">Mark paid</button>`:''}<button class="btn sm w" data-a="edit" data-k="payouts" data-id="${p.id}">Edit</button></div><div class="sect">${facts([['Date',fmtD(p.date)],['Reference',esc(p.ref)]])}</div>${delBtn('payouts',p.id)}</div>`}

/* ---------- forms ---------- */
function opt(v,l,sel){return `<option value="${esc(v)}" ${sel?'selected':''}>${esc(l)}</option>`}
function fieldHTML(f,v){
  const id='f_'+f.k,req=f.req?'required':'',wide=f.wide||['textarea','checks','days','tags'].includes(f.t)?' wide':'';
  const lab=`<span>${f.l}${f.req?' *':''}</span>`;const hint=f.hint?`<span class="hint">${f.hint}</span>`:'';
  const sel=(opts)=>`<label class="fld${wide}">${lab}<select id="${id}" name="${f.k}" ${req}><option value="">Select…</option>${opts}</select>${hint}</label>`;
  switch(f.t){
    case 'textarea':return `<label class="fld wide">${lab}<textarea id="${id}" name="${f.k}" rows="${f.rows||3}">${esc(v)}</textarea>${hint}</label>`;
    case 'select':return sel(f.o.map(o=>opt(o,o,o===v)).join(''));
    case 'programme':return sel(TRACKS.map(t=>{const ps=S.programmes.filter(p=>p.track===t);return ps.length?`<optgroup label="${t}">${ps.map(p=>opt(p.id,p.name,p.id===v)).join('')}</optgroup>`:''}).join(''));
    case 'batch':return sel(S.batches.filter(b=>b.status!=='Cancelled'&&(b.status!=='Completed'||b.id===v)).map(b=>opt(b.id,`${b.code} · ${pname(b.programmeId)}`,b.id===v)).join(''));
    case 'trainer':return sel(S.trainers.filter(x=>['Approved','Active'].includes(x.stage)||x.id===v).map(x=>opt(x.id,x.name,x.id===v)).join(''));
    case 'student':return sel([...S.students].sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{const fi=fin(s);return opt(s.id,`${s.name} · ${s.code||''}${fi.due>0?` · balance ${inr(fi.due)}`:''}`,s.id===v)}).join(''));
    case 'centre':return sel((S.config.centres||[]).map(c=>opt(c,c,c===v)).join('')+(v&&!(S.config.centres||[]).includes(v)?opt(v,v,true):''));
    case 'checks':case 'days':{const o=f.t==='days'?WEEK:f.o;const a=Array.isArray(v)?v:[];return `<fieldset class="fld wide"><legend>${f.l}</legend><div class="checks">${o.map(x=>`<label class="chk"><input type="checkbox" name="${f.k}" value="${esc(x)}" ${a.includes(x)?'checked':''}><span>${esc(x)}</span></label>`).join('')}</div></fieldset>`}
    case 'toggle':return `<label class="chk" style="align-self:end;min-height:40px"><input type="checkbox" name="${f.k}" ${v?'checked':''}><span>${f.l}</span></label>`;
    case 'file':return `<div class="fld wide"><span>${f.l}</span><div class="drop" style="padding:14px;gap:10px">${v&&v.name?`<span style="font-size:13px">Current: <b>${esc(v.name)}</b> ${v.size?`· ${fileSize(v.size)}`:''}</span>`:''}<input id="${id}" name="${f.k}" type="file" accept="${ACCEPT}"><span class="hint" style="font-size:11.5px;color:var(--faint)">${BACKEND.review||MODE==='demo'?'In this review copy, files up to 1.5 MB stay in your browser. ':''}PDF up to 25 MB, images up to 10 MB, videos up to 200 MB. For long videos, a YouTube link is lighter.</span><div class="upl" hidden><i></i></div></div></div>`;
    case 'tags':return `<label class="fld wide">${lab}<input id="${id}" name="${f.k}" value="${esc((v||[]).join(', '))}">${hint}</label>`;
    default:return `<label class="fld${wide}">${lab}<input id="${id}" name="${f.k}" type="${f.t||'text'}" ${f.t==='number'?`inputmode="decimal" step="${f.step||'1'}" min="0"`:''} ${f.list?`list="${f.list}"`:''} value="${esc(v)}" ${req}>${f.list==='rcats'?`<datalist id="rcats">${[...new Set(['Brochures','Workshops','News','Student guides','Corporate','Events',...S.resources.map(r=>r.category).filter(Boolean)])].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>`:''}${hint}</label>`;
  }
}
function defaults(k){
  const t=today();
  return {resources:{kind:'Update',date:t,published:false},enquiries:{stage:'New',source:'Phone call',kind:'Student course',followUp:t},students:{status:'Active',joinedOn:t,docs:['Admission form']},trainers:{stage:'Applied',rateType:'Per day'},programmes:{track:'IT course',mode:'Classroom'},batches:{status:'Upcoming',start:t},engagements:{status:'Proposal sent',gst:18,days:1},payments:{date:t,mode:'UPI'},payouts:{date:t,status:'Due'}}[k]||{};
}
function openForm(k,id,pre={}){
  if(RO){toast('You can view records but not change them.','bad');return}
  const d=id?M[k]?.get(id):null;
  const v={...(d?{}:defaults(k)),...(d||{}),...pre};
  if(k==='students'&&!d&&v.programmeId&&!v.feeTotal)v.feeTotal=prog(v.programmeId)?.fee||'';
  D={mode:'form',kind:k,id:id||null,pre};
  openDrawer();
  $('#drawer').innerHTML=dHead(d?`Edit ${NOUN[k]}`:(k==='payments'?'Record fee payment':`New ${NOUN[k]}`),d?esc(d.name||d.code||d.client||d.receiptNo||d.title||''):'')+`<div class="db"><form class="f" data-kind="${k}" novalidate>${F[k].map(f=>fieldHTML(f,v[f.k])).join('')}
  ${k==='payments'?`<p class="wide" style="grid-column:1/-1;margin:0;color:var(--muted);font-size:13px" id="payhint"></p>`:''}
  <div class="f-acts">${d&&k!=='payments'?'':''}<button type="button" class="btn" data-a="${d&&['programmes','payments'].indexOf(k)<0?'back':'close'}">Cancel</button><button class="btn pri" type="submit">${d?'Save changes':k==='payments'?'Save and get receipt':'Save'}</button></div>
  ${d&&['programmes','payments'].includes(k)?`<div class="f-acts" style="justify-content:flex-start">${k==='payments'?`<button type="button" class="btn sm" data-a="receipt" data-id="${d.id}">Receipt PDF</button>`:''}<button type="button" class="btn sm danger" data-a="del" data-k="${k}" data-id="${d.id}">Delete ${NOUN[k]}</button></div>`:''}</form></div>`;
  if(k==='payments')payHint();
  setTimeout(()=>{const first=$('#drawer form input:not([type=checkbox]),#drawer form select');first&&first.focus()},30);
}
function payHint(){const sel=$('#f_studentId');const h=$('#payhint');if(!sel||!h)return;const s=stu(sel.value);if(!s){h.textContent='';return}const f=fin(s);h.textContent=`Balance before this payment: ${inr(f.due)} of ${inr(f.net)}.`;const amt=$('#f_amount');if(amt&&!amt.value&&f.due>0&&!D.id)amt.placeholder=String(f.due)}
function collect(form,k){
  const fd=new FormData(form);const out={};
  F[k].forEach(f=>{
    if(f.t==='file')return;
    if(f.t==='toggle'){out[f.k]=fd.get(f.k)==='on';return}
    if(f.t==='checks'||f.t==='days')out[f.k]=fd.getAll(f.k);
    else if(f.t==='tags')out[f.k]=String(fd.get(f.k)||'').split(',').map(s=>s.trim()).filter(Boolean);
    else if(f.t==='number'){const x=fd.get(f.k);out[f.k]=x===''||x===null?null:Number(x)}
    else out[f.k]=String(fd.get(f.k)??'').trim();
  });
  return out;
}
async function submitForm(form){
  const k=form.dataset.kind;
  if(k==='config'){const fd=new FormData(form);const c={orgName:fd.get('orgName').trim(),address:fd.get('address').trim(),phone:fd.get('phone').trim(),email:fd.get('email').trim(),gstin:fd.get('gstin').trim(),signatory:fd.get('signatory').trim(),websiteUrl:(u=>/^https?:\/\//i.test(u)?u.replace(/\/?$/,'/'):'')(String(fd.get('websiteUrl')||'').trim()),centres:String(fd.get('centres')).split('\n').map(s=>s.trim()).filter(Boolean)};
    await W(()=>DB.doc('config/main').set({...c,updatedAt:now()}),'Details saved');return}
  const missing=F[k].filter(f=>f.req).find(f=>{const el=form.elements[f.k];return el&&!String(el.value||'').trim()});
  if(missing){const el=form.elements[missing.k];el.focus();toast(`${missing.l} is required.`,'bad');return}
  const v=collect(form,k);
  if(v.phone&&digits(v.phone).length<10){form.elements.phone.focus();toast('Enter a 10-digit mobile number.','bad');return}
  if(k==='payments'&&!(v.amount>0)){form.elements.amount.focus();toast('Enter the amount received.','bad');return}
  const btn=form.querySelector('[type=submit]');
  if(k==='resources'){
    const old=D.id?M.resources.get(D.id):null;const picked=form.elements.file?.files?.[0];
    if(picked&&kindForType(picked.type))v.kind=kindForType(picked.type); // the file decides the type
    const hasFile=picked||(old&&old.file);
    if(v.url&&!/^https?:\/\//i.test(v.url)){form.elements.url.focus();toast('Links must start with https://','bad');return}
    if(['PDF','Image'].includes(v.kind)&&!hasFile&&!v.url){toast(`Choose the ${v.kind==='PDF'?'PDF':'image'} file to share.`,'bad');return}
    if(v.kind==='Video'&&!hasFile&&!v.url){form.elements.url.focus();toast('Upload the video or paste its YouTube or Vimeo link.','bad');return}
    if(v.kind==='Link'&&!v.url){form.elements.url.focus();toast('Paste the link to share.','bad');return}
    if(v.kind==='Update'&&!v.summary&&!v.body){form.elements.summary.focus();toast('Write the update first.','bad');return}
    if(picked){
      const bar=form.querySelector('.upl');const fill=bar&&bar.firstElementChild;btn.disabled=true;if(bar)bar.hidden=false;
      try{v.file=await BACKEND.uploads.upload(picked,pc=>{if(fill)fill.style.width=Math.round(pc*100)+'%'})}
      catch(e){console.error(e);btn.disabled=false;if(bar)bar.hidden=true;toast(e&&e.message?e.message:'The upload didn’t finish. Check your connection and try again.','bad');return}
    }
  }
  btn.disabled=true;
  const id=D.id;let newId=null;
  const ok=await W(async()=>{
    if(id){await upd(k,id,v);return}
    if(k==='students')v.code=`SB${today().slice(2,4)}${today().slice(5,7)}-${rnd(4)}`;
    if(k==='payments')v.receiptNo=`RC-${today().replace(/-/g,'').slice(2)}-${rnd(4)}`;
    const ref=await add(k,v);newId=ref.id;
    if(k==='students'&&D.pre&&D.pre.fromEnquiry)await upd('enquiries',D.pre.fromEnquiry,{stage:'Converted'});
    if(k==='trainers'&&D.pre&&D.pre.fromEnquiry)await upd('enquiries',D.pre.fromEnquiry,{stage:'Converted'});
  },id?'Saved':k==='resources'?(v.published?'Published on the website':'Saved as a draft'):k==='payments'?'Payment recorded':`${NOUN[k][0].toUpperCase()+NOUN[k].slice(1)} added`);
  btn.disabled=false;
  if(!ok)return;
  if(k==='payments'&&newId){const sid=v.studentId;M.payments=M.payments||new Map();setTimeout(()=>{const p=S.payments.find(x=>x.id===newId)||{id:newId,...v};receipt(p)},400);openDetail('students',sid);return}
  if(['programmes','payments','payouts'].includes(k)&&!(k==='payouts'&&id)){closeDrawer();return}
  openDetail(k,id||newId);
}

/* ---------- PDFs ---------- */
async function save(filename,data){
  try{
    data=await data;
    const blob=data instanceof Blob?data:new Blob([data]);
    const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename.replace(/[\\/:*?"<>|]+/g,'-');
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);
  }catch(e){console.error(e);toast('Couldn’t prepare the download.','bad')}
}
let _pdf,_xl;
const PDF=async()=>(_pdf??=(await import('jspdf')).jsPDF);
const XL=async()=>(_xl??=(await import('exceljs')).default);
const RS=n=>'Rs. '+Math.round(+n||0).toLocaleString('en-IN');
function pdfHeader(doc,w){
  const c=S.config;doc.setFillColor(104,21,161);doc.rect(0,0,w,4,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(40,20,55);doc.text(org(),14,18);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(100,90,115);
  const lines=[c.address,[c.phone,c.email].filter(Boolean).join('  ·  '),c.gstin?`GSTIN ${c.gstin}`:''].filter(Boolean);
  lines.forEach((l,i)=>doc.text(doc.splitTextToSize(l,w-28),14,24+i*4.2));
  return 24+lines.length*4.2+4;
}
async function receipt(p){
  const jsPDF=await PDF();
  const s=stu(p.studentId)||{};const f=s.id?fin(s):{net:0,paid:0,due:0};const b=bat(s.batchId);
  const doc=new jsPDF({unit:'mm',format:'a5'});const w=148;
  let y=pdfHeader(doc,w);
  doc.setDrawColor(220,210,235);doc.line(14,y,w-14,y);y+=9;
  doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(104,21,161);doc.text('FEE RECEIPT',14,y);
  doc.setFontSize(9);doc.setTextColor(60,50,70);doc.setFont('helvetica','normal');doc.text(`Receipt no. ${p.receiptNo||''}`,w-14,y-4,{align:'right'});doc.text(`Date ${fmtD(p.date)}`,w-14,y+1,{align:'right'});
  y+=10;
  const row=(a,v)=>{doc.setFont('helvetica','normal');doc.setTextColor(110,100,125);doc.text(a,14,y);doc.setTextColor(30,20,40);doc.setFont('helvetica','bold');doc.text(doc.splitTextToSize(String(v||'—'),80),54,y);y+=7};
  row('Received from',s.name);row('Student ID',s.code);row('Programme',pname(s.programmeId));row('Batch',b?.code);row('Paid by',`${p.mode||''}${p.ref?`  (ref. ${p.ref})`:''}`);
  y+=3;doc.setFillColor(243,236,251);doc.roundedRect(14,y,w-28,20,3,3,'F');
  doc.setTextColor(104,21,161);doc.setFontSize(18);doc.setFont('helvetica','bold');doc.text(RS(p.amount),20,y+9);
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(70,60,85);doc.text(doc.splitTextToSize(`Rupees ${words(p.amount)} only`,w-40),20,y+15);
  y+=29;
  doc.setFontSize(9);doc.setTextColor(70,60,85);
  doc.text(`Total fee ${RS(f.net)}     Paid to date ${RS(f.paid)}     Balance ${RS(f.due)}`,14,y);
  y+=22;doc.setDrawColor(150,140,160);doc.line(w-64,y,w-14,y);doc.text(S.config.signatory||'Authorised signatory',w-14,y+5,{align:'right'});
  doc.setFontSize(7.5);doc.setTextColor(140,130,150);doc.text('This is a computer-generated receipt.',14,200);
  save(`Receipt ${p.receiptNo||''} ${s.name||''}.pdf`,doc.output('arraybuffer'));
}
async function certificate(s){
  const jsPDF=await PDF();
  const b=bat(s.batchId);const p=prog(s.programmeId);
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'});const w=297,h=210;
  doc.setFillColor(251,248,253);doc.rect(0,0,w,h,'F');
  doc.setDrawColor(104,21,161);doc.setLineWidth(1.2);doc.rect(10,10,w-20,h-20);doc.setLineWidth(.3);doc.rect(14,14,w-28,h-28);
  doc.setFillColor(242,164,107);doc.rect(w/2-20,30,40,1.4,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(104,21,161);doc.text(org().toUpperCase(),w/2,24,{align:'center',charSpace:1.5});
  doc.setFont('times','bold');doc.setFontSize(34);doc.setTextColor(42,18,64);doc.text('Certificate of Completion',w/2,56,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(12);doc.setTextColor(90,80,105);doc.text('This is to certify that',w/2,76,{align:'center'});
  doc.setFont('times','bolditalic');doc.setFontSize(30);doc.setTextColor(104,21,161);doc.text(s.name||'',w/2,96,{align:'center'});
  doc.setDrawColor(205,176,236);doc.line(w/2-70,100,w/2+70,100);
  doc.setFont('helvetica','normal');doc.setFontSize(12);doc.setTextColor(90,80,105);doc.text('has successfully completed the programme',w/2,114,{align:'center'});
  doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(42,18,64);doc.text(doc.splitTextToSize(p?.name||'',200),w/2,128,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(90,80,105);
  const span=b?.start?`${fmtD(b.start)} to ${fmtD(b.end)}`:(p?.duration||'');doc.text([span,b?.centre||s.centre||''].filter(Boolean).join('  ·  '),w/2,140,{align:'center'});
  const certNo=`CERT-${(s.code||'').replace(/^SB/,'')}`;
  doc.setFontSize(9);doc.text(`Certificate no. ${certNo}`,26,186);doc.text(`Issued ${fmtD(today())}`,26,191);
  doc.setDrawColor(120,110,130);doc.line(170,180,225,180);doc.line(235,180,275,180);
  doc.text(trn(b?.trainerId)?.name||'Trainer',197.5,186,{align:'center'});doc.text('Director',255,186,{align:'center'});
  save(`Certificate ${s.name}.pdf`,doc.output('arraybuffer'));
}
async function invoice(e){
  const jsPDF=await PDF();
  const doc=new jsPDF({unit:'mm',format:'a4'});const w=210;let y=pdfHeader(doc,w);
  doc.setDrawColor(220,210,235);doc.line(14,y,w-14,y);y+=10;
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(104,21,161);doc.text('PROFORMA INVOICE',14,y);
  doc.setFontSize(9.5);doc.setFont('helvetica','normal');doc.setTextColor(60,50,70);doc.text(`No. ${e.invoiceNo||'—'}`,w-14,y-4,{align:'right'});doc.text(`Date ${fmtD(today())}`,w-14,y+1,{align:'right'});
  y+=12;doc.setTextColor(110,100,125);doc.text('Bill to',14,y);doc.setTextColor(30,20,40);doc.setFont('helvetica','bold');doc.text(e.client||'',14,y+6);doc.setFont('helvetica','normal');doc.text([e.contact,e.venue].filter(Boolean).join('  ·  '),14,y+11);
  y+=22;doc.setFillColor(243,236,251);doc.rect(14,y,w-28,9,'F');doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(60,40,80);
  doc.text('Description',18,y+6);doc.text('Days',120,y+6);doc.text('Participants',140,y+6);doc.text('Amount',w-18,y+6,{align:'right'});
  y+=16;doc.setFont('helvetica','normal');doc.setTextColor(30,20,40);
  doc.text(doc.splitTextToSize(`${pname(e.programmeId)} workshop${e.start?`, from ${fmtD(e.start)}`:''}`,95),18,y);doc.text(String(e.days||''),120,y);doc.text(String(e.participants||''),140,y);doc.text(RS(e.fee),w-18,y,{align:'right'});
  y+=14;doc.setDrawColor(230,222,240);doc.line(110,y,w-14,y);y+=7;
  const gst=engTotal(e)-(+e.fee||0);
  doc.text('Subtotal',120,y);doc.text(RS(e.fee),w-18,y,{align:'right'});y+=7;
  doc.text(`GST ${e.gst||0}%`,120,y);doc.text(RS(gst),w-18,y,{align:'right'});y+=9;
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(104,21,161);doc.text('Total',120,y);doc.text(RS(engTotal(e)),w-18,y,{align:'right'});
  y+=8;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(70,60,85);doc.text(doc.splitTextToSize(`Rupees ${words(engTotal(e))} only`,w-28),14,y);
  y+=24;doc.setDrawColor(150,140,160);doc.line(w-70,y,w-14,y);doc.text(`For ${org()}`,w-14,y+5,{align:'right'});
  doc.setFontSize(8);doc.setTextColor(140,130,150);doc.text('Proforma invoice. A tax invoice is issued on payment.',14,285);
  save(`Proforma ${e.client}${e.invoiceNo?' '+e.invoiceNo.replace(/\//g,'-'):''}.pdf`,doc.output('arraybuffer'));
}

/* ---------- Excel ---------- */
function rowsFor(k){
  const T=x=>trn(x)?.name||'',P=pname,B=x=>bat(x)?.code||'';
  switch(k){
    case 'students':return S.students.map(s=>{const f=fin(s),a=attOf(s);return {'Student ID':s.code,Name:s.name,Mobile:s.phone,Email:s.email,Education:s.education,'Parent/guardian':s.guardian,'Parent mobile':s.guardianPhone,Programme:P(s.programmeId),Batch:B(s.batchId),Centre:s.centre,'Admission date':s.joinedOn,Status:s.status,'Course fee':+s.feeTotal||0,Discount:+s.discount||0,Paid:f.paid,Balance:f.due,'Next due':s.nextDue,'Attendance %':a?a.pct:'','Documents':(s.docs||[]).join(', '),Notes:s.notes}});
    case 'enquiries':return S.enquiries.map(e=>({Name:e.name,Mobile:e.phone,Email:e.email,'Enquiry for':e.kind,Programme:P(e.programmeId),Source:e.source,Stage:e.stage,Centre:e.centre,'Next follow-up':e.followUp,Notes:e.notes}));
    case 'trainers':return S.trainers.map(x=>({Name:x.name,Mobile:x.phone,Email:x.email,City:x.city,Expertise:(x.expertise||[]).join(', '),'Experience (yrs)':x.experience,'Rate type':x.rateType,Rate:x.rate,Stage:x.stage,Rating:x.rating,Documents:(x.docs||[]).join(', '),Notes:x.notes}));
    case 'batches':return S.batches.map(b=>({Batch:b.code,Programme:P(b.programmeId),Trainer:T(b.trainerId),Centre:b.centre,Start:b.start,End:b.end,Days:(b.days||[]).join(', '),Timing:b.time,Seats:b.capacity,Enrolled:enrolled(b).length,'Classes held':Object.keys(b.attendance||{}).length,Status:b.status}));
    case 'engagements':return S.engagements.map(e=>({Client:e.client,Contact:e.contact,'Contact mobile':e.contactPhone,Workshop:P(e.programmeId),Trainer:T(e.trainerId),Start:e.start,Days:e.days,Participants:e.participants,Venue:e.venue,'Fee before GST':+e.fee||0,'GST %':+e.gst||0,'Total':Math.round(engTotal(e)),Status:e.status,'Invoice no.':e.invoiceNo,Feedback:e.feedback}));
    case 'payments':return S.payments.map(p=>{const s=stu(p.studentId);return {Date:p.date,'Receipt no.':p.receiptNo,Student:s?.name,'Student ID':s?.code,Programme:P(s?.programmeId),Amount:+p.amount||0,'Paid by':p.mode,Reference:p.ref,Note:p.note}});
    case 'payouts':return S.payouts.map(p=>({Trainer:T(p.trainerId),For:p.forWhat,Date:p.date,Amount:+p.amount||0,Status:p.status,Reference:p.ref}));
    case 'programmes':return S.programmes.map(p=>({Programme:p.name,Track:p.track,Duration:p.duration,Fee:+p.fee||0,Mode:p.mode,Description:p.description}));
  }return [];
}
const SHEET={students:'Students',enquiries:'Enquiries',trainers:'Trainers',batches:'Batches',engagements:'Corporate workshops',payments:'Fee payments',payouts:'Trainer payouts',programmes:'Programmes'};
async function book(sheets){
  const ExcelJS=await XL();const wb=new ExcelJS.Workbook();wb.creator=org();
  sheets.forEach(([name,rows])=>{
    const ws=wb.addWorksheet(name.replace(/[\\/?*[\]:]/g,'-').slice(0,31));const keys=Object.keys(rows[0]||{});
    ws.columns=keys.map(k=>({header:k,key:k,width:Math.min(40,Math.max(k.length,...rows.map(r=>String(r[k]??'').length))+2)}));
    rows.forEach(r=>ws.addRow(r));
    if(keys.length){ws.getRow(1).font={bold:true};ws.views=[{state:'frozen',ySplit:1}]}
  });
  return wb.xlsx.writeBuffer();
}
function exportX(k){save(`${SHEET[k]} ${today()}.xlsx`,book([[SHEET[k],rowsFor(k)]]))}
function backup(){save(`Soft Binomials data ${today()}.xlsx`,book(Object.keys(SHEET).map(k=>[SHEET[k],rowsFor(k)])))}
const cellVal=v=>v==null?'':v instanceof Date?v:typeof v==='object'?(v.result??v.text??(v.richText?v.richText.map(t=>t.text).join(''):'')):v;
function parseCSV(t){
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===','){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}
  if(f!==''||row.length){row.push(f);rows.push(row)}
  return rows;
}
async function readSheet(file){
  if(/\.csv$/i.test(file.name))return parseCSV(await file.text());
  if(!/\.xlsx$/i.test(file.name))throw new Error('type');
  const ExcelJS=await XL();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const ws=wb.worksheets[0];const out=[];const n=ws.columnCount;
  ws.eachRow({includeEmpty:false},row=>out.push(Array.from({length:n},(_,i)=>cellVal(row.getCell(i+1).value))));
  return out;
}
const IMPF={
  students:[['name','Name',['name','full name','student name','student','candidate name']],['phone','Mobile',['mobile','phone','mobile no','mobile number','contact','contact no','phone number','whatsapp']],['email','Email',['email','e-mail','email id','mail']],['education','Education',['qualification','college','school','education','class']],['guardian','Parent/guardian',['parent','guardian','father','mother','parent name','parent/guardian']],['guardianPhone','Parent mobile',['parent mobile','guardian mobile','parent phone','parent contact']],['programme','Programme',['course','programme','program','course name','training']],['batch','Batch',['batch','batch code','batch name']],['centre','Centre',['centre','center','branch','location']],['joinedOn','Admission date',['admission date','date of admission','joining date','date of joining','joined','enrolled on','date']],['feeTotal','Course fee',['fee','fees','total fee','course fee','total fees']],['discount','Discount',['discount','concession','scholarship']],['paid','Already paid',['paid','fees paid','amount paid','received']],['nextDue','Next due date',['due date','next due','instalment date','next instalment']],['status','Status',['status']],['notes','Notes',['notes','remarks','remark','comment','comments']]],
  enquiries:[['name','Name',['name','full name','student name','candidate']],['phone','Mobile',['mobile','phone','mobile no','contact','contact no','phone number','whatsapp']],['email','Email',['email','e-mail','mail']],['kind','Enquiry for',['enquiry for','type','enquiry type','category']],['programme','Programme',['course','programme','program','interested in','interest']],['source','Source',['source','lead source','reference']],['stage','Stage',['stage','status']],['centre','Centre',['centre','center','branch']],['followUp','Next follow-up',['follow up','follow-up','followup','next follow up','follow up date']],['notes','Notes',['notes','remarks','remark','comment']]],
  trainers:[['name','Name',['name','full name','trainer','trainer name','faculty']],['phone','Mobile',['mobile','phone','mobile no','contact','phone number']],['email','Email',['email','e-mail','mail']],['city','City',['city','location']],['expertise','Topics',['expertise','skills','topics','subjects','specialisation','specialization','courses']],['experience','Experience (yrs)',['experience','years','exp']],['rateType','Rate type',['rate type','paid per']],['rate','Rate',['rate','charges','fee','rate per day','per day','per hour']],['stage','Stage',['stage','status']],['notes','Notes',['notes','remarks','comment']]]
};
const norm=h=>String(h||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function autoMap(k,headers){
  const map={},used=new Set(),nh=headers.map(norm);
  IMPF[k].forEach(([key,,syn])=>{const i=nh.findIndex((h,j)=>!used.has(j)&&syn.includes(h));if(i>=0){map[key]=i;used.add(i)}});
  IMPF[k].forEach(([key,,syn])=>{if(key in map)return;const i=nh.findIndex((h,j)=>!used.has(j)&&syn.some(s=>s.length>3&&h.includes(s)));if(i>=0){map[key]=i;used.add(i)}});
  return map;
}
function toISO(v){
  if(v instanceof Date&&!isNaN(v))return isoOf(v);
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}
  const s=String(v||'').trim();if(!s)return '';
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
  const d=new Date(s);return isNaN(d)?'':isoOf(d);
}
const findProg=v=>{const n=norm(v);if(!n)return '';const p=S.programmes.find(p=>norm(p.name)===n)||S.programmes.find(p=>norm(p.name).includes(n)||n.includes(norm(p.name)));return p?p.id:''};
const findBatch=v=>{const n=norm(v);if(!n)return '';const b=S.batches.find(b=>norm(b.code)===n);return b?b.id:''};
const pickOpt=(v,opts,dflt)=>{const n=norm(v);return opts.find(o=>norm(o)===n)||opts.find(o=>n&&norm(o).includes(n))||dflt};

function openImport(k){
  if(RO){toast('You can view records but not change them.','bad');return}
  D={mode:'import',kind:k};IMP={kind:k,headers:[],rows:[],map:{},skipDup:true};openDrawer();drawImport();
}
function drawImport(){
  const {kind:k}=IMP;
  let body=`<div class="sect"><h3>1 · Choose your sheet</h3><div class="drop"><label class="btn"><input type="file" id="impfile" accept=".xlsx,.csv" hidden data-a="impfile">Choose Excel (.xlsx) or CSV file</label><span style="color:var(--muted);font-size:13px">Or copy the rows in Excel, including the header row, and paste them here:</span><textarea id="imppaste" placeholder="Name	Mobile	Course	Fee…" aria-label="Paste rows from Excel"></textarea><div class="acts"><button class="btn sm" data-a="imppaste">Use pasted rows</button><button class="btn sm ghost" data-a="template" data-k="${k}">Download a blank template</button></div></div></div>`;
  if(IMP.rows.length){
    const opts=i=>`<option value="">Don’t import</option>${IMP.headers.map((h,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(h||`Column ${j+1}`)}</option>`).join('')}`;
    const prev=IMP.rows.slice(0,5).map(r=>buildRow(k,r));
    const unmatched=k!=='trainers'&&IMP.map.programme!==undefined?IMP.rows.filter(r=>String(r[IMP.map.programme]||'').trim()&&!findProg(r[IMP.map.programme])).length:0;
    const dups=IMP.rows.filter(r=>{const p=last10(r[IMP.map.phone]);return p&&S[k].some(x=>last10(x.phone)===p)}).length;
    body+=`<div class="sect"><h3>2 · Match your columns</h3><p style="margin:0 0 10px;font-size:13px;color:var(--muted)">We matched what we could from your header row. Check each one.</p><div class="map">${IMPF[k].map(([key,label])=>`<label for="m_${key}">${label}</label><select id="m_${key}" data-a="impmap" data-v="${key}">${opts(IMP.map[key])}</select>`).join('')}</div>
    ${unmatched?`<p class="banner" style="margin-top:12px">${unmatched} row${unmatched===1?'':'s'} name a programme that isn’t in your Programmes list. They will import without a programme. Add the programme first if you want them linked.</p>`:''}</div>
    <div class="sect"><h3>3 · Check and import</h3><div class="prev"><table><thead><tr>${['Name','Mobile','Programme / topics',k==='students'?'Fee':k==='enquiries'?'Stage':'Stage'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${prev.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(k==='trainers'?(r.expertise||[]).join(', '):pname(r.programmeId))}</td><td>${esc(k==='students'?inr(r.feeTotal):r.stage)}</td></tr>`).join('')}</tbody></table></div>
    <label class="chk" style="margin-top:10px"><input type="checkbox" data-a="impdup" ${IMP.skipDup?'checked':''}><span>Skip ${dups} row${dups===1?'':'s'} whose mobile number is already in the console</span></label>
    <div class="acts" style="margin-top:12px"><button class="btn pri" data-a="impgo">Import ${IMP.rows.length} row${IMP.rows.length===1?'':'s'}</button><span id="impprog" style="align-self:center;color:var(--muted)"></span></div></div>`;
  }
  $('#drawer').innerHTML=dHead(`Import ${SHEET[k].toLowerCase()} from Excel`,'Bring in your existing register in one go')+`<div class="db">${body}</div>`;
}
function setSheet(aoa){
  const rows=aoa.filter(r=>r&&r.some(c=>String(c??'').trim()!==''));
  if(rows.length<2){toast('Add a header row and at least one data row.','bad');return}
  IMP.headers=rows[0].map(h=>String(h??'').trim());IMP.rows=rows.slice(1);IMP.map=autoMap(IMP.kind,IMP.headers);drawImport();
}
function buildRow(k,r){
  const g=key=>IMP.map[key]===undefined||IMP.map[key]===''?'':r[IMP.map[key]];
  const s=key=>String(g(key)??'').trim();const n=key=>{const x=parseFloat(String(g(key)??'').replace(/[^0-9.]/g,''));return isNaN(x)?null:x};
  if(k==='students')return {name:s('name'),phone:s('phone'),email:s('email'),education:s('education'),guardian:s('guardian'),guardianPhone:s('guardianPhone'),programmeId:findProg(s('programme')),batchId:findBatch(s('batch')),centre:s('centre'),joinedOn:toISO(g('joinedOn'))||today(),feeTotal:n('feeTotal'),discount:n('discount'),nextDue:toISO(g('nextDue')),status:pickOpt(s('status'),ST.students,'Active'),notes:s('notes'),docs:[],_paid:n('paid')};
  if(k==='enquiries')return {name:s('name'),phone:s('phone'),email:s('email'),kind:pickOpt(s('kind'),KINDS,'Student course'),programmeId:findProg(s('programme')),source:pickOpt(s('source'),SOURCES,'Other'),stage:pickOpt(s('stage'),ST.enquiries,'New'),centre:s('centre'),followUp:toISO(g('followUp')),notes:s('notes')};
  return {name:s('name'),phone:s('phone'),email:s('email'),city:s('city'),expertise:s('expertise').split(/[,;/]/).map(x=>x.trim()).filter(Boolean),experience:n('experience'),rateType:pickOpt(s('rateType'),['Per day','Per hour','Per session','Per batch'],'Per day'),rate:n('rate'),stage:pickOpt(s('stage'),ST.trainers,'Applied'),notes:s('notes'),docs:[]};
}
async function runImport(){
  const k=IMP.kind;if(IMP.map.name===undefined){toast('Choose which column holds the name.','bad');return}
  const btn=document.querySelector('[data-a="impgo"]');btn.disabled=true;
  const seen=new Set(S[k].map(x=>last10(x.phone)).filter(Boolean));
  let done=0,skipped=0,failed=0;const total=IMP.rows.length;const prog=$('#impprog');
  for(const r of IMP.rows){
    const v=buildRow(k,r);
    if(!v.name){skipped++;continue}
    const p=last10(v.phone);
    if(IMP.skipDup&&p&&seen.has(p)){skipped++;continue}
    const paid=v._paid;delete v._paid;
    if(k==='students')v.code=`SB${today().slice(2,4)}${today().slice(5,7)}-${rnd(4)}`;
    try{const ref=await add(k,v);if(k==='students'&&paid>0)await add('payments',{studentId:ref.id,amount:paid,date:v.joinedOn||today(),mode:'Cash',note:'Opening balance from imported sheet',receiptNo:`OB-${rnd(6)}`});done++;if(p)seen.add(p)}catch(e){failed++;if(e&&e.code==='quota_exceeded'){toast(errMsg(e),'bad');break}}
    if(prog)prog.textContent=`${done+skipped+failed} of ${total}…`;
  }
  toast(`Imported ${done} ${SHEET[k].toLowerCase()}${skipped?`, skipped ${skipped}`:''}${failed?`, ${failed} failed`:''}.`,failed?'bad':'');
  closeDrawer();
}
function template(k){save(`${SHEET[k]} import template.xlsx`,book([[SHEET[k],[Object.fromEntries(IMPF[k].map(([,l])=>[l,'']))]]]))}

/* ---------- events ---------- */
document.addEventListener('click',async ev=>{
  const menu=$('#newmenu');if(menu&&menu.open&&!ev.target.closest('#newmenu summary'))menu.open=false;
  if(ev.target.closest('a[target="_blank"]'))return;
  const el=ev.target.closest('[data-a]');
  if(!el)return;
  const a=el.dataset.a,k=el.dataset.k,id=el.dataset.id,v=el.dataset.v;
  if(a==='rpublish'||a==='rpin'){const r=M.resources.get(el.dataset.id);if(!r)return;const key=a==='rpublish'?'published':'pinned';await W(()=>upd('resources',r.id,{[key]:!r[key]}),a==='rpublish'?(r.published?'Hidden from the website':'Published on the website'):(r.pinned?'Unpinned':'Pinned to the top'));return}
  if(a==='theme'){toggleTheme();el.closest('details')?.removeAttribute('open');return}
  if(a==='opennav'){setNav(true);return}
  if(a==='closenav'){setNav(false);return}
  if(a==='hidetour'){try{localStorage.setItem(TOUR_KEY,'1')}catch{}render();return}
  if(['stage','progfilter','monthfilter','attdate','impmap','atttick','doc','impdup','impfile','setrole'].includes(a))return; // handled on change
  switch(a){
    case 'new':openForm(k);break;
    case 'open':ev.preventDefault();openDetail(k,id);break;
    case 'edit':openForm(k,id);break;
    case 'close':closeDrawer();break;
    case 'back':D&&D.id?openDetail(D.kind,D.id):closeDrawer();break;
    case 'filter':FL[el.dataset.g][el.dataset.f]=v;render();break;
    case 'feestab':FL.fees.tab=v;if(view!=='fees'){location.hash='fees'}else render();break;
    case 'del':if(el.dataset.confirm){const ok=await W(()=>del(k,id),`${NOUN[k][0].toUpperCase()+NOUN[k].slice(1)} deleted`);if(ok)closeDrawer()}else{el.dataset.confirm='1';el.textContent='Click again to delete permanently';}break;
    case 'contacted':await W(()=>upd('enquiries',id,{stage:(M.enquiries.get(id)?.stage==='New'?'Contacted':M.enquiries.get(id)?.stage),followUp:addDays(today(),2)}),'Marked contacted. Follow-up moved 2 days ahead.');break;
    case 'convert':{const e=M.enquiries.get(id);openForm('students',null,{name:e.name,phone:e.phone,email:e.email,programmeId:e.programmeId,centre:e.centre,notes:e.notes,fromEnquiry:id});break}
    case 'totrainer':{const e=M.enquiries.get(id);openForm('trainers',null,{name:e.name,phone:e.phone,email:e.email,notes:e.notes,fromEnquiry:id});break}
    case 'pay':openForm('payments',null,{studentId:id});break;
    case 'receipt':{const p=M.payments.get(id);if(p)receipt(p);break}
    case 'cert':{const s=M.students.get(id);if(s)certificate(s);break}
    case 'invoice':{const e=M.engagements.get(id);if(e)invoice(e);break}
    case 'newpayout':openForm('payouts',null,{trainerId:id});break;
    case 'batchpayout':{const b=M.batches.get(id);const t=trn(b.trainerId);openForm('payouts',null,{trainerId:b.trainerId,forWhat:`Batch ${b.code}`,amount:t?.rateType==='Per batch'?t.rate:(t?.rateType==='Per session'?(t.rate||0)*Object.keys(b.attendance||{}).length:null)});break}
    case 'engpayout':{const e=M.engagements.get(id);const t=trn(e.trainerId);openForm('payouts',null,{trainerId:e.trainerId,forWhat:`${e.client} · ${pname(e.programmeId)}`,amount:t?.rateType==='Per day'?(t.rate||0)*(+e.days||1):null});break}
    case 'payoutpaid':await W(()=>upd('payouts',id,{status:'Paid',date:today()}),'Payout marked paid');break;
    case 'addstudent':{const b=M.batches.get(id);openForm('students',null,{batchId:id,programmeId:b.programmeId,centre:b.centre});break}
    case 'exportroster':{const b=M.batches.get(id);const days=Object.keys(b.attendance||{}).sort();save(`${b.code} roster.xlsx`,book([[b.code,enrolled(b).map(s=>{const r={'Student ID':s.code,Name:s.name,Mobile:s.phone};days.forEach(d=>r[fmtS(d)]=(b.attendance[d]||[]).includes(s.id)?'P':'A');const at=attOf(s);r['Attendance %']=at?at.pct:'';r.Balance=fin(s).due;return r})]]));break}
    case 'attall':{const b=M.batches.get(ATT.batchId);const ids=enrolled(b).map(s=>s.id);ATT.set=ATT.set.size===ids.length?new Set():new Set(ids);drawDetail();break}
    case 'attpick':{const b=M.batches.get(ATT.batchId);ATT.date=v;ATT.set=new Set((b.attendance||{})[v]||[]);drawDetail();break}
    case 'attsave':{const b=M.batches.get(ATT.batchId);const ids=[...ATT.set];await W(()=>upd('batches',b.id,{attendance:{[ATT.date]:ids},...(b.status==='Upcoming'?{status:'Running'}:{})}),`Attendance saved for ${fmtS(ATT.date)}: ${ids.length} present`);break}
    case 'copy':try{await navigator.clipboard.writeText(el.dataset.text);toast('Copied')}catch{toast('Copy didn’t work here. Select the number instead.','bad')}break;
    case 'copydues':{const list=S.students.filter(s=>['Active','On hold'].includes(s.status)).map(s=>({s,f:fin(s)})).filter(x=>x.f.due>0);const txt=list.map(({s,f})=>`${s.name}\t${s.phone||''}\t${pname(s.programmeId)}\t${f.due}\t${s.nextDue||''}`).join('\n');try{await navigator.clipboard.writeText('Name\tMobile\tProgramme\tBalance\tDue date\n'+txt);toast('Dues list copied. Paste it into Excel or WhatsApp.')}catch{toast('Copy didn’t work here. Use Export instead.','bad')}break}
    case 'export':exportX(k);break;
    case 'signout':BACKEND.signOut&&BACKEND.signOut();break;
    case 'resetdemo':if(!el.dataset.confirm){el.dataset.confirm='1';el.textContent='Click again to reset';break}BACKEND.reset&&BACKEND.reset();break;
    case 'backup':backup();break;
    case 'import':openImport(k);break;
    case 'template':template(k);break;
    case 'imppaste':{const t=$('#imppaste').value;if(!t.trim()){toast('Paste rows copied from Excel first.','bad');break}setSheet(t.split(/\r?\n/).map(l=>l.split('\t')));break}
    case 'impgo':runImport();break;
    case 'rmsamples':{if(!el.dataset.confirm){el.dataset.confirm='1';el.textContent='Click again to remove all sample records';break}
      el.disabled=true;let n=0;for(const c of COLS){for(const d of S[c].filter(x=>x.sample)){try{await del(c,d.id);n++;el.textContent=`Removing… ${n}`}catch(e){toast(errMsg(e),'bad');return}}}toast(`Removed ${n} sample records`);break}
  }
});
document.addEventListener('change',async ev=>{
  const el=ev.target;const a=el.dataset.a;
  if(a==='setrole'){try{await BACKEND.team.setRole(el.dataset.id,el.value);toast('Role updated')}catch(e){toast('Couldn’t change the role.','bad');loadTeam()}return}
  if(a==='stage'){const k=el.dataset.k,id=el.dataset.id;await W(()=>upd(k,id,{[SK[k]]:el.value}),`Moved to ${el.value}`);return}
  if(a==='progfilter'){FL.students.prog=el.value;render();return}
  if(a==='monthfilter'){FL.fees.month=el.value;render();return}
  if(a==='doc'){const k=el.dataset.k,id=el.dataset.id;const d=M[k].get(id);const set=new Set(d.docs||[]);el.checked?set.add(el.value):set.delete(el.value);await W(()=>upd(k,id,{docs:[...set]}));return}
  if(a==='atttick'){el.checked?ATT.set.add(el.value):ATT.set.delete(el.value);const c=document.querySelector('#drawer .att')?.parentElement?.querySelector('.toolbar.w span');if(c){const b=M.batches.get(ATT.batchId);c.textContent=`${ATT.set.size} of ${enrolled(b).length} present`}return}
  if(a==='attdate'){const b=M.batches.get(ATT.batchId);ATT.date=el.value||today();ATT.set=new Set((b.attendance||{})[ATT.date]||[]);drawDetail();return}
  if(a==='impmap'){const v=el.value;if(v==='')delete IMP.map[el.dataset.v];else IMP.map[el.dataset.v]=+v;drawImport();return}
  if(a==='impdup'){IMP.skipDup=el.checked;return}
  if(a==='impfile'){const file=el.files[0];if(!file)return;
    try{setSheet(await readSheet(file))}catch(e){console.error(e);toast('Couldn’t read that file. Save it as Excel (.xlsx) or CSV and try again.','bad')}return}
  const form=el.closest('form.f');
  if(form&&form.dataset.kind==='students'&&el.name==='programmeId'){const fee=form.elements.feeTotal;const p=prog(el.value);if(fee&&p&&p.fee&&(!fee.value||fee.dataset.auto)){fee.value=p.fee;fee.dataset.auto='1'}}
  if(form&&form.dataset.kind==='students'&&el.name==='batchId'){const b=bat(el.value);if(b){if(!form.elements.programmeId.value){form.elements.programmeId.value=b.programmeId;form.elements.programmeId.dispatchEvent(new Event('change',{bubbles:true}))}if(!form.elements.centre.value&&b.centre)form.elements.centre.value=b.centre}}
  if(form&&form.dataset.kind==='payments'&&el.name==='studentId')payHint();
});
document.addEventListener('submit',ev=>{const f=ev.target.closest('form.f');if(!f)return;ev.preventDefault();submitForm(f)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#drawer').hidden)closeDrawer()});
let qt;$('#q').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{Q=e.target.value.trim();render()},120)});
window.addEventListener('hashchange',()=>{setNav(false);route()});

/* ---------- theme, shortcuts, phone menu, scroll progress ---------- */
function themeNow(){const t=document.documentElement.dataset.theme;return t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
function paintThemeBtn(){const dark=themeNow()==='dark';const b=$('#themeBtn');b.innerHTML=svgI(dark?'sun':'moon');b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');b.title=dark?'Light theme':'Dark theme'}
function toggleTheme(){
  const next=themeNow()==='dark'?'light':'dark';const root=document.documentElement;
  root.classList.add('theming');root.dataset.theme=next;try{localStorage.setItem('sb-theme',next)}catch{}
  paintThemeBtn();setTimeout(()=>root.classList.remove('theming'),450);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',paintThemeBtn);
paintThemeBtn();
if(/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent))$('#kbd').textContent='⌘ K';
document.addEventListener('keydown',ev=>{
  const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
  if((ev.key==='k'||ev.key==='K')&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();$('#q').focus();$('#q').select();return}
  if(ev.key==='/'&&!typing&&$('#drawer').hidden){ev.preventDefault();$('#q').focus();return}
  if(ev.key==='Escape'&&document.activeElement===$('#q')&&$('#q').value){$('#q').value='';Q='';render()}
  if(ev.key==='Escape'&&document.documentElement.classList.contains('navopen'))setNav(false);
});
function setNav(open){document.documentElement.classList.toggle('navopen',open);$('#navscrim').hidden=!open;$('#menuBtn').setAttribute('aria-expanded',open)}
let sp=0;addEventListener('scroll',()=>{if(sp)return;sp=requestAnimationFrame(()=>{sp=0;const h=document.documentElement.scrollHeight-innerHeight;$('#progress').style.transform=`scaleX(${h>0?Math.min(1,scrollY/h):0})`})},{passive:true});

route();
connect();
}
