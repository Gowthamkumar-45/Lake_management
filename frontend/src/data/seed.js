export const TALUKS = ['Ramanathapuram','Paramakudi','Tiruvadanai','Kamuthi','Mudukulathur','Rajasingamangalam','Kadaladi','Mandapam'];
export const TYPES = ['Lake','Pond','Canal','River','Kanmai'];
export const STATUSES = ['Full','Medium','Dry'];

export const BODIES = [
  { id:'WB-1042', name:'Periya Kanmai', type:'Kanmai', taluk:'Ramanathapuram', village:'Pamban Road', status:'Full', level:92, area:'48 ha', last:'12 Apr 2026', next:'12 Jul 2026', work:'Completed' },
  { id:'WB-1088', name:'Sathirakudi Periya Eri', type:'Lake', taluk:'Paramakudi', village:'Sathirakudi', status:'Medium', level:61, area:'120 ha', last:'02 Mar 2026', next:'15 Jun 2026', work:'In Progress' },
  { id:'WB-1153', name:'Kenikarai Pond', type:'Pond', taluk:'Mandapam', village:'Kenikarai', status:'Dry', level:14, area:'8 ha', last:'20 Dec 2025', next:'18 Jun 2026', work:'Pending' },
  { id:'WB-1207', name:'Vaigai Branch Canal', type:'Canal', taluk:'Paramakudi', village:'Abiramam', status:'Medium', level:54, area:'22 km', last:'28 Feb 2026', next:'28 Jun 2026', work:'In Progress' },
  { id:'WB-1260', name:'Kamuthi Big Tank', type:'Kanmai', taluk:'Kamuthi', village:'Kamuthi East', status:'Full', level:88, area:'66 ha', last:'05 Apr 2026', next:'05 Jul 2026', work:'Completed' },
  { id:'WB-1314', name:'Mudukulathur Eri', type:'Lake', taluk:'Mudukulathur', village:'Sayalkudi Rd', status:'Medium', level:47, area:'94 ha', last:'15 Jan 2026', next:'14 Jun 2026', work:'Pending' },
  { id:'WB-1377', name:'Gundar River Stretch', type:'River', taluk:'Tiruvadanai', village:'Devipattinam', status:'Medium', level:58, area:'31 km', last:'22 Mar 2026', next:'30 Jun 2026', work:'In Progress' },
  { id:'WB-1402', name:'Karangadu Pond', type:'Pond', taluk:'Tiruvadanai', village:'Karangadu', status:'Dry', level:9, area:'5 ha', last:'10 Nov 2025', next:'13 Jun 2026', work:'Pending' },
  { id:'WB-1455', name:'Kadaladi Oorani', type:'Pond', taluk:'Kadaladi', village:'Kadaladi', status:'Full', level:79, area:'12 ha', last:'18 Apr 2026', next:'18 Jul 2026', work:'Completed' },
  { id:'WB-1509', name:'Rajasingamangalam Kanmai', type:'Kanmai', taluk:'Rajasingamangalam', village:'R.S. Mangalam', status:'Medium', level:52, area:'40 ha', last:'01 Mar 2026', next:'24 Jun 2026', work:'In Progress' },
  { id:'WB-1562', name:'Uchipuli Canal', type:'Canal', taluk:'Mandapam', village:'Uchipuli', status:'Full', level:84, area:'17 km', last:'09 Apr 2026', next:'09 Jul 2026', work:'Completed' },
  { id:'WB-1610', name:'Thiruvadanai Big Eri', type:'Lake', taluk:'Tiruvadanai', village:'Tiruvadanai', status:'Full', level:90, area:'138 ha', last:'14 Apr 2026', next:'14 Jul 2026', work:'Completed' },
  { id:'WB-1668', name:'Sayalkudi Tank', type:'Kanmai', taluk:'Mudukulathur', village:'Sayalkudi', status:'Dry', level:11, area:'29 ha', last:'02 Dec 2025', next:'16 Jun 2026', work:'Pending' },
  { id:'WB-1721', name:'Ramnad South Oorani', type:'Pond', taluk:'Ramanathapuram', village:'Thiruppalaikudi', status:'Medium', level:49, area:'7 ha', last:'20 Feb 2026', next:'27 Jun 2026', work:'In Progress' },
];

