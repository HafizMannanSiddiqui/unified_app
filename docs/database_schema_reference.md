# Unified App — Complete Database Schema Reference

## Old → New Table Mapping

| # | Old System | Old Table | New Table | What Changed |
|---|---|---|---|---|
| 1 | GTL | `data` | `time_entries` | Renamed. user_id VARCHAR→INT FK, approver string→INT FK, all string IDs→INT FKs |
| 2 | GTL | `users` | `users` | Merged with HRMS users. MD5→bcrypt. team_id string→INT FK |
| 3 | GTL | `teams` | `teams` | Merged with HRMS teams. team_id string "TM_0002"→INT PK |
| 4 | GTL | `programs` | `programs` | program_id string "0001"→INT PK |
| 5 | GTL | `projects` | `projects` | project_id string "PXP01"→INT PK. FK→programs added |
| 6 | GTL | `sub_projects` | `sub_projects` | Split from team assignment. sub_project_id string→INT PK |
| 7 | NEW | — | `team_sub_project_assignments` | Junction table (was embedded in old sub_projects.team_id) |
| 8 | GTL | `wbs` | `wbs` | wbs_id had no FK→now proper PK |
| 9 | GTL | `permissions` | DROPPED | Replaced by HRMS RBAC model |
| 10 | GTL | `counter` | `counters` | Merged with HRMS counter |
| 11 | HRMS | `users` | `users` | Merged with GTL. zk_id, card_no, designation_id kept |
| 12 | HRMS | `teams` | `teams` | Merged with GTL teams |
| 13 | HRMS | `attendance` | `attendance` | username string→user_id INT FK |
| 14 | HRMS | `attendance_requests` | `attendance_requests` | requester_username→requester_id FK, approver_username→approver_id FK |
| 15 | HRMS | `attendance_images` | `attendance_images` | user_name string→user_id INT FK |
| 16 | HRMS | `leaves` | `leaves` | confirmed_by string→INT FK. Dropped redundant username column |
| 17 | HRMS | `holidays` | `holidays` | is_valid INT→BOOLEAN |
| 18 | HRMS | `weekend_assignments` | `weekend_assignments` | assigned_by/deleted_by string→INT FKs |
| 19 | HRMS | `profiles` | `profiles` | unique_id(CNIC) link→user_id FK. Arrays for languages/hobbies/countries |
| 20 | HRMS | `profiles_education` | `profile_education` | unique_id(CNIC)→profile_id FK with CASCADE delete |
| 21 | HRMS | `profiles_experience` | `profile_experience` | unique_id(CNIC)→profile_id FK with CASCADE delete |
| 22 | HRMS | `profile_acvisa` | `profile_visas` | unique_id(CNIC)→profile_id FK with CASCADE delete |
| 23 | HRMS | `designations` | `designations` | team_id string→INT FK |
| 24 | HRMS | `roles` | `roles` | No change |
| 25 | HRMS | `modules` | `modules` | parent_id/child_id→self-referential parent_id. Added slug |
| 26 | HRMS | `module_permissions` | `module_permissions` | Added UNIQUE(module_id, task) |
| 27 | HRMS | `role_has_permissions` | `role_has_permissions` | Added UNIQUE(role_id, module_id, task) |
| 28 | HRMS | `user_has_role` | `user_has_role` | Added UNIQUE(user_id, role_id) |
| 29 | HRMS | `device_users` | `device_users` | userid→user_id FK with UNIQUE |
| 30 | HRMS | `settings` | `settings` | ip TEXT→value JSONB |
| 31 | HRMS | `counter` | `counters` | Merged with GTL counter |
| 32 | HRMS | `permissions` | DROPPED | Was empty. Covered by RBAC tables |

**Summary: 32 old tables → 27 new tables** (2 dropped, 2 merged pairs, 1 new junction table)

---

## All 27 Tables — Columns, Types, and Foreign Keys

