# Multi-Contest Architecture - Visual Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    COCOA BLOOM JUDGING SYSTEM                   │
│                   Multi-Contest Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ADMIN     │     │  DIRECTOR   │     │ PARTICIPANT │
│             │     │             │     │             │
│ • All       │     │ • Own       │     │ • Submit to │
│   Contests  │     │   Contests  │     │   Active    │
│ • Cleanup   │     │ • 1 Active  │     │   Contests  │
│ • All       │     │   Max       │     │ • View      │
│   Notifs    │     │ • Own       │     │   Results   │
│             │     │   Notifs    │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   RLS       │
                    │  POLICIES   │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
│  CONTESTS   │    │   SAMPLES   │    │  RANKINGS   │
│             │    │             │    │             │
│ • created_by│───▶│ • contest_id│───▶│ • contest_id│
│ • dates     │    │ • user_id   │    │ • per-      │
│ • status    │    │ • tracking  │    │   contest   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Contest Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTEST LIFECYCLE                          │
└──────────────────────────────────────────────────────────────┘

1. CREATION
   ┌─────────────────────────────────────────┐
   │ Director creates contest                │
   │ ↓                                       │
   │ Check: Has active contest?              │
   │ ├─ YES → ❌ Reject                      │
   │ └─ NO  → ✅ Create                      │
   └─────────────────────────────────────────┘
                    ↓
2. ACTIVE PERIOD
   ┌─────────────────────────────────────────┐
   │ start_date <= TODAY <= end_date         │
   │                                         │
   │ • Participants submit samples           │
   │ • Judges evaluate                       │
   │ • Rankings computed                     │
   │ • Notifications sent to director        │
   └─────────────────────────────────────────┘
                    ↓
3. COMPLETION
   ┌─────────────────────────────────────────┐
   │ TODAY > end_date                        │
   │                                         │
   │ • Contest marked as completed           │
   │ • Final results available               │
   │ • Director can create new contest       │
   └─────────────────────────────────────────┘
                    ↓
4. CLEANUP (Optional)
   ┌─────────────────────────────────────────┐
   │ Admin triggers cleanup                  │
   │                                         │
   │ • Delete samples                        │
   │ • Delete rankings                       │
   │ • Delete contest                        │
   └─────────────────────────────────────────┘
```

## Data Isolation Model

```
┌────────────────────────────────────────────────────────────────┐
│                      DATA ISOLATION                             │
└────────────────────────────────────────────────────────────────┘

DIRECTOR A                    DIRECTOR B                    ADMIN
    │                             │                           │
    ├─ Contest 1 (Active)         ├─ Contest 3 (Active)      ├─ ALL
    │  ├─ Sample 1.1              │  ├─ Sample 3.1           │   CONTESTS
    │  ├─ Sample 1.2              │  ├─ Sample 3.2           │
    │  └─ Rankings (Top 10)       │  └─ Rankings (Top 10)    │
    │                             │                           │
    ├─ Contest 2 (Completed)      └─ Contest 4 (Upcoming)    │
    │  ├─ Sample 2.1                 └─ (No samples yet)     │
    │  └─ Rankings (Top 10)                                  │
    │                                                         │
    └─ ❌ Cannot create Contest 5                            │
       (Already has active Contest 1)                        │

┌────────────────────────────────────────────────────────────────┐
│ RLS POLICIES ENFORCE:                                          │
│ • Directors see only their contests                            │
│ • Directors receive only their notifications                   │
│ • Rankings computed per contest                                │
│ • No cross-contest data leakage                                │
└────────────────────────────────────────────────────────────────┘
```

## Notification Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION ROUTING                         │
└────────────────────────────────────────────────────────────────┘

EVENT: Sample Submitted to Contest 1 (created by Director A)

                    ┌──────────────┐
                    │   TRIGGER    │
                    │  (on INSERT) │
                    └──────┬───────┘
                           │
                ┌──────────▼──────────┐
                │ Get contest_id      │
                │ Get contest.created_by │
                └──────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
   │  ADMIN  │      │ DIRECTOR A│     │PARTICIPANT│
   │  (ALL)  │      │  (OWNER)  │     │  (OWNER)  │
   │         │      │           │     │           │
   │ ✅ Gets │      │ ✅ Gets   │     │ ✅ Gets   │
   │  Notif  │      │   Notif   │     │   Notif   │
   └─────────┘      └───────────┘     └───────────┘

   ┌─────────┐
   │DIRECTOR B│
   │ (OTHER) │
   │         │
   │ ❌ No   │
   │  Notif  │
   └─────────┘

OLD BEHAVIOR: All directors got notification
NEW BEHAVIOR: Only contest owner director gets notification
```

## Ranking System