export const ROLES = {
  admin:   { label:'District Administrator', short:'District Admin', name:'S. Karthikeyan', init:'SK', sub:'Ramnad HQ', org:'District Collectorate', landing:'/', nav:['/','/explore','/map','/water-bodies','/maintenance','/field','/reports','/master-data','/users'], canEdit:true, canExport:true, canManageUsers:true, scope:null },
  taluk:   { label:'Taluk Officer', short:'Taluk Officer', name:'R. Meenakshi', init:'RM', sub:'Paramakudi Taluk', org:'Paramakudi Taluk Office', landing:'/', nav:['/','/explore','/map','/water-bodies','/maintenance','/field','/reports'], canEdit:true, canExport:true, canManageUsers:false, scope:'Paramakudi' },
  field:   { label:'Field Officer', short:'Field Officer', name:'M. Rajesh', init:'MR', sub:'Field · Ramanathapuram', org:'Field Operations Unit', landing:'/field', nav:['/field'], canEdit:false, canExport:false, canManageUsers:false, scope:'Ramanathapuram' },
  auditor: { label:'Auditor', short:'Auditor', name:'A. Fathima', init:'AF', sub:'Audit Cell', org:'District Audit Cell', landing:'/', nav:['/','/explore','/map','/water-bodies','/reports'], canEdit:false, canExport:true, canManageUsers:false, scope:null },
};

export const USERS = [
  { name:'S. Karthikeyan', init:'SK', roleKey:'admin', taluk:'All taluks', phone:'+91 94421 00412', email:'collector.wb@ramnad.tn.gov.in', status:'Active', last:'Online now' },
  { name:'R. Meenakshi', init:'RM', roleKey:'taluk', taluk:'Paramakudi', phone:'+91 94422 18830', email:'to.paramakudi@ramnad.tn.gov.in', status:'Active', last:'12 min ago' },
  { name:'K. Suresh Kumar', init:'KS', roleKey:'taluk', taluk:'Mandapam', phone:'+91 94422 56091', email:'to.mandapam@ramnad.tn.gov.in', status:'Active', last:'1 hr ago' },
  { name:'P. Lakshmi', init:'PL', roleKey:'taluk', taluk:'Tiruvadanai', phone:'+91 94423 71205', email:'to.tiruvadanai@ramnad.tn.gov.in', status:'Active', last:'3 hr ago' },
  { name:'M. Rajesh', init:'MR', roleKey:'field', taluk:'Ramanathapuram', phone:'+91 95661 40027', email:'fo.rajesh@ramnad.tn.gov.in', status:'Active', last:'24 min ago' },
  { name:'V. Anand', init:'VA', roleKey:'field', taluk:'Mandapam', phone:'+91 95662 33914', email:'fo.anand@ramnad.tn.gov.in', status:'Active', last:'Yesterday' },
  { name:'S. Devan', init:'SD', roleKey:'field', taluk:'Kamuthi', phone:'+91 95663 88450', email:'fo.devan@ramnad.tn.gov.in', status:'On leave', last:'2 days ago' },
  { name:'J. Bhuvana', init:'JB', roleKey:'field', taluk:'Mudukulathur', phone:'+91 95664 10772', email:'fo.bhuvana@ramnad.tn.gov.in', status:'Active', last:'5 hr ago' },
  { name:'A. Fathima', init:'AF', roleKey:'auditor', taluk:'All taluks', phone:'+91 94424 90061', email:'audit.wb@ramnad.tn.gov.in', status:'Active', last:'30 min ago' },
  { name:'T. Ganesan', init:'TG', roleKey:'field', taluk:'Kadaladi', phone:'+91 95665 27188', email:'fo.ganesan@ramnad.tn.gov.in', status:'Inactive', last:'12 days ago' },
];

