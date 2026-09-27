# Localization verification — 2026-09-24

## Additional report display-copy pass — 2026-09-25

Long-stay report empty/summary/day-count messages and visible region labels now use four-language display translations. The PQ20 control line and its conditional explanatory notes also use scoped four-language keys; the count arithmetic and report selection are unchanged. Catalog parity is now **1,659 keys per language**, with no missing keys relative to UZ. `npm test`: **75/75 PASS**; production build: **PASS**. This is source/regression verification only for those conditional report states. The global claim of zero untranslated or mixed-language UI is **not established**; the pending browser and dynamic-source inventory in the checkpoint below still applies.

## Four-language visible-copy audit checkpoint — 2026-09-25

**Not closed; overall PARTIAL.** The catalogs now contain **1,651 keys in each of UZ/RU/EN/KK**, with zero missing keys relative to UZ. An authenticated browser loaded the Facilities full table in RU and KK with **237 rows**. The MSCT-only filter showed **72 rows** in both; KK search for the localized region `Andijon wálayatı` narrowed the result to **4 rows**. EN entry labels loaded, but the browser target closed again during the full 237-row table read. EN full-table/filter, Facilities add/duplicate/dirty/save/no-results/error branches, and the rest of the four-language branch matrix remain unverified.

Display-only fixes in this pass: patient-card banner statuses and stored discharge-outcome label; GRACE risk labels and MSCT choice display; treatment-time helper after discharge; patient-list dynamic totals and missing-time count; pending-admission age, sex and waiting-days label; report patient drilldown age, sex, region, status and count; movement routing audit visible summary and known reason labels. Stored values, free-text fields, patient data, routing decisions and clinical thresholds were not changed. `npm test`: **73/73 PASS**; `npm run build`: **PASS**.

The static visible-copy detector still reports **23 candidates**, mostly acronyms/code fragments, and cannot establish zero real UI text. Separate source inspection still finds untranslated dynamic composite strings (particularly in `hisobot.js`, `admin.js`, `qabul.js`, `marshrut.js` and some clinical branches). Therefore the number of remaining untranslated/mixed-language UI messages is **not yet established and must not be reported as zero**. Browser-pending patient-card branches: populated Condition/Follow-up/Handover/subsequent Treatment histories; conditional Discharge/rehabilitation/complication/retrospective states; populated Media actions; NSTEMI PCI window. Full wizard, reports, admin, dashboard and settings branch-by-branch four-language verification also remains pending.

## Read-only localization closure pass — 2026-09-25

**Overall remains PARTIAL.** The authenticated EN Facilities page showed translated entry controls, level choices and table headers; its browser target again closed during full-table loading, so EN full-table/filter is **PENDING**. RU and KK full-table/filter browser paths were not completed in this pass. The prior UZ 237-row table and 72-row MSCT filter check remain the only populated Facilities browser proof.

An authenticated EN patient list exposed a real mixed-language age/sex cell (`57 yosh · Erkak`). The display now uses existing age and gender translations without modifying stored patient values. Fresh browser verification showed EN `Age: 57 · Male`, RU `Возраст: 57 · Мужчина`, and KK `Jası: 57 · Er adam` (with other rows showing the respective female labels). The authenticated KK patient-card Overview banner then exposed untranslated age/admission copy and an untranslated region display. Those banner fragments now use display-only keys and the existing region translator; a fresh RU patient card confirmed `Возраст: 70 · город Ташкент` and `Поступил: ...`. Fresh EN/KK/UZ banner retests remain **PENDING**.

Patient-card Condition was opened read-only on an RU record; its entry labels and empty-history message were translated, but there was no populated Condition history in that record. A source inspection also found mixed Uzbek/Cyrillic text in the conditional NSTEMI PCI-window display. Its messages now use four-language keys; the GRACE thresholds and 24/72-hour calculations are unchanged. This PCI branch has **source/regression coverage only**, not authenticated four-language browser proof. No patient record, free-text field, status, stored enum or clinical value was changed.

Checks: `npm test` **66/66 PASS**; `npm run build` **PASS**. Remaining translation-browser PENDING items: Facilities EN/RU/KK full table and filters; patient-card populated Condition/Follow-up/Handover histories; subsequent-treatment history; discharge conditional states; NSTEMI PCI-window populated state; fresh EN/KK/UZ patient-card banner; remaining authenticated routes and data-driven branches in all four languages. Independent clinical/native-language terminology review remains pending.

## Facilities performance separation and bounded EN fixture — 2026-09-25

**Facilities localization remains separate from browser performance.** Source inspection confirms `draw()` renders every filtered row into one `tbody.innerHTML` and calls page-wide `initIcons()`; each search/filter change calls `draw()` again. In the authenticated UZ browser, 237 rows rendered and MSCT filtering showed 72 rows. The EN target closed while the full table was loading, so a large-DOM/client-render contribution is plausible but **not proven**; no application exception was captured. No pagination or virtual scrolling was introduced without a measured product requirement.

A new synthetic **30-institution EN fixture** exercises table rendering, translated region-name search (12 matches), and combined MSCT filtering (8 matches), asserting stored Uzbek region and facility values are unchanged. This is regression/source-level verification, **not** authenticated EN full-table browser verification. `npm test`: **63/63 PASS**. EN full-table browser closure remains **PENDING**, and overall localization verification remains **PARTIAL**.

## Facilities browser follow-up — 2026-09-25

