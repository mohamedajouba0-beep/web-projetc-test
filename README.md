# Dashboard Produzione — Officina Meccanica di Precisione

Dashboard per il monitoraggio della produzione in tempo reale. Due versioni
disponibili :

| Versione | File | Lingua | Piattaforma |
|---|---|---|---|
| **Google Sheets** (🇮🇹 italiano) | [`google_sheets/Code.gs`](./google_sheets/Code.gs) + [`google_sheets/ISTRUZIONI.md`](./google_sheets/ISTRUZIONI.md) | Italiano | Google Sheets (web, tablet, mobile) |
| **Excel** (🇫🇷 français) | [`Tableau_Production.xlsx`](./Tableau_Production.xlsx) | Français | Excel Online / Desktop / mobile |

---

## 👉 Versione Google Sheets italiana (consigliata)

Istruzioni complete in italiano : [`google_sheets/ISTRUZIONI.md`](./google_sheets/ISTRUZIONI.md).

Riassunto :
1. Crea un nuovo Google Sheet vuoto.
2. **Estensioni → Apps Script**.
3. Incolla il contenuto di [`google_sheets/Code.gs`](./google_sheets/Code.gs).
4. Esegui la funzione `buildDashboard`.
5. Il foglio è costruito con i tre fogli **Magazzino**, **Ordini Clienti**, **Produzione**,
   formule collegate, menu a tendina e formattazione condizionale.

---

## Version Excel française (legacy)

Classeur Excel **prêt à l'emploi** pour piloter en temps réel les ordres de production.
Conçu pour une tablette ouvrant **Excel Online** via OneDrive (aucun VBA, aucune macro).

Fichier à ouvrir : **`Tableau_Production.xlsx`** (à la racine du dépôt).

---

## 1. Vue d'ensemble

Trois feuilles interconnectées :

| Feuille | Rôle | Tableau Excel |
|---|---|---|
| **Magasin** | Suivi matières premières, statut, dates de réception | `tblMagasin` |
| **Commandes Clients** | Carnet de commandes + niveau d'urgence calculé | `tblCommandes` |
| **Production** | Cœur de l'outil : ordres de fabrication, phases, chrono, dashboard | `tblProduction` |

La feuille **Production** s'ouvre en premier et affiche en tête un **mini-dashboard** :

- `Commandes en retard` — nombre de commandes dont la date limite est dépassée
- `Commandes critiques` — échéance < 7 jours
- `Ordres en cours` — ordres dont le statut n'est pas « Terminé »
- `% avancement global` — quantités réalisées / quantités commandées
- `Dernière MAJ` — horodatage recalculé à chaque ouverture

---

## 2. Utilisation quotidienne

### Ajouter une commande client
1. Feuille **Commandes Clients** → cliquer sur la dernière ligne du tableau, `Tab` pour
   créer une nouvelle ligne (le tableau s'étend automatiquement).
2. Remplir `N° Commande`, `Client`, `Quantité Totale`, `Date Limite de Livraison`.
3. Les colonnes `Jours restants` et `Niveau Urgence` se remplissent toutes seules.
4. Une commande en retard passe la ligne en rose, l'étiquette devient `EN RETARD` en rouge,
   et le compteur du dashboard Production s'incrémente.

### Créer un ordre de production
1. Feuille **Production** → nouvelle ligne dans le tableau sous le dashboard.
2. Choisir le `N° Commande` dans la liste déroulante (alimentée par Commandes Clients).
3. `Qté totale` se remplit par **RECHERCHEX** automatique.
4. Choisir `Machine` et saisir `Opérateur`.
5. Au fil de la fabrication : mettre à jour `Qté réalisée` et les phases
   `Tournage` / `Fraisage` / `Rectification` (`À faire` → `En cours` → `Fait`).
6. La colonne **`Statut Global`** calcule en cascade :
   - Tournage pas `Fait` → `En attente Tournage`
   - Fraisage pas `Fait` → `En attente Fraisage`
   - Rectification pas `Fait` → `En attente Rectification`
   - Qté réalisée < Qté totale → `Finition en cours`
   - Sinon → **`Terminé`** (fond vert foncé)

### Saisir le temps réel (Début / Fin)

Pas de bouton Start/Stop (impossible sans VBA sur Excel Online), mais la saisie est
**immédiate** grâce aux raccourcis Excel :

| Plateforme | Raccourci heure courante |
|---|---|
| Excel Desktop Windows | `Ctrl` + `Maj` + `:` |
| Excel Desktop Mac | `⌘` + `;` |
| Excel Online / tablette | Taper `=MAINTENANT()` dans la cellule puis `Entrée`, ou saisir `HH:MM` |

La colonne **`Durée (h)`** calcule automatiquement `(Heure Fin - Heure Début) × 24` en
heures décimales dès que les deux cellules sont renseignées.

### Suivre le magasin
Feuille **Magasin** : toute ligne dont la `Quantité en Stock` ≤ 0 passe en rouge gras.
Toute matière `En commande` est mise en évidence en orange.

---

## 3. Alertes visuelles (mises en forme conditionnelle)

| Où | Condition | Résultat visuel |
|---|---|---|
| Commandes `Niveau Urgence` | `EN RETARD` | rouge gras |
|  | `CRITIQUE` | rouge clair |
|  | `URGENT` | orange |
|  | `NORMAL` | vert |
| Commandes, ligne entière | Date limite < aujourd'hui | fond rose |
| Production `Tournage/Fraisage/Rectification` | `Fait` | vert |
|  | `En cours` | jaune |
|  | `À faire` | gris |
| Production `Statut Global` | `Terminé` | vert foncé, texte blanc |
| Production `% Avancement` | — | barre de progression bleue |
| Dashboard `Commandes en retard` | valeur > 0 | rouge gras |

---

## 4. Régénérer le classeur

Le classeur est généré par un script Python versionné. Pour repartir d'un état propre
ou modifier la structure :

```bash
pip install openpyxl
python3 scripts/build_dashboard.py
```

Le script réécrit `Tableau_Production.xlsx` à la racine. Toute modification de structure,
de formule ou de MFC passe par l'édition de `scripts/build_dashboard.py` puis re-run
— ainsi les changements sont traçables dans Git.

---

## 5. Limites connues (hors périmètre)

- Pas de chronomètre **temps réel** côté cellule : Excel Online n'exécute ni VBA, ni
  ActiveX. La durée est calculée par différence Heure Fin − Heure Début.
- Pas de graphiques Gantt / Pareto intégrés pour l'instant.
- Pas d'authentification opérateur : le champ `Opérateur` est déclaratif.
- Les données sont des exemples. Les effacer avant mise en production.

---

## 6. Structure du dépôt

```
.
├── README.md
├── Tableau_Production.xlsx     ← le livrable à ouvrir
├── scripts/
│   └── build_dashboard.py      ← générateur (openpyxl)
└── .gitignore
```
