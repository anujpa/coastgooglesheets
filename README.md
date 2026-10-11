# Coast FIRE Tracker (Google Apps Script)

A Google Apps Script that builds a Coast FIRE tracking workbook inside a Google Sheet. It creates a live **Dashboard**, lets you save point-in-time **Snapshot** tabs with one click, and rolls every snapshot up into a **Trend** table and chart so you can watch the gap to Coast FIRE close over time.

> **Disclaimer:** This is a planning tool built on simple compound-growth assumptions. It is not financial advice, and real returns, inflation, taxes, and fees will differ from any projection. Co-developed with Claude.

---

## What is Coast FIRE?

Coast FIRE is the point where your current invested balance, left alone with **no further contributions**, will grow to your full FIRE number by your retirement age. Once you hit it, you only need to earn enough to cover current expenses, and compounding does the rest.

This tracker separates two ages:

- **Coast Target Age**: the age you want to stop contributing.
- **Retirement Age**: the age you actually start withdrawing.

The years between them are the "coast runway" during which your money grows untouched.

---

## Features

- **Dashboard** with inputs and calculated outputs, all as visible, auditable sheet formulas
- **Two ways to set your FIRE number**: type it in directly, or derive it from annual spending and a withdrawal rate
- **Separate growth rates** for the saving phase and the coasting phase
- **One-click snapshots** (duplicate the Dashboard and freeze the date)
- **Trend tab** that scans all snapshots and charts balance vs. the Coast number needed
- **Status flag** (Coasted / Behind by $X) with color coding
- Custom functions you can reuse in any cell

---

## Requirements

- A Google account
- A Google Sheet that the script is **bound to** (created via **Extensions > Apps Script** from inside the sheet)

> **Important:** The script must be opened from inside the sheet, not as a standalone project. The calculations use custom functions (`COASTFIRE_FV`, etc.), and Google Sheets only recognizes custom functions from a script bound to that spreadsheet.

---

## Installation

