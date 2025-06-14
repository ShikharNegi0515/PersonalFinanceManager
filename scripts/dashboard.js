import { auth, db } from './firebase.js';
import {
    ref,
    push,
    onValue,
    remove,
    update,
} from 'https://www.gstatic.com/firebasejs/11.9.0/firebase-database.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js';

const logoutBtn = document.getElementById("logout-btn");
const userNameEl = document.getElementById("user-name");

// Expense
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const totalExpenseEl = document.getElementById("total-expenses");

const expenseTitle = document.getElementById("expense-title");
const expenseAmount = document.getElementById("expense-amount");
const expenseDate = document.getElementById("expense-date");
const expenseCategory = document.getElementById("expense-category");

// Income
const incomeForm = document.getElementById("income-form");
const incomeList = document.getElementById("income-list");
const totalIncomeEl = document.getElementById("total-income");

const incomeSource = document.getElementById("income-source");
const incomeAmount = document.getElementById("income-amount");
const incomeDate = document.getElementById("income-date");

// Budget
const budgetForm = document.getElementById("budget-form");
const budgetCategory = document.getElementById("budget-category");
const budgetLimit = document.getElementById("budget-limit");
const budgetList = document.getElementById("budget-list");

const balanceEl = document.getElementById("balance");

let currentUserId = null;
let editingExpenseId = null;
let editingBudgetId = null;

let budgetMap = {};  
let categoryExpenseMap = {}; 

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        userNameEl.textContent = user.email.split("@")[0];
        loadExpenses();
        loadIncome();
        loadBudgets();
        loadRecurringPayments();
        loadSavingsGoals();
        loadSpendingTrends()
    } else {
        window.location.href = "login.html";
    }
});

logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "login.html");
});

// ================= EXPENSES =================

const expenseNote = document.getElementById("expense-note");
const expenseTags = document.getElementById("expense-tags");

expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = expenseTitle.value.trim();
    const amount = parseFloat(expenseAmount.value.trim());
    const date = expenseDate.value;
    const category = expenseCategory.value;
    const note = expenseNote.value.trim();
    const tags = expenseTags.value.trim().split(",").map(t => t.trim()).filter(t => t);

    if (!title || !amount || !date || !category) return;

    const data = { title, amount, date, category, note, tags };
    const refPath = ref(db, `users/${currentUserId}/expenses`);

    if (editingExpenseId) {
        update(ref(db, `users/${currentUserId}/expenses/${editingExpenseId}`), data);
        editingExpenseId = null;
    } else {
        push(refPath, data);
    }

    expenseForm.reset();
    expenseTags.value = "";
});

