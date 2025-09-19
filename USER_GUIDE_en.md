# Cocoa Bloom Judging — User Guide

This guide explains how to use the Cocoa Bloom Judging website from a user’s perspective. It covers registration, login, role-based dashboards, and each module: user management, contests, sample submission and management, physical and sensory evaluations, notifications, and results.

Note: Some features depend on your assigned role and on administrator setup (database schema, storage, and permissions). If you can’t access a page, contact your administrator.

---

## 1) Getting Started

### 1.1 Accessing the site

- Open the site in your browser. The home page provides an overview and entry points to Register or Log in.
- UI supports English and Spanish; the preferred language is auto-detected but can be switched by changing the browser language.

### 1.2 Registration

- Go to `/register`.
- Fill in:
  - Name, Email, Password
  - Role: choose one of `participant`, `evaluator`, `judge`, or (rarely) `director` (administrators are assigned by staff).
  - Optional Phone.
  - For Evaluators: you can upload supporting documents during registration.
- Submit the form. Your account is created with status “not verified” and you are logged out immediately (approval is required).
- An administrator must verify your profile before you can log in.

### 1.3 Login

- Go to `/login` and enter your email/password.
- If your profile is verified, you will be logged in and redirected to the Dashboard.
- If not yet verified, login is rejected; contact admin or wait for approval.

---

## 2) Roles and Dashboards

After login, you are taken to `/dashboard`. The app shows a role-aware dashboard and sidebar navigation.

- Roles:
  - Participant: submit samples, track status, view notifications and results.
  - Evaluator: review assigned samples in final evaluation phases (when applicable), view results and notifications.
  - Judge: complete sensory evaluations for assigned samples, see your workload and progress, view results and notifications.
  - Director: manage evaluations end-to-end: sample intake, physical evaluations, judge assignment, evaluation supervision, results, notifications, and profile.
  - Admin: full management, including users, contests, samples, finance, notifications, and results.

The sidebar changes based on your role, showing only the modules available to you. Common items include Dashboard, Results, Final Results, Notifications, and My Profile.

---

## 3) Public Pages

### 3.1 Home Page `/`

- Overview, actions to Register or Log in.

### 3.2 QR Verification `/verify/:trackingCode`

- Anyone can verify a sample by scanning its QR code or visiting the URL.
- Shows basic sample information, status (submitted/received/approved/evaluated/disqualified), and submission date.

---

## 4) Participant Journey

### 4.1 Sample Submission `/dashboard/submission`

- Step-based form:
  1. Select Contest: choose an available (upcoming/active) contest.
  2. Origin & Owner: country, farm, contact info; cooperative details if applicable.
  3. Sample Info: quantity (e.g., 3 kg), genetic material, crop age, hectares, moisture, fermentation percentage.
  4. Processing Info: fermenter type, fermentation time, drying type/time.
  5. Payment: currently PayPal is enabled; card/Nequi are shown as coming soon. Agree to terms to enable the PayPal button.
- Submission flow:
  - When you submit, the system registers your sample, generates a unique tracking code, and creates a QR code image stored in the system.
  - After payment confirmation (via PayPal), your sample’s payment status becomes “completed.”
- After submission, you see a success summary with your tracking code and QR code URL.

### 4.2 Tracking Samples

- Participants can track status via notifications and results pages. Physical and sensory evaluation statuses progress over time.

### 4.3 Results `/dashboard/results`

- View competition results relevant to you.
- Includes top samples, statistics, and detailed breakdowns when available.

### 4.4 Notifications `/dashboard/notifications`

- Receive updates such as sample received, approved/disqualified, evaluation progress, or ranking announcements.
- Mark as read/unread or delete notifications.

### 4.5 My Profile `/dashboard/profile`

- View your profile details.

---

## 5) Judge Journey

### 5.1 Judge Dashboard `/dashboard/evaluation`

- Shows samples assigned to you with status (pending, in progress, completed), contest details, deadlines, and recent notifications.
- Select a sample to open the Sensory Evaluation form.