### TABLE 1: `teams`
> Source: GTL teams + HRMS teams (merged)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| team_name | VARCHAR(255) | NOT NULL | — |
| legacy_team_id | VARCHAR(100) | INDEX | — |
| source_system | VARCHAR(10) | | — |
| display_order | INTEGER | NOT NULL DEFAULT 0 | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 2: `roles`
> Source: HRMS roles

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| name | VARCHAR(100) | NOT NULL, UNIQUE | — |
| description | TEXT | | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_by | VARCHAR(100) | | — |
| updated_by | VARCHAR(100) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 3: `modules`
> Source: HRMS modules — Self-referential hierarchy

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| parent_id | INTEGER | INDEX | **modules.id** |
| name | VARCHAR(100) | NOT NULL | — |
| slug | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_by | VARCHAR(100) | | — |
| updated_by | VARCHAR(100) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 4: `programs`
> Source: GTL programs (DG MATRIX, etc.)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| legacy_program_id | VARCHAR(20) | INDEX | — |
| program_name | VARCHAR(500) | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE, INDEX | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 5: `wbs`
> Source: GTL Work Breakdown Structure

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| legacy_wbs_id | INTEGER | INDEX | — |
| description | VARCHAR(255) | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 6: `holidays`
> Source: HRMS holidays

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| year | SMALLINT | NOT NULL, INDEX | — |
| from_date | DATE | NOT NULL | — |
| to_date | DATE | NOT NULL | — |
| number_of_days | INTEGER | NOT NULL, CHECK > 0 | — |
| description | TEXT | | — |
| is_valid | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_by | VARCHAR(100) | | — |
| updated_by | VARCHAR(100) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 7: `settings`
> Source: HRMS settings (device IPs, configs)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| name | VARCHAR(255) | NOT NULL, UNIQUE | — |
| display_name | VARCHAR(200) | | — |
| description | TEXT | | — |
| value | JSONB | | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 8: `designations`
> Source: HRMS designations

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| team_id | INTEGER | INDEX | **teams.id** |
| name | VARCHAR(200) | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_by | VARCHAR(100) | | — |
| updated_by | VARCHAR(100) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 9: `projects`
> Source: GTL projects (PX-Microgrid, PX-EV Charger)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| program_id | INTEGER | NOT NULL, INDEX | **programs.id** |
| legacy_project_id | VARCHAR(100) | INDEX | — |
| project_name | VARCHAR(255) | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE, INDEX | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 10: `sub_projects`
> Source: GTL sub_projects (Controls, Hardware Design, etc.)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| program_id | INTEGER | NOT NULL, INDEX | **programs.id** |
| project_id | INTEGER | INDEX | **projects.id** |
| legacy_sub_project_id | VARCHAR(100) | INDEX | — |
| sub_project_name | VARCHAR(255) | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 11: `team_sub_project_assignments`
> NEW junction table — links teams to sub_projects (many:many)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| team_id | INTEGER | NOT NULL, INDEX, UNIQUE(team_id, sub_project_id) | **teams.id** |
| sub_project_id | INTEGER | NOT NULL, INDEX | **sub_projects.id** |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 12: `users`
> Source: GTL users + HRMS users (MERGED — single source of truth)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| username | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | — |
| email | VARCHAR(255) | INDEX | — |
| display_name | VARCHAR(200) | | — |
| first_name | VARCHAR(100) | | — |
| last_name | VARCHAR(100) | | — |
| password_hash | VARCHAR(255) | NOT NULL DEFAULT 'not-set' | — |
| legacy_password_md5 | VARCHAR(64) | | — |
| team_id | INTEGER | INDEX | **teams.id** |
| designation_id | INTEGER | INDEX | **designations.id** |
| report_to | INTEGER | INDEX | **users.id** (self) |
| payroll_company | VARCHAR(100) | INDEX | — |
| alias_info | JSONB | | — |
| zk_id | INTEGER | | — |
| card_no | VARCHAR(50) | | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE, INDEX | — |
| reset_link_token | VARCHAR(255) | | — |
| created_by | VARCHAR(100) | | — |
| updated_by | VARCHAR(100) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 13: `module_permissions`
> Source: HRMS module_permissions

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| module_id | INTEGER | NOT NULL, INDEX, UNIQUE(module_id, task) | **modules.id** |
| task | module_task_enum | NOT NULL | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |

---

### TABLE 14: `role_has_permissions`
> Source: HRMS role_has_permissions — The permission matrix

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| role_id | INTEGER | NOT NULL, INDEX, UNIQUE(role_id, module_id, task) | **roles.id** |
| module_id | INTEGER | NOT NULL, INDEX | **modules.id** |
| task | module_task_enum | NOT NULL | — |
| permission | BOOLEAN | NOT NULL DEFAULT FALSE | — |
| created_by | INTEGER | | **users.id** |
| updated_by | INTEGER | | **users.id** |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 15: `user_has_role`
> Source: HRMS user_has_role — Many-to-many: users ↔ roles

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX, UNIQUE(user_id, role_id) | **users.id** |
| role_id | INTEGER | NOT NULL, INDEX | **roles.id** |