**Overall remains PARTIAL.** In a fresh authenticated UZ tab, accessibility navigation opened `/muassasa-imkoniyat` successfully. The populated table reported **237 institutions**; the **MSCT only** filter reduced the displayed count to **72**, matching the MSCT summary count. No row value or facility record was changed. A separate fresh EN tab opened the same route and showed translated entry controls, filter options, level options and table headers (`Facility capabilities`, `All levels`, `New institution`, `REGION`, `INSTITUTION`, `LEVEL`, `ANGIOGRAPHY`, `ACTIONS`). Before the full EN table could be read, the browser target closed during table loading. Thus UZ populated table + one filter are browser-verified, while **EN full table/filter verification remains PENDING**. The earlier dashboard-return observation was not reproduced with accessibility navigation and is not evidence of an application navigation defect; the large-table browser target failure remains unclassified.

## Facilities full-table and filter-copy source checkpoint — 2026-09-25

**Overall remains PARTIAL.** The dedicated Facilities page's full table/filters were revisited in an authenticated EN browser, but the browser target again timed out while the large table loaded. Two browser reads after navigation gave no usable table state; this is **not** treated as proof of an application defect or as a browser PASS. Source review found untranslated table headers, level option labels, region cells, hidden badges, no-results/loading/error copy, dynamic summary counts, dirty/save copy, and add-dialog labels. These now use the existing four-language catalog or scoped new keys. Search accepts a localized region name as display input while persisted region names, facility names, level IDs, checkbox values and save payloads stay unchanged. No facility row, checkbox, hidden state or record was changed.

Source/regression checks: `npm test` **62/62 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Full Facilities table/filter browser verification remains **PENDING**. The timeout needs separate performance/browser investigation if it repeats under a narrower controlled fixture.

## Patient-card populated-history source checkpoint — 2026-09-25

**Overall remains PARTIAL.** The Follow-up populated-history renderer previously inserted stored period, condition, recurrence and disability labels as raw Uzbek text. It now translates those known enum values and UI labels only at display time, while free-text notes and doctor names remain unmodified (and are escaped before HTML insertion). The Condition populated table now binds headers to four-language keys and translates the stored condition display label; Handover keeps its translated condition badge and now escapes the next-doctor name. No record value, enum, clinical calculation, or save operation changed.

This pass adds source/regression coverage for those populated renderers; an existing populated Condition/Follow-up/Handover record was **not** reached in the authenticated browser, so browser verification of those data branches remains pending. Checks: `npm test` **61/61 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only).

## Patient-card Media and Discharge conditional-copy checkpoint — 2026-09-25

**Overall remains PARTIAL.** Source inspection found visible Uzbek UI copy in the patient-card Media entry/empty state and the Discharge already-discharged, transferred, deceased, retrospective, complication, transfer-destination and rehabilitation branches. Media copy now uses the existing four-language catalogs plus scoped new keys. A fresh authenticated EN browser confirmed `Upload file`, `Patient files`, `No file selected`, `No files uploaded yet`, and the four translated document-type labels; a fresh KK rerender confirmed `Fayldı júklew`, `Nawqas faylları`, `Fayl tańlanbadı`, and `Ele fayl júklenbegen.` Stored document-type values remained Uzbek. No file was selected, uploaded or deleted.

Discharge conditional display copy and the six infarction-complication labels were connected to four-language keys. The radio/checkbox values, patient status values, facility option values, and medical calculations were not changed. A synthetic render regression checked discharged, transferred, deceased and retrospective-infarction branches in RU/EN/KK, including the original `Kardiogen shok` checkbox value. These conditional branches were **not** exercised on real patient records or saved in the browser. Populated Media file cards and upload/delete results also remain pending. New clinical translation wording, especially complication labels, still requires independent clinician/native-language review.

Checks: `npm test` **60/60 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only).

## Dashboard region-filter responsive checkpoint — 2026-09-25

**Dashboard region-filter responsive check PASS; full route-by-route responsive coverage remains PARTIAL.** The authenticated EN dashboard was measured at 390×844, 768×1024, 1366×768, and 1920×1080 after full region names were localized. All 15 region-filter controls remained present, and document `scrollWidth` equalled viewport `clientWidth` at each size (no document-level horizontal overflow). At 390 px, the region buttons wrapped within the viewport, but their original 31 px height was below the 44 px mobile touch-target rule. Mobile-only minimum height was added for the all-regions, 14 region, and RSHTYoIM buttons; the generated CSS cache version was advanced. A fresh 390 px browser load, after viewport settling, measured a 44 px target and no horizontal overflow. The temporary viewport override was reset. No filter or database value changed.

Checks: `npm test` **58/58 passed**, `npm run build` passed, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). This checkpoint covers the dashboard region-filter area, not every dashboard component or authenticated route.

## Dashboard region filter localization checkpoint — 2026-09-25

**Dashboard region buttons PASS for UZ/RU/EN/KK; overall remains PARTIAL.** The 14 region buttons previously removed the Uzbek `viloyati`/`Respublikasi` suffix before translation, so only `Toshkent shahri` matched a full-name catalog entry. Buttons now translate each full region name from the existing four-language catalog, while `setViewViloyat(...)`, DB region names, population lookup keys, and facility names keep their original values. The all-regions control and selected-region chart heading are localized; chart labels translate region names only in the all-regions view, not facility names. A fresh authenticated browser load confirmed all 14 buttons in UZ, RU, EN and KK. Clicking English `Andijan Region` selected that button and displayed `By institution: Andijan Region`, while its action still supplied `Andijon viloyati`.