```
┌────────────────────────────────────────────────────────────────┐
│                    RANKING COMPUTATION                          │
└────────────────────────────────────────────────────────────────┘

CONTEST 1                          CONTEST 2
┌─────────────────────┐           ┌─────────────────────┐
│ Sample 1.1: 95 pts  │ Rank 1    │ Sample 2.1: 92 pts  │ Rank 1
│ Sample 1.2: 93 pts  │ Rank 2    │ Sample 2.2: 90 pts  │ Rank 2
│ Sample 1.3: 91 pts  │ Rank 3    │ Sample 2.3: 88 pts  │ Rank 3
│ ...                 │           │ ...                 │
│ Sample 1.10: 85 pts │ Rank 10   │ Sample 2.10: 80 pts │ Rank 10
└─────────────────────┘           └─────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ COMPUTATION LOGIC:                                             │
│                                                                │
│ WITH ranked AS (                                               │
│   SELECT                                                       │
│     sample_id,                                                 │
│     contest_id,                                                │
│     avg_score,                                                 │
│     ROW_NUMBER() OVER (                                        │
│       PARTITION BY contest_id  ← Per-contest ranking          │
│       ORDER BY avg_score DESC                                  │
│     ) as rank                                                  │
│   FROM aggregated                                              │
│ )                                                              │
│ SELECT * FROM ranked WHERE rank <= 10                          │
└────────────────────────────────────────────────────────────────┘

KEY: Rankings are independent per contest
     Sample 1.1 (Rank 1 in Contest 1) ≠ Sample 2.1 (Rank 1 in Contest 2)
```

## Database Schema Relationships

```
┌────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                              │
└────────────────────────────────────────────────────────────────┘

profiles                    contests
┌──────────────┐           ┌──────────────────┐
│ id (PK)      │◄──────────│ created_by (FK)  │
│ email        │           │ id (PK)          │
│ name         │           │ name             │
│ role         │           │ start_date       │
│              │           │ end_date         │
└──────────────┘           │ sample_price     │
                           └────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
            │   sample     │  │top_results│  │notifications│
            ├──────────────┤  ├───────────┤  ├───────────┤
            │ id (PK)      │  │ sample_id │  │ id (PK)   │
            │ contest_id(FK)│ │contest_id │  │contest_id │
            │ user_id (FK) │  │ rank      │  │recipient  │
            │ tracking_code│  │ avg_score │  │ type      │
            │ status       │  └───────────┘  └───────────┘
            └──────┬───────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
┌───────▼──┐ ┌────▼─────┐ ┌──▼──────────┐
│physical_ │ │sensory_  │ │final_       │
│evaluations│ │evaluations│ │evaluations  │
└──────────┘ └──────────┘ └─────────────┘

CASCADE DELETE:
• Delete contest → Deletes samples → Deletes evaluations
• Delete contest → Deletes rankings
• Delete contest → Deletes notifications
```

## Security Model

```
┌────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
└────────────────────────────────────────────────────────────────┘

LAYER 1: Row Level Security (RLS)
┌────────────────────────────────────────────────────────────────┐
│ contests table:                                                │
│                                                                │
│ SELECT: auth.uid() = created_by OR role = 'admin'             │
│ UPDATE: auth.uid() = created_by OR role = 'admin'             │
│ DELETE: auth.uid() = created_by OR role = 'admin'             │
└────────────────────────────────────────────────────────────────┘

LAYER 2: Database Triggers
┌────────────────────────────────────────────────────────────────┐
│ BEFORE INSERT on contests:                                     │
│                                                                │
│ IF role = 'director' AND has_active_contest()                  │
│   THEN RAISE EXCEPTION                                         │
└────────────────────────────────────────────────────────────────┘

LAYER 3: Application Validation
┌────────────────────────────────────────────────────────────────┐
│ ContestsService.createContest():                               │
│                                                                │
│ 1. Check user authentication                                   │
│ 2. Check user role                                             │
│ 3. If director, check active contest                           │
│ 4. Validate dates                                              │
│ 5. Call database INSERT                                        │
└────────────────────────────────────────────────────────────────┘

LAYER 4: UI Restrictions
┌────────────────────────────────────────────────────────────────┐
│ • Hide "Create Contest" button if director has active          │
│ • Show warning message                                         │
│ • Disable form submission                                      │
└────────────────────────────────────────────────────────────────┘

Defense in Depth: Multiple layers ensure security even if one fails
```

## Cleanup Process

