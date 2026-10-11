/**
 * COAST FIRE TRACKER
 * ---------------------------------------------------------------
 * SETUP INSTRUCTIONS:
 * 1. Create a new blank Google Sheet (sheets.new).
 * 2. In the sheet, go to Extensions > Apps Script.
 * 3. Delete any starter code in the editor and paste this entire file.
 * 4. Save (Ctrl/Cmd+S), then run the "setup" function once from the
 *    toolbar dropdown (you'll be asked to authorize the script).
 * 5. Reload the spreadsheet tab. A "Coast FIRE" menu will appear.
 * 6. Fill in your real numbers on the Dashboard tab.
 * 7. Whenever you want to log progress, use Coast FIRE > New Snapshot,
 *    then update that new tab's numbers to reflect today's situation.
 * 8. Use Coast FIRE > Refresh Trend Data to rebuild the trend table
 *    and chart from all your snapshots.
 * ---------------------------------------------------------------
 */

var SHEET_NAMES = {
  DASHBOARD: 'Dashboard',
  TREND: 'Trend'
};

var SNAPSHOT_PREFIX = 'Snapshot';

// Row layout is defined once here so every function stays in sync.
var ROWS = buildRowMap();

function buildRowMap() {
  var order = [
    'title', 'blank1',
    'section_personal', 'birthday', 'date_captured', 'current_age', 'blank2',
    'section_assumptions', 'coast_target_age', 'retirement_age', 'current_balance',
    'monthly_contribution', 'pre_coast_rate', 'pre_coast_monthly_rate',
    'post_coast_rate', 'post_coast_monthly_rate', 'blank3',
    'section_fire', 'fire_mode', 'fire_number_direct', 'annual_spending',
    'withdrawal_rate', 'fire_number_calculated', 'effective_fire_number', 'blank4',
    'section_outputs', 'years_to_coast', 'coast_runway_years',
    'projected_balance_at_coast', 'coast_number_needed_at_coast', 'gap_at_coast',
    'coast_number_needed_today', 'gap_today', 'status',
    'required_monthly_contribution', 'projected_coast_age', 'blank5', 'notes'
  ];
  var map = {};
  order.forEach(function(key, i) { map[key] = i + 1; });
  return map;
}

function getLabels() {
  return {
    title: 'Coast FIRE Tracker',
    section_personal: 'PERSONAL INFO',
    birthday: 'Birthday',
    date_captured: 'Date Captured',
    current_age: 'Current Age (as of date captured)',
    section_assumptions: 'ASSUMPTIONS & CONTRIBUTIONS',
    coast_target_age: 'Coast Target Age',
    retirement_age: 'Retirement Age',
    current_balance: 'Current Invested Balance',
    monthly_contribution: 'Monthly Contribution',
    pre_coast_rate: 'Pre-Coast Annual Growth Rate',
    pre_coast_monthly_rate: 'Pre-Coast Monthly Rate (calculated)',
    post_coast_rate: 'Post-Coast Annual Growth Rate',
    post_coast_monthly_rate: 'Post-Coast Monthly Rate (calculated)',
    section_fire: 'FIRE NUMBER',
    fire_mode: 'FIRE Number Mode (Direct Entry / Calculated)',
    fire_number_direct: 'FIRE Number (Direct Entry)',
    annual_spending: 'Annual Retirement Spending',
    withdrawal_rate: 'Withdrawal Rate',
    fire_number_calculated: 'FIRE Number (Calculated from Spending)',
    effective_fire_number: 'Effective FIRE Number',
    section_outputs: 'CALCULATED OUTPUTS',
    years_to_coast: 'Years to Coast Target Age',
    coast_runway_years: 'Coast Runway (Coast Age to Retirement, Years)',
    projected_balance_at_coast: 'Projected Balance at Coast Target Age',
    coast_number_needed_at_coast: 'Coast Number Needed at Coast Target Age',
    gap_at_coast: 'Gap at Coast Age (Projected minus Needed)',
    coast_number_needed_today: 'Coast Number Needed TODAY',
    gap_today: 'Gap Today (Balance minus Needed Today)',
    status: 'Status',
    required_monthly_contribution: 'Required Extra Monthly Contribution to Coast by Target Age',
    projected_coast_age: 'Projected Age You Actually Reach Coast Status',
    notes: 'Notes'
  };
}