Checks: `npm test` **58/58 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Full route-level responsive verification and district/facility naming policy remain pending, as do the other previously listed clinical and patient-card branches.

## Patient-card Condition entry and empty-history checkpoint — 2026-09-25

**Overall remains PARTIAL.** An authenticated EN browser opened the patient-card Condition tab read-only and found untranslated section headings and two condition choices. The headings and empty-history message now use existing/four-language semantic keys, while all condition choices translate only their visible text. Fresh EN load confirmed `New measurement`, `Condition history`, `Good`, `Satisfactory`, `Severe`, `Very severe`, `Critical`, and `No measurements recorded yet`. The select option values remained the original Uzbek enums (`Yaxshi`, `Qoniqarli`, `Og'ir`, `Juda og'ir`, `Kritik`). No measurement was entered or saved. Populated condition history and save-result branches remain pending.

Checks: `npm test` **57/57 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Other populated/data-driven patient-card branches, Facilities full table/filters, clinical branches, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Treatment history admission-record checkpoint — 2026-09-25

**Overall remains PARTIAL.** An authenticated EN browser opened an existing patient card's Treatment tab read-only. Its populated admission-treatment entry rendered `Treatment on admission` and an English display label for a known stored treatment. The three history labels (empty history, admission treatment, subsequent treatment) now use their existing four-language semantic keys directly; known treatment values are translated only for display, with persisted values and free-text notes untouched. A fresh EN load confirmed the admission-history label. No treatment was selected, edited, deleted, or saved. A populated subsequent-treatment record was not reached in this pass, so that data branch and its edit/delete flows remain pending rather than PASS.

Checks: `npm test` **56/56 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Other populated patient-card histories, conditional discharge/transfer, Facilities full table/filters, clinical branches, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Follow-up entry checkpoint — 2026-09-25

**Overall remains PARTIAL.** An authenticated EN browser opened a stroke patient card's Follow-up tab read-only. Field labels were English, but `Yangi kuzatuv`, `Kuzatuvlar tarixi`, all four follow-up periods and several patient-condition choices remained Uzbek. The headings now use four-language keys, while select display text uses the existing translator and each `<option value>` retains its original stored Uzbek enum. A fresh EN load confirmed `New follow-up`, `Follow-up history`, `30 days`, `3 months`, `6 months`, `1 year`, `Good / stable`, `Readmitted (re-hospitalisation)`, `Recurrent event (stroke/heart attack)`, and `Died`; the empty-history message displayed `No follow-up records`. No follow-up record was entered or saved. Populated history and save-result branches remain unverified.

Checks: `npm test` **55/55 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Treatment history, conditional discharge/transfer and other patient-card data branches, Facilities full table/filters, other clinical flows, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Discharge entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser opened the patient-card Discharge form read-only. The heading, stroke mRS levels 0–6, and several outcome choices remained Uzbek. These display labels now use four-language catalog entries; radio `value` attributes retain the original Uzbek persisted enums. Fresh EN checks covered both infarction and stroke entry forms: `Discharge patient`, English outcome choices (`Recovered`, `Unchanged`, `Referred for rehabilitation`, `Transferred to another hospital`, `Died`), and English mRS 0–6 descriptions. The stroke mRS values were rechecked after the final translator-binding adjustment and remained unchanged. No option was selected and no patient was discharged or saved.

Checks: `npm test` **54/54 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Conditional transfer/rehabilitation fields, retrospective discharge, already-discharged states and save-result paths remain unverified. Follow-up, treatment history, other patient-card/data branches, Facilities full table/filters, clinical branches, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Handover entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser opened a stroke patient card's Handover tab read-only. Field labels were English, but the two section headings, submit button and four condition choices remained Uzbek. These now use four-language display keys, while each `<option value>` retains its original stored Uzbek enum. A fresh EN load confirmed `Shift handover`, `Handover log`, `Hand over shift`, `Stable`, `Improved`, `Worsened`, and `Critical`; the empty history rendered `No shift handover records yet`. No condition was selected and no handover record was saved. Populated handover history and save-result paths remain unverified.

Checks: `npm test` **53/53 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Patient-card Discharge, Follow-up and other branches, treatment history, Facilities full table/filters, other clinical flows, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Overview visible-label checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser opened a stroke patient card read-only. Overview initially retained Uzbek section headings (`Klinik holat (Qabul)`, `Vaqt ko'rsatkichlari`) and multiple field labels, including body weight, height, citizenship, permanent address, MSCT, primary treatment and timeline labels. The section headings now use four-language semantic keys, and the card's row helper translates only the label while leaving the value markup untouched. Exact four-language catalog entries were added for the observed missing labels. A fresh EN load confirmed `Clinical condition (admission)`, `Time intervals`, `Body weight`, `Height`, `Citizenship`, `Permanent address`, `Was MSCT performed?`, `Primary treatment`, `Disease type`, `Symptom onset`, `Hospital arrival`, `Ambulance arrival`, and `CT/MSCT performed`. No patient data was edited or recorded in this report.