---

### TABLE 16: `time_entries`
> Source: GTL `data` table (RENAMED) — Main time logging table

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX | **users.id** |
| program_id | INTEGER | NOT NULL, INDEX | **programs.id** |
| team_id | INTEGER | INDEX | **teams.id** |
| project_id | INTEGER | INDEX | **projects.id** |
| sub_project_id | INTEGER | | **sub_projects.id** |
| work_type | INTEGER | NOT NULL | — |
| product_phase | product_phase_enum | | — |
| entry_date | DATE | NOT NULL, INDEX | — |
| description | TEXT | | — |
| wbs_id | INTEGER | | **wbs.id** |
| hours | NUMERIC(5,2) | NOT NULL, CHECK > 0 AND <= 24 | — |
| approver_id | INTEGER | INDEX | **users.id** |
| status | SMALLINT | NOT NULL DEFAULT 0, INDEX | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

**7 FKs in this table** (was 0 in old system — all were broken strings)

---

### TABLE 17: `attendance`
> Source: HRMS attendance

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX | **users.id** |
| checkin_date | DATE | INDEX | — |
| checkin_time | TIME | | — |
| checkout_date | DATE | | — |
| checkout_time | TIME | | — |
| status | SMALLINT | NOT NULL DEFAULT 1, INDEX | — |
| checkin_state | attendance_state_enum | NOT NULL DEFAULT 'manual' | — |
| checkout_state | attendance_state_enum | | — |
| checkin_ip | VARCHAR(45) | | — |
| checkin_hostname | VARCHAR(255) | | — |
| checkout_ip | VARCHAR(45) | | — |
| checkout_hostname | VARCHAR(255) | | — |
| created_by | INTEGER | | **users.id** |
| updated_by | INTEGER | | **users.id** |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 18: `attendance_requests`
> Source: HRMS attendance_requests

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| requester_id | INTEGER | NOT NULL, INDEX | **users.id** |
| attendance_type | VARCHAR(50) | NOT NULL | — |
| checkin_date | DATE | INDEX | — |
| checkin_time | TIME | | — |
| checkout_date | DATE | | — |
| checkout_time | TIME | | — |
| description | TEXT | | — |
| approver_id | INTEGER | INDEX | **users.id** |
| status | SMALLINT | NOT NULL DEFAULT 1, INDEX | — |
| requester_ip | VARCHAR(45) | | — |
| requester_hostname | VARCHAR(255) | | — |
| approver_ip | VARCHAR(45) | | — |
| approver_hostname | VARCHAR(255) | | — |
| created_by | INTEGER | | **users.id** |
| updated_by | INTEGER | | **users.id** |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 19: `attendance_images`
> Source: HRMS attendance_images

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX | **users.id** |
| attendance_date | DATE | NOT NULL, INDEX | — |
| action | attendance_action_enum | NOT NULL | — |
| image_path | VARCHAR(500) | NOT NULL | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 20: `leaves`
> Source: HRMS leaves

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX | **users.id** |
| from_date | DATE | NOT NULL | — |
| to_date | DATE | NOT NULL | — |
| number_of_days | INTEGER | NOT NULL, CHECK > 0 | — |
| leave_type | leave_type_enum | NOT NULL | — |
| description | TEXT | | — |
| confirmed_by | INTEGER | INDEX | **users.id** |
| status | leave_status_enum | NOT NULL DEFAULT 'pending', INDEX | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 21: `weekend_assignments`
> Source: HRMS weekend_assignments

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, INDEX, UNIQUE(user_id, weekend_date) | **users.id** |
| weekend_date | DATE | NOT NULL, INDEX | — |
| weekend_number | SMALLINT | NOT NULL | — |
| year | SMALLINT | NOT NULL, INDEX | — |
| attendance_type | attendance_type_enum | NOT NULL | — |
| assigned_by | INTEGER | NOT NULL, INDEX | **users.id** |
| assigned_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| status | SMALLINT | NOT NULL DEFAULT 1 | — |
| deleted_by | INTEGER | | **users.id** |

---

