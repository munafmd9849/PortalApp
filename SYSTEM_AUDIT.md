# System Review: Unnoticed Risks & Improvements

Following a deep audit of the code and database structure, here are the "unnoticed" issues that currently exist. These are areas where the system works fine for a few users but could face security or management problems as you grow.

---

## 1. The "Global Admin" Problem (Privacy Risk)
**Issue:** Currently, any staff member with an "Admin" role can see and edit **every student and every job** in the entire system, regardless of their city.
*   **Risk:** A Bangalore admin can accidentally delete a Noida job or export the private phone numbers of students from Lucknow. 
*   **Improvement Needed:** "Hard-lock" admins to specific centres in the database so they only see what they are responsible for.

## 2. Missing "Who Did What" (Audit Trail)
**Issue:** There is no record (log) of changes made by admins. 
*   **Risk:** If a student's status is changed to "Rejected" by mistake, or if a job posting is deleted, there is no way to tell which admin did it or when they did it.
*   **Improvement Needed:** Add an "Activity Log" that records every major admin action.

## 3. Permanent Deletions (Data Loss Risk)
**Issue:** When you delete a job or a skill, it is permanently removed from the database immediately ("Hard Delete").
*   **Risk:** If an admin clicks "Delete" by mistake, that data is gone forever.
*   **Improvement Needed:** Use "Soft Deletes," where data is marked as "hidden" or "archived" for 30 days before being truly deleted.

## 4. Private Data Exposure (Mass Export)
**Issue:** The "Export to CSV" feature allows any admin to download a list of all students including their personal email and phone numbers in one file.
*   **Risk:** This is a major data privacy concern. If one admin account is compromised, the entire student database (contact info) can be stolen easily.
*   **Improvement Needed:** Limit exports to specific "Super Admins" or record a log every time a file is downloaded.

## 5. System "Pollution" (Performance)
**Issue:** The system currently "polls" (asks the server for updates) every 30 seconds for the entire student list.
*   **Risk:** As you reach 5,000+ students, this will make the dashboard very slow and could crash the server during peak placement season.
*   **Improvement Needed:** Use more efficient "delta updates" where the system only asks for *new* changes instead of the whole list.

## 6. Access Control Gaps
**Issue:** While the UI hides things nicely, a tech-savvy student could potentially call the API directly to view other students' profiles because the backend doesn't always check if the "requester" is the "owner" of the data.

## 8. Synchronous Bulk Emailing (Scaling Bottleneck)
**Issue:** When a job is posted, the server tries to send up to 500 emails immediately using `Promise.allSettled`.
*   **Risk:** The API will hang for 10-20 seconds for the admin who clicks "Post." If 1,000+ students need notification, the server might crash or get blocked by your email provider. The system has a "Queue" (BullMQ) but it is currently sitting idle and not being used for these emails.
*   **Improvement Needed:** Move all bulk emails to the background queue so the API stays lightning-fast.

## 9. "Filter-after-Pagination" Bug (Data Visibility)
**Issue:** In some admin views (like Applicants), the system fetches a "page" of 25 students first, and *then* tries to filter them in memory.
*   **Risk:** If you are searching for a specific candidate who is on page 10, the filter will return "No results" because it only looked at the 25 people on page 1.
*   **Improvement Needed:** Perform all filtering directly in the Database (Prisma) so search results are always accurate.

## 10. O(N²) Database Pressure (Evaluation Load)
**Issue:** Every time an admin grades a student during an interview, the system fetches **every single evaluation** for that round to update the "Stats" counters.
*   **Risk:** If 10 admins are grading 500 students simultaneously, the database will be hit with thousands of massive queries per minute, potentially causing a slowdown or timeout during the drive.
*   **Improvement Needed:** Use incremental updates or database-level aggregations (`_count`) instead of fetching all records.

---

### Summary Recommendation
The system is built horizontally (features are there), but it needs **vertical reinforcement** (security and constraints) before it is ready for a massive national rollout. 

**Priority 1:** Add Audit Logs (Accountability).
**Priority 2:** Lock Admins to Centres (Privacy).
**Priority 3:** Soft Deletion (Safety).
**Priority 4:** Admin Invitation System (Security & Workload Control).
