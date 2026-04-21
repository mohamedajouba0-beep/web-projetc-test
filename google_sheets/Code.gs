/**
 * Dashboard « Monitoraggio Produzione — Officina Meccanica di Precisione »
 * Versione Google Sheets.
 *
 * INSTALLAZIONE
 *   1. Crea un nuovo Google Sheet vuoto.
 *   2. Menu  Estensioni → Apps Script.
 *   3. Cancella il Code.gs predefinito, incolla tutto questo file, Salva.
 *   4. Nel selettore di funzione scegli « buildDashboard ».
 *   5. Clicca « Esegui » e autorizza lo script (solo la prima volta).
 *   6. Torna al foglio : i 3 fogli Magazzino / Ordini Clienti / Produzione
 *      sono creati, formattati e collegati tra loro.
 *
 * Dopo l'installazione, un menu « 🏭 Produzione » appare a ogni apertura.
 */

/* ============================================================
 * Menu personalizzato
 * ============================================================ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏭 Produzione')
    .addItem('Ricostruisci il foglio', 'buildDashboard')
    .addItem('Cancella i dati (mantiene la struttura)', 'clearData')
    .addToUi();
}

/* ============================================================
 * Punto di ingresso principale
 * ============================================================ */
function buildDashboard() {
  const ss = SpreadsheetApp.getActive();

  // Rimuove i fogli esistenti (tranne l'ultimo per sicurezza)
  ss.getSheets().forEach((sh, i) => {
    if (i < ss.getSheets().length - 1) ss.deleteSheet(sh);
  });

  buildMagazzino_(ss);
  buildOrdini_(ss);
  buildProduzione_(ss);

  // Rimuove il foglio iniziale residuo
  const leftovers = ss.getSheets().filter(s =>
    !['Magazzino', 'Ordini Clienti', 'Produzione'].includes(s.getName()));
  leftovers.forEach(s => ss.deleteSheet(s));

  // Ordine dei tab : Produzione per primo
  ss.setActiveSheet(ss.getSheetByName('Produzione'));
  ss.moveActiveSheet(1);

  SpreadsheetApp.getUi().alert(
    'Foglio costruito ✔\n\n' +
    'I tre fogli sono pronti con dati di esempio, formule, ' +
    'menu a tendina e formattazione condizionale.');
}

/* ============================================================
 * Foglio « Magazzino »
 * ============================================================ */
function buildMagazzino_(ss) {
  const sh = ss.insertSheet('Magazzino');
  const headers = ['ID Materiale', 'Descrizione', 'Quantità in Stock',
                   'Stato', 'Data ricezione prevista'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  const today = new Date();
  const plus = (n) => new Date(today.getTime() + n * 86400000);

  const data = [
    ['MAT-001', 'Barra acciaio 42CrMo4 Ø40',  120, 'Disponibile', ''],
    ['MAT-002', 'Barra inox 316L Ø25',        35,  'Disponibile', ''],
    ['MAT-003', 'Lastra alluminio 7075 20mm', 0,   'In ordine',   plus(4)],
    ['MAT-004', 'Tondo bronzo CuSn8 Ø30',     8,   'Disponibile', ''],
    ['MAT-005', 'Lamiera acciaio S235 5mm',   0,   'In ordine',   plus(10)],
  ];
  sh.getRange(2, 1, data.length, headers.length).setValues(data);

  styleHeader_(sh, 1, headers.length);
  sh.setColumnWidths(1, 1, 120);
  sh.setColumnWidths(2, 1, 250);
  sh.setColumnWidths(3, 1, 150);
  sh.setColumnWidths(4, 1, 130);
  sh.setColumnWidths(5, 1, 190);
  sh.setFrozenRows(1);
  sh.getRange('E2:E').setNumberFormat('dd/mm/yyyy');

  // Convalida Stato
  const dvStato = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Disponibile', 'In ordine'], true)
    .setAllowInvalid(false).build();
  sh.getRange('D2:D1000').setDataValidation(dvStato);

  // Formattazione condizionale
  const rules = [];

  // Quantità <= 0 → rosso grassetto
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(0)
    .setBackground('#F8CBAD').setFontColor('#9C0006').setBold(true)
    .setRanges([sh.getRange('C2:C1000')]).build());

  // Stato « In ordine » → arancione
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('In ordine')
    .setBackground('#FFD8A8').setFontColor('#9C5700').setBold(true)
    .setRanges([sh.getRange('D2:D1000')]).build());

  sh.setConditionalFormatRules(rules);

  ss.setNamedRange('magazzino_id', sh.getRange('A2:A1000'));
}

