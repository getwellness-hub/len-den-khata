const SUPABASE_URL = "https://qqtfheaqkqudlyavyvcn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3iZQvq4ehh3yAhBxPDhJpw_0WFFSvI7";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const KEY = "lenDenKhata_v1";
const LOCAL_BACKUP_KEY = "lenDenKhata_local_backup_before_cloud";

let db = JSON.parse(
  localStorage.getItem(KEY) || '{"people":[]}'
);

let activePersonId = null;
let currentUser = null;
let cloudReady = false;

const $ = id => document.getElementById(id);

const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

const save = () =>
  localStorage.setItem(KEY, JSON.stringify(db));

const person = id =>
  db.people.find(p => p.id === id);
function balance(p) {
  return p.transactions.reduce(
    (s, t) =>
      s +
      (t.type === "given"
        ? Number(t.amount)
        : -Number(t.amount)),
    0
  );
}

function totals() {
  let net = 0;

  db.people.forEach(p => {
    net += balance(p);
  });

  return {
    receivable: db.people.reduce(
      (s, p) => s + Math.max(balance(p), 0),
      0
    ),
    payable: db.people.reduce(
      (s, p) => s + Math.max(-balance(p), 0),
      0
    ),
    net
  };
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}

function openModal(id) {
  $(id).classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function toast(s) {
  $("toast").textContent = s;
  $("toast").style.display = "block";

  setTimeout(() => {
    $("toast").style.display = "none";
  }, 1800);
 }
function render() {
  const t = totals();

  $("totalReceivable").textContent = money(t.receivable);
  $("totalPayable").textContent = money(t.payable);

  $("netBalance").textContent =
    money(Math.abs(t.net)) +
    (t.net > 0
      ? " (You will receive)"
      : t.net < 0
      ? " (You will pay)"
      : "");

  $("totalAccounts").textContent = db.people.length;

  const q = $("searchInput").value.trim().toLowerCase();

  const list = db.people.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      (p.mobile || "").includes(q)
  );

  $("emptyState").classList.toggle(
    "hidden",
    db.people.length > 0
  );

  $("accountsList").innerHTML = list.map(p => {
    const b = balance(p);

    const cls =
      b > 0 ? "receivable" :
      b < 0 ? "payable" : "zero";

    const label =
      b > 0 ? "You will receive" :
      b < 0 ? "You will pay" : "Settled";

    return `
      <div class="account-card" data-id="${p.id}">
        <div class="person-info">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.mobile || "No mobile")} · ${p.transactions.length} transaction${p.transactions.length === 1 ? "" : "s"}</p>
        </div>
        <div class="amount ${cls}">
          <strong>${money(Math.abs(b))}</strong>
          <small>${label}</small>
        </div>
      </div>
    `;
  }).join("");

  if (db.people.length === 0) {
    $("accountsList").innerHTML = "";
  }
}

function setCloudStatus(text) {
  $("cloudStatus").textContent = text;
}
function openAccount(id) {
  activePersonId = id;

  const p = person(id);
  if (!p) return;

  $("accountTitle").textContent = p.name;
  $("accountSub").textContent = p.mobile || "";

  renderTransactions(p);
  openModal("accountModal");
}

function renderTransactions(p) {
  const b = balance(p);

  $("accountBalance").textContent =
    `Balance: ${money(Math.abs(b))}` +
    `${b > 0
      ? " — You will receive"
      : b < 0
      ? " — You will pay"
      : " — Settled"}`;

  const tx = [...p.transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.created - a.created
  );

  $("transactionList").innerHTML = tx.length
    ? tx.map(t => `
      <div class="transaction">
        <div class="tx-left">
          <strong class="${
            t.type === "given"
              ? "tx-given"
              : "tx-received"
          }">
            ${
              t.type === "given"
                ? "I Gave Money"
                : "I Received Money"
            } · ${money(t.amount)}
          </strong>
          <small>
            ${esc(t.date)}
            ${t.note ? " · " + esc(t.note) : ""}
          </small>
        </div>
        <div class="tx-actions">
          <button onclick="editTx('${t.id}')">
            Edit
          </button>
          <button onclick="deleteTx('${t.id}')">
            Delete
          </button>
        </div>
      </div>
    `).join("")
    : `<p style="text-align:center;color:#6b7280;padding:25px">
         No transactions yet.
       </p>`;
}
$("addPersonBtn").onclick = () => openPerson();

$("emptyAddBtn").onclick = () => openPerson();

