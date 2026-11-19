# Module count

PBK programmes are globally accredited. They are not registered with the South African Qualifications Authority (SAQA), and they are not registered on the National Qualifications Framework (NQF). Do not publish a SAQA qualification ID, including 118402, on a programme title, description, certificate, or page.

## What the course editor does

- The course editor shows a target module count of 18 or 20.
- That number is an internal planning figure. It is not a SAQA requirement and it is not a SETA requirement.
- If the count does not match the target, a short message suggests adding or removing modules.
- The choices are set in code (`expectedModulesSetting` in `CourseEditor.tsx`).

## Recommendation

- Choose 18 or 20 unique modules when that is the internal plan for the programme.
- Each module should have a distinct title and content.
- Remove duplicate modules via **Remove module** in the course editor so the count reflects real, unique modules.

## Adding new modules with AI

To add AI-generated modules to an existing course:

1. Go to **Admin → Courses** and open the course.
2. Open the **Modules** tab.
3. Click **Add new modules with AI**.
4. Choose **Number to generate**.
5. Click **Generate with AI**.

Each new module is generated with units, a formative quiz, and an assignment. The generator is instructed not to describe the programme as SAQA registered, SETA accredited, or on the NQF. You need **ANTHROPIC_API_KEY** in `.env.local` for this to work. Modules are created one at a time to avoid timeouts.

Stored course titles or descriptions that still mention SAQA are hidden when shown to learners. Changing those database rows needs a reviewed SQL statement. Do not run it from this document.