export const GEO_TREE = [
  { lb:'Ramanathapuram', type:'Municipality', taluk:'Ramanathapuram', wards:[
    { name:'Ward 1', areas:['Pamban Road','Thiruppalaikudi'] },
    { name:'Ward 5', areas:['Bazaar Street','Collectorate Nagar'] }]},
  { lb:'Paramakudi', type:'Municipality', taluk:'Paramakudi', wards:[
    { name:'Ward 3', areas:['Abiramam','Sathirakudi'] },
    { name:'Ward 8', areas:['Emaneswaram'] }]},
  { lb:'Rameswaram', type:'Town Panchayat', taluk:'Mandapam', wards:[
    { name:'Ward 2', areas:['Agni Theertham','Pamban'] },
    { name:'Ward 6', areas:['Uchipuli','Kenikarai'] }]},
  { lb:'Kamuthi', type:'Town Panchayat', taluk:'Kamuthi', wards:[
    { name:'Ward 4', areas:['Kamuthi East','Kamuthi West'] }]},
  { lb:'Mudukulathur', type:'Town Panchayat', taluk:'Mudukulathur', wards:[
    { name:'Ward 1', areas:['Sayalkudi Road'] }]},
  { lb:'Kadaladi', type:'Panchayat', taluk:'Kadaladi', villages:['Kadaladi','Devipattinam','Karangadu'] },
  { lb:'Tiruvadanai', type:'Panchayat', taluk:'Tiruvadanai', villages:['Tiruvadanai','Devipattinam','Karangadu'] },
  { lb:'R.S. Mangalam', type:'Panchayat', taluk:'Rajasingamangalam', villages:['R.S. Mangalam','Sikkal'] },
];

export const TALUK_STATS = [
  { name:'Ramanathapuram', total:214, full:128, med:62, dry:24 },
  { name:'Paramakudi', total:198, full:96, med:74, dry:28 },
  { name:'Tiruvadanai', total:176, full:104, med:48, dry:24 },
  { name:'Mudukulathur', total:152, full:60, med:58, dry:34 },
  { name:'Kamuthi', total:141, full:88, med:39, dry:14 },
  { name:'Mandapam', total:118, full:72, med:31, dry:15 },
];

export const TYPE_DIST = [
  { label:'Kanmai (Tanks)', count:486, color:'#0891b2' },
  { label:'Ponds', count:362, color:'#0ea5e9' },
  { label:'Lakes', count:228, color:'#0d9488' },
  { label:'Canals', count:142, color:'#38bdf8' },
  { label:'Rivers', count:66, color:'#7dd3fc' },
];

export const RECENT_UPDATES = [
  { officer:'M. Rajesh', init:'MR', action:'completed desilting at', body:'Periya Kanmai', taluk:'Ramanathapuram', time:'24 min ago', status:'Completed' },
  { officer:'A. Fathima', init:'AF', action:'uploaded progress photos for', body:'Sathirakudi Eri', taluk:'Paramakudi', time:'1 hr ago', status:'In Progress' },
  { officer:'K. Suresh', init:'KS', action:'flagged dry status at', body:'Kenikarai Pond', taluk:'Mandapam', time:'3 hr ago', status:'Pending' },
  { officer:'P. Lakshmi', init:'PL', action:'started bund repair at', body:'Gundar River', taluk:'Tiruvadanai', time:'5 hr ago', status:'In Progress' },
  { officer:'V. Anand', init:'VA', action:'closed weed-removal work at', body:'Uchipuli Canal', taluk:'Mandapam', time:'Yesterday', status:'Completed' },
];