### TABLE 22: `profiles`
> Source: HRMS profiles — 1:1 with users

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| user_id | INTEGER | NOT NULL, UNIQUE, INDEX | **users.id** |
| cnic | VARCHAR(20) | UNIQUE, INDEX | — |
| first_name | VARCHAR(100) | | — |
| last_name | VARCHAR(100) | | — |
| father_name | VARCHAR(100) | | — |
| father_occupation | VARCHAR(100) | | — |
| mother_occupation | VARCHAR(100) | | — |
| contact_no | VARCHAR(20) | | — |
| personal_email | VARCHAR(200) | | — |
| dob | DATE | | — |
| marital_status | VARCHAR(50) | | — |
| nationality | VARCHAR(50) | DEFAULT 'Pakistani' | — |
| blood_group | VARCHAR(10) | INDEX | — |
| passport_status | VARCHAR(10) | DEFAULT 'no' | — |
| passport_no | VARCHAR(50) | | — |
| passport_expiry | DATE | | — |
| international_tour | BOOLEAN | DEFAULT FALSE | — |
| visited_countries | TEXT[] | | — |
| current_address | TEXT | | — |
| permanent_address | TEXT | | — |
| career_objectives | TEXT | | — |
| job_title | VARCHAR(100) | | — |
| df_job | VARCHAR(100) | | — |
| sitting_location | VARCHAR(100) | | — |
| passion | VARCHAR(255) | | — |
| siblings | SMALLINT | DEFAULT 0 | — |
| dependents | SMALLINT | DEFAULT 0 | — |
| languages | TEXT[] | | — |
| hobbies | TEXT[] | | — |
| date_of_joining | DATE | | — |
| house | VARCHAR(100) | | — |
| vehicle | VARCHAR(100) | | — |
| picture_path | VARCHAR(500) | | — |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | — |
| updated_by | INTEGER | | **users.id** |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 23: `profile_education`
> Source: HRMS profiles_education — Many per profile, CASCADE delete

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| profile_id | INTEGER | NOT NULL, INDEX | **profiles.id** (CASCADE) |
| record_type | profile_record_type_enum | NOT NULL | — |
| examination | VARCHAR(200) | | — |
| degree | VARCHAR(200) | | — |
| board | VARCHAR(200) | | — |
| passing_year | VARCHAR(10) | | — |
| percentage | VARCHAR(20) | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 24: `profile_experience`
> Source: HRMS profiles_experience — Many per profile, CASCADE delete

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| profile_id | INTEGER | NOT NULL, INDEX | **profiles.id** (CASCADE) |
| organization | VARCHAR(200) | | — |
| designation | VARCHAR(200) | | — |
| job_role | VARCHAR(200) | | — |
| work_from | DATE | | — |
| work_to | DATE | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 25: `profile_visas`
> Source: HRMS profile_acvisa — Many per profile, CASCADE delete

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| profile_id | INTEGER | NOT NULL, INDEX | **profiles.id** (CASCADE) |
| visa_country | VARCHAR(100) | | — |
| visa_expiry | DATE | | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

### TABLE 26: `device_users`
> Source: HRMS device_users — ZKTeco biometric mapping, 1:1 with users

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| uid | INTEGER | NOT NULL | — |
| user_id | INTEGER | NOT NULL, UNIQUE, INDEX | **users.id** |
| name | VARCHAR(255) | | — |
| role | SMALLINT | NOT NULL DEFAULT 0 | — |
| card_no | VARCHAR(255) | | — |

---

### TABLE 27: `counters`
> Source: GTL counter + HRMS counter (merged)

| Column | Type | Constraints | FK → |
|---|---|---|---|
| id | SERIAL | PRIMARY KEY | — |
| module_name | VARCHAR(100) | NOT NULL, UNIQUE | — |
| value | INTEGER | NOT NULL DEFAULT 0 | — |
| created_by | INTEGER | | **users.id** |
| updated_by | INTEGER | | **users.id** |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | — |

---

## All Foreign Key Relationships (34 total)