function loadExpenses() {
    const refPath = ref(db, `users/${currentUserId}/expenses`);
    onValue(refPath, (snapshot) => {
        expenseList.innerHTML = "";
        let total = 0;
        categoryExpenseMap = {};

        snapshot.forEach((child) => {
            const { title, amount, category, note, tags = [] } = child.val();
            const id = child.key;
            total += amount;

            categoryExpenseMap[category] = (categoryExpenseMap[category] || 0) + amount;

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${title} - ₹${amount} (${category})</span>
                ${note ? `<small class="note">Note: ${note}</small>` : ''}
                ${tags.length ? `<small class="tags"> ${tags.join(', ')}</small>` : ''}
                <div>
                    <button class="edit-btn" data-id="${id}">Edit</button>
                    <button class="delete-btn" data-id="${id}">Delete</button>
                </div>
            `;
            expenseList.appendChild(li);
        });

        checkBudgetLimits();
        totalExpenseEl.textContent = `₹${total}`;
        updateBalance();
        renderCharts();
    });
}

expenseList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("edit-btn")) {
        const path = ref(db, `users/${currentUserId}/expenses/${id}`);
        editingExpenseId = id;
        onValue(path, (snap) => {
            const d = snap.val();
            expenseTitle.value = d.title;
            expenseAmount.value = d.amount;
            expenseDate.value = d.date;
            expenseCategory.value = d.category;
            expenseNote.value = d.note || "";
            expenseTags.value = (d.tags || []).join(", ");
        }, { onlyOnce: true });
    }

    if (e.target.classList.contains("delete-btn")) {
        remove(ref(db, `users/${currentUserId}/expenses/${id}`));
    }
});


// ================= INCOME =================

const incomeNote = document.getElementById("income-note");
const incomeTags = document.getElementById("income-tags");

incomeForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const source = incomeSource.value.trim();
    const amount = parseFloat(incomeAmount.value.trim());
    const date = incomeDate.value;
    const note = incomeNote.value.trim();
    const tags = incomeTags.value.trim().split(",").map(t => t.trim()).filter(t => t);

    if (!source || !amount || !date) return;

    push(ref(db, `users/${currentUserId}/income`), { source, amount, date, note, tags });
    incomeForm.reset();
    incomeTags.value = "";
});

function loadIncome() {
    const refPath = ref(db, `users/${currentUserId}/income`);
    onValue(refPath, (snapshot) => {
        incomeList.innerHTML = "";
        let total = 0;

        snapshot.forEach((child) => {
            const { source, amount, note, tags = [] } = child.val();
            const id = child.key;
            total += amount;

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${source} - ₹${amount}</span>
                ${note ? `<small class="note">Note: ${note}</small>` : ''}
                ${tags.length ? `<small class="tags">Tags: ${tags.join(', ')}</small>` : ''}
                <div>
                    <button class="delete-income-btn" data-id="${id}">Delete</button>
                </div>
            `;
            incomeList.appendChild(li);
        });

        totalIncomeEl.textContent = `₹${total}`;
        updateBalance();
        renderCharts();
    });
}

incomeList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("delete-income-btn")) {
        remove(ref(db, `users/${currentUserId}/income/${id}`));
    }
});



// ================= BUDGET =================

budgetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const category = budgetCategory.value;
    const limit = parseFloat(budgetLimit.value.trim());
    if (!category || !limit) return;

    const budgetData = { category, limit };
    const refPath = ref(db, `users/${currentUserId}/budgets`);

    if (editingBudgetId) {
        update(ref(db, `users/${currentUserId}/budgets/${editingBudgetId}`), budgetData);
        editingBudgetId = null;
    } else {
        push(refPath, budgetData);
    }

    budgetForm.reset();
});

