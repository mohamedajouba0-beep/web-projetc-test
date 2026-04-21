# Dashboard Produzione — versione Google Sheets (italiano)

Dashboard per il monitoraggio in tempo reale della produzione di un'officina
meccanica di precisione, costruito interamente con Google Sheets + Apps Script.
Nessuna installazione, funziona su tablet tramite il browser.

## Installazione in 2 minuti

1. Aprire [sheets.google.com](https://sheets.google.com) e creare un **nuovo foglio vuoto**.
   Rinominarlo ad esempio `Dashboard Produzione`.
2. Menu **Estensioni → Apps Script**. Si apre una nuova scheda.
3. Cancellare il contenuto di `Code.gs` e incollare tutto il contenuto del file
   [`google_sheets/Code.gs`](./Code.gs) di questo repo.
4. Cliccare **💾 Salva** (o `Ctrl+S`).
5. Nel selettore di funzione in alto, scegliere **`buildDashboard`** e cliccare **▶ Esegui**.
6. Google chiede un'autorizzazione (solo la prima volta) → `Revisiona autorizzazioni`
   → scegli il tuo account → `Avanzate` → `Vai a <nome del progetto> (non sicuro)`
   → `Consenti`. Questo serve unicamente per permettere allo script di modificare
   il tuo proprio foglio.
7. Tornare al foglio : i tre fogli **Magazzino**, **Ordini Clienti**, **Produzione**
   sono costruiti, formattati e collegati.

Al prossimo accesso, un menu **🏭 Produzione** appare nella barra del foglio
(`Ricostruisci il foglio`, `Cancella i dati`).

## Struttura prodotta

| Foglio | Ruolo |
|---|---|
| **Magazzino** | Materie prime, stock, stato, data ricezione prevista |
| **Ordini Clienti** | Carnet ordini + livello di urgenza calcolato |
| **Produzione** | Cuore dello strumento : KPI, fasi Tornitura → Fresatura → Rettifica, durata reale, stato globale |

### Dashboard nella parte alta della Produzione

- **Ordini in ritardo** — numero di ordini con data scaduta
- **Ordini critici** — scadenza < 7 giorni
- **Ordini in corso** — stato globale diverso da `Completato`
- **% avanzamento globale** — quantità realizzata / quantità ordinata
- **Ultimo aggiornamento** — `=NOW()`

### Fasi di lavorazione

Ogni ordine ha tre fasi con menu a tendina `Da fare` / `In corso` / `Fatto`.
La colonna **Stato Globale** si calcola in cascata :

1. Tornitura non `Fatto` → `In attesa Tornitura`
2. Fresatura non `Fatto` → `In attesa Fresatura`
3. Rettifica non `Fatto` → `In attesa Rettifica`
4. Qtà realizzata < Qtà totale → `Finitura in corso`
5. Altrimenti → **`Completato`** (sfondo verde scuro, testo bianco)

### Durata reale di lavorazione

Nessun cronometro automatico (impossibile in modo affidabile in Google Sheets),
ma l'operatore inserisce l'ora di inizio / fine :

- Scorciatoia ora corrente su desktop : `Ctrl + Maj + ;`
- Su tablet : digitare `=NOW()` o scrivere `HH:MM`

La colonna **Durata (h)** calcola automaticamente `(Ora Fine − Ora Inizio) × 24`
in ore decimali non appena entrambe le celle sono compilate.

### Alert visivi (formattazione condizionale)

| Zona | Condizione | Visivo |
|---|---|---|
| Livello Urgenza | `IN RITARDO` | rosso grassetto |
|  | `CRITICO` | rosso chiaro |
|  | `URGENTE` | arancione |
|  | `NORMALE` | verde |
| Ordine Clienti (riga intera) | Data scaduta | sfondo rosa |
| Fasi Tornitura/Fresatura/Rettifica | `Fatto` | verde |
|  | `In corso` | giallo |
|  | `Da fare` | grigio |
| Stato Globale | `Completato` | verde scuro, testo bianco |
| % Avanzamento | — | gradiente rosso → giallo → verde |
| KPI Ordini in ritardo | > 0 | testo rosso grassetto |

## Aggiungere un ordine / un ordine di produzione

### Nuovo ordine cliente
1. Scheda **Ordini Clienti** → ultima riga → compilare `N° Ordine`, `Cliente`,
   `Quantità Totale`, `Data Limite di Consegna`.
2. Le colonne `Giorni rimanenti` e `Livello Urgenza` si autocompilano.

### Nuovo ordine di produzione
1. Scheda **Produzione** → nuova riga sotto l'intestazione.
2. Scegliere l'**N° Ordine** dal menu a tendina (alimentato da Ordini Clienti).
3. La **Qtà totale** si compila tramite `CERCA.VERT`.
4. Scegliere `Macchina`, scrivere l'`Operatore`, aggiornare le fasi al procedere
   della lavorazione.

**Nota formule** : per estendere le formule a nuove righe, basta trascinare
l'angolo inferiore delle celle con formule (colonne D, F, L, M sulla
Produzione) o ricopiare con `Ctrl+D`. Se preferisci che si propaghino da sole,
aggiungi `ARRAYFORMULA(...)` (esercizio successivo).

## Alternativa più veloce : importare l'.xlsx

Il repo contiene anche `Tableau_Production.xlsx` (versione francese).
Puoi trascinarlo su [drive.google.com](https://drive.google.com),
doppio click → **Apri con Google Sheets** → **File → Salva come Google Sheet**.
La struttura, le formule e la formattazione condizionale si traducono
automaticamente (le tabelle Excel diventano intervalli semplici). Lingua : francese.

Per la versione italiana nativa, preferisci lo script Apps Script sopra.

## Limiti conosciuti

- Non c'è cronometro Start/Stop in tempo reale : solo calcolo per differenza
  Ora Fine − Ora Inizio.
- Non ci sono grafici Gantt integrati (si possono aggiungere manualmente).
- Nessun login operatore : il campo `Operatore` è dichiarativo.
- I dati pre-riempiti sono esempi : cancellarli prima di utilizzare lo strumento
  in produzione (menu `🏭 Produzione → Cancella i dati`).
