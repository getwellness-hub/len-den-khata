const KEY="lenDenKhata_v1";
let db=JSON.parse(localStorage.getItem(KEY)||'{"people":[]}');
let activePersonId=null;

const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2});
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const person=id=>db.people.find(p=>p.id===id);
function balance(p){return p.transactions.reduce((s,t)=>s+(t.type==="given"?t.amount:-t.amount),0)}
function totals(){
 let net=0;db.people.forEach(p=>net+=balance(p));
 return {receivable:db.people.reduce((s,p)=>s+Math.max(balance(p),0),0),payable:db.people.reduce((s,p)=>s+Math.max(-balance(p),0),0),net};
}
function render(){
 const t=totals();$("totalReceivable").textContent=money(t.receivable);$("totalPayable").textContent=money(t.payable);$("netBalance").textContent=money(Math.abs(t.net))+(t.net>0?" (You will receive)":t.net<0?" (You will pay":"");$("totalAccounts").textContent=db.people.length;
 const q=$("searchInput").value.trim().toLowerCase();
 const list=db.people.filter(p=>p.name.toLowerCase().includes(q)||(p.mobile||"").includes(q));
 $("emptyState").classList.toggle("hidden",db.people.length>0);
 $("accountsList").innerHTML=list.map(p=>{
   const b=balance(p), cls=b>0?"receivable":b<0?"payable":"zero", label=b>0?"You will receive":b<0?"You will pay":"Settled";
   return `<div class="account-card" data-id="${p.id}"><div class="person-info"><h3>${esc(p.name)}</h3><p>${esc(p.mobile||"No mobile")} · ${p.transactions.length} transaction${p.transactions.length===1?"":"s"}</p></div><div class="amount ${cls}"><strong>${money(Math.abs(b))}</strong><small>${label}</small></div></div>`;
 }).join("");
 if(db.people.length===0) $("accountsList").innerHTML="";
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
function toast(s){$("toast").textContent=s;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",1800)}
function openAccount(id){
 activePersonId=id;const p=person(id);$("accountTitle").textContent=p.name;$("accountSub").textContent=p.mobile||"";
 renderTransactions(p);openModal("accountModal");
}
function renderTransactions(p){
 const b=balance(p);$("accountBalance").textContent=`Balance: ${money(Math.abs(b))}${b>0?" — You will receive":b<0?" — You will pay":" — Settled"}`;
 const tx=[...p.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
 $("transactionList").innerHTML=tx.length?tx.map(t=>`<div class="transaction">
 <div class="tx-left"><strong class="${t.type==="given"?"tx-given":"tx-received"}">${t.type==="given"?"Money Given":"Money Received"} · ${money(t.amount)}</strong><small>${t.date}${t.note?" · "+esc(t.note):""}</small></div>
 <div class="tx-actions"><button onclick="editTx('${t.id}')">Edit</button><button onclick="deleteTx('${t.id}')">Delete</button></div></div>`).join(""):`<p style="text-align:center;color:#6b7280;padding:25px">No transactions yet.</p>`;
}
$("addPersonBtn").onclick=()=>openPerson();
$("emptyAddBtn").onclick=()=>openPerson();
$("searchInput").oninput=render;
$("accountsList").onclick=e=>{const card=e.target.closest(".account-card");if(card)openAccount(card.dataset.id)};
function openPerson(p=null){
 $("personModalTitle").textContent=p?"Edit Account":"New Account";$("personId").value=p?.id||"";$("personName").value=p?.name||"";$("personMobile").value=p?.mobile||"";$("personNote").value=p?.note||"";openModal("personModal");
}
$("personForm").onsubmit=e=>{e.preventDefault();let id=$("personId").value;
 if(id){let p=person(id);p.name=$("personName").value.trim();p.mobile=$("personMobile").value.trim();p.note=$("personNote").value.trim();toast("Account updated")}
 else {db.people.push({id:crypto.randomUUID(),name:$("personName").value.trim(),mobile:$("personMobile").value.trim(),note:$("personNote").value.trim(),transactions:[]});toast("Account created")}
 save();closeModal("personModal");render();
};
$("giveBtn").onclick=()=>openTx("given");$("receiveBtn").onclick=()=>openTx("received");
function openTx(type,t=null){$("transactionTitle").textContent=t?"Edit Transaction":type==="given"?"Money Given":"Money Received";$("transactionType").value=type;$("transactionAmount").value=t?.amount||"";$("transactionDate").value=t?.date||new Date().toISOString().slice(0,10);$("transactionNote").value=t?.note||"";$("transactionForm").dataset.id=t?.id||"";openModal("transactionModal")}
$("transactionForm").onsubmit=e=>{e.preventDefault();const p=person(activePersonId),id=e.currentTarget.dataset.id,type=$("transactionType").value,tx={id:id||crypto.randomUUID(),type,amount:Number($("transactionAmount").value),date:$("transactionDate").value,note:$("transactionNote").value.trim(),created:Date.now()};
 if(id){const old=p.transactions.find(x=>x.id===id);Object.assign(old,tx)}else p.transactions.push(tx);
 save();closeModal("transactionModal");renderTransactions(p);render();toast("Transaction saved");
};
window.editTx=id=>{const p=person(activePersonId),t=p.transactions.find(x=>x.id===id);openTx(t.type,t)};
window.deleteTx=id=>{if(!confirm("Delete this transaction?"))return;const p=person(activePersonId);p.transactions=p.transactions.filter(t=>t.id!==id);save();renderTransactions(p);render();toast("Transaction deleted")};
$("deleteAccountBtn").onclick=()=>{if(!confirm("Delete this entire account and its transactions?"))return;db.people=db.people.filter(p=>p.id!==activePersonId);save();closeModal("accountModal");render();toast("Account deleted")};
$("statementBtn").onclick=()=>{
 const p=person(activePersonId);const b=balance(p);const rows=[...p.transactions].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>`<tr><td>${t.date}</td><td>${t.type==="given"?"Money Given":"Money Received"}</td><td>${money(t.amount)}</td><td>${esc(t.note||"")}</td></tr>`).join("");
 const w=window.open("","_blank");w.document.write(`<html><head><title>${esc(p.name)} - Len-Den Khata</title><style>body{font-family:Arial;padding:30px;color:#17202a}h1{color:#0f766e}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:9px;text-align:left}th{background:#f0fdfa}.summary{padding:12px;background:#f0fdfa;border-radius:8px}</style></head><body><h1>Len-Den Khata</h1><h2>${esc(p.name)}</h2><p>${esc(p.mobile||"")}</p><div class="summary"><b>Balance: ${money(Math.abs(b))} ${b>0?"(You will receive)":b<0?"(You will pay)":"(Settled)"}</b></div><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table><p>Generated on ${new Date().toLocaleString("en-IN")}</p><script>window.print()<\/script></body></html>`);w.document.close();
};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="len-den-khata-backup.json";a.click();toast("Backup exported")};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
render();
