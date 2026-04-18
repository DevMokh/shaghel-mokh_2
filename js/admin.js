// js/admin.js
import { db, APP_ID } from './firebase.js';
import { showToast } from './helpers.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const AID = 'shaghel-mokh-ultra-full';
const QCOL = () => collection(db, 'artifacts', AID, 'public', 'data', 'questions');
const SUBS = {
  'إسلاميات': ['قصص الأنبياء','القرآن الكريم','السيرة النبوية','الفقه الميسر'],
  'تاريخ مصر': ['الفراعنة','مصر الحديثة','آثار النوبة','ثورات مصر'],
  'تقنية': ['برمجة','ذكاء اصطناعي','أمن سيبراني','تاريخ الحواسيب'],
  'علوم وفضاء': ['الفضاء','جسم الإنسان','الكيمياء','الفيزياء الكمية'],
  'جغرافيا': ['عواصم','أعلام','عجائب الدنيا','تضاريس الأرض'],
  'رياضة': ['كرة قدم','أساطير','الأولمبياد','كأس العالم'],
  'ألغاز': ['منطق','أحجيات','رياضيات','ذكاء بصري'],
  'طعام': ['أطباق عالمية','حلويات','توابل','فواكه نادرة'],
  'أحياء القاهرة': ['وسط البلد','المعادي والزمالك','الإسكندرية','مدن جديدة'],
  'كلمات مصرية': ['أمثال شعبية','كلمات قبطية','عامية قديمة','ألقاب ومسميات'],
  'موسيقى وأغاني': ['أغاني الزمن الجميل','فيروز وأم كلثوم','نجوم الـ 80s','مهرجانات'],
  'سينما وتليفزيون': ['أفلام الـ 90s','نجوم الشاشة','مسلسلات رمضان','كلاكيت زمان'],
};
const $ = id => document.getElementById(id);
let allQs = [], filteredQs = [];

window.toast = (msg, type, dur) => showToast(msg, dur);
window.loadQs = async () => {
  $('ql').innerHTML = '<div class="state">جاري التحميل...</div>';
  try { const snap = await getDocs(query(QCOL(), orderBy('createdAt', 'desc'))); allQs = []; snap.forEach(d => allQs.push({ id: d.id, ...d.data() })); updateStats(); applyFilter(); window.toast(`✅ ${allQs.length} سؤال`); }
  catch (e) { $('ql').innerHTML = `<div class="state">❌ ${e.message}</div>`; }
};
window.applyFilter = () => {
  const cat = $('fcat').value, sub = $('fsub').value, s = $('sinp').value.trim().toLowerCase();
  filteredQs = allQs.filter(q => (!cat || q.category === cat) && (!sub || q.subCategory === sub) && (!s || q.t?.toLowerCase().includes(s) || q.a?.some(o => o.toLowerCase().includes(s))));
  $('lcnt').innerText = filteredQs.length + ' سؤال'; $('bdelall').style.display = filteredQs.length ? 'inline-flex' : 'none';
  renderList();
};
function renderList() { /* مشابه للكود السابق */ }
window.addManual = async () => { /* ... */ };
window.ss = (cid, sid) => { /* ... */ };
window.syncFsub = () => { /* ... */ };
window.sw = tab => { ['manual','ai','ai500','file','bulk'].forEach(t => { $(`tab-${t}`).style.display = t === tab ? 'block' : 'none'; }); };
// تحميل أولي
window.loadQs();