/* ============================================================
 * Foglio « Ordini Clienti »
 * ============================================================ */
function buildOrdini_(ss) {
  const sh = ss.insertSheet('Ordini Clienti');
  const headers = ['N° Ordine', 'Cliente', 'Quantità Totale',
                   'Data Limite di Consegna', 'Giorni rimanenti',
                   'Livello Urgenza'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  const today = new Date();
  const plus = (n) => new Date(today.getTime() + n * 86400000);

  const data = [
    ['ORD-2026-001', 'AeroMeccanica SRL', 50,  plus(3)],
    ['ORD-2026-002', 'Hydro Industrie',   120, plus(10)],
    ['ORD-2026-003', 'MediTech',          8,   plus(-2)],
    ['ORD-2026-004', 'AutoPrecisione',    200, plus(20)],
    ['ORD-2026-005', 'NavalWorks',        30,  plus(5)],
  ];
  sh.getRange(2, 1, data.length, 4).setValues(data);

  // Formule colonne E (Giorni rimanenti) e F (Livello Urgenza)
  const n = data.length;
  const eFormulas = [], fFormulas = [];
  for (let i = 0; i < n; i++) {
    const row = i + 2;
    eFormulas.push([`=D${row}-TODAY()`]);
    fFormulas.push([
      `=IF(D${row}<TODAY(),"IN RITARDO",` +
      `IF(E${row}<7,"CRITICO",` +
      `IF(E${row}<15,"URGENTE","NORMALE")))`
    ]);
  }
  sh.getRange(2, 5, n, 1).setFormulas(eFormulas);
  sh.getRange(2, 6, n, 1).setFormulas(fFormulas);

  styleHeader_(sh, 1, headers.length);
  sh.setColumnWidths(1, 1, 140);
  sh.setColumnWidths(2, 1, 180);
  sh.setColumnWidths(3, 1, 130);
  sh.setColumnWidths(4, 1, 180);
  sh.setColumnWidths(5, 1, 120);
  sh.setColumnWidths(6, 1, 140);
  sh.setFrozenRows(1);
  sh.getRange('D2:D').setNumberFormat('dd/mm/yyyy');
  sh.getRange('E2:E').setNumberFormat('0');
  sh.getRange('F2:F').setHorizontalAlignment('center');

  // Named ranges riutilizzati dal foglio Produzione
  ss.setNamedRange('ordini_num', sh.getRange('A2:A1000'));
  ss.setNamedRange('ordini_qta', sh.getRange('C2:C1000'));

  // Formattazione condizionale
  const rules = [];
  const urgRng = sh.getRange('F2:F1000');

  rules.push(cfText_(urgRng, 'IN RITARDO', '#FFC7CE', '#9C0006', true));
  rules.push(cfText_(urgRng, 'CRITICO',    '#FCE4E4', '#9C0006', true));
  rules.push(cfText_(urgRng, 'URGENTE',    '#FFD8A8', '#9C5700', true));
  rules.push(cfText_(urgRng, 'NORMALE',    '#C6EFCE', '#006100', true));

  // Riga intera se data scaduta → sfondo rosa
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($D2<>"",$D2<TODAY())')
    .setBackground('#FDECEC')
    .setRanges([sh.getRange('A2:F1000')]).build());

  sh.setConditionalFormatRules(rules);
}

/* ============================================================
 * Foglio « Produzione » — cuore dello strumento
 * ============================================================ */