function loadBudgets() {
    const refPath = ref(db, `users/${currentUserId}/budgets`);
    onValue(refPath, (snapshot) => {
        budgetList.innerHTML = "";
        budgetMap = {};

        snapshot.forEach((child) => {
            const { category, limit } = child.val();
            const id = child.key;
            budgetMap[category] = limit;

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${category} Budget: ₹${limit}</span>
                <div>
                    <button class="edit-budget-btn" data-id="${id}">Edit</button>
                    <button class="delete-budget-btn" data-id="${id}">Delete</button>
                </div>
            `;
            budgetList.appendChild(li);
        });

        checkBudgetLimits();
    });
}

budgetList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("edit-budget-btn")) {
        const path = ref(db, `users/${currentUserId}/budgets/${id}`);
        editingBudgetId = id;
        onValue(path, (snap) => {
            const d = snap.val();
            budgetCategory.value = d.category;
            budgetLimit.value = d.limit;
        }, { onlyOnce: true });
    }

    if (e.target.classList.contains("delete-budget-btn")) {
        remove(ref(db, `users/${currentUserId}/budgets/${id}`));
    }
});

function checkBudgetLimits() {
    for (const category in budgetMap) {
        const budgetLimit = budgetMap[category];
        const spent = categoryExpenseMap[category] || 0;
        if (spent > budgetLimit) {
            alert(`⚠️ Budget exceeded for ${category}! Limit: ₹${budgetLimit}, Spent: ₹${spent}`);
        }
    }
}

function updateBalance() {
    const totalIncome = parseFloat(totalIncomeEl.textContent.replace("₹", "")) || 0;
    const totalExpense = parseFloat(totalExpenseEl.textContent.replace("₹", "")) || 0;
    balanceEl.textContent = `₹${totalIncome - totalExpense}`;
}


// ================= RECURRING PAYMENTS =================

const recurringForm = document.getElementById("recurring-form");
const recurringList = document.getElementById("recurring-list");

const recurringTitle = document.getElementById("recurring-title");
const recurringAmount = document.getElementById("recurring-amount");
const recurringStartDate = document.getElementById("recurring-start-date");
const recurringFrequency = document.getElementById("recurring-frequency");
const recurringCategory = document.getElementById("recurring-category");

let editingRecurringId = null;

recurringForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = recurringTitle.value.trim();
    const amount = parseFloat(recurringAmount.value.trim());
    const startDate = recurringStartDate.value;
    const frequency = recurringFrequency.value;
    const category = recurringCategory.value;

    if (!title || !amount || !startDate || !frequency || !category) return;

    const data = {
        title, amount, startDate, frequency, category,
        lastApplied: "" 
    };

    const refPath = ref(db, `users/${currentUserId}/recurring`);

    if (editingRecurringId) {
        update(ref(db, `users/${currentUserId}/recurring/${editingRecurringId}`), data);
        editingRecurringId = null;
    } else {
        push(refPath, data);
    }

    recurringForm.reset();
});

function loadRecurringPayments() {
    const refPath = ref(db, `users/${currentUserId}/recurring`);
    onValue(refPath, (snapshot) => {
        recurringList.innerHTML = "";

        snapshot.forEach((elem) => {
            const data = elem.val();
            const id = elem.key;

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${data.title} - ₹${data.amount} (${data.frequency}, ${data.category})</span>
                <div>
                    <button class="edit-recurring-btn" data-id="${id}">Edit</button>
                    <button class="delete-recurring-btn" data-id="${id}">Delete</button>
                </div>
            `;
            recurringList.appendChild(li);
            handleRecurringPayment(data, id);
        });
    });
}

recurringList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;

    if (e.target.classList.contains("edit-recurring-btn")) {
        const path = ref(db, `users/${currentUserId}/recurring/${id}`);
        editingRecurringId = id;
        onValue(path, (snap) => {
            const d = snap.val();
            recurringTitle.value = d.title;
            recurringAmount.value = d.amount;
            recurringStartDate.value = d.startDate;
            recurringFrequency.value = d.frequency;
            recurringCategory.value = d.category;
        }, { onlyOnce: true });
    }

    if (e.target.classList.contains("delete-recurring-btn")) {
        remove(ref(db, `users/${currentUserId}/recurring/${id}`));
    }
});

function handleRecurringPayment(data, id) {
    const today = new Date().toISOString().split("T")[0];
    const lastApplied = data.lastApplied || "";
    const shouldApply = checkIfRecurringToday(data, lastApplied);

    if (shouldApply) {
        const expenseData = {
            title: data.title,
            amount: data.amount,
            date: today,
            category: data.category
        };
        push(ref(db, `users/${currentUserId}/expenses`), expenseData);

        update(ref(db, `users/${currentUserId}/recurring/${id}`), { lastApplied: today });
    }
}

function checkIfRecurringToday(data, lastApplied) {
    const today = new Date();
    const startDate = new Date(data.startDate);
    const lastDate = lastApplied ? new Date(lastApplied) : null;

    if (today < startDate) return false;

    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const isNew = !lastDate || lastDate.toISOString().split("T")[0] !== today.toISOString().split("T")[0];

    if (!isNew) return false;

    switch (data.frequency) {
        case "daily":
            return true;
        case "weekly":
            return diffDays % 7 === 0;
        case "monthly":
            return today.getDate() === startDate.getDate();
        default:
            return false;
    }
}


// // ================= SPLIT EXPENSE HANDLING =================

// const addSplitBtn = document.getElementById("add-split");
// const splitExpenseContainer = document.getElementById("split-expense-container");

