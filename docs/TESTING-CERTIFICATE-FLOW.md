# Testing the flow: Application → Certificate

Two ways to test the full flow.

---

## Option 1: Fast-track API

The students page does not show a fast-track button. `POST /api/admin/fast-track-certificate` is admin-only and issues a **Certificate of Completion** only when the enrolment is already approved and full tuition is recorded. It does not grant course access and it does not mark the fee as paid. The download is not the formal certificate presented on graduation day.

1. **Apply as student**
   - Log in as a **student**.
   - Go to **My courses** (or **Courses**).
   - Click **Enroll** on a course (creates application + pending payment).

2. **Approve the application, then record full tuition**
   - Log in as **admin** or **super_admin**.
   - Go to **Students** and approve the application.
   - Record the amount received. The course opens at the first instalment. A Certificate of Completion requires the full fee, in US dollars, with no conversion.

3. **Call the fast-track API**
   - `POST /api/admin/fast-track-certificate` with `{ "userId", "courseId" }` while signed in as admin.
   - If tuition is not fully recorded, the API returns 403 and does not change the enrolment.
   - On success it marks units complete and assessments graded, then issues the completion document.

4. **See the completion document**
   - Log in again as the **student**.
   - Open the course. You should see **Your Certificate of Completion is ready**.
   - The formal certificate is presented on graduation day and is not this download.

**Requirements:** The course must have at least one module and, for each module, at least one assessment (quiz or assignment). Units are optional for fast-track (they are all marked complete).

---

## Option 2: Full manual flow

Use this to test the real student journey.

1. **Apply**
   - Student: **My courses** → **Enroll** on a course.

2. **Approve**
   - Admin: **Students** → **Pending** → **Approve** (and optionally **View proof** if proof was uploaded).

3. **Complete course**
   - Student: **My courses** → open the course.
   - Open **Module 1** → open each **unit** (visiting the unit page marks it complete).
   - When all units in the module are done, **Quizzes & assessments** unlock.
   - Do each **quiz** (submit answers) or **assignment** (upload file + submit).

4. **Grade (if assignments)**
   - Lecturer/Admin: **Lecturer dashboard** (or grading UI) → open the submission → enter marks and **Save**.  
   - Quizzes are auto-graded on submit.

5. **Next module**
   - Repeat from step 3 for Module 2, 3, … (each module unlocks after the previous one is **passed**).

6. **Certificate**
   - When **all** modules are passed, the certificate is created automatically (on next course page load or after the last grading).
   - Student: **My courses** → course → **Your Certificate of Completion is ready**, after full tuition is recorded.

**Pass rule:** Per module, the weighted average of assessment marks must be ≥ module pass mark (default 50%). A Certificate of Completion is issued only when every module is **passed** and full tuition is recorded. The formal certificate is presented on graduation day.
