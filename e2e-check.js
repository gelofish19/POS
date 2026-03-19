const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 4399;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "pos.e2e.sqlite");

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not start in time.");
}

async function api(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${PORT}${pathname}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${payload.error || response.status}`);
  }
  return payload;
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function runChecks() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      POS_DB_PATH: DB_PATH
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/api/health`);

    const staff = await api("/api/auth/staff");
    if (!Array.isArray(staff.staff) || staff.staff.length < 1) {
      throw new Error("Expected seeded staff users.");
    }

    const login = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ staffId: "u1", pin: "1234" })
    });
    if (!login.staff || login.staff.id !== "u1") {
      throw new Error("Expected admin login to succeed.");
    }

    const beforeSummary = await api("/api/dashboard/today-summary");

    const created = await api("/api/services", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Service",
        category: "Testing",
        price: 99,
        changedByStaffId: "u1"
      })
    });
    if (!created.service || !created.service.id) {
      throw new Error("Expected service create response.");
    }

    const serviceId = created.service.id;
    const patched = await api(`/api/services/${encodeURIComponent(serviceId)}`, {
      method: "PATCH",
      body: JSON.stringify({ price: 109, changedByStaffId: "u1" })
    });
    if (patched.service.price !== 109) {
      throw new Error("Expected service price update.");
    }

    const toggled = await api(`/api/services/${encodeURIComponent(serviceId)}/toggle-active`, {
      method: "PATCH",
      body: JSON.stringify({ changedByStaffId: "u1" })
    });
    if (toggled.service.active !== false) {
      throw new Error("Expected service to be disabled after toggle.");
    }

    await api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        staffId: "u1",
        paymentMethod: "Cash",
        items: [{ id: "PR01", name: "Printing B/W", qty: 2, price: 5 }],
        customer: { name: "", phone: "" },
        cashReceived: 20
      })
    });

    await api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        staffId: "u1",
        paymentMethod: "GCash",
        items: [{ id: serviceId, name: "Test Service", qty: 1, price: 109 }],
        customer: { name: "", phone: "" }
      })
    });

    await api("/api/cash-movements", {
      method: "POST",
      body: JSON.stringify({
        staffId: "u1",
        type: "in",
        amount: 500,
        note: "Opening cash"
      })
    });

    await api("/api/cash-movements", {
      method: "POST",
      body: JSON.stringify({
        staffId: "u1",
        type: "out",
        amount: 125.5,
        note: "Cash drop"
      })
    });

    const txList = await api(`/api/transactions?date=${todayKey()}`);
    if (!Array.isArray(txList.transactions) || txList.transactions.length < 1) {
      throw new Error("Expected at least one transaction for today.");
    }
    const txRange = await api(`/api/transactions?startDate=${todayKey()}&endDate=${todayKey()}`);
    if (!Array.isArray(txRange.transactions) || txRange.transactions.length < 2) {
      throw new Error("Expected ranged transaction query to return today transactions.");
    }

    const afterSummary = await api("/api/dashboard/today-summary");
    if (Number(afterSummary.totalSales) <= Number(beforeSummary.totalSales)) {
      throw new Error("Expected summary total to increase after transaction.");
    }

    const reports = await api(`/api/reports?startDate=${todayKey()}&endDate=${todayKey()}`);
    if (!reports?.validation?.ok) {
      throw new Error(`Expected report validation to pass, got: ${(reports?.validation?.errors || []).join(", ")}`);
    }
    if (Number(reports?.totals?.transactionCount || 0) < 2) {
      throw new Error("Expected at least two transactions in reports.");
    }
    const paymentMethods = new Set((reports.paymentBreakdown || []).map((row) => row.paymentMethod));
    if (!paymentMethods.has("Cash") || !paymentMethods.has("GCash")) {
      throw new Error("Expected Cash and GCash in payment breakdown.");
    }
    if (Number(reports?.cashMovements?.cashIn?.total || 0) !== 500) {
      throw new Error("Expected Cash In total to be 500.");
    }
    if (Number(reports?.cashMovements?.cashOut?.total || 0) !== 125.5) {
      throw new Error("Expected Cash Out total to be 125.5.");
    }

    console.log("E2E checks passed.");
    console.log(`Transactions today: ${txList.transactions.length}`);
    console.log(`Total sales today: ${afterSummary.totalSales}`);
  } finally {
    if (!child.killed) {
      child.kill();
    }
    await Promise.race([
      once(child, "close"),
      new Promise((resolve) => setTimeout(resolve, 1000))
    ]);
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
  }
}

runChecks().catch((error) => {
  console.error(`E2E checks failed: ${error.message}`);
  process.exit(1);
});
