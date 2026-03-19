-- proof_url is only set after the student uploads; allow NULL until then.
ALTER TABLE payments ALTER COLUMN proof_url DROP NOT NULL;