```
┌────────────────────────────────────────────────────────────────┐
│                    CLEANUP WORKFLOW                             │
└────────────────────────────────────────────────────────────────┘

BEFORE CLEANUP:
┌─────────────────────────────────────────────────────────────┐
│ Contest 1 (Expired: 2024-01-15)                             │
│ ├─ Sample 1.1                                               │
│ │  ├─ Physical Evaluation                                   │
│ │  ├─ Sensory Evaluation                                    │
│ │  └─ Final Evaluation                                      │
│ ├─ Sample 1.2                                               │
│ └─ Rankings (Top 10)                                        │
│                                                             │
│ Contest 2 (Active: 2024-03-01 to 2024-03-15)               │
│ ├─ Sample 2.1                                               │
│ └─ Rankings (Top 10)                                        │
└─────────────────────────────────────────────────────────────┘

ADMIN TRIGGERS: cleanup_expired_contests()
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ FOR EACH expired contest:                                   │
│   1. DELETE FROM top_results WHERE contest_id = expired_id  │
│   2. DELETE FROM sample WHERE contest_id = expired_id       │
│      (CASCADE deletes evaluations)                          │
│   3. DELETE FROM contests WHERE id = expired_id             │
│   4. LOG cleanup details                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
AFTER CLEANUP:
┌─────────────────────────────────────────────────────────────┐
│ Contest 2 (Active: 2024-03-01 to 2024-03-15)               │
│ ├─ Sample 2.1                                               │
│ └─ Rankings (Top 10)                                        │
│                                                             │
│ ✅ Contest 1 and all its data removed                       │
└─────────────────────────────────────────────────────────────┘
```

## API Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    API REQUEST FLOW                             │
└────────────────────────────────────────────────────────────────┘

DIRECTOR CREATES CONTEST:

Client                  Service                 Database
  │                       │                        │
  │ createContest()       │                        │
  ├──────────────────────►│                        │
  │                       │ getUser()              │
  │                       ├───────────────────────►│
  │                       │◄───────────────────────┤
  │                       │ user.id                │
  │                       │                        │
  │                       │ getProfile(user.id)    │
  │                       ├───────────────────────►│
  │                       │◄───────────────────────┤
  │                       │ role: 'director'       │
  │                       │                        │
  │                       │ director_has_active()  │
  │                       ├───────────────────────►│
  │                       │◄───────────────────────┤
  │                       │ true/false             │
  │                       │                        │
  │                       │ IF true:               │
  │                       │   throw Error          │
  │                       │                        │
  │                       │ IF false:              │
  │                       │   INSERT contest       │
  │                       ├───────────────────────►│
  │                       │                        │ TRIGGER:
  │                       │                        │ check_director_active()
  │                       │                        │
  │                       │◄───────────────────────┤
  │                       │ contest data           │
  │◄──────────────────────┤                        │
  │ success               │                        │
  │                       │                        │

DIRECTOR VIEWS CONTESTS:

Client                  Service                 Database
  │                       │                        │
  │ getDirectorContests() │                        │
  ├──────────────────────►│                        │
  │                       │ SELECT * FROM contests │
  │                       │ WHERE created_by=uid   │
  │                       ├───────────────────────►│
  │                       │                        │ RLS:
  │                       │                        │ Filter by created_by
  │                       │◄───────────────────────┤
  │                       │ [Contest 1, Contest 2] │
  │◄──────────────────────┤                        │
  │ contests[]            │                        │
```

## State Transitions

```
┌────────────────────────────────────────────────────────────────┐
│                    CONTEST STATE MACHINE                        │
└────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   CREATED    │
                    │              │
                    │ start_date   │
                    │   > TODAY    │
                    └──────┬───────┘
                           │
                           │ TODAY >= start_date
                           ▼
                    ┌──────────────┐
                    │   ACTIVE     │
                    │              │
                    │ start_date   │
                    │ <= TODAY <=  │
                    │   end_date   │
                    └──────┬───────┘
                           │
                           │ TODAY > end_date
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │
                    │              │
                    │ end_date     │
                    │   < TODAY    │
                    └──────┬───────┘
                           │
                           │ Admin cleanup
                           ▼
                    ┌──────────────┐
                    │   DELETED    │
                    │              │
                    │ (Removed     │
                    │  from DB)    │
                    └──────────────┘

DIRECTOR CONSTRAINTS:
• Can create new contest in: CREATED, COMPLETED, DELETED states
• Cannot create new contest in: ACTIVE state
```

---

## Legend

```
┌────────────────────────────────────────────────────────────────┐
│                         SYMBOLS                                 │
└────────────────────────────────────────────────────────────────┘

├─  Branch/Connection
│   Vertical line
─   Horizontal line
►   Flow direction
▼   Downward flow
◄   Return flow
✅  Success/Allowed
❌  Failure/Denied
(PK) Primary Key
(FK) Foreign Key
```

---

These diagrams provide a visual representation of the multi-contest architecture, showing how data flows, how security is enforced, and how different components interact.