### 5.2 Sensory Evaluation

- Comprehensive form to assess flavor attributes (aroma, acidity, fresh/brown fruit, vegetal, floral, wood, spice, nut, caramel/panela), bitterness, astringency, roast, defects, and overall quality.
- Save your evaluation to update progress or complete it when finished.

### 5.3 Results and Notifications

- Judges can review results pages for approved/published outcomes and review notifications for assignments and deadlines.

---

## 6) Evaluator Journey

- Evaluators may participate in special/final evaluation phases.
- The dashboard highlights your tasks and results.
- Use Notifications and Results pages to keep track of your activity.

---

## 7) Director Journey

Directors coordinate the evaluation pipeline.

### 7.1 Sample Management `/dashboard/samples`

- Manage all submitted samples:
  - View list of samples with participant details and status.
  - See internal and external (tracking) codes.
  - Download QR when available.
  - Update statuses as samples are received or move into evaluation.

### 7.2 Physical Evaluation `/dashboard/physical-evaluation`

- Evaluate incoming samples physically before sensory evaluation:
  - Odor checklist (typical/atypical), humidity, beans/defects metrics, textual notes.
  - Save evaluations to update the sample’s physical status.
  - Approve or disqualify samples based on physical rules; participants receive notifications when disqualified (with reasons).

### 7.3 Judge Assignment `/dashboard/sample-assignment`

- Assign approved samples to judges with deadlines and tracking.

### 7.4 Evaluation Supervision `/dashboard/evaluation-supervision`

- Monitor overall progress:
  - Per-sample status (assigned, evaluating, evaluated), average score, and deadlines.
  - Per-judge KPIs (pending/in-progress/completed evaluations) and timestamps.
  - Refresh to get real-time status.

### 7.5 Results `/dashboard/results` and Final Results `/dashboard/final-results`

- Results: consolidated sensory evaluation outcomes with scores and ranking.
- Final Results: aggregate final evaluation results; shows the ranking, per-sample details, and can generate participant PDF reports (with a sensory radar and optional physical metrics).

### 7.6 Notifications `/dashboard/notifications`

- Review system notifications and their priorities; mark read/unread or delete.

### 7.7 My Profile `/dashboard/profile`

- View your profile details.

---

## 8) Admin Journey

Admins have all Director capabilities, plus user and contest management.

### 8.1 User Management `/dashboard/users`

- View all users (except admins in the list by default), filter by role.
- Activate/Deactivate users (verification gate for registration).
- Delete users.
- For Evaluators: view and download uploaded documents.

### 8.2 Contest Management `/dashboard/contests`

- Create and edit contests with:
  - Name, Description, Location
  - Dates (start/end)
  - Prices: sample fee and evaluation fee
  - Final evaluation flag
- The status (upcoming/active/completed) is derived from dates.

### 8.3 Finance Management `/dashboard/finance`

- Placeholder for financial summaries.

---

## 9) Payments (PayPal)

- On the Sample Submission Payment step, choose PayPal and agree to terms.
- The PayPal Smart Buttons render; complete payment.
- A Supabase Edge Function verifies the order with PayPal and records the payment in the database.
- Participant sample payment status updates to “completed.”

If PayPal is unavailable (client ID missing), you’ll see an inline message; contact admin.

---

## 10) Notifications

- The Notifications page shows all messages for your account:
  - Types: sample received/approved/disqualified, judge assignment, evaluation progress, contest milestones, rankings, etc.
  - Priorities: urgent/high/medium/low.
- You can filter by type/priority, mark as read/unread, delete, or view detailed content (including disqualification reasons when applicable).

---

## 11) Results

### 11.1 Results `/dashboard/results`

- Displays real-time results from sensory evaluations with top-ranked samples, scores breakdown, stats, and details.

### 11.2 Final Results `/dashboard/final-results`

- Aggregates final evaluation records to present a final ranking.
- Selecting a result reveals detailed sensory attributes, optional physical details, and a downloadable PDF report.