Checks: `npm test` **52/52 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). This is a visible-label checkpoint for the exercised stroke Overview branch, not complete Overview coverage. Infarction-specific/data-driven branches and the remaining card tabs, treatment history, Facilities full table/filters, other clinical branches, responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Patient-card Treatment tab entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser opened a patient card read-only and selected the Treatment tab. `Yangi muolaja qo'shish`, `Muolajalar tarixi`, and the stroke transfer-for-angiography option remained Uzbek. The headings now use four-language catalog keys, and treatment option display text uses the existing translator. An exact catalog entry was added for the stroke transfer option's en dash; its radio `value` remains the original stored Uzbek enum. A fresh EN load confirmed `Add treatment`, `Treatment history`, and `Transferred to another facility for angiography and endovascular treatment`, while the input value stayed unchanged. No treatment option was selected or saved; patient identifiers and clinical data were not recorded in this report.

Checks: `npm test` **51/51 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Treatment history/data branches and other patient-card tabs remain pending, alongside Facilities full table/filters, other clinical branches, responsive route coverage, naming policy and independent clinician/native-speaker review.

## Admin Messages populated-screen checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser opened Admin → Messages read-only with 52 existing entries. Summary labels, message-type badges and reply placeholder displayed in English, but existing reply headings retained `Administrator javobi` and reply-update buttons misleadingly displayed `Refresh` (the generic translation of `Yangilash`). These now use context-specific four-language keys. A fresh EN load confirmed `Administrator reply` and `Update reply` on the populated screen. No reply was sent or edited, and no message was marked read. Empty-state, new-message and save-result branches were not exercised.

Checks: `npm test` **50/50 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin entry screens are now checked through Messages, while Data quality/Duplicates result branches, Messages other branches, Facilities full table/filters, patient-card remaining tabs, other clinical branches, full responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Admin Sign-in history checkpoint — 2026-09-24

**Overall remains PARTIAL.** Authenticated EN browser inspection of Admin → Sign-in history loaded the real log table read-only. Column headers, heading and login/logout badges displayed in English, but summary labels `Chiqish`, `Faol foydalanuvchilar` and `Oxirgi 300 ta yozuv` remained Uzbek. The summary now uses four-language catalog keys explicitly. A fresh EN load confirmed `Total records`, `Sign-ins`, `Sign-outs`, `Active users`, `Sign-in / sign-out history`, and `Latest 300 records`. No login-log or user record was modified. This verifies the observed populated EN state, not every locale or the empty/error branches.

Checks: `npm test` **49/49 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin Messages, Data quality/Duplicates result branches, Facilities full table/filters, patient-card remaining tabs, other clinical branches, full responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Admin Duplicates entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser showed `Check duplicate patients` and `Start check`, but the explanation and the two mode buttons remained Uzbek. Those entry controls now use the existing four-language catalog explicitly. Fresh EN load confirmed `Finds patients with the same full name (Cyrillic or Latin) and year of birth.`, `Same day (one institution)`, `All time (Cyrillic + Latin)`, and `Start check`. Neither mode nor the check action was clicked; result tables and deletion paths remain unverified. No patient record was changed.

Checks: `npm test` **48/48 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin Sign-in history and Messages, Data quality/Duplicates result branches, Facilities full table/filters, patient-card remaining tabs, other clinical branches, full responsive route coverage, naming policy and independent clinician/native-speaker review remain pending.

## Admin Data quality entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** An authenticated EN browser showed that Admin → Data quality retained Uzbek explanatory copy and the `Tekshirishni boshlash` action while the heading appeared in English. The heading, explanatory copy and action are now explicitly bound to the existing four-language catalog. A fresh EN load confirmed `Data quality check`, `Checks all patient records for institutions that do not match the region and for missing institution or region fields.`, and `Start check`. The check action was **not** run: its implementation can automatically correct patient-record fields. Thus only the entry state, not audit results or data branches, is browser-verified. No patient record was changed.

Checks: `npm test` **47/47 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors. Admin Duplicates, Sign-in history, Messages and Data quality result branches remain pending, as do Facilities full table/filters, patient-card remaining tabs, other clinical branches, full responsive route coverage, naming policy and independent clinician/native-speaker review.

## Admin Population inner-tab checkpoint — 2026-09-24

**Overall remains PARTIAL.** In an authenticated EN browser, Admin → Population displayed its heading (`Population by region`), explanatory text, region and 18+/30+ table headers, but its save control was still Uzbek (`💾 Saqlash`). The control now uses the existing four-language `common.save` key. A fresh EN page load and read-only revisit confirmed `💾 Save`. Population inputs and saved figures were not changed; Save was not clicked. This verifies the EN entry view and control, not all four locales or the save path.

Checks: `npm test` **46/46 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin remaining inner tabs/data branches, Facilities full table/filters, patient-card remaining tabs, other clinical branches, complete responsive route coverage, district/facility naming policy, and independent clinician/native-speaker review remain pending.

## Facilities EN and Admin Facilities inner-tab checkpoint — 2026-09-24

**Overall remains PARTIAL.** On the dedicated Facilities page, an authenticated EN browser rendered the entry heading `Facility capabilities`, subtitle `MSCT and angiography availability for routing`, and `New institution`. A subsequent read-only DOM check timed out while the large table loaded, matching the prior browser stall. Thus **Facilities EN entry controls PASS; full table/filters PENDING**. The timeout alone is not proof of an application defect; no facility was edited.