// ---------------------------------------------------------------
// MENU
// ---------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Coast FIRE')
    .addItem('New Snapshot', 'newSnapshot')
    .addItem('Refresh Trend Data', 'refreshTrend')
    .addSeparator()
    .addItem('Rebuild Dashboard (resets formulas/formatting)', 'setup')
    .addToUi();
}

// ---------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var dashboard = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
  if (!dashboard) {
    dashboard = ss.insertSheet(SHEET_NAMES.DASHBOARD);
  } else {
    dashboard.clear();
    dashboard.clearFormats();
  }
  buildDashboardSheet(dashboard);
  dashboard.setTabColor('#4a86e8');

  var trend = ss.getSheetByName(SHEET_NAMES.TREND);
  if (!trend) {
    trend = ss.insertSheet(SHEET_NAMES.TREND);
  } else {
    trend.clear();
  }
  var headers = ['Date Captured', 'Current Balance', 'Coast Number Needed Today', 'Gap Today', 'Status', 'Source Sheet'];
  trend.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  trend.autoResizeColumns(1, headers.length);
  trend.setTabColor('#ffd966');

  // Remove Google's default blank "Sheet1" if it's still hanging around.
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 2) {
    ss.deleteSheet(defaultSheet);
  }

  ss.setActiveSheet(dashboard);
  SpreadsheetApp.getUi().alert(
    'Coast FIRE Tracker created!\n\n' +
    'Fill in your real numbers on the Dashboard tab, then use the ' +
    '"Coast FIRE" menu to create snapshots over time.'
  );
}