---

## 12) QR-Based Verification (Public)

- Scan the sample QR code or visit `/verify/:trackingCode`.
- The page shows sample information and current status, providing transparency and tamper-evident verification.

---

## 13) Tips & Troubleshooting

- Can’t log in after registering? Your profile likely needs admin verification.
- Missing PayPal button? Admin must set the PayPal client ID in environment variables.
- Can’t find a contest in submission? It must be in upcoming/active status.
- Disqualified in physical evaluation? Check your notifications for listed reasons.
- Results empty? Judges/evaluators may not have completed evaluations yet.

---

## 14) Glossary

- Tracking Code: A unique external code used in QR and public verification.
- Internal Code: A generated code used internally for organizing and anonymizing samples.
- Physical Evaluation: First screening (odor, humidity, defects) to approve or disqualify samples.
- Sensory Evaluation: Judges score flavor attributes and overall quality.
- Final Evaluation: Optional advanced stage performed by evaluators.

---

## 15) Where to Find Each Page

- Public
  - Home: `/`
  - QR Verification: `/verify/:trackingCode`
- Auth
  - Register: `/register`
  - Login: `/login`
- Dashboard (role-based)
  - Dashboard: `/dashboard`
  - User Management: `/dashboard/users` (admin)
  - Contest Management: `/dashboard/contests` (admin/director)
  - Sample Management: `/dashboard/samples` (admin/director)
  - Physical Evaluation: `/dashboard/physical-evaluation` (director)
  - Judge Assignment: `/dashboard/sample-assignment` (director)
  - Evaluation Supervision: `/dashboard/evaluation-supervision` (director)
  - Judge Dashboard (Sensory): `/dashboard/evaluation` (judge)
  - Sample Submission: `/dashboard/submission` (participant)
  - Results: `/dashboard/results`
  - Final Results: `/dashboard/final-results`
  - Notifications: `/dashboard/notifications`
  - My Profile: `/dashboard/profile`

---

## 16) Admin Setup Notes (for context)

- The app requires environment variables for Supabase and PayPal and configured Storage buckets for QR codes and evaluator documents.
- Apply SQL migrations/policies provided in the `sqls/` folder to enable RLS and RPCs.

This guide reflects the live code paths and page structure in the application.

---

## 17) Detailed Module How‑Tos (Step‑by‑Step)

### 17.1 Registration & Login details

1. Registration

- Fill required fields; select a role.
- Submit: your profile enters “not verified”. You cannot log in yet.
- An admin activates your profile in `/dashboard/users`.

2. Login

- After activation, log in at `/login`.
- You’ll land on `/dashboard` with role‑specific menu.

3. Common issues

- Wrong credentials: try again or contact support.
- Not verified: wait for admin approval.

### 17.2 Participant — Sample Submission (all steps)

1. Contest selection

- Only contests in upcoming/active status appear.
- Selecting a contest fills fees; total = entryFee + sampleFee.

2. Origin & Owner

- Country (required), Department/Municipality/District (optional), Farm name.
- Owner full name, ID (optional), Phone (optional), Email (optional), Address (optional).
- Cooperative: toggle and specify name (optional).

3. Sample Information

- Quantity (default 3 kg recommended), Genetic material, Crop age, Source hectares, Moisture, Fermentation %.

4. Processing

- Fermenter type, Fermentation time (h), Drying type, Drying time (h).

5. Payment

- Choose PayPal and check “Agree to terms” to enable the button.
- Complete the PayPal popup; on approval, payment is verified server‑side and recorded.

6. Success page

- Shows contest, owner/farm, tracking code, and QR code URL.
- Use the QR on package labels; recipients scan `/verify/:trackingCode`.

Errors & recovery

- If PayPal is cancelled, you can retry.
- If an error occurs during capture, a message appears; try again later or contact support.

### 17.3 Director — Sample Management