Admin → Facilities initially showed Uzbek `Viloyat tanlang`, counts, heading and action copy in EN. These were connected to the existing four-language catalog. Region labels are display-only: the `data-v`/stored region identifiers remain unchanged. A fresh authenticated browser confirmed the entry panel in EN (`Select a region`, `Andijan Region — facility list`, `Active: 18`, `Hidden: 1`, `Edit MSCT / level`, `Add`), then confirmed the region heading and selector in KK, RU and UZ after switching language. No region selection, facility visibility, capability or list entry was saved. The hidden/missing-facility explanatory branches have catalog entries and source bindings but were not browser-triggered.

Checks: `npm test` **45/45 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin other inner tabs, Facilities full-table controls, patient-card remaining tabs, other clinical branches, complete responsive coverage, district/facility naming policy and independent clinician/native-speaker review remain pending.

## Admin Users inner-screen remediation — 2026-09-24

**Overall remains PARTIAL.** Authenticated EN browser inspection exposed Uzbek copy in the Admin → Users permission matrix, filter defaults, counts, list heading and summary cards despite the already-localized top tabs. Those display strings now use the existing four-language catalog; permission identifiers, checkbox behavior, role values and facility names were not changed. A fresh EN browser load confirmed `Role permissions`, all nine permission-row labels, `User list`, `All regions`, `All facilities`, `Users found`, table headers, summary-card labels and the region/facility side-card headings. No checkbox, role, account or facility value was modified. A new regression test covers the keys and source bindings; `npm test` **44/44 passed**, build passed, CDSS audit **9 scenarios / 0 untranslated**, and `git diff --check` found no whitespace errors.

The Facilities EN retest was attempted by selecting EN on Dashboard before navigating. The browser target closed while the large Facilities table loaded, so the EN browser result remains **PENDING**, not an established application defect. Admin’s other inner tabs/data-driven branches, user-table row details and all four-language interactive coverage are not closed. Patient-card remaining tabs, clinical branches, full responsive audit, district/facility naming policy and independent clinician/native-speaker review also remain open.

## Admin and facilities entry checkpoint — 2026-09-24

**Overall remains PARTIAL.** The authenticated Admin entry screen showed seven untranslated top-level tab labels in EN. They now use existing four-language catalog keys without changing tab identifiers, permissions or data. A fresh browser load confirmed EN `Users`, `Facilities`, `Population`, `Data quality`, `Duplicates`, `Sign-in history`, `Messages` and the corresponding KK labels. Admin inner tabs, tables and data-driven branches are not comprehensively verified; no account, role or permission was changed.

The Facilities entry screen showed a KK Uzbek subtitle and `Yangi muassasa` button. The subtitle now uses the existing `pages.capabilitiesSubtitle` key and the button has a display-only key. On a fresh browser load, KK displayed `Marshrutizaciya ushın MSKT hám angiografiya barlıǵı` and `Jańa mákeme`. The large Facilities table stalled the browser during an EN language-switch attempt, so **EN Facilities browser retest remains pending**; the stall was not diagnosed as an application defect. No facility capability, visibility or list entry was edited or saved.

Latest checks: `npm test` **43/43 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated lines**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Admin/Facilities full branch coverage, patient-card remaining tabs, other clinical branches, complete responsive route coverage, naming policy and independent clinical/native-language review remain open.

## Patient list/card read-only checkpoint — 2026-09-24

**Overall remains PARTIAL.** In an authenticated browser, the English patient-list entry screen exposed untranslated controls: `Registr turi`, `Qidiruv`, `Vaqt to'ldirish`, `F.I.O. ni ko'rsatish`, and the two new-patient buttons. Their display copy now uses the existing i18n catalog (or existing navigation keys). Fresh-load browser checks confirmed the filter/action labels in EN, RU and KK; the personal-data toggle was checked only in its closed state. No name-reveal action was performed.

A patient card was opened read-only from the list. Its KK navigation and tabs initially retained `Avvalgi`, `Umumiy`, `Navbatchi`, `Chiqarish` and `Kuzatuv`. Those visible controls now use semantic keys without changing tab indices or patient data. On a fresh browser load, KK displayed `Aldınǵı`, `Ulıwma`, `Náwbet`, `Shıǵarıw`, `Baqlaw`; EN displayed `Previous`, `Overview`, `Handover`, `Discharge`, `Follow-up`. No edit, discharge, delete, bulk-time, export or save action was used. This verifies list-entry controls and card navigation only, not every card tab or data-driven branch.

Latest checks: `npm test` **42/42 passed**, `npm run build` passed, CDSS audit **9 scenarios / 0 untranslated lines**, and `git diff --check` found no whitespace errors (Windows line-ending warnings only). Administration, facilities, other patient-card tabs, remaining clinical branches, full route-by-route responsive checks, district/facility naming policy and independent clinical/native-language review remain open.

## Follow-up browser retest — 2026-09-24

**Overall remains PARTIAL.** A fresh authenticated browser loaded `form-locales.js?v=20260924-i18n-r25`. An unsaved synthetic stroke draft reached treatment step 4 through the NIHSS, GCS and AHA calculator UIs. After enabling MSCT, the previously missed Door-to-CT helper displayed in RU, EN and KK; EN showed `For calculating door-to-CT time`, and KK showed `Qabıllawdan KTǵa shekemgi waqıttı esaplaw ushın`. This closes the prior browser-retest gap for that helper.