function buildDashboardSheet(sheet) {
  var labels = getLabels();
  var content = [];
  for (var i = 0; i < 38; i++) content.push(['', '']);

  function setRow(key, label, value) {
    content[ROWS[key] - 1] = [label, value];
  }

  setRow('title', labels.title, '');
  setRow('section_personal', labels.section_personal, '');
  setRow('birthday', labels.birthday, new Date(1990, 0, 1));
  setRow('date_captured', labels.date_captured, '=TODAY()');
  setRow('current_age', labels.current_age,
    '=IFERROR(($B$' + ROWS.date_captured + '-$B$' + ROWS.birthday + ')/365.25,"Enter birthday")');

  setRow('section_assumptions', labels.section_assumptions, '');
  setRow('coast_target_age', labels.coast_target_age, 45);
  setRow('retirement_age', labels.retirement_age, 60);
  setRow('current_balance', labels.current_balance, 100000);
  setRow('monthly_contribution', labels.monthly_contribution, 1000);
  setRow('pre_coast_rate', labels.pre_coast_rate, 0.07);
  setRow('pre_coast_monthly_rate', labels.pre_coast_monthly_rate,
    '=(1+$B$' + ROWS.pre_coast_rate + ')^(1/12)-1');
  setRow('post_coast_rate', labels.post_coast_rate, 0.05);
  setRow('post_coast_monthly_rate', labels.post_coast_monthly_rate,
    '=(1+$B$' + ROWS.post_coast_rate + ')^(1/12)-1');

  setRow('section_fire', labels.section_fire, '');
  setRow('fire_mode', labels.fire_mode, 'Calculated');
  setRow('fire_number_direct', labels.fire_number_direct, 1500000);
  setRow('annual_spending', labels.annual_spending, 60000);
  setRow('withdrawal_rate', labels.withdrawal_rate, 0.04);
  setRow('fire_number_calculated', labels.fire_number_calculated,
    '=IF($B$' + ROWS.withdrawal_rate + '=0,0,$B$' + ROWS.annual_spending + '/$B$' + ROWS.withdrawal_rate + ')');
  setRow('effective_fire_number', labels.effective_fire_number,
    '=IF($B$' + ROWS.fire_mode + '="Direct Entry",$B$' + ROWS.fire_number_direct + ',$B$' + ROWS.fire_number_calculated + ')');

  setRow('section_outputs', labels.section_outputs, '');
  setRow('years_to_coast', labels.years_to_coast,
    '=MAX($B$' + ROWS.coast_target_age + '-$B$' + ROWS.current_age + ',0)');
  setRow('coast_runway_years', labels.coast_runway_years,
    '=MAX($B$' + ROWS.retirement_age + '-$B$' + ROWS.coast_target_age + ',0)');
  setRow('projected_balance_at_coast', labels.projected_balance_at_coast,
    '=COASTFIRE_FV($B$' + ROWS.current_balance + ',$B$' + ROWS.monthly_contribution + ',$B$' +
    ROWS.pre_coast_monthly_rate + ',$B$' + ROWS.years_to_coast + '*12)');
  setRow('coast_number_needed_at_coast', labels.coast_number_needed_at_coast,
    '=COASTFIRE_PV($B$' + ROWS.effective_fire_number + ',$B$' + ROWS.post_coast_monthly_rate + ',$B$' +
    ROWS.coast_runway_years + '*12)');
  setRow('gap_at_coast', labels.gap_at_coast,
    '=$B$' + ROWS.projected_balance_at_coast + '-$B$' + ROWS.coast_number_needed_at_coast);
  setRow('coast_number_needed_today', labels.coast_number_needed_today,
    '=COASTFIRE_PV($B$' + ROWS.coast_number_needed_at_coast + ',$B$' + ROWS.pre_coast_monthly_rate + ',$B$' +
    ROWS.years_to_coast + '*12)');
  setRow('gap_today', labels.gap_today,
    '=$B$' + ROWS.current_balance + '-$B$' + ROWS.coast_number_needed_today);
  setRow('status', labels.status,
    '=IF($B$' + ROWS.gap_today + '>=0,"Coasted","Behind by "&TEXT(-$B$' + ROWS.gap_today + ',"$#,##0"))');
  setRow('required_monthly_contribution', labels.required_monthly_contribution,
    '=IF($B$' + ROWS.gap_today + '>=0,0,COASTFIRE_REQUIRED_CONTRIBUTION($B$' + ROWS.current_balance +
    ',$B$' + ROWS.coast_number_needed_at_coast + ',$B$' + ROWS.pre_coast_monthly_rate + ',$B$' +
    ROWS.years_to_coast + '*12))');
  setRow('projected_coast_age', labels.projected_coast_age,
    '=COASTFIRE_PROJECTED_COAST_AGE($B$' + ROWS.current_age + ',$B$' + ROWS.retirement_age + ',$B$' +
    ROWS.current_balance + ',$B$' + ROWS.monthly_contribution + ',$B$' + ROWS.pre_coast_monthly_rate +
    ',$B$' + ROWS.post_coast_monthly_rate + ',$B$' + ROWS.effective_fire_number + ')');

  setRow('notes', labels.notes, '');

  sheet.getRange(1, 1, content.length, 2).setValues(content);
  applyFormatting(sheet);
}

function applyFormatting(sheet) {
  sheet.setColumnWidth(1, 360);
  sheet.setColumnWidth(2, 220);

  sheet.getRange(ROWS.title, 1).setFontSize(16).setFontWeight('bold');

  var sectionRows = [ROWS.section_personal, ROWS.section_assumptions, ROWS.section_fire, ROWS.section_outputs];
  sectionRows.forEach(function(r) {
    sheet.getRange(r, 1, 1, 2).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
  });

  sheet.getRange(ROWS.birthday, 2).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(ROWS.date_captured, 2).setNumberFormat('yyyy-mm-dd');

  [ROWS.pre_coast_rate, ROWS.pre_coast_monthly_rate, ROWS.post_coast_rate,
   ROWS.post_coast_monthly_rate, ROWS.withdrawal_rate].forEach(function(r) {
    sheet.getRange(r, 2).setNumberFormat('0.00%');
  });

  [ROWS.current_balance, ROWS.monthly_contribution, ROWS.fire_number_direct, ROWS.annual_spending,
   ROWS.fire_number_calculated, ROWS.effective_fire_number, ROWS.projected_balance_at_coast,
   ROWS.coast_number_needed_at_coast, ROWS.gap_at_coast, ROWS.coast_number_needed_today,
   ROWS.gap_today, ROWS.required_monthly_contribution].forEach(function(r) {
    sheet.getRange(r, 2).setNumberFormat('$#,##0.00');
  });

  [ROWS.current_age, ROWS.years_to_coast, ROWS.coast_runway_years, ROWS.projected_coast_age].forEach(function(r) {
    sheet.getRange(r, 2).setNumberFormat('0.00');
  });

  var modeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Direct Entry', 'Calculated'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(ROWS.fire_mode, 2).setDataValidation(modeRule);

  var statusRange = sheet.getRange(ROWS.status, 2);
  var rules = sheet.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('Coasted')
    .setBackground('#d9ead3')
    .setRanges([statusRange])
    .build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('Behind')
    .setBackground('#f4cccc')
    .setRanges([statusRange])
    .build());
  sheet.setConditionalFormatRules(rules);

  sheet.setFrozenColumns(1);
}