// addSplitBtn.addEventListener("click", () => {
//     const div = document.createElement("div");
//     div.className = "split-entry";
//     div.innerHTML = `
//         <input type="text" class="split-category" placeholder="Category (e.g., Food)">
//         <input type="number" class="split-amount" placeholder="Amount">
//         <button type="button" class="remove-split">❌</button>
//     `;
//     splitExpenseContainer.appendChild(div);
// });

// splitExpenseContainer.addEventListener("click", (e) => {
//     if (e.target.classList.contains("remove-split")) {
//         e.target.parentElement.remove();
//     }
// });



// ================= REPORT =================
const summaryMonth = document.getElementById("summary-month");
const summaryYear = document.getElementById("summary-year");
const generateSummaryBtn = document.getElementById("generate-summary");
const summaryResult = document.getElementById("summary-result");

const currentYear = new Date().getFullYear();
for (let i = 0; i < 10; i++) {
    const option = document.createElement("option");
    option.value = currentYear - i;
    option.textContent = currentYear - i;
    summaryYear.appendChild(option);
}

generateSummaryBtn.addEventListener("click", () => {
    const selectedMonth = summaryMonth.value;
    const selectedYear = summaryYear.value;

    const refPath = ref(db, `users/${currentUserId}/expenses`);
    onValue(refPath, (snapshot) => {
        const summary = {};
        let total = 0;

        snapshot.forEach((child) => {
            const { amount, date, category } = child.val();
            const expenseDate = new Date(date);
            const m = String(expenseDate.getMonth() + 1).padStart(2, "0");
            const y = expenseDate.getFullYear().toString();

            if (
                (selectedMonth === "" || selectedMonth === m) &&
                (selectedYear === "" || selectedYear === y)
            ) {
                summary[category] = (summary[category] || 0) + amount;
                total += amount;
            }
        });
        if (total === 0) {
            summaryResult.innerHTML = "<p>No data found for selected filters.</p>";
            return;
        }

        let html = `<h4>Total Expenses: ₹${total}</h4><ul>`;
        for (const cat in summary) {
            html += `<li>${cat}: ₹${summary[cat]}</li>`;
        }
        html += "</ul>";

        summaryResult.innerHTML = html || "<p>No data found for selected filters.</p>";
    }, { onlyOnce: true });
});


// ================= CHARTS =================

let expensePieChart, incomeDoughnutChart;