The extended-report entry screen was inspected without generating a report or exporting. KK initially retained three Uzbek labels (`Sana (dan)`, `Sana (gacha)`, `Terapevtik oyna`); EN therapeutic-window controls also retained `Infarkt turi` and `Kaskad`. The existing catalog now translates those controls, and a fresh browser load confirmed KK `Sáne (baslap)` / `Sáne (shekem)` / `Terapiyalıq waqıt aralıǵı`, plus EN `Date (from)` / `Date (to)` / `Infarction type` / `Cascade` / `Therapeutic window`. The therapeutic-window tab and its diagnosis filters were opened read-only. Report generation, result tables, export and other tabs were not fully verified.

Latest checks: `npm test` **41/41 passed**, `npm run build` passed, and the CDSS audit still reports **0 untranslated lines in 9 scenarios**. `git diff --check` found no whitespace errors (only Windows line-ending warnings). Patient list/card, administration, facilities, other clinical branches, full responsive route coverage, district/facility name policy and independent clinical/native-language review remain open. No patient record, profile, password, account, permission or facility was saved or changed; no Telegram message or export was sent.

## ASPECTS four-language interactive retest — 2026-09-24

**ASPECTS inline treatment-step block: PASS for the exercised score/reset and language-switch path. Overall localization remains PARTIAL.** In an authenticated browser, an unsaved synthetic stroke draft reached step 4 via the NIHSS, GCS and AHA calculator UIs. After enabling MSCT and MSCT angiography, all ten ASPECTS regions were selected in each of UZ, RU, EN and KK: 10/10 became 0/10, and Clear restored 10/10. UZ was also checked at three selected regions (7/10). A KK M1 selection (9/10) remained selected through EN, RU, UZ and KK switching, with the treatment-strategy explanation changing language. The UI presents ASPECTS inline in step 4, not as a separate modal in this flow. No record was saved.

The next read-only browser check exposed a separate localization gap before extended-report verification: the MSCT time helper `Door-to-CT mezonini hisoblash uchun` remained Uzbek in EN/KK. Its four-language display entry was added to the existing catalog. `npm test` still passes **40/40**, `npm run build` passes, and `git diff --check` has no whitespace errors (Windows line-ending warnings only). The new helper translation has not yet been browser-rechecked after a fresh catalog load. Extended reports and the other remaining authenticated modules were not verified in this pass. Clinical/native-language terminology approval is still pending.

## Current verification checkpoint — 2026-09-24

**Overall: PARTIAL / verification and clinical-language review pending.** Existing i18n architecture and stored clinical values were retained. This pass filled observed catalog gaps in stroke/infarction treatment choices, infarction diagnosis/Killip/ECG options, settings, and report entry controls. The stroke occlusion options and segment help now translate at render time without changing the selected/stored values. An incomplete-stroke CDSS severity line is included in the audit.

Authenticated browser checks used synthetic, unsaved drafts. The stroke wizard reached step 4 after NIHSS, GCS and AHA calculations; ASPECTS region interactions changed 10/10 to 7/10 and 0/10, reset to 10/10, then retained an M1 selection and 9/10 through UZ/RU/EN/KK switching. The record number, step and treatment selection remained stable. A separate infarction draft retained its record number, patient fields, AHA result, clinical inputs and angiography selection through four-language switching and backward navigation. Field validation was observed without submitting either record. Dashboard, stroke entry and infarction clinical screens had no document-level horizontal overflow at 390×844, 768×1024, 1366×768 and 1920×1080; this is not a complete responsive audit of every route.

The settings headings/actions and the reports entry headings, descriptions, filters and buttons were rechecked in KK; two missed age-filter labels were then corrected and rechecked. Report generation, export, print and Telegram actions were not triggered. Latest checks: `npm test` **40/40 passed**, `npm run build` passed, `node scripts/audit-cdss-localization.cjs` found **0 untranslated lines across 9 scenarios**, and `git diff --check` found no whitespace errors (only Windows line-ending warnings).

Remaining work: full ASPECTS modal interaction in each of UZ/RU/EN/KK, more authenticated clinical branches and other modules (including extended reports, patient card/list, administration and facilities), route-by-route responsive/overflow inspection, district/facility display-name policy and review, and independent clinician/native-speaker approval of RU/EN/KK terminology. The browser checks above do not establish a complete E2E pass. No patient record, profile, password, account, facility or permission was saved or changed; no export or Telegram message was sent. No DB, Auth, RLS, enum or clinical formula changes were made in this pass.

## Latest remediation checkpoint — 2026-09-24

**Overall: PARTIAL / full authenticated verification pending.** The P1 draft-preservation fix remains in place. This pass added display-only translations for GCS, NIHSS and ASPECTS treatment-tactics recommendations, and for CDSS headings, results, warnings, care, prevention, dose notes and timing labels. An eight-scenario CDSS audit (ischaemic/haemorrhagic/TIA stroke and STEMI/NSTEMI paths) now finds **0 untranslated visible result strings in those scenarios**. This is scenario coverage, not proof that every CDSS branch is translated. The persisted CDSS payload and clinical calculation rules were not changed; regression tests compare the persisted result across languages.

Region option labels now translate in the new stroke/infarction forms and settings while their stored `value` remains Uzbek. In the authenticated local browser, RU showed `Андижанская область` with value `Andijon viloyati`; EN showed `Andijan Region` with the same value; KK showed `Andijon wálayatı` with the same value. The generated stroke record number stayed unchanged during EN→KK switching. Other district and facility names remain untranslated proper/administrative names and need a naming-policy decision and full display review.