- Summary cards: totals by status.
- Filters:
  - Text search by external code, participant, or origin.
  - Internal code filter field.
  - Status dropdown (all/submitted/received/physical_evaluation/approved/disqualified).
- Actions:
  - Refresh to reload.
  - Receive Sample: marks selected sample as received and sets received date.
  - Delete Sample: removes a sample (use with care).

### 17.4 Director — Physical Evaluation (criteria & actions)

Workflow

1. Select a sample with status received/physical_evaluation.
2. Fill the form sections:

- Odor checklist: mark typical/atypical. Atypical items add to “undesirable aromas”.
- Humidity (%), Broken/Flat/Affected/Violated grains.
- Beans: well‑fermented + lightly‑fermented, purple, slaty, internal moldy, over‑fermented.
- Notes (optional).

Save & status

- Save Evaluation: stores evaluation; sample status becomes `physical_evaluation` unless disqualified.
- Approve Sample: sets status to `approved` (ready for judge assignment).

Pass/Fail criteria (disqualify if any):

- Undesirable aromas present.
- Humidity < 3.5% or > 8.0%.
- Broken grains > 10%.
- Affected grains/insects ≥ 1.
- Well‑fermented + Lightly‑fermented < 60%.
- Purple beans > 15%.
- Slaty beans > 0%.
- Internal moldy beans > 0%.
- Over‑fermented beans > 0%.
- Warning only: Flat grains > 15% (does not disqualify).

Notifications

- Disqualification reasons are saved; users can see them in notifications UI.

### 17.5 Director — Judge Assignment

- Modes: Single (assign judges to one sample) or Bulk (assign to multiple samples).
- Available Judges: list of active judges (availability shown).
- Single assignment steps:
  1. Click a sample with status approved.
  2. Select judges (checkboxes).
  3. Assign judges; the sample moves to assigned/evaluating as judges progress.
- Bulk assignment steps:
  1. Switch to Bulk mode.
  2. Select multiple approved samples via checkboxes.
  3. Pick judges and Assign.
- Status legend: approved → assigned → evaluating → evaluated.

### 17.6 Judge — Dashboard & Sensory Evaluation

Dashboard

- See counts: total/pending/in‑progress/completed; deadlines per contest.
- Click a sample to open the Sensory Evaluation.

Form (0–10 scales)

- Attributes: cacao, bitterness, astringency, caramel/panela, grouped totals (acidity, fruits, vegetal, floral, wood, spice, nut), roast degree, defects total.
- Sub‑attributes drive totals automatically; a live radar chart visualizes the profile.
- Comments: flavor notes, recommendations, additional positives.
- Verdict: Approved or Disqualified (with reasons if needed).
- Overall quality is auto‑computed from positives minus a small defects penalty.
- Submit saves your evaluation; progress becomes 100% and status completed.

### 17.7 Director — Evaluation Supervision

- Overview with filters: all/assigned/evaluating/evaluated.
- Per‑sample: internal code, participant, contest, deadline, average score, progress bar, and judge list with statuses and dates.
- Quick stats: judges assigned, completed/in‑progress/pending counts.
- Refresh to fetch latest data.

### 17.8 Notifications Deep Dive

- Filters: by type and priority.
- Live updates: new rows appear without reload.
- Actions: mark read/unread, delete, mark all read.
- Details view:
  - Shows badges for type/priority and a humanized timestamp.
  - Disqualified messages split into base message + bullet reasons.

### 17.9 Results & Final Results Deep Dive

Results

- Top‑ranking samples from sensory evaluations with detailed breakdowns and stats.

Final Results

- Aggregates final_evaluations per sample (average score, latest date).
- Selecting an item loads physical details (if any) and full sensory attributes for radar.
- Download report: generates a participant PDF including radar and optional metrics.

### 17.10 QR Verification Details

- Shows current sample status and key info (tracking code, submission date, owner/farm, contest).
- Status icon: green for approved/evaluated, red for disqualified, blue for in‑transit.
- Use this link on packaging to allow transparent public verification.