function buildProduzione_(ss) {
  const sh = ss.insertSheet('Produzione');
  const HEADER_ROW = 6;

  /* ---- Dashboard righe 1-3 ---- */
  sh.getRange('A1:M1').merge()
    .setValue('DASHBOARD — MONITORAGGIO PRODUZIONE')
    .setFontSize(18).setFontWeight('bold').setFontColor('#1F4E78')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 38);

  const kpis = [
    ['A2', 'Ordini in ritardo',
      '=COUNTIF(\'Ordini Clienti\'!F:F,"IN RITARDO")'],
    ['C2', 'Ordini critici',
      '=COUNTIF(\'Ordini Clienti\'!F:F,"CRITICO")'],
    ['E2', 'Ordini in corso',
      `=COUNTIFS(M${HEADER_ROW + 1}:M1000,"<>Completato",M${HEADER_ROW + 1}:M1000,"<>")`],
    ['G2', '% avanzamento globale',
      `=IFERROR(SUM(E${HEADER_ROW + 1}:E1000)/SUM(D${HEADER_ROW + 1}:D1000),0)`],
    ['I2', 'Ultimo aggiornamento', '=NOW()'],
  ];

  kpis.forEach(([a1, label, formula]) => {
    const labelCell = sh.getRange(a1);
    labelCell.setValue(label).setFontWeight('bold').setFontColor('#595959')
      .setBackground('#EAF3FB').setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
    const valueA1 = a1[0] + '3';
    sh.getRange(valueA1).setFormula(formula)
      .setFontSize(16).setFontWeight('bold').setFontColor('#1F4E78')
      .setBackground('#EAF3FB').setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
  });
  sh.getRange('G3').setNumberFormat('0.0%');
  sh.getRange('I3').setNumberFormat('dd/mm/yyyy hh:mm');
  sh.setRowHeight(2, 22);
  sh.setRowHeight(3, 32);

  /* ---- Intestazione tabella riga 6 ---- */
  const headers = ['N° Ordine', 'Macchina', 'Operatore', 'Qtà totale',
    'Qtà realizzata', '% Avanzamento', 'Tornitura', 'Fresatura', 'Rettifica',
    'Ora Inizio', 'Ora Fine', 'Durata (h)', 'Stato Globale'];
  sh.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sh, HEADER_ROW, headers.length);

  /* ---- Dati di esempio ---- */
  const sample = [
    ['ORD-2026-001', 'Tornio CNC 1',  'G. Rossi',    30, 'Fatto',   'In corso', 'Da fare'],
    ['ORD-2026-002', 'Fresatrice 1',  'L. Bianchi',  75, 'Fatto',   'Fatto',    'In corso'],
    ['ORD-2026-003', 'Tornio CNC 2',  'A. Ferrari',  8,  'Fatto',   'Fatto',    'Fatto'],
    ['ORD-2026-004', 'Fresatrice 2',  'M. Romano',   40, 'In corso','Da fare',  'Da fare'],
    ['ORD-2026-005', 'Rettificatrice','P. Esposito', 10, 'Fatto',   'Fatto',    'Da fare'],
  ];

  for (let i = 0; i < sample.length; i++) {
    const r = HEADER_ROW + 1 + i;
    const [num, macchina, operatore, qtaReal, torn, fres, rett] = sample[i];
    sh.getRange(r, 1).setValue(num);
    sh.getRange(r, 2).setValue(macchina);
    sh.getRange(r, 3).setValue(operatore);
    // Qtà totale : CERCA.VERT su Ordini Clienti
    sh.getRange(r, 4).setFormula(
      `=IFERROR(VLOOKUP(A${r},'Ordini Clienti'!A:C,3,FALSE),0)`);
    sh.getRange(r, 5).setValue(qtaReal);
    sh.getRange(r, 6).setFormula(`=IFERROR(E${r}/D${r},0)`);
    sh.getRange(r, 7).setValue(torn);
    sh.getRange(r, 8).setValue(fres);
    sh.getRange(r, 9).setValue(rett);
    // Colonne 10-11 : Ora Inizio / Fine (inserimento manuale)
    sh.getRange(r, 12).setFormula(
      `=IF(AND(J${r}<>"",K${r}<>""),(K${r}-J${r})*24,"")`);
    // Stato Globale in cascata
    sh.getRange(r, 13).setFormula(
      `=IF(G${r}<>"Fatto","In attesa Tornitura",` +
      `IF(H${r}<>"Fatto","In attesa Fresatura",` +
      `IF(I${r}<>"Fatto","In attesa Rettifica",` +
      `IF(E${r}<D${r},"Finitura in corso","Completato"))))`);
  }

  /* ---- Larghezze + formati ---- */
  const widths = [140, 130, 120, 100, 120, 120, 110, 110, 110, 100, 100, 100, 180];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(`F${HEADER_ROW + 1}:F1000`).setNumberFormat('0%');
  sh.getRange(`J${HEADER_ROW + 1}:K1000`).setNumberFormat('hh:mm');
  sh.getRange(`L${HEADER_ROW + 1}:L1000`).setNumberFormat('0.00');
  sh.getRange(`A${HEADER_ROW + 1}:M1000`).setVerticalAlignment('middle');
  sh.getRange(`B${HEADER_ROW + 1}:M1000`).setHorizontalAlignment('center');
  sh.setFrozenRows(HEADER_ROW);

  /* ---- Menu a tendina ---- */
  const dvNum = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getRangeByName('ordini_num'), true)
    .setAllowInvalid(true).build();
  sh.getRange(`A${HEADER_ROW + 1}:A1000`).setDataValidation(dvNum);

  const dvMacchina = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Tornio CNC 1', 'Tornio CNC 2', 'Fresatrice 1',
      'Fresatrice 2', 'Rettificatrice'], true)
    .setAllowInvalid(false).build();
  sh.getRange(`B${HEADER_ROW + 1}:B1000`).setDataValidation(dvMacchina);

  const dvFase = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Da fare', 'In corso', 'Fatto'], true)
    .setAllowInvalid(false).build();
  ['G', 'H', 'I'].forEach(col =>
    sh.getRange(`${col}${HEADER_ROW + 1}:${col}1000`).setDataValidation(dvFase));

  /* ---- Formattazione condizionale ---- */
  const rules = [];

  // KPI ritardi / critici → rosso se > 0
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#FFC7CE').setFontColor('#9C0006').setBold(true)
    .setRanges([sh.getRange('A3')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#FCE4E4').setFontColor('#9C0006').setBold(true)
    .setRanges([sh.getRange('C3')]).build());

  // Fasi
  ['G', 'H', 'I'].forEach(col => {
    const rng = sh.getRange(`${col}${HEADER_ROW + 1}:${col}1000`);
    rules.push(cfText_(rng, 'Fatto',    '#C6EFCE', '#006100', true));
    rules.push(cfText_(rng, 'In corso', '#FFEB9C', '#9C5700', true));
    rules.push(cfText_(rng, 'Da fare',  '#E7E6E6', '#595959', false));
  });

  // Stato Globale
  const statoRng = sh.getRange(`M${HEADER_ROW + 1}:M1000`);
  rules.push(cfText_(statoRng, 'Completato',           '#548235', '#FFFFFF', true));
  rules.push(cfText_(statoRng, 'Finitura in corso',    '#FFEB9C', '#9C5700', true));
  rules.push(cfText_(statoRng, 'In attesa Tornitura',  '#E7E6E6', '#595959', false));
  rules.push(cfText_(statoRng, 'In attesa Fresatura',  '#EAF3FB', '#1F4E78', false));
  rules.push(cfText_(statoRng, 'In attesa Rettifica',  '#FFF2CC', '#7F6000', false));

  // Gradiente su % Avanzamento
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#F8696B', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMidpointWithValue('#FFEB84', SpreadsheetApp.InterpolationType.NUMBER, '0.5')
    .setGradientMaxpointWithValue('#63BE7B', SpreadsheetApp.InterpolationType.NUMBER, '1')
    .setRanges([sh.getRange(`F${HEADER_ROW + 1}:F1000`)]).build());

  sh.setConditionalFormatRules(rules);
}

/* ============================================================
 * Utilità
 * ============================================================ */
function styleHeader_(sh, row, ncols) {
  sh.getRange(row, 1, 1, ncols)
    .setBackground('#1F4E78')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sh.setRowHeight(row, 30);
}

function cfText_(range, text, bg, fg, bold) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text)
    .setBackground(bg).setFontColor(fg).setBold(bold)
    .setRanges([range]).build();
}

/* ============================================================
 * Azione menu : cancella solo i dati
 * ============================================================ */
function clearData() {
  const ss = SpreadsheetApp.getActive();
  const mapping = [
    ['Magazzino', 2],
    ['Ordini Clienti', 2],
    ['Produzione', 7],
  ];
  mapping.forEach(([name, firstDataRow]) => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const lastRow = sh.getLastRow();
    if (lastRow >= firstDataRow) {
      sh.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, sh.getLastColumn())
        .clearContent();
    }
  });
  SpreadsheetApp.getUi().alert('Dati cancellati. Struttura e formule mantenute.');
}