Latest checks: `npm test` **38/38 passed**, `npm run build` passed, and `node scripts/audit-cdss-localization.cjs` reported 0 findings across 8 scenarios. The pre-existing Browserslist-age warning remains. No patient record was submitted or changed. A complete 4-language ASPECTS modal run, all authenticated clinical flows, four responsive viewports, and independent clinical/native-language review are **PENDING**. Do not interpret this checkpoint as localization DONE.

The supplemental static detector's **23 candidates** were classified: 11 JavaScript-expression false positives (dashboard lines 300, 1250 twice, 1268, 1273; movement line 135; report lines 724, 750, 812, 1568, 1675), 10 retained technical abbreviations/units/placeholders (`KT`, `AG`, `A`, `GRACE`, `DQ`, `ЎЦВК`, `N/A`, `min`, and two `mm Hg` labels), and 2 proper brand/organization names in login. This classification applies only to that detector's candidate list; the authenticated browser still governs actual copy coverage.

## Remediation update — 2026-09-24

**Overall remains FAIL / P2 remediation and full retest pending.** The P1 language-switch draft reset has been corrected in both new-patient wizards. Language changes now save the visible step and rerender that wizard with its existing draft, step, medical-record number and calculator fields rather than calling a fresh route render. The infarction wizard also no longer clears treatment timestamps whose inputs are absent from the current step.

Evidence: `npm test` passes 36/36, including draft-preservation, stored-enum/display-label and AHA score-band regressions; `npm run build` passes. In the authenticated browser, a synthetic stroke draft retained step 2 and F.I.O. across UZ→RU; a synthetic infarction draft retained step 2 and F.I.O. across RU→EN, and navigating back showed the same generated record number. A second synthetic stroke draft reached step 4 after NIHSS=1, GCS=15 and AHA=0 calculations; EN→RU retained step 4, and navigating back showed NIHSS=1 and GCS=15. No patient was saved. A fully populated step-4 infarction scenario remains to be checked separately.

The wizard's route heading, step names, section headings/progress and citizenship buttons now use the existing four-language catalog; the English infarction and stroke entry screens were rechecked in the browser after rebuilding. Presentation-mode and common risk-factor display labels now translate while stored enum values stay Uzbek; the English stroke browser flow showed `Self-presentation` and `Arterial hypertension`. Yes/No treatment buttons, first/recurrent options and rerendered symptom-hour display have also been corrected. The AHA modal's ten questions and answer labels were added to all four catalogs without changing point values; all appeared in Russian in the authenticated browser. Its score-band labels now use the existing risk translations, with boundary tests at 6/7 and 13/14; the final score-band change was not separately browser-rechecked. Other config-derived treatment options, dynamic CDSS/treatment advice and other modules listed below still show untranslated copy. Clinical translations require clinician/native-language sign-off. Catalog parity and passing tests are not evidence of complete localization.

## Verification closure attempt — actual browser findings

**Historical finding: FAIL / remediation and retest required.** This section records the initial browser failures; see the remediation update above for current P1 progress. Equal catalog sizes and passing regression tests do not establish full UI coverage.

The authenticated local browser (visible build label `v20260924-189`) was used through the normal UI. A temporary synthetic stroke form was populated without submitting it. No patient, account, permission, password or facility changes were saved. No Telegram messages or exports were sent. Application source was not changed during this verification pass.

### Confirmed defects

| Priority | Finding | Reproduction / evidence | Relevant source |
| --- | --- | --- | --- |
| P1 | Changing language discards an in-progress stroke form | Complete institution/patient/clinical steps with synthetic values; open ASPECTS at step 4; switch RU to EN. The UI returns to step 1, institution and presentation mode are empty, and a new record number is generated. | `js/i18n.js:79`, `js/pages/insult-yangi.js:17` |
| P2 | Clinical workflow remains mixed-language | In RU, risk-factor choices, presentation-mode choices, treatment options, wizard titles and citizenship buttons retain Uzbek copy. Examples: `Klinik`, `BO'LIM 4 / 4`, `Diagnostika va Muolaja`, `Arterial gipertenziya`. | `js/pages/insult-yangi.js`, `js/config.js` |
| P2 | AHA questionnaire is not fully localized | Open AHA in the RU clinical step: the title, numbered questions and most choices remain Uzbek; generic Yes/No and action buttons translate. | `js/calculators.js:228` |
| P2 | Computed recommendations and CDSS remain Uzbek | After applying NIHSS/GCS results and changing ASPECTS, recommendation blocks retain Uzbek text, including `DAVOLASH TAKTIKASI`, `KLINIK BAHOLASH`, and longer clinical instructions. The ASPECTS core recommendation itself translates. | `js/calculators.js:603`, `js/cdss.js` |
| P2 | Settings copy remains untranslated | RU/EN/KK retain `Profil ma'lumotlari`, `Profilni saqlash`, `Parolni o'zgartirish`. | `js/pages/settings.js:32` |
| P2 | Reports and extended reports retain untranslated controls | RU/EN/KK retain `Shakllantirish`, `Telegram hisobot`, `Shaklni yuklab olish`, `Kaskad`, `Terapevtik oyna`, and several report headings. | `js/pages/hisobot.js`, `js/pages/keng-hisobot.js` |
| P2 | Patient list/card and admin/facilities retain untranslated controls | Examples: `Vaqt to'ldirish`, `F.I.O. ni ko'rsatish`, `Avvalgi`, `Umumiy`, `Navbatchi`, `Chiqarish`, `Kuzatuv`, admin tab labels and `Yangi muassasa`. | Corresponding page modules |
| P2 | Exact-match gaps in route headings | Examples visible in RU/EN/KK: `Infarkt Reyestri`, `Insult Reyestri`, `Yangi Infarkt Bemori`, `Yangi Insult Bemori`, emoji-prefixed pending-admission and movement headings. | Corresponding page modules |

