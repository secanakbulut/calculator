const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const insightsEl = document.getElementById("insights");
const historyEl = document.getElementById("history");
const clearHistoryBtn = document.getElementById("clearHistory");

let current = "0";
let lastWasEquals = false;
let history = [];

function render() {
  resultEl.textContent = current;
}

function setExpression(text) {
  expressionEl.innerHTML = text || "&nbsp;";
}

function appendValue(value) {
  if (lastWasEquals && /[0-9.]/.test(value)) {
    current = "0";
    setExpression("");
  }
  lastWasEquals = false;

  if (value === ".") {
    const lastNumber = current.split(/[+\-*/]/).pop();
    if (lastNumber.includes(".")) return;
    if (lastNumber === "") {
      current += "0.";
      return render();
    }
  }

  if (/[+\-*/]/.test(value)) {
    if (/[+\-*/]$/.test(current)) {
      current = current.slice(0, -1) + value;
      return render();
    }
  }

  if (current === "0" && /[0-9]/.test(value)) {
    current = value;
  } else {
    current += value;
  }
  render();
}

function clearAll() {
  current = "0";
  setExpression("");
  lastWasEquals = false;
  render();
}

function deleteLast() {
  if (lastWasEquals) {
    clearAll();
    return;
  }
  if (current.length <= 1) {
    current = "0";
  } else {
    current = current.slice(0, -1);
  }
  render();
}

function applyPercent() {
  try {
    const value = evaluate(current);
    current = String(value / 100);
    render();
  } catch (e) {
    // ignore
  }
}

function toggleSign() {
  if (current.startsWith("-")) {
    current = current.slice(1);
  } else if (current !== "0") {
    current = "-" + current;
  }
  render();
}

function evaluate(expr) {
  if (!/^[-+0-9.*/() ]+$/.test(expr)) {
    throw new Error("Invalid characters");
  }
  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${expr});`)();
  if (typeof value !== "number" || !isFinite(value)) {
    throw new Error("Bad result");
  }
  return Math.round(value * 1e12) / 1e12;
}

function calculate() {
  try {
    const expr = current;
    const value = evaluate(expr);
    setExpression(prettify(expr) + " =");
    current = String(value);
    lastWasEquals = true;
    render();
    addHistory(expr, value);
    showInsights(value);
  } catch (e) {
    setExpression("Error");
    current = "0";
    render();
  }
}

function prettify(expr) {
  return expr
    .replaceAll("*", " × ")
    .replaceAll("/", " ÷ ")
    .replaceAll("+", " + ")
    .replaceAll("-", " − ");
}

function addHistory(expr, value) {
  history.unshift({ expr, value });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = "";
  history.forEach((item, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="expr">${prettify(item.expr)}</span><span class="res">${item.value}</span>`;
    li.addEventListener("click", () => {
      current = String(item.value);
      lastWasEquals = true;
      render();
      showInsights(item.value);
    });
    historyEl.appendChild(li);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  renderHistory();
});

function showInsights(num) {
  const facts = collectFacts(num);
  insightsEl.innerHTML = "";
  if (facts.length === 0) {
    insightsEl.innerHTML = '<p class="insights-empty">No facts for this number.</p>';
    return;
  }
  facts.forEach(({ label, value }) => {
    const div = document.createElement("div");
    div.className = "fact";
    div.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
    insightsEl.appendChild(div);
  });
}

function collectFacts(num) {
  const facts = [];
  const isInt = Number.isInteger(num);
  const abs = Math.abs(num);

  facts.push({ label: "Type", value: describeType(num) });

  if (isInt && abs <= 1e9) {
    facts.push({ label: "Binary", value: "0b" + num.toString(2) });
    facts.push({ label: "Hex", value: "0x" + Math.abs(num).toString(16).toUpperCase() });
  }

  if (isInt && abs > 1 && abs < 1e7) {
    facts.push({ label: "Prime?", value: isPrime(abs) ? "yes" : "no" });
    const factors = primeFactors(abs);
    if (factors.length > 0) {
      facts.push({ label: "Prime factors", value: factors.join(" × ") });
    }
  }

  if (num >= 0 && num <= 1e15) {
    const sqrt = Math.sqrt(num);
    facts.push({ label: "Square root", value: trim(sqrt) });
  }

  facts.push({ label: "Squared", value: trim(num * num) });

  if (isInt && abs >= 0 && abs <= 20) {
    facts.push({ label: "Factorial", value: String(factorial(abs)) });
  }

  if (isInt && abs > 0 && abs <= 1000) {
    facts.push({ label: "Roman", value: toRoman(abs) || "n/a" });
  }

  return facts;
}

function describeType(num) {
  if (!Number.isInteger(num)) return "Decimal";
  if (num === 0) return "Zero";
  if (num < 0) return "Negative integer";
  return "Positive integer";
}

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function primeFactors(n) {
  const factors = [];
  let x = n;
  for (let i = 2; i * i <= x; i++) {
    while (x % i === 0) {
      factors.push(i);
      x = x / i;
    }
  }
  if (x > 1) factors.push(x);
  return factors;
}

function factorial(n) {
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return r.toString();
}

function toRoman(num) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "";
  let n = num;
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v; }
  }
  return r;
}

function trim(n) {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toPrecision(10)).toString();
}

document.querySelectorAll(".key").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.value;
    const action = btn.dataset.action;
    if (action === "clear") return clearAll();
    if (action === "delete") return deleteLast();
    if (action === "percent") return applyPercent();
    if (action === "sign") return toggleSign();
    if (action === "equals") return calculate();
    if (value !== undefined) appendValue(value);
  });
});

document.addEventListener("keydown", (e) => {
  if (/^[0-9.]$/.test(e.key)) return appendValue(e.key);
  if (["+", "-", "*", "/"].includes(e.key)) return appendValue(e.key);
  if (e.key === "Enter" || e.key === "=") { e.preventDefault(); return calculate(); }
  if (e.key === "Backspace") return deleteLast();
  if (e.key === "Escape") return clearAll();
  if (e.key === "%") return applyPercent();
});

render();