function renderCharts() {
    const labels = Object.keys(categoryExpenseMap);
    const data = Object.values(categoryExpenseMap);

    if (expensePieChart) expensePieChart.destroy();
    expensePieChart = new Chart(document.getElementById("expensePieChart"), {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: "Expenses by Category",
                data,
                backgroundColor: [
                    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"
                ],
                borderColor: "#fff",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    // ----- Income vs Expense Doughnut Chart -----
    const totalIncome = parseFloat(totalIncomeEl.textContent.replace("₹", "")) || 0;
    const totalExpense = parseFloat(totalExpenseEl.textContent.replace("₹", "")) || 0;

    if (incomeDoughnutChart) incomeDoughnutChart.destroy();
    incomeDoughnutChart = new Chart(document.getElementById("incomeDoughnutChart"), {
        type: "doughnut",
        data: {
            labels: ["Income", "Expense"],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: ["#10b981", "#ef4444"],
                borderColor: "#fff",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}

// // ================= SPENDING TRENDS =================
function loadSpendingTrends() {
    const refPath = ref(db, `users/${currentUserId}/expenses`);
    onValue(refPath, (snapshot) => {
        const monthlyData = {};

        snapshot.forEach(child => {
            const { date, category, amount } = child.val();
            if (!date || !category || !amount) return;

            const monthKey = date.slice(0, 7); // Format: YYYY-MM

            if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
            monthlyData[monthKey][category] = (monthlyData[monthKey][category] || 0) + amount;
        });

        const months = Object.keys(monthlyData).sort();
        const categories = new Set();

        months.forEach(month => {
            Object.keys(monthlyData[month]).forEach(cat => categories.add(cat));
        });

        const datasets = [...categories].map((category, i) => {
            const colorList = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
            const color = colorList[i % colorList.length];
            return {
                label: category,
                data: months.map(m => monthlyData[m][category] || 0),
                borderColor: color,
                backgroundColor: color,
                tension: 0.3
            };
        });

        const ctx = document.getElementById("trendsChart")?.getContext("2d");
        if (!ctx || months.length === 0) {
            console.warn("No trend data available or canvas missing.");
            return;
        }

        if (window.trendsChart && typeof window.trendsChart.destroy === "function") {
            window.trendsChart.destroy();
        }

        window.trendsChart = new Chart(ctx, {
            type: 'line',
            data: { labels: months, datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Spending Trends by Category' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => `₹${val}`
                        }
                    }
                }
            }
        });
    });
}



// // ================= GOALS =================
const savingsForm = document.getElementById("savings-form");
const goalTitleInput = document.getElementById("goal-title");
const goalAmountInput = document.getElementById("goal-target");
const goalDeadlineInput = document.getElementById("goal-deadline");
const savingsList = document.getElementById("savings-list");

savingsForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = goalTitleInput.value.trim();
    const amount = parseFloat(goalAmountInput.value.trim());
    const deadline = goalDeadlineInput.value;

    if (!title || isNaN(amount) || amount <= 0 || !deadline) {
        alert("Please enter valid goal details.");
        return;
    }

    const savingsRef = ref(db, `users/${currentUserId}/savingsGoals`);
    push(savingsRef, {
        title,
        amount,
        deadline,
        saved: 0
    });

    goalTitleInput.value = "";
    goalAmountInput.value = "";
    goalDeadlineInput.value = "";
});

function loadSavingsGoals() {
    const savingsRef = ref(db, `users/${currentUserId}/savingsGoals`);
    onValue(savingsRef, (snapshot) => {
        savingsList.innerHTML = "";

        snapshot.forEach((childSnapshot) => {
            const goal = childSnapshot.val();
            const key = childSnapshot.key;

            const listItem = document.createElement("li");
            listItem.style.marginBottom = "1rem";

            const progressPercent = goal.saved && goal.amount ? (goal.saved / goal.amount) * 100 : 0;

            listItem.innerHTML = `
        <div style="background:#f8f8f8; padding:1rem; border-radius:6px;">
          <strong>${goal.title}</strong><br />
          Target: ₹${goal.amount} | Saved: ₹${goal.saved}<br />
          Deadline: ${goal.deadline}
          <div style="height:10px; background:#e0e0e0; margin-top:8px; border-radius:5px;">
            <div style="height:100%; background:#10B981; width:${progressPercent}%; border-radius:5px;"></div>
          </div>
          <input type="number" placeholder="Amount to Add" style="margin-top:10px;" />
          <button class="update-goal" data-key="${key}">Update</button>
          <button class="delete-goal" data-key="${key}">Delete</button>
        </div>
      `;

            savingsList.appendChild(listItem);
        });

        document.querySelectorAll(".update-goal").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const key = e.target.getAttribute("data-key");
                const amountInput = e.target.parentElement.querySelector("input[type='number']");
                const additionalAmount = parseFloat(amountInput.value);

                if (isNaN(additionalAmount) || additionalAmount <= 0) {
                    alert("Enter a valid amount to add.");
                    return;
                }

                const goalRef = ref(db, `users/${currentUserId}/savingsGoals/${key}`);

                onValue(goalRef, (snapshot) => {
                    const current = snapshot.val();
                    const updatedSaved = (current.saved || 0) + additionalAmount;
                    update(goalRef, { saved: updatedSaved });
                }, {
                    onlyOnce: true
                });
            });
        });

        document.querySelectorAll(".delete-goal").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const key = e.target.getAttribute("data-key");
                const goalRef = ref(db, `users/${currentUserId}/savingsGoals/${key}`);
                remove(goalRef);
            });
        });
    });
}
loadSavingsGoals();