| # | Source Table | Source Column | → Target Table | Target Column | On Delete | Relationship |
|---|---|---|---|---|---|---|
| 1 | users | team_id | teams | id | SET NULL | Many users → 1 team |
| 2 | users | designation_id | designations | id | SET NULL | Many users → 1 designation |
| 3 | users | report_to | users | id | SET NULL | Many users → 1 manager (self) |
| 4 | designations | team_id | teams | id | SET NULL | Many designations → 1 team |
| 5 | modules | parent_id | modules | id | SET NULL | Child module → parent (self) |
| 6 | projects | program_id | programs | id | CASCADE | Many projects → 1 program |
| 7 | sub_projects | program_id | programs | id | CASCADE | Many sub_projects → 1 program |
| 8 | sub_projects | project_id | projects | id | SET NULL | Many sub_projects → 1 project |
| 9 | team_sub_project_assignments | team_id | teams | id | CASCADE | Junction: team side |
| 10 | team_sub_project_assignments | sub_project_id | sub_projects | id | CASCADE | Junction: sub_project side |
| 11 | module_permissions | module_id | modules | id | CASCADE | Many perms → 1 module |
| 12 | role_has_permissions | role_id | roles | id | CASCADE | Many perms → 1 role |
| 13 | role_has_permissions | module_id | modules | id | CASCADE | Many perms → 1 module |
| 14 | role_has_permissions | created_by | users | id | SET NULL | Audit |
| 15 | role_has_permissions | updated_by | users | id | SET NULL | Audit |
| 16 | user_has_role | user_id | users | id | CASCADE | Junction: user side |
| 17 | user_has_role | role_id | roles | id | CASCADE | Junction: role side |
| 18 | time_entries | user_id | users | id | CASCADE | Many entries → 1 user |
| 19 | time_entries | program_id | programs | id | RESTRICT | Many entries → 1 program |
| 20 | time_entries | team_id | teams | id | SET NULL | Many entries → 1 team |
| 21 | time_entries | project_id | projects | id | SET NULL | Many entries → 1 project |
| 22 | time_entries | sub_project_id | sub_projects | id | SET NULL | Many entries → 1 sub_project |
| 23 | time_entries | wbs_id | wbs | id | SET NULL | Many entries → 1 WBS item |
| 24 | time_entries | approver_id | users | id | SET NULL | Many entries → 1 approver |
| 25 | attendance | user_id | users | id | CASCADE | Many records → 1 user |
| 26 | attendance | created_by | users | id | SET NULL | Audit |
| 27 | attendance | updated_by | users | id | SET NULL | Audit |
| 28 | attendance_requests | requester_id | users | id | CASCADE | Many requests → 1 requester |
| 29 | attendance_requests | approver_id | users | id | SET NULL | Many requests → 1 approver |
| 30 | attendance_images | user_id | users | id | CASCADE | Many images → 1 user |
| 31 | leaves | user_id | users | id | CASCADE | Many leaves → 1 user |
| 32 | leaves | confirmed_by | users | id | SET NULL | Many leaves → 1 confirmer |
| 33 | weekend_assignments | user_id | users | id | CASCADE | Many assignments → 1 user |
| 34 | weekend_assignments | assigned_by | users | id | RESTRICT | Many assignments → 1 assigner |
| 35 | weekend_assignments | deleted_by | users | id | SET NULL | Audit |
| 36 | profiles | user_id | users | id | CASCADE | 1 profile → 1 user (UNIQUE) |
| 37 | profiles | updated_by | users | id | SET NULL | Audit |
| 38 | profile_education | profile_id | profiles | id | CASCADE | Many edu → 1 profile |
| 39 | profile_experience | profile_id | profiles | id | CASCADE | Many exp → 1 profile |
| 40 | profile_visas | profile_id | profiles | id | CASCADE | Many visas → 1 profile |
| 41 | device_users | user_id | users | id | CASCADE | 1 device → 1 user (UNIQUE) |
| 42 | counters | created_by | users | id | SET NULL | Audit |
| 43 | counters | updated_by | users | id | SET NULL | Audit |

---

## Enum Types (8 total)

| Enum Name | Values | Used In |
|---|---|---|
| product_phase_enum | production, rnd | time_entries.product_phase |
| leave_type_enum | casual_leave, earned_leave, sick_leave | leaves.leave_type |
| leave_status_enum | pending, approved, rejected | leaves.status |
| attendance_state_enum | manual, rfid, auto | attendance.checkin_state, checkout_state |
| attendance_action_enum | checkin, checkout | attendance_images.action |
| attendance_type_enum | full_day, half_day | weekend_assignments.attendance_type |
| module_task_enum | View, Add, Edit, Delete | module_permissions.task, role_has_permissions.task |
| profile_record_type_enum | education, certification | profile_education.record_type |

---

## Indexes (50+ total)

Every FK column is indexed. Additional composite indexes for common queries:
- `time_entries(user_id, entry_date)` — timesheet lookups
- `attendance(user_id, checkin_date)` — attendance reports
- `attendance_images(user_id, attendance_date)` — image lookups
- `leaves(user_id, status)` — leave balance queries
- `holidays(from_date, to_date)` — date range checks
