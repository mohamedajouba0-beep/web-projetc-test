"""Generate Tableau_Production.xlsx — tableau de bord de suivi de production.

Re-run this script to rebuild the workbook from scratch:
    pip install openpyxl
    python3 scripts/build_dashboard.py

Output: Tableau_Production.xlsx at the repo root.

Formulas are stored in English (TODAY, IF, AND, COUNTIFS, XLOOKUP...) as required by
openpyxl / the OOXML spec. Excel displays them localized (AUJOURDHUI, SI, ET, NB.SI.ENS,
RECHERCHEX) when opened in a French UI. The separator is always a comma in storage.
"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, DataBarRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo


OUTPUT = Path(__file__).resolve().parent.parent / "Tableau_Production.xlsx"

# --- Styling palette -------------------------------------------------------

HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
TITLE_FONT = Font(name="Calibri", size=18, bold=True, color="1F4E78")
KPI_LABEL_FONT = Font(name="Calibri", size=10, bold=True, color="595959")
KPI_VALUE_FONT = Font(name="Calibri", size=16, bold=True, color="1F4E78")
DASHBOARD_FILL = PatternFill("solid", fgColor="EAF3FB")

THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)

# MFC fills
FILL_GREEN = PatternFill("solid", fgColor="C6EFCE")
FILL_GREEN_DARK = PatternFill("solid", fgColor="548235")
FILL_YELLOW = PatternFill("solid", fgColor="FFEB9C")
FILL_GREY = PatternFill("solid", fgColor="E7E6E6")
FILL_RED = PatternFill("solid", fgColor="FFC7CE")
FILL_RED_LIGHT = PatternFill("solid", fgColor="FCE4E4")
FILL_ORANGE = PatternFill("solid", fgColor="FFD8A8")
FILL_PINK = PatternFill("solid", fgColor="FDECEC")

FONT_RED_BOLD = Font(bold=True, color="9C0006")
FONT_GREEN_BOLD = Font(bold=True, color="006100")
FONT_ORANGE_BOLD = Font(bold=True, color="9C5700")
FONT_WHITE_BOLD = Font(bold=True, color="FFFFFF")


def style_header_row(ws, row: int, ncols: int) -> None:
    for col in range(1, ncols + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[row].height = 28


def set_col_widths(ws, widths: dict[str, int]) -> None:
    for col_letter, width in widths.items():
        ws.column_dimensions[col_letter].width = width


def add_table(ws, name: str, ref: str, style_name: str = "TableStyleMedium2") -> None:
    tbl = Table(displayName=name, ref=ref)
    tbl.tableStyleInfo = TableStyleInfo(
        name=style_name,
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )
    ws.add_table(tbl)


# ---------------------------------------------------------------------------
# Feuille « Magasin »
# ---------------------------------------------------------------------------


def build_magasin(wb: Workbook) -> None:
    ws = wb.create_sheet("Magasin")
    headers = [
        "ID Matière",
        "Désignation",
        "Quantité en Stock",
        "Statut",
        "Date de réception prévue",
    ]
    ws.append(headers)

    sample = [
        ("MAT-001", "Barre acier 42CrMo4 Ø40", 120, "Disponible", None),
        ("MAT-002", "Barre inox 316L Ø25",      35,  "Disponible", None),
        ("MAT-003", "Plaque aluminium 7075 20mm", 0,   "En commande", date.today() + timedelta(days=4)),
        ("MAT-004", "Rond bronze CuSn8 Ø30",    8,   "Disponible", None),
        ("MAT-005", "Tôle acier S235 5mm",      0,   "En commande", date.today() + timedelta(days=10)),
    ]
    for row in sample:
        ws.append(row)

    last_row = ws.max_row
    ncols = len(headers)
    style_header_row(ws, 1, ncols)
    set_col_widths(ws, {"A": 14, "B": 32, "C": 18, "D": 16, "E": 24})
    ws.freeze_panes = "A2"

    # Dates
    for r in range(2, last_row + 1):
        ws.cell(row=r, column=5).number_format = "dd/mm/yyyy"

    # Data validation: Statut
    dv_statut = DataValidation(
        type="list",
        formula1='"Disponible,En commande"',
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Valeur invalide",
        error="Choisir 'Disponible' ou 'En commande'.",
    )
    dv_statut.add(f"D2:D{last_row + 50}")
    ws.add_data_validation(dv_statut)

    # Data validation: Quantité >= 0
    dv_qty = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0)
    dv_qty.error = "La quantité doit être ≥ 0."
    dv_qty.add(f"C2:C{last_row + 50}")
    ws.add_data_validation(dv_qty)

    add_table(ws, "tblMagasin", f"A1:E{last_row}")

    # MFC : Quantité <= 0 → rouge gras
    ws.conditional_formatting.add(
        f"C2:C{last_row}",
        CellIsRule(operator="lessThanOrEqual", formula=["0"], stopIfTrue=False,
                   fill=FILL_RED, font=FONT_RED_BOLD),
    )
    # MFC : Statut « En commande » → fond orange clair
    ws.conditional_formatting.add(
        f"D2:D{last_row}",
        CellIsRule(operator="equal", formula=['"En commande"'], fill=FILL_ORANGE,
                   font=FONT_ORANGE_BOLD),
    )


# ---------------------------------------------------------------------------
# Feuille « Commandes Clients »
# ---------------------------------------------------------------------------


def build_commandes(wb: Workbook) -> None:
    ws = wb.create_sheet("Commandes Clients")
    headers = [
        "N° Commande",
        "Client",
        "Quantité Totale",
        "Date Limite de Livraison",
        "Jours restants",
        "Niveau Urgence",
    ]
    ws.append(headers)

    today = date.today()
    sample = [
        ("CMD-2026-001", "AéroMéca SAS",     50,  today + timedelta(days=3)),
        ("CMD-2026-002", "Hydro Industries", 120, today + timedelta(days=10)),
        ("CMD-2026-003", "MédiTech",         8,   today - timedelta(days=2)),
        ("CMD-2026-004", "AutoPrécis",       200, today + timedelta(days=20)),
        ("CMD-2026-005", "NavalWorks",       30,  today + timedelta(days=5)),
    ]
    for num, client, qte, deadline in sample:
        ws.append([
            num,
            client,
            qte,
            deadline,
            # Jours restants
            f'=[@[Date Limite de Livraison]]-TODAY()',
            # Niveau d'urgence en cascade
            (
                '=IF([@[Date Limite de Livraison]]<TODAY(),"EN RETARD",'
                'IF([@[Jours restants]]<7,"CRITIQUE",'
                'IF([@[Jours restants]]<15,"URGENT","NORMAL")))'
            ),
        ])

    last_row = ws.max_row
    ncols = len(headers)
    style_header_row(ws, 1, ncols)
    set_col_widths(ws, {"A": 18, "B": 22, "C": 16, "D": 22, "E": 14, "F": 18})
    ws.freeze_panes = "A2"

    for r in range(2, last_row + 1):
        ws.cell(row=r, column=4).number_format = "dd/mm/yyyy"
        ws.cell(row=r, column=5).number_format = "0"
        ws.cell(row=r, column=6).alignment = CENTER

    add_table(ws, "tblCommandes", f"A1:F{last_row}")

    # MFC Niveau Urgence
    urgence_range = f"F2:F{last_row}"
    ws.conditional_formatting.add(
        urgence_range,
        CellIsRule(operator="equal", formula=['"EN RETARD"'], fill=FILL_RED, font=FONT_RED_BOLD),
    )
    ws.conditional_formatting.add(
        urgence_range,
        CellIsRule(operator="equal", formula=['"CRITIQUE"'], fill=FILL_RED_LIGHT, font=FONT_RED_BOLD),
    )
    ws.conditional_formatting.add(
        urgence_range,
        CellIsRule(operator="equal", formula=['"URGENT"'], fill=FILL_ORANGE, font=FONT_ORANGE_BOLD),
    )
    ws.conditional_formatting.add(
        urgence_range,
        CellIsRule(operator="equal", formula=['"NORMAL"'], fill=FILL_GREEN, font=FONT_GREEN_BOLD),
    )

    # MFC ligne entière : Date limite < aujourd'hui → fond rose
    row_range = f"A2:F{last_row}"
    ws.conditional_formatting.add(
        row_range,
        FormulaRule(formula=[f"$D2<TODAY()"], fill=FILL_PINK),
    )


# ---------------------------------------------------------------------------
# Feuille « Production »
# ---------------------------------------------------------------------------


PHASE_VALUES = '"À faire,En cours,Fait"'
MACHINE_VALUES = '"Tour CNC 1,Tour CNC 2,Fraiseuse 1,Fraiseuse 2,Rectifieuse"'

PROD_HEADERS = [
    "N° Commande",   # A
    "Machine",       # B
    "Opérateur",     # C
    "Qté totale",    # D (formule XLOOKUP)
    "Qté réalisée",  # E
    "% Avancement",  # F
    "Tournage",      # G
    "Fraisage",      # H
    "Rectification", # I
    "Heure Début",   # J
    "Heure Fin",     # K
    "Durée (h)",     # L
    "Statut Global", # M
]
PROD_HEADER_ROW = 6  # dashboard occupies rows 1-4


def build_production(wb: Workbook) -> None:
    ws = wb.create_sheet("Production")

    # --- Dashboard zone (rows 1-4) ---------------------------------------
    ws.merge_cells("A1:M1")
    title = ws.cell(row=1, column=1, value="TABLEAU DE BORD — SUIVI DE PRODUCTION")
    title.font = TITLE_FONT
    title.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 34

    kpis = [
        ("A2", "Commandes en retard",
         '=COUNTIF(tblCommandes[Niveau Urgence],"EN RETARD")'),
        ("C2", "Commandes critiques",
         '=COUNTIF(tblCommandes[Niveau Urgence],"CRITIQUE")'),
        ("E2", "Ordres en cours",
         '=COUNTIFS(tblProduction[Statut Global],"<>Terminé")'),
        ("G2", "% avancement global",
         '=IFERROR(SUM(tblProduction[Qté réalisée])/SUM(tblProduction[Qté totale]),0)'),
        ("I2", "Dernière MAJ",
         '=NOW()'),
    ]
    for anchor, label, formula in kpis:
        col = anchor[0]
        row = int(anchor[1:])
        label_cell = ws[f"{col}{row}"]
        label_cell.value = label
        label_cell.font = KPI_LABEL_FONT
        label_cell.fill = DASHBOARD_FILL
        label_cell.alignment = Alignment(horizontal="center", vertical="center")
        label_cell.border = BORDER

        # Value one row below
        value_cell = ws[f"{col}{row + 1}"]
        value_cell.value = formula
        value_cell.font = KPI_VALUE_FONT
        value_cell.fill = DASHBOARD_FILL
        value_cell.alignment = Alignment(horizontal="center", vertical="center")
        value_cell.border = BORDER

    ws["G3"].number_format = "0.0%"
    ws["I3"].number_format = "dd/mm/yyyy hh:mm"
    ws.row_dimensions[2].height = 20
    ws.row_dimensions[3].height = 28

    # MFC : compteur retards > 0 → texte rouge gras
    ws.conditional_formatting.add(
        "A3",
        CellIsRule(operator="greaterThan", formula=["0"], fill=FILL_RED, font=FONT_RED_BOLD),
    )
    ws.conditional_formatting.add(
        "C3",
        CellIsRule(operator="greaterThan", formula=["0"], fill=FILL_RED_LIGHT, font=FONT_RED_BOLD),
    )

    # --- Table header (row 6) --------------------------------------------
    for i, h in enumerate(PROD_HEADERS, start=1):
        ws.cell(row=PROD_HEADER_ROW, column=i, value=h)
    style_header_row(ws, PROD_HEADER_ROW, len(PROD_HEADERS))

    sample = [
        ("CMD-2026-001", "Tour CNC 1",  "J. Martin",  30, "Fait",     "En cours", "À faire"),
        ("CMD-2026-002", "Fraiseuse 1", "L. Dubois",  75, "Fait",     "Fait",     "En cours"),
        ("CMD-2026-003", "Tour CNC 2",  "A. Bernard", 8,  "Fait",     "Fait",     "Fait"),
        ("CMD-2026-004", "Fraiseuse 2", "M. Leroy",   40, "En cours", "À faire",  "À faire"),
        ("CMD-2026-005", "Rectifieuse", "P. Girard",  10, "Fait",     "Fait",     "À faire"),
    ]

    for i, (num, machine, operator, qte_real, tour, frais, rectif) in enumerate(sample):
        r = PROD_HEADER_ROW + 1 + i
        ws.cell(row=r, column=1, value=num)
        ws.cell(row=r, column=2, value=machine)
        ws.cell(row=r, column=3, value=operator)
        ws.cell(row=r, column=4,
                value='=IFERROR(XLOOKUP([@[N° Commande]],tblCommandes[N° Commande],'
                      'tblCommandes[Quantité Totale]),0)')
        ws.cell(row=r, column=5, value=qte_real)
        ws.cell(row=r, column=6,
                value='=IFERROR([@[Qté réalisée]]/[@[Qté totale]],0)')
        ws.cell(row=r, column=7, value=tour)
        ws.cell(row=r, column=8, value=frais)
        ws.cell(row=r, column=9, value=rectif)
        # Heure Début / Fin laissés vides pour saisie
        ws.cell(row=r, column=10, value=None)
        ws.cell(row=r, column=11, value=None)
        ws.cell(row=r, column=12,
                value='=IF(AND([@[Heure Début]]<>"",[@[Heure Fin]]<>""),'
                      '([@[Heure Fin]]-[@[Heure Début]])*24,"")')
        ws.cell(row=r, column=13,
                value='=IF([@Tournage]<>"Fait","En attente Tournage",'
                      'IF([@Fraisage]<>"Fait","En attente Fraisage",'
                      'IF([@Rectification]<>"Fait","En attente Rectification",'
                      'IF([@[Qté réalisée]]<[@[Qté totale]],"Finition en cours","Terminé"))))')

    last_row = PROD_HEADER_ROW + len(sample)

    # Column widths + formats
    set_col_widths(ws, {
        "A": 16, "B": 14, "C": 14, "D": 12, "E": 14, "F": 14,
        "G": 13, "H": 13, "I": 15, "J": 14, "K": 14, "L": 12, "M": 22,
    })
    for r in range(PROD_HEADER_ROW + 1, last_row + 1):
        ws.cell(row=r, column=6).number_format = "0%"
        ws.cell(row=r, column=10).number_format = "hh:mm"
        ws.cell(row=r, column=11).number_format = "hh:mm"
        ws.cell(row=r, column=12).number_format = "0.00"
        for c in (2, 6, 7, 8, 9, 10, 11, 12, 13):
            ws.cell(row=r, column=c).alignment = CENTER

    ws.freeze_panes = f"A{PROD_HEADER_ROW + 1}"

    add_table(ws, "tblProduction",
              f"A{PROD_HEADER_ROW}:{get_column_letter(len(PROD_HEADERS))}{last_row}")

    # --- Data validations -------------------------------------------------
    dv_num = DataValidation(type="list",
                            formula1="=tblCommandes[N° Commande]",
                            allow_blank=True)
    dv_num.add(f"A{PROD_HEADER_ROW + 1}:A{last_row + 50}")
    ws.add_data_validation(dv_num)

    dv_machine = DataValidation(type="list", formula1=MACHINE_VALUES, allow_blank=True)
    dv_machine.add(f"B{PROD_HEADER_ROW + 1}:B{last_row + 50}")
    ws.add_data_validation(dv_machine)

    for col_letter in ("G", "H", "I"):
        dv = DataValidation(type="list", formula1=PHASE_VALUES, allow_blank=False)
        dv.add(f"{col_letter}{PROD_HEADER_ROW + 1}:{col_letter}{last_row + 50}")
        ws.add_data_validation(dv)

    dv_time_start = DataValidation(type="time", operator="between",
                                   formula1="0", formula2="1", allow_blank=True)
    dv_time_start.add(f"J{PROD_HEADER_ROW + 1}:K{last_row + 50}")
    ws.add_data_validation(dv_time_start)

    # --- Conditional formatting ------------------------------------------
    for col_letter in ("G", "H", "I"):
        rng = f"{col_letter}{PROD_HEADER_ROW + 1}:{col_letter}{last_row}"
        ws.conditional_formatting.add(
            rng,
            CellIsRule(operator="equal", formula=['"Fait"'],
                       fill=FILL_GREEN, font=FONT_GREEN_BOLD),
        )
        ws.conditional_formatting.add(
            rng,
            CellIsRule(operator="equal", formula=['"En cours"'],
                       fill=FILL_YELLOW, font=FONT_ORANGE_BOLD),
        )
        ws.conditional_formatting.add(
            rng,
            CellIsRule(operator="equal", formula=['"À faire"'],
                       fill=FILL_GREY),
        )

    statut_rng = f"M{PROD_HEADER_ROW + 1}:M{last_row}"
    ws.conditional_formatting.add(
        statut_rng,
        CellIsRule(operator="equal", formula=['"Terminé"'],
                   fill=FILL_GREEN_DARK, font=FONT_WHITE_BOLD),
    )
    ws.conditional_formatting.add(
        statut_rng,
        CellIsRule(operator="equal", formula=['"Finition en cours"'],
                   fill=FILL_YELLOW, font=FONT_ORANGE_BOLD),
    )

    # Data bar sur % Avancement
    avancement_rng = f"F{PROD_HEADER_ROW + 1}:F{last_row}"
    ws.conditional_formatting.add(
        avancement_rng,
        DataBarRule(start_type="num", start_value=0,
                    end_type="num", end_value=1,
                    color="4F81BD", showValue=True),
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def build_workbook() -> Workbook:
    wb = Workbook()
    default = wb.active
    wb.remove(default)

    # Order: Magasin, Commandes, Production so references resolve left-to-right
    build_magasin(wb)
    build_commandes(wb)
    build_production(wb)

    # Make Production the first sheet shown on open
    prod = wb["Production"]
    wb.move_sheet(prod, offset=-wb.sheetnames.index("Production"))
    wb.active = wb.sheetnames.index("Production")

    return wb


def main() -> None:
    wb = build_workbook()
    wb.save(OUTPUT)
    print(f"OK — classeur généré : {OUTPUT.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