// ---------------------------------------------------------------
// SNAPSHOTS
// ---------------------------------------------------------------
function newSnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
  if (!dashboard) {
    SpreadsheetApp.getUi().alert('Run "setup" first to create the Dashboard tab.');
    return;
  }

  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var baseName = SNAPSHOT_PREFIX + ' ' + todayStr;
  var name = baseName;
  var counter = 2;
  while (ss.getSheetByName(name)) {
    name = baseName + ' (' + counter + ')';
    counter++;
  }

  var newSheet = dashboard.copyTo(ss);
  newSheet.setName(name);
  newSheet.setTabColor('#cfe2f3');

  // Freeze the date so it doesn't keep moving forward like the Dashboard's does.
  newSheet.getRange(ROWS.date_captured, 2).setValue(new Date());

  // Move it to sit right before the Trend tab.
  var trend = ss.getSheetByName(SHEET_NAMES.TREND);
  if (trend) {
    ss.setActiveSheet(newSheet);
    ss.moveActiveSheet(trend.getIndex());
  }

  SpreadsheetApp.getUi().alert(
    'Snapshot created: ' + name + '\n\n' +
    'Update the input values on this new tab to reflect today\'s numbers, ' +
    'then run "Refresh Trend Data" from the Coast FIRE menu.'
  );
}

// ---------------------------------------------------------------
// TREND
// ---------------------------------------------------------------
function refreshTrend() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trend = ss.getSheetByName(SHEET_NAMES.TREND);
  if (!trend) {
    trend = ss.insertSheet(SHEET_NAMES.TREND);
  }
  trend.clear();
  trend.getCharts().forEach(function(chart) { trend.removeChart(chart); });

  var headers = ['Date Captured', 'Current Balance', 'Coast Number Needed Today', 'Gap Today', 'Status', 'Source Sheet'];
  trend.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  var snapshotSheets = ss.getSheets().filter(function(s) {
    return s.getName().indexOf(SNAPSHOT_PREFIX) === 0;
  });

  var rows = snapshotSheets.map(function(s) {
    return [
      s.getRange(ROWS.date_captured, 2).getValue(),
      s.getRange(ROWS.current_balance, 2).getValue(),
      s.getRange(ROWS.coast_number_needed_today, 2).getValue(),
      s.getRange(ROWS.gap_today, 2).getValue(),
      s.getRange(ROWS.status, 2).getValue(),
      s.getName()
    ];
  });

  rows.sort(function(a, b) { return new Date(a[0]) - new Date(b[0]); });

  if (rows.length > 0) {
    trend.getRange(2, 1, rows.length, headers.length).setValues(rows);
    trend.getRange(2, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    trend.getRange(2, 2, rows.length, 3).setNumberFormat('$#,##0.00');
  }

  trend.autoResizeColumns(1, headers.length);

  if (rows.length > 1) {
    var chart = trend.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(trend.getRange(1, 1, rows.length + 1, 1))
      .addRange(trend.getRange(1, 2, rows.length + 1, 1))
      .addRange(trend.getRange(1, 3, rows.length + 1, 1))
      .setPosition(2, headers.length + 2, 0, 0)
      .setOption('title', 'Coast FIRE Progress Over Time')
      .setOption('hAxis.title', 'Date Captured')
      .setOption('vAxis.title', 'Amount ($)')
      .setOption('width', 700)
      .setOption('height', 420)
      .build();
    trend.insertChart(chart);
  } else {
    SpreadsheetApp.getUi().alert('Trend data refreshed. Add at least 2 snapshots to see a chart.');
  }
}

