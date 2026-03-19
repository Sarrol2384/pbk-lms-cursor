# SETA and module count (20 unique modules)

## Is 20 modules required by SETA?

**SAQA/SETA do not set one fixed number** (e.g. 20) for every qualification. Requirements are per qualification and are usually expressed as:

- **Credits** (e.g. 120, 360)
- **Unit standards** (core, fundamental, elective)
- **NQF level**

So “20 modules” is **not** a universal SETA rule for all courses. Some institutions or SETAs do, however, use **20 unique modules** for a full qualification as an internal or sector standard.

## What this LMS does

- The course editor shows: **Modules: X / 18 or 20 (SAQA/SETA varies by qualification)**.
- Supports both **18** (e.g. SAQA 118402 BBA) and **20** module standards.
- If the count is not 18 or 20, a short message suggests adding or removing modules.
- The supported standards are set in code (`SUPPORTED_MODULE_STANDARDS` in `CourseEditor.tsx`).

## Recommendation

- Aim for **20 unique modules** per full qualification if that is your or your SETA’s standard.
- Each module should have a **distinct title** and content (no duplicate “Human Resource Management” rows).
- Remove duplicate modules via **Remove module** in the course editor so the count reflects real, unique modules.

---

## Adding new modules with AI

To add AI-generated modules to an **existing** course:

1. Go to **Admin → Courses** and open the course (e.g. Bachelor of Business Administration).
2. Open the **Modules** tab.
3. Click **“Add new modules with AI”** to expand the panel.
4. Choose **Number to generate** (2, 4, 6, 10, or “Up to 20 total”).
5. Click **“Generate with AI”**.

Each new module is generated with **units**, a **formative quiz**, and an **assignment** (South African context, SETA-aligned). You need **ANTHROPIC_API_KEY** in `.env.local` for this to work. Modules are created one at a time to avoid timeouts.