$("searchInput").oninput = render;

$("accountsList").onclick = e => {
  const card = e.target.closest(".account-card");
  if (card) {
    openAccount(card.dataset.id);
  }
};

function openPerson(p = null) {
  $("personModalTitle").textContent =
    p ? "Edit Account" : "New Account";

  $("personId").value = p?.id || "";
  $("personName").value = p?.name || "";
  $("personMobile").value = p?.mobile || "";
  $("personNote").value = p?.note || "";

  openModal("personModal");
}

$("personForm").onsubmit = async e => {
  e.preventDefault();

  if (!currentUser) {
    toast("Please sign in first");
    return;
  }

  const id = $("personId").value;

  try {
    if (id) {
      const p = person(id);

      p.name = $("personName").value.trim();
      p.mobile = $("personMobile").value.trim();
      p.note = $("personNote").value.trim();

      const { error } =
        await supabaseClient
          .from("people")
          .update({
            name: p.name,
            mobile: p.mobile,
            note: p.note
          })
          .eq("id", id)
          .eq("user_id", currentUser.id);

      if (error) throw error;

      toast("Account updated");
    } else {
      const p = {
        id: crypto.randomUUID(),
        user_id: currentUser.id,
        name: $("personName").value.trim(),
        mobile: $("personMobile").value.trim(),
        note: $("personNote").value.trim(),
        transactions: []
      };

      const { error } =
        await supabaseClient
          .from("people")
          .insert({
            id: p.id,
            user_id: currentUser.id,
            name: p.name,
            mobile: p.mobile,
            note: p.note
          });

      if (error) throw error;

      db.people.push(p);

      toast("Account created");
    }

    save();
    closeModal("personModal");
    render();

  } catch (err) {
    console.error(err);
    toast("Could not save account");
  }
};
$("giveBtn").onclick = () => openTx("given");
$("receiveBtn").onclick = () => openTx("received");

function openTx(type, t = null) {
  $("transactionTitle").textContent =
    t
      ? "Edit Transaction"
      : type === "given"
      ? "I Gave Money"
      : "I Received Money";

  $("transactionType").value = type;
  $("transactionAmount").value = t?.amount || "";
  $("transactionDate").value =
    t?.date || new Date().toISOString().slice(0, 10);
  $("transactionNote").value = t?.note || "";

  $("transactionForm").dataset.id = t?.id || "";

  openModal("transactionModal");
}

$("transactionForm").onsubmit = async e => {
  e.preventDefault();

  if (!currentUser) {
    toast("Please sign in first");
    return;
  }

  const p = person(activePersonId);
  const id = e.currentTarget.dataset.id;

  const tx = {
    id: id || crypto.randomUUID(),
    type: $("transactionType").value,
    amount: Number($("transactionAmount").value),
    date: $("transactionDate").value,
    note: $("transactionNote").value.trim(),
    created: Date.now()
  };

  try {
    if (id) {
      const { error } =
        await supabaseClient
          .from("transactions")
          .update({
            type: tx.type,
            amount: tx.amount,
            transaction_date: tx.date,
            note: tx.note
          })
          .eq("id", id)
          .eq("user_id", currentUser.id);

      if (error) throw error;

      const old = p.transactions.find(x => x.id === id);
      Object.assign(old, tx);

      toast("Transaction updated");
    } else {
      const { error } =
        await supabaseClient
          .from("transactions")
          .insert({
            id: tx.id,
            user_id: currentUser.id,
            person_id: p.id,
            type: tx.type,
            amount: tx.amount,
            transaction_date: tx.date,
            note: tx.note
          });

      if (error) throw error;

      p.transactions.push(tx);

      toast("Transaction saved");
    }

    save();
    closeModal("transactionModal");
    renderTransactions(p);
    render();

  } catch (err) {
    console.error(err);
    toast("Could not save transaction");
  }
};
window.editTx = id => {
  const p = person(activePersonId);
  const t = p?.transactions.find(x => x.id === id);

  if (t) openTx(t.type, t);
};

window.deleteTx = async id => {
  if (!confirm("Delete this transaction?")) return;
  if (!currentUser) return;

  const p = person(activePersonId);

  try {
    const { error } =
      await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) throw error;

    p.transactions =
      p.transactions.filter(t => t.id !== id);

    save();
    renderTransactions(p);
    render();
    toast("Transaction deleted");

  } catch (err) {
    console.error(err);
    toast("Could not delete transaction");
  }
};