1. Create a new blank Google Sheet (type `sheets.new` in your browser).
2. Go to **Extensions > Apps Script**.
3. Delete any starter code in the editor and paste in the full contents of `CoastFireTracker.gs`.
4. (Optional) Change any defaults, see [Customizing before you run](#customizing-before-you-run).
5. Click **Save**.
6. In the function dropdown, select **`setup`** and click **Run**.
7. Approve the authorization prompt. Google may show an "unverified app" warning because it's your own script: choose **Advanced > Go to project (unsafe)** and allow access.
8. Reload the spreadsheet tab. A **Coast FIRE** menu now appears in the menu bar.

After `setup`, your workbook contains two tabs: **Dashboard** and **Trend**.

---

## Customizing before you run

Everything below lives in `CoastFireTracker.gs`. Edit before running `setup()`, or edit and re-run it later (note that re-running resets the Dashboard, see [Rebuilding](#rebuilding-the-dashboard)).

### 1. Starting numbers (most important)

In `buildDashboardSheet()`, the `setRow(...)` calls hold sample values. Replace them with your own:

| Input | Sample default | Where to change |
|---|---|---|
| Birthday | `1990-01-01` | `setRow('birthday', ..., new Date(1990, 0, 1))` (month is 0-indexed: `0` = January) |
| Coast target age | `45` | `setRow('coast_target_age', ...)` |
| Retirement age | `60` | `setRow('retirement_age', ...)` |
| Current invested balance | `100000` | `setRow('current_balance', ...)` |
| Monthly contribution | `1000` | `setRow('monthly_contribution', ...)` |
| Pre-coast annual growth | `0.07` (7%) | `setRow('pre_coast_rate', ...)` |
| Post-coast annual growth | `0.05` (5%) | `setRow('post_coast_rate', ...)` |
| FIRE number mode | `Calculated` | `setRow('fire_mode', ...)` (`'Direct Entry'` or `'Calculated'`) |
| FIRE number (direct) | `1500000` | `setRow('fire_number_direct', ...)` |
| Annual retirement spending | `60000` | `setRow('annual_spending', ...)` |
| Withdrawal rate | `0.04` (4%) | `setRow('withdrawal_rate', ...)` |

You can also skip this entirely and just type your real numbers into the Dashboard after setup. Rates are entered as decimals in the script (`0.07`) and display as percentages in the sheet.

### 2. Names and prefixes

At the top of the file:

```javascript
var SHEET_NAMES = { DASHBOARD: 'Dashboard', TREND: 'Trend' };
var SNAPSHOT_PREFIX = 'Snapshot';
```

- Rename the tabs here if you like.
- `SNAPSHOT_PREFIX` controls both how new snapshot tabs are named **and** which tabs the Trend sheet picks up. Any tab whose name starts with this prefix is treated as a snapshot.

### 3. Labels and appearance

- **`getLabels()`**: change the text of any row label.
- **`applyFormatting()`**: column widths, section header color (`#4a86e8`), number formats (`$#,##0.00`, `0.00%`, `yyyy-mm-dd`), and the green/red status colors.
- **Tab colors**: set in `setup()` and `newSnapshot()` via `setTabColor(...)`.
- **Chart size and titles**: in `refreshTrend()` (`width`, `height`, `title`, axis titles).

### 4. Changing the row layout (advanced)

Row positions come from the `order` array in `buildRowMap()`, so formulas and snapshots stay in sync automatically. If you **add or remove rows** in that array, also update the hard-coded row count in `buildDashboardSheet()`:

```javascript
for (var i = 0; i < 38; i++) content.push(['', '']);
```

Change `38` to the new total number of rows, or the sheet will be truncated or padded incorrectly.

### 5. Time zone

Snapshot tab names use the script's time zone. Set it under **Project Settings > Time zone** in the Apps Script editor if dates look off by a day.

---

## Using the tracker

### Dashboard

Edit the input cells (labels in column A, values in column B). Everything else recalculates.

**Inputs**

| Field | Notes |
|---|---|
| Birthday | Used to compute your current age |
| Date Captured | `=TODAY()` on the Dashboard; frozen on snapshots |
| Coast Target Age | Age you want to stop contributing |
| Retirement Age | Age you start withdrawing |
| Current Invested Balance | Your balance as of the date captured |
| Monthly Contribution | What you add each month until coast age |
| Pre-Coast / Post-Coast Growth Rate | Annual rates; converted to monthly internally |
| FIRE Number Mode | Dropdown: **Direct Entry** or **Calculated** |
| FIRE Number (Direct Entry) | Used when mode is Direct Entry |
| Annual Retirement Spending, Withdrawal Rate | Used when mode is Calculated (FIRE number = spending ÷ rate) |

There is no default withdrawal rate baked into the logic. The rate in the sheet is just a starting value you should set yourself.

**Outputs**

| Output | Meaning |
|---|---|
| Effective FIRE Number | The FIRE number actually in use, based on your mode |
| Years to Coast Target Age | Time until you stop contributing |
| Coast Runway | Years between coast age and retirement age |
| Projected Balance at Coast Target Age | Balance if you keep contributing until coast age |
| Coast Number Needed at Coast Target Age | Balance needed at coast age to reach the FIRE number by retirement with zero contributions |
| Gap at Coast Age | Projected minus needed at coast age |
| **Coast Number Needed TODAY** | The same target discounted back to today: the number most people mean by "my Coast FIRE number" |
| Gap Today | Current balance minus Coast number needed today |
| Status | **Coasted** if the gap today is zero or positive, otherwise **Behind by $X** |
| Required Total Monthly Contribution | Total monthly contribution needed to reach the coast target by your coast age (shows 0 if already coasted) |
| Projected Age You Actually Reach Coast Status | Month-by-month simulation using your current contribution rate |

### Creating a snapshot

1. Click **Coast FIRE > New Snapshot**.
2. A new tab named `Snapshot YYYY-MM-DD` appears just before the Trend tab, with the date captured frozen to today.
3. Update the input cells on that tab (balance, contribution, rates, etc.) to reflect your numbers for that date. The outputs recalculate within the tab.

You can also duplicate an existing snapshot tab manually. Just keep the name starting with `Snapshot`, and set the Date Captured cell to the date you want.

### Refreshing the trend

Click **Coast FIRE > Refresh Trend Data**. The script reads every `Snapshot*` tab, sorts by date, rebuilds the table, and draws a line chart of **Current Balance** vs. **Coast Number Needed Today**. The chart needs at least two snapshots. Run this after adding or editing snapshots, because it doesn't update automatically.

### Rebuilding the dashboard

**Coast FIRE > Rebuild Dashboard** (or running `setup()`) clears and recreates the Dashboard and Trend tabs. Existing snapshot tabs are **not** deleted, but anything you typed on the Dashboard is reset to the script defaults, so note your numbers first.

---

## How the math works

- **Monthly rate**: the annual rate is converted with `(1 + annual)^(1/12) − 1`, so a 7% annual rate means 7% growth over a full year, not 7% × 12 compounding.
- **Future value**: `balance × (1+r)^n + contribution × ((1+r)^n − 1) / r`, with contributions made at the end of each month.
- **Coast number needed at coast age**: FIRE number ÷ `(1 + post-coast monthly rate)^(coast runway months)`.
- **Coast number needed today**: the value above ÷ `(1 + pre-coast monthly rate)^(months to coast age)`.
- **Current age**: `(date captured − birthday) / 365.25`.
- **Projected coast age**: starting today, each month the script checks whether the current balance, grown at the post-coast rate until retirement age, reaches the FIRE number. If yes, that is your projected coast age. Otherwise it applies one month of growth plus your contribution and checks again.

### Custom functions

You can use these in any cell of the spreadsheet:

| Function | Purpose |
|---|---|
| `COASTFIRE_FV(balance, monthlyContribution, monthlyRate, months)` | Future value with monthly contributions |
| `COASTFIRE_PV(futureValue, monthlyRate, months)` | Present value of a future amount |
| `COASTFIRE_REQUIRED_CONTRIBUTION(balance, targetFutureValue, monthlyRate, months)` | Total monthly contribution to hit a target |
| `COASTFIRE_PROJECTED_COAST_AGE(currentAge, retirementAge, balance, monthlyContribution, preMonthlyRate, postMonthlyRate, fireNumber)` | Age at which you could begin coasting |

---

## Assumptions and limitations

- **Constant returns**: growth rates are fixed, with no market volatility or sequence-of-returns risk.
- **Nominal vs. real**: the script doesn't adjust for inflation. Either use inflation-adjusted ("real") growth rates and today's-dollar spending, or accept that figures are nominal. Pick one approach and stay consistent across snapshots.
- **No taxes, fees, or contribution growth**: contributions stay flat until coast age.
- **Contributions at month end**: a minor simplification.
- **Retirement spending is a single flat number**: no healthcare, Social Security, or other income modeling.
- **Snapshots are manual**: the tracker doesn't pull balances from any account.
- **Trend is not automatic**: run **Refresh Trend Data** after changing snapshots.

---

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| `#NAME?` in output cells | The script isn't bound to this sheet. Open **Extensions > Apps Script** from inside the sheet and paste the code there. |
| No **Coast FIRE** menu | Reload the sheet after saving the script, or run `onOpen` manually once. |
| Authorization warning | Expected for personal scripts. Use **Advanced > Go to project** to continue. |
| "Enter birthday" in the age cell | The birthday cell is empty or not a valid date. |
| Chart missing on Trend tab | You need at least two snapshots, then run **Refresh Trend Data**. |
| A snapshot isn't in the Trend table | Its tab name doesn't start with the `SNAPSHOT_PREFIX` (default `Snapshot`). |
| Snapshot date is off by a day | Check the script time zone under **Project Settings**. |
| Status shows an odd value | Make sure mode is set to Direct Entry or Calculated, and that the corresponding input cells are filled. |

---

## File structure

```
CoastFireTracker.gs
├── Config          SHEET_NAMES, SNAPSHOT_PREFIX, ROWS (row map)
├── Labels          getLabels()
├── Menu            onOpen()
├── Setup           setup(), buildDashboardSheet(), applyFormatting()
├── Snapshots       newSnapshot()
├── Trend           refreshTrend()
└── Custom funcs    COASTFIRE_FV, _PV, _REQUIRED_CONTRIBUTION, _PROJECTED_COAST_AGE
```

---

## License

Use and modify freely for personal use. No warranty.