The same reset pattern exists in the infarction form's `render()` (`js/pages/infarkt-yangi.js:17`), but loss of a populated infarction draft was not separately reproduced in the browser.

### ASPECTS result: interactive RU path checked, surrounding localization FAIL

- Reached step 4 by normal Next controls after filling synthetic data and using NIHSS, GCS and AHA modals.
- Enabled MSCT and MSCT angiography in an ischaemic-stroke form.
- All ten anatomical regions, instructions, level headings and reset button appeared in Russian.
- Clicking three regions changed the score from 10 to 7; clicking the remaining seven changed it to 0.
- The core ASPECTS recommendation changed at those scores and remained Russian.
- Reset cleared all ten selections and restored 10/10.
- The separate treatment-tactics block remained Uzbek: this is a real localization failure, not merely missing browser coverage.
- NIHSS/GCS modal questions were Russian; their post-calculation recommendation blocks were not fully localized.
- Required-field and risk-factor validation messages were exercised without submitting a patient record.
- Full ASPECTS interaction in UZ/EN/KK, other clinical branches and responsive/mobile layouts remain pending.

### Four-language entry-screen coverage (not full E2E)

UZ/RU/EN/KK language selection and entry headings/visible controls were inspected for settings, patient list, pending admission, infarction registry, stroke registry, reports, extended report, patient movement, routing, admin, facility capabilities, new-infarction form, new-stroke form and a read-only patient card.

These are entry-screen localization checks, not 56 complete clinical scenarios. Lazy data loading, all filters, every tab, exports, save flows and all wizard branches were not exhaustively checked. Admin and patient-card checks were read-only. A desktop screenshot of the English infarction form corroborated the mixed-language headings; it does not establish a full layout pass.

### Closure criteria

1. Preserve current step, all entered values and calculator state when changing language in either wizard; add regression coverage and reproduce the fixed behavior in the browser.
2. Translate identified UI and dynamic clinical-output copy using the existing catalogs, preserving stored enum values and clinical logic. Obtain appropriate clinical/native-language review for clinical wording.
3. Repeat ASPECTS interactions in all four languages and complete the remaining authenticated read-only scenarios and layout checks.
4. Rerun tests/build after remediation. The earlier 31/31 and successful build below are historical baseline results, not evidence that these newly observed defects pass.

## Verified changes

- Existing i18n architecture retained; no database, Auth, RLS, enum or clinical formula changes made in this correction pass.
- Catalog coverage: 1,156 keys per locale (UZ, RU, EN, KK), up from 732.
- Removed substring translation that produced mixed-language words and could alter names.
- Fixed language switching: the lexical `Router` must be checked directly, not through `window.Router`.
- Added translations for dashboard, forms, patient card, reports, administration, settings and facility workflows.
- Localized dashboard dynamic counts, clinical labels and age/sex chart text.
- Fixed translator name shadowing in the patient-card time validation and dashboard recent-patient renderer.
- Preserved stored symptom-hour values while translating only their displayed labels.
- Corrected malformed report button markup.

## Checks

- `npm test`: 31/31 passed.
- `npm run build`: passed; existing Browserslist database-age warning remains.
- Syntax checks for i18n runtime, dashboard and age/sex chart passed.
- `git diff --check`: no whitespace errors (Windows line-ending warnings only).
- Authenticated dashboard checked in UZ, RU, EN and KK, including actual language-switch rerendering.
- Automated ASPECTS checks cover ten localized regions and the unchanged 0–10 scoring range in all four languages.
- New tests cover new-patient field-label catalog coverage, symptom display versus persisted values, lexical Router rerendering, and the dashboard translator-shadowing regression.

## Module status

| Module | Correction / automated checks | Browser verification in this pass |
| --- | --- | --- |
| Dashboard and age/sex chart | Corrected | Four languages checked |
| Infarction and stroke forms | Field labels and symptom display checked | Incomplete |
| ASPECTS | Four-language rendering and score range checked | Incomplete: wizard navigation not confirmed |
| Patient card | Copy and time-validation translator collision corrected | Not reverified end to end |
| Registries, reports, administration, settings, facilities | Catalog coverage expanded | Not reverified end to end |

## Audit limitations

The older hardcoded-copy detector reports zero only within its narrow patterns; this is not proof that every UI string is localized. The supplemental `node scripts/audit-visible-copy.cjs` inventory includes static HTML text and field labels, but not every dynamic or multiline expression. Its remaining 23 candidates include technical abbreviations, proper names and JavaScript-regex false positives; this does not establish zero remaining real strings across the application.

The authenticated browser did not confirm navigation from the dashboard into the new-stroke wizard in this pass. No patient was created, edited or submitted to complete that check. Full wizard and module-by-module browser verification remains outstanding. Clinical language quality has not received independent clinician/native-speaker sign-off.

No deployment was performed. Pre-existing unrelated SQL edits were left untouched.
