# Testing the flow: Application → Certificate

Two ways to test the full flow.

---

## Option 1: Fast-track (recommended)

Use this to get from “enrolled” to “certificate issued” in one click.

1. **Apply as student**
   - Log in as a **student**.
   - Go to **My courses** (or **Courses**).
   - Click **Enroll** on a course (creates application + pending payment).

2. **Approve as admin**
   - Log in as **admin** or **super_admin**.
   - Go to **Students**.
   - In **Pending**, find the payment and click **Approve**.

3. **Fast-track certificate**
   - Stay in **Students**.
   - Open the **Approved** tab.
   - Find the same student/course row and click **Fast-track cert**.
   - This marks all units complete and all assessments as graded (full marks), then runs certificate logic.

4. **See the certificate**
   - Log in again as the **student**.
   - Go to **My courses** → open that course (or **Dashboard** → the course).
   - You should see **Your certificate is ready** with **View** / **Download**.
   - Or go to **Certificates** to see it in the list.

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
   - Student: **My courses** → course → **Your certificate is ready** or **Certificates**.

**Pass rule:** Per module, the weighted average of assessment marks must be ≥ module pass mark (default 50%). Certificate is issued only when every module is **passed**.
