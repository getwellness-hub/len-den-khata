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
 <div class="tx-left"><strong class="${t.type==="given"?"tx-given":"tx-received"}">${t.type==="given"?"I Gave Money":"I Received Money"} · ${money(t.amount)}</strong><small>${t.date}${t.note?" · "+esc(t.note):""}</small></div>
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
function openTx(type,t=null){$("transactionTitle").textContent=t?"Edit Transaction":type==="given"?"I Gave Money":"I Received Money";$("transactionType").value=type;$("transactionAmount").value=t?.amount||"";$("transactionDate").value=t?.date||new Date().toISOString().slice(0,10);$("transactionNote").value=t?.note||"";$("transactionForm").dataset.id=t?.id||"";openModal("transactionModal")}
$("transactionForm").onsubmit=e=>{e.preventDefault();const p=person(activePersonId),id=e.currentTarget.dataset.id,type=$("transactionType").value,tx={id:id||crypto.randomUUID(),type,amount:Number($("transactionAmount").value),date:$("transactionDate").value,note:$("transactionNote").value.trim(),created:Date.now()};
 if(id){const old=p.transactions.find(x=>x.id===id);Object.assign(old,tx)}else p.transactions.push(tx);
 save();closeModal("transactionModal");renderTransactions(p);render();toast("Transaction saved");
};
window.editTx=id=>{const p=person(activePersonId),t=p.transactions.find(x=>x.id===id);openTx(t.type,t)};
window.deleteTx=id=>{if(!confirm("Delete this transaction?"))return;const p=person(activePersonId);p.transactions=p.transactions.filter(t=>t.id!==id);save();renderTransactions(p);render();toast("Transaction deleted")};
$("deleteAccountBtn").onclick=()=>{if(!confirm("Delete this entire account and its transactions?"))return;db.people=db.people.filter(p=>p.id!==activePersonId);save();closeModal("accountModal");render();toast("Account deleted")};
$("statementBtn").onclick=()=>{
 const p=person(activePersonId);
 const sorted=[...p.transactions].sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
 let running=0;
 const rows=sorted.map(t=>{
   running += t.type==="given"?t.amount:-t.amount;
   const label=t.type==="given"?"Money Given":"Money Received";
   const status=running>0?"Receivable":running<0?"Payable":"Settled";
   return `<tr>
     <td>${esc(t.date)}</td>
     <td><span class="badge ${t.type==="given"?"given":"received"}">${label}</span></td>
     <td class="amount">${money(t.amount)}</td>
     <td>${esc(t.note||"—")}</td>
     <td class="balance">${money(Math.abs(running))}<small>${status}</small></td>
   </tr>`;
 }).join("");

 const b=balance(p);
 const status=b>0?"Amount Receivable":b<0?"Amount Payable":"Account Settled";
 const generated=new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
 const w=window.open("","_blank");
 if(!w){toast("Please allow pop-ups to print the statement");return;}
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Transaction Record - ${esc(p.name)}</title>
 <style>
 @page{size:A4;margin:14mm}
 *{box-sizing:border-box}
 body{margin:0;background:#fff;color:#17202a;font-family:Arial,Helvetica,sans-serif;font-size:12px}
 .sheet{max-width:780px;margin:auto}
 .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f766e;padding-bottom:16px}
 .brand{font-size:24px;font-weight:800;color:#0f766e}.subtitle{color:#64748b;margin-top:4px;font-size:11px}
 .statement-title{text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700}
 .customer{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}
 .box{border:1px solid #e2e8f0;border-radius:8px;padding:12px}
 .label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
 .value{font-size:14px;font-weight:700}
 .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
 .sum{border-radius:8px;padding:11px;border:1px solid #e2e8f0}
 .sum .label{margin-bottom:5px}.sum .value{font-size:16px}
 .receivable{color:#15803d}.payable{color:#b91c1c}.settled{color:#475569}
 table{width:100%;border-collapse:collapse}
 th{background:#f0fdfa;color:#134e4a;text-align:left;font-size:10px;text-transform:uppercase;padding:9px;border-bottom:1px solid #cbd5e1}
 td{padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
 td.amount,td.balance{text-align:right;white-space:nowrap;font-weight:700}
 td.balance small{display:block;font-size:8px;color:#64748b;font-weight:400;margin-top:2px}
 .badge{font-size:9px;padding:4px 6px;border-radius:5px;font-weight:700;display:inline-block}
 .badge.given{background:#dcfce7;color:#166534}.badge.received{background:#fee2e2;color:#991b1b}
 .empty{text-align:center;padding:25px;color:#64748b}
 .footer{margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
 .note{margin-top:14px;background:#f8fafc;border-radius:7px;padding:9px;color:#475569;font-size:9px}
 @media print{.no-print{display:none}}
 </style></head><body><div class="sheet">
 <div class="header"><div><div class="brand">Transaction Record</div><div class="subtitle">Simple &amp; Secure Money Tracking</div></div><div class="statement-title">Statement of Account</div></div>
 <div class="customer">
   <div class="box"><div class="label">Account Holder</div><div class="value">${esc(p.name)}</div></div>
   <div class="box"><div class="label">Mobile Number</div><div class="value">${esc(p.mobile||"Not provided")}</div></div>
 </div>
 <div class="summary">
   <div class="sum"><div class="label">Money Given</div><div class="value">₹${p.transactions.filter(t=>t.type==="given").reduce((s,t)=>s+t.amount,0).toLocaleString("en-IN")}</div></div>
   <div class="sum"><div class="label">Money Received</div><div class="value">₹${p.transactions.filter(t=>t.type==="received").reduce((s,t)=>s+t.amount,0).toLocaleString("en-IN")}</div></div>
   <div class="sum"><div class="label">${status}</div><div class="value ${b>0?"receivable":b<0?"payable":"settled"}">${money(Math.abs(b))}</div></div>
 </div>
 ${rows?`<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th><th>Running Balance</th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty">No transactions recorded.</div>`}
 <div class="note"><b>Balance meaning:</b> Receivable means money is due to you. Payable means money is due from you. This statement is generated from the Transaction Record app.</div>
 <div class="footer"><span>Generated: ${generated}</span><span>Transaction Record</span></div>
 </div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
 w.document.close();
};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="len-den-khata-backup.json";a.click();toast("Backup exported")};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
render();

$("editAccountBtn").onclick=()=>{const p=person(activePersonId);closeModal("accountModal");openPerson(p)};