// ---------------------------------------------------------------
// CUSTOM FORMULA FUNCTIONS (usable directly in cells too, e.g.
// =COASTFIRE_FV(10000, 500, 0.005, 120) )
// ---------------------------------------------------------------

/**
 * Future value of a balance plus ordinary monthly contributions.
 * @customfunction
 */
function COASTFIRE_FV(balance, monthlyContribution, monthlyRate, months) {
  balance = Number(balance) || 0;
  monthlyContribution = Number(monthlyContribution) || 0;
  monthlyRate = Number(monthlyRate) || 0;
  months = Math.max(Math.round(Number(months) || 0), 0);
  if (months === 0) return balance;
  if (Math.abs(monthlyRate) < 1e-9) {
    return balance + monthlyContribution * months;
  }
  var growth = Math.pow(1 + monthlyRate, months);
  return balance * growth + monthlyContribution * ((growth - 1) / monthlyRate);
}

/**
 * Present value of a future amount, discounted monthly.
 * @customfunction
 */
function COASTFIRE_PV(futureValue, monthlyRate, months) {
  futureValue = Number(futureValue) || 0;
  monthlyRate = Number(monthlyRate) || 0;
  months = Math.max(Math.round(Number(months) || 0), 0);
  if (months === 0) return futureValue;
  return futureValue / Math.pow(1 + monthlyRate, months);
}

/**
 * Monthly contribution required to reach a target future value.
 * @customfunction
 */
function COASTFIRE_REQUIRED_CONTRIBUTION(balance, targetFutureValue, monthlyRate, months) {
  balance = Number(balance) || 0;
  targetFutureValue = Number(targetFutureValue) || 0;
  monthlyRate = Number(monthlyRate) || 0;
  months = Math.round(Number(months) || 0);
  if (months <= 0) return 'N/A';
  if (Math.abs(monthlyRate) < 1e-9) {
    return Math.round(((targetFutureValue - balance) / months) * 100) / 100;
  }
  var growth = Math.pow(1 + monthlyRate, months);
  var needed = (targetFutureValue - balance * growth) / ((growth - 1) / monthlyRate);
  return Math.round(needed * 100) / 100;
}

/**
 * Simulates month by month to find the age at which continuing current
 * contributions would let the balance coast (grow untouched at the
 * post-coast rate) to the FIRE number by the retirement age.
 * @customfunction
 */
function COASTFIRE_PROJECTED_COAST_AGE(currentAge, retirementAge, balance, monthlyContribution,
    preMonthlyRate, postMonthlyRate, fireNumber) {
  currentAge = Number(currentAge) || 0;
  retirementAge = Number(retirementAge) || 0;
  balance = Number(balance) || 0;
  monthlyContribution = Number(monthlyContribution) || 0;
  preMonthlyRate = Number(preMonthlyRate) || 0;
  postMonthlyRate = Number(postMonthlyRate) || 0;
  fireNumber = Number(fireNumber) || 0;

  if (fireNumber <= 0) return 'N/A';
  var maxMonths = Math.round((retirementAge - currentAge) * 12);
  if (maxMonths <= 0) return 'N/A';

  var bal = balance;
  for (var m = 0; m <= maxMonths; m++) {
    var monthsRemaining = maxMonths - m;
    var projectedAtRetirement = bal * Math.pow(1 + postMonthlyRate, monthsRemaining);
    if (projectedAtRetirement >= fireNumber) {
      return Math.round((currentAge + m / 12) * 100) / 100;
    }
    bal = bal * (1 + preMonthlyRate) + monthlyContribution;
  }
  return 'Not before retirement age';
}