export const WORK_POOL = [
  { type:'Desilting', name:'Tank-bed desilting', desc:'Mechanical removal of accumulated silt and sediment from the tank bed to restore storage capacity and improve groundwater recharge.', start:'02 Apr 2026', cend:'21 Apr 2026', prog:65, photos:4 },
  { type:'Bund strengthening', name:'Bund strengthening & turfing', desc:'Earthwork to raise and compact the tank bund with stone pitching on the water-face slope and turfing on the rear slope.', start:'10 Mar 2026', cend:'24 Mar 2026', prog:100, photos:6 },
  { type:'Encroachment removal', name:'Encroachment clearance drive', desc:'Survey-backed removal of unauthorised structures along the foreshore and supply channel, followed by boundary demarcation.', start:'18 Feb 2026', cend:'06 Mar 2026', prog:45, photos:3 },
  { type:'Canal cleaning', name:'Feeder canal cleaning', desc:'Clearing of silt, weeds and debris from the feeder canal to improve inflow into the water body during the monsoon.', start:'03 Feb 2026', cend:'15 Feb 2026', prog:100, photos:5 },
  { type:'Water flow restoration', name:'Inlet–outlet flow restoration', desc:'Repair of sluice gates and restoration of inlet and outlet structures to ensure free movement of water across the network.', start:'21 Jan 2026', cend:'04 Feb 2026', prog:30, photos:2 },
  { type:'Cleaning operations', name:'Weed & debris cleaning', desc:'Removal of invasive water hyacinth and floating debris from the water spread area to restore the open water surface.', start:'08 Jan 2026', cend:'19 Jan 2026', prog:100, photos:4 },
];

export const MAINTENANCE_TIMELINE = [
  { date:'24 Apr 2026', title:'Desilting completed', body:'Periya Kanmai', taluk:'Ramanathapuram', officer:'M. Rajesh', state:'Completed' },
  { date:'18 Apr 2026', title:'Bund strengthening — 70%', body:'Gundar River Stretch', taluk:'Tiruvadanai', officer:'P. Lakshmi', state:'In Progress' },
  { date:'12 Apr 2026', title:'Inlet channel cleared', body:'Kamuthi Big Tank', taluk:'Kamuthi', officer:'R. Devan', state:'Completed' },
  { date:'06 Apr 2026', title:'Weed removal scheduled', body:'Sathirakudi Periya Eri', taluk:'Paramakudi', officer:'A. Fathima', state:'In Progress' },
  { date:'28 Mar 2026', title:'Site inspection — dry bed', body:'Kenikarai Pond', taluk:'Mandapam', officer:'K. Suresh', state:'Pending' },
];

export const MONTHLY = [
  {m:'Jan',v:38},{m:'Feb',v:52},{m:'Mar',v:61},{m:'Apr',v:74},
  {m:'May',v:48},{m:'Jun',v:69},{m:'Jul',v:57},{m:'Aug',v:44},
  {m:'Sep',v:51},{m:'Oct',v:66},{m:'Nov',v:72},{m:'Dec',v:59},
];

export function hash(s) { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%100000; return h; }

export const WORK_OFFICERS = [
  { name:'M. Rajesh', init:'MR', desig:'Field Officer' },
  { name:'A. Fathima', init:'AF', desig:'Junior Engineer' },
  { name:'K. Suresh', init:'KS', desig:'Field Officer' },
  { name:'P. Lakshmi', init:'PL', desig:'Assistant Engineer' },
  { name:'V. Anand', init:'VA', desig:'Work Supervisor' },
  { name:'R. Devan', init:'RD', desig:'Field Officer' },
];

export const SRC_POOL = [
  { type:'Rain-fed catchment', name:'Direct catchment runoff', conn:['Local micro-catchment'], flow:'Inflow', side:'in' },
  { type:'Canal connection', name:'Vaigai Branch Canal', conn:['Vaigai Main Canal','Sathirakudi Eri'], flow:'Inflow', side:'in' },
  { type:'River connection', name:'Gundar River feeder', conn:['Gundar River'], flow:'Seasonal', side:'in' },
  { type:'Groundwater support', name:'Aquifer recharge zone', conn:['14 recharge wells'], flow:'Bidirectional', side:'in' },
  { type:'Inlet sluice', name:'North inlet sluice #2', conn:['Feeder channel FC-4'], flow:'Inflow', side:'in' },
  { type:'Outlet / surplus weir', name:'South surplus weir', conn:['Downstream ayacut','Karangadu Pond'], flow:'Outflow', side:'out' },
  { type:'Supply channel', name:'Ayacut supply channel', conn:['1,240-acre ayacut'], flow:'Outflow', side:'out' },
];

export const RENO_CATS = ['Under Renovation','Renovation Complete','Renovation Pending','Encroachment','Disappeared'];
export const STAGE_NAMES = ['Survey & demarcation','De-silting','Bund strengthening','Inlet / outlet work'];