$("deleteAccountBtn").onclick = async () => {
  if (!confirm(
    "Delete this entire account and its transactions?"
  )) return;

  if (!currentUser) return;

  try {
    const { error } =
      await supabaseClient
        .from("people")
        .delete()
        .eq("id", activePersonId)
        .eq("user_id", currentUser.id);

    if (error) throw error;

    db.people =
      db.people.filter(p => p.id !== activePersonId);

    save();
    closeModal("accountModal");
    render();
    toast("Account deleted");

  } catch (err) {
    console.error(err);
    toast("Could not delete account");
  }
};

$("editAccountBtn").onclick = () => {
  const p = person(activePersonId);

  closeModal("accountModal");
  openPerson(p);
};

document
  .querySelectorAll("[data-close]")
  .forEach(b => {
    b.onclick = () => closeModal(b.dataset.close);
  });

document
  .querySelectorAll(".modal")
  .forEach(m => {
    m.onclick = e => {
      if (e.target === m) closeModal(m.id);
    };
  });

async function signIn() {
  $("googleLoginBtn").disabled = true;
  $("loginError").style.display = "none";

  const redirectTo =
    window.location.origin + window.location.pathname;

  const { error } =
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

  if (error) {
    $("googleLoginBtn").disabled = false;
    $("loginError").textContent = error.message;
    $("loginError").style.display = "block";
  }
}

async function signOut() {
  await supabaseClient.auth.signOut();
}

function updateAuthUI() {
  const area = $("authArea");

  if (!currentUser) {
    area.innerHTML = "";
    $("loginGate").classList.remove("hidden");
    setCloudStatus("Cloud sync: sign in required");
    return;
  }

  $("loginGate").classList.add("hidden");

  const email =
    currentUser.email || "Google account";

  area.innerHTML = `
    <span class="auth-user">${esc(email)}</span>
    <button class="auth-btn" id="logoutBtn">
      Log out
    </button>
  `;

  $("logoutBtn").onclick = signOut;
}

$("googleLoginBtn").onclick = signIn;

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  }
);

async function uploadLocalData() {
  if (!currentUser || !db.people.length) return;

  localStorage.setItem(
    LOCAL_BACKUP_KEY,
    JSON.stringify(db)
  );

  const peopleRows = db.people.map(p => ({
    id: p.id,
    user_id: currentUser.id,
    name: p.name,
    mobile: p.mobile || null,
    note: p.note || null
  }));

  let { error } =
    await supabaseClient
      .from("people")
      .insert(peopleRows);

  if (error) throw error;

  const txRows = [];

  db.people.forEach(p => {
    p.transactions.forEach(t => {
      txRows.push({
        id: t.id,
        user_id: currentUser.id,
        person_id: p.id,
        type: t.type,
        amount: Number(t.amount),
        transaction_date: t.date,
        note: t.note || null
      });
    });
  });

  if (txRows.length) {
    ({ error } =
      await supabaseClient
        .from("transactions")
        .insert(txRows));

    if (error) throw error;
  }
   }
async function loadCloudData() {
  setCloudStatus("Cloud sync: loading...");

  const { data: peopleRows, error: peopleError } =
    await supabaseClient
      .from("people")
      .select("id,name,mobile,note,created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });

  if (peopleError) throw peopleError;

  const { data: txRows, error: txError } =
    await supabaseClient
      .from("transactions")
      .select(
        "id,person_id,type,amount,transaction_date,note,created_at"
      )
      .eq("user_id", currentUser.id)
      .order("transaction_date", { ascending: true });

  if (txError) throw txError;

  if (peopleRows.length === 0 && db.people.length > 0) {
    const yes = confirm(
      `We found ${db.people.length} local account(s) on this phone. Upload them to your Google account now?`
    );

    if (yes) {
      await uploadLocalData();
      return await loadCloudData();
    }
  }

  const peopleMap = new Map();

  peopleRows.forEach(p => {
    peopleMap.set(p.id, {
      id: p.id,
      name: p.name,
      mobile: p.mobile || "",
      note: p.note || "",
      transactions: []
    });
  });

  txRows.forEach(t => {
    const p = peopleMap.get(t.person_id);

    if (p) {
      p.transactions.push({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.transaction_date,
        note: t.note || "",
        created: new Date(t.created_at).getTime()
      });
    }
  });

  db = {
    people: [...peopleMap.values()]
  };

  save();
  cloudReady = true;
  setCloudStatus("Cloud sync: connected");
  render();
   }
render();
