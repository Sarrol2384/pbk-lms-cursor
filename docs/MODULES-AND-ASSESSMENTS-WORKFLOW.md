# Module and assessment workflow: options and editing

## 1. Duplicate check and matching criteria (implemented)

When you **add new modules with AI** to an existing course:

- **Duplicate / overlap check**: The AI is given the list of **existing module titles** and instructed not to duplicate or closely overlap. When adding one module at a time, the API can first ask the AI for **one suggested new title** that is distinct from existing ones, then generate the full module for that title.
- **Same criteria as existing modules**: The generator receives:
  - **Units per module**: Taken from the first existing module (e.g. 5 units). New modules use the same number.
  - **Content length and style**: The prompt asks for “same content length and assessment style” as the rest of the course.

So new modules are kept distinct and aligned with the current course structure.

---

## 2. How to edit quizzes and assessments (already in the app)

You can edit quizzes and assignments at any time after they are created.

**Path:**  
**Admin → Courses → [Course] → Modules** → expand a module → under **Assessments**, click the quiz or assignment name (e.g. “Module 1 Formative Quiz” or “Module 1 Assignment”).

**On the assessment page you can:**

- **Quiz**: Change title, total marks, weight; add/edit/remove **questions** (question text, option A–D, correct answer, marks per question).
- **Assignment**: Change title, total marks, weight; edit the **brief** (instructions); add/edit/remove **rubric criteria** (criteria text and marks).

So you can:

- Add modules with AI (with units + quiz + assignment), then go through each module and edit the quiz questions and assignment brief/rubric as needed, **or**
- Add only module structure first (see option B below), then add quizzes/assignments later and edit them in one phase.

---

## 3. Workflow options

### Option A: Full module each time (current default)

- Use **“Add new modules with AI”** and generate full modules (units + quiz + assignment).
- After generation, open each module → open each assessment (quiz or assignment) and edit as above.
- **Pros**: One step per module; students see a complete module as soon as you’re happy with edits.  
- **Cons**: You may edit many quizzes/assignments as you go.

### Option B: Modules first, then assessments (possible future feature)

- **Phase 1:** Add only **module + units** (no quiz, no assignment). For example, a separate action “Add module (structure only)” that creates one module and its units from AI.
- **Phase 2:** When all 20 modules (and unit content) are finalised, run **“Generate assessments for all modules”** to add one quiz and one assignment per module.
- **Phase 3:** Edit all quizzes and assignments from the same assessment list.

**Pros**: Lock module list and content first; then do all assessment authoring in one go.  
**Cons**: Requires a new flow (structure-only generation + bulk “add assessments”). Not implemented yet; you can do Option A and edit assessments after each module.

### Recommendation for now

- Use **Option A**: add full modules with AI (with duplicate check and matching criteria).
- Edit quizzes and assignments as you go via **Admin → Courses → [Course] → Modules → [Module] → [Quiz or Assignment]**.
- If you prefer to finalise all module titles and unit content before any assessments, you can add modules manually (title + units only) and later add quizzes/assignments manually, or wait until an “add structure only” / “generate assessments for all modules” feature exists.

---

## 4. Summary

| Question | Answer |
|----------|--------|
| Does it check if the module already exists? | Yes. Existing titles are sent to the AI; for single-module add, a distinct title can be suggested first. |
| Does the new module match length/structure of others? | Yes. Units per module (and style) are taken from existing modules. |
| How do I edit quizzes and assessments? | Admin → Courses → [Course] → Modules → expand module → click the quiz or assignment name. |
| Should we add all modules first, then quizzes/assignments? | Optional. Current flow is “full module each time”; a “modules first, then assessments” flow can be added later if you want it. |
