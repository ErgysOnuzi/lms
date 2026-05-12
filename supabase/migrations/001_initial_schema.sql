-- ============================================================
-- LMS Mega Migration
-- Covers: profiles, courses, modules, lessons, enrollments,
--         assignments, submissions, lesson_progress, quizzes,
--         quiz_attempts, discussions, settings, audit_logs,
--         certificates, notifications
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ─── Enums ───────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'alumni');
CREATE TYPE course_status AS ENUM ('draft', 'pending', 'published', 'archived');
CREATE TYPE content_type AS ENUM ('video', 'markdown', 'document', 'quiz');
CREATE TYPE submission_status AS ENUM ('not_started', 'submitted', 'late', 'graded');

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'student',
  organization_id UUID,                        -- multi-tenant hook
  xp_points     INTEGER NOT NULL DEFAULT 0,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  last_active   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auto-create profile on auth sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Organization Settings (multi-tenant / branding) ─────────
CREATE TABLE organization_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT 'My University',
  logo_url        TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#6366f1',
  accent_color    TEXT NOT NULL DEFAULT '#8b5cf6',
  domain          TEXT UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free', -- free | pro | enterprise
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Courses ─────────────────────────────────────────────────
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  instructor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID,
  status          course_status NOT NULL DEFAULT 'draft',
  is_free         BOOLEAN NOT NULL DEFAULT FALSE,
  language        TEXT NOT NULL DEFAULT 'en',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Modules ─────────────────────────────────────────────────
CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Lessons ─────────────────────────────────────────────────
CREATE TABLE lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,                   -- markdown body
  content_type     content_type NOT NULL DEFAULT 'markdown',
  video_url        TEXT,
  document_url     TEXT,
  quiz_data        JSONB,                  -- quiz questions JSON
  position         INTEGER NOT NULL DEFAULT 0,
  is_free_preview  BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Enrollments ─────────────────────────────────────────────
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

-- ─── Assignments ─────────────────────────────────────────────
CREATE TABLE assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  rubric      JSONB,                       -- peer review rubric
  due_date    TIMESTAMPTZ,
  max_points  INTEGER NOT NULL DEFAULT 100,
  allow_late  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Submissions ─────────────────────────────────────────────
CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT,
  file_url      TEXT,
  status        submission_status NOT NULL DEFAULT 'not_started',
  points_earned INTEGER,
  feedback      TEXT,
  submitted_at  TIMESTAMPTZ,
  graded_at     TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

-- comment threads on submissions (Realtime)
CREATE TABLE submission_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Lesson Progress ─────────────────────────────────────────
CREATE TABLE lesson_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at     TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, lesson_id)
);

-- ─── Quiz Attempts ───────────────────────────────────────────
CREATE TABLE quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL DEFAULT 0,
  max_score    INTEGER NOT NULL DEFAULT 0,
  passed       BOOLEAN NOT NULL DEFAULT FALSE,
  answers      JSONB,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, student_id)     -- prevent retake once passed
);

-- ─── Certificates ────────────────────────────────────────────
CREATE TABLE certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_url  TEXT,
  UNIQUE (student_id, course_id)
);

-- ─── Discussions ─────────────────────────────────────────────
CREATE TABLE discussions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES discussions(id) ON DELETE CASCADE,  -- threading
  body         TEXT NOT NULL,
  upvotes      INTEGER NOT NULL DEFAULT 0,
  is_endorsed  BOOLEAN NOT NULL DEFAULT FALSE,  -- instructor endorsed
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── System Audit Logs ───────────────────────────────────────
CREATE TABLE system_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── API Keys (public SIS integration) ───────────────────────
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_discussions_lesson ON discussions(lesson_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_actor ON system_audit_logs(actor_id);

-- ─── Helper: is_admin() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─── Helper: is_instructor_of(course_id) ─────────────────────
CREATE OR REPLACE FUNCTION is_instructor_of(p_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses
    WHERE id = p_course_id AND instructor_id = auth.uid()
  );
$$;

-- ─── Helper: is_enrolled_in(course_id) ──────────────────────
CREATE OR REPLACE FUNCTION is_enrolled_in(p_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE course_id = p_course_id AND student_id = auth.uid()
  );
$$;

-- ─── Enable RLS ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ─── RLS: profiles ───────────────────────────────────────────
CREATE POLICY "profiles_select_any" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (is_admin());

-- ─── RLS: courses ────────────────────────────────────────────
-- Published courses visible to all authenticated users; drafts only to owner/admin
CREATE POLICY "courses_select_published" ON courses FOR SELECT USING (
  status = 'published'
  OR instructor_id = auth.uid()
  OR is_admin()
);
CREATE POLICY "courses_insert_instructor" ON courses FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor','admin'))
  );
CREATE POLICY "courses_update_own" ON courses FOR UPDATE
  USING (instructor_id = auth.uid() OR is_admin());
CREATE POLICY "courses_delete_own" ON courses FOR DELETE
  USING (instructor_id = auth.uid() OR is_admin());

-- ─── RLS: modules ────────────────────────────────────────────
CREATE POLICY "modules_select" ON modules FOR SELECT USING (
  is_instructor_of(course_id)
  OR is_enrolled_in(course_id)
  OR is_admin()
  OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND status = 'published')
);
CREATE POLICY "modules_write_instructor" ON modules FOR ALL USING (
  is_instructor_of(course_id) OR is_admin()
);

-- ─── RLS: lessons ────────────────────────────────────────────
CREATE POLICY "lessons_select" ON lessons FOR SELECT USING (
  is_free_preview
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = module_id
      AND (is_instructor_of(m.course_id) OR is_enrolled_in(m.course_id))
  )
);
CREATE POLICY "lessons_write_instructor" ON lessons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM modules m WHERE m.id = module_id AND is_instructor_of(m.course_id)
  ) OR is_admin()
);

-- ─── RLS: enrollments ────────────────────────────────────────
CREATE POLICY "enrollments_select_own" ON enrollments FOR SELECT USING (
  student_id = auth.uid() OR is_admin()
  OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "enrollments_insert_student" ON enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid() OR is_admin());
CREATE POLICY "enrollments_delete_own" ON enrollments FOR DELETE
  USING (student_id = auth.uid() OR is_admin());

-- ─── RLS: assignments ────────────────────────────────────────
CREATE POLICY "assignments_select" ON assignments FOR SELECT USING (
  is_instructor_of(course_id)
  OR is_enrolled_in(course_id)
  OR is_admin()
);
CREATE POLICY "assignments_write_instructor" ON assignments FOR ALL USING (
  is_instructor_of(course_id) OR is_admin()
);

-- ─── RLS: submissions ────────────────────────────────────────
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  student_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM assignments a WHERE a.id = assignment_id AND is_instructor_of(a.course_id)
  )
);
CREATE POLICY "submissions_insert_student" ON submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "submissions_update_own" ON submissions FOR UPDATE
  USING (
    student_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM assignments a WHERE a.id = assignment_id AND is_instructor_of(a.course_id)
    )
  );

-- ─── RLS: submission_comments ────────────────────────────────
CREATE POLICY "comments_select" ON submission_comments FOR SELECT USING (
  author_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.id = submission_id
      AND (s.student_id = auth.uid() OR is_instructor_of(a.course_id))
  )
);
CREATE POLICY "comments_insert" ON submission_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ─── RLS: lesson_progress ────────────────────────────────────
CREATE POLICY "progress_own" ON lesson_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "progress_instructor_read" ON lesson_progress FOR SELECT USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = lesson_id AND is_instructor_of(m.course_id)
  )
);

-- ─── RLS: quiz_attempts ──────────────────────────────────────
CREATE POLICY "quiz_attempts_own" ON quiz_attempts FOR ALL USING (student_id = auth.uid());
CREATE POLICY "quiz_attempts_instructor_read" ON quiz_attempts FOR SELECT USING (is_admin());

-- ─── RLS: certificates ───────────────────────────────────────
CREATE POLICY "certificates_own" ON certificates FOR SELECT USING (
  student_id = auth.uid() OR is_admin()
);
CREATE POLICY "certificates_insert_system" ON certificates FOR INSERT WITH CHECK (is_admin());

-- ─── RLS: discussions ────────────────────────────────────────
CREATE POLICY "discussions_select" ON discussions FOR SELECT USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = lesson_id
      AND (is_enrolled_in(m.course_id) OR is_instructor_of(m.course_id))
  )
);
CREATE POLICY "discussions_insert" ON discussions FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "discussions_update_own" ON discussions FOR UPDATE USING (author_id = auth.uid() OR is_admin());
CREATE POLICY "discussions_delete" ON discussions FOR DELETE USING (author_id = auth.uid() OR is_admin());

-- ─── RLS: notifications ──────────────────────────────────────
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- ─── RLS: system_audit_logs ──────────────────────────────────
CREATE POLICY "audit_logs_admin_only" ON system_audit_logs FOR ALL USING (is_admin());

-- ─── RLS: organization_settings ─────────────────────────────
CREATE POLICY "org_settings_read" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "org_settings_write_admin" ON organization_settings FOR ALL USING (is_admin());

-- ─── RLS: api_keys ───────────────────────────────────────────
CREATE POLICY "api_keys_admin" ON api_keys FOR ALL USING (is_admin());

-- ─── Auto-issue certificate on 100% completion ───────────────
CREATE OR REPLACE FUNCTION maybe_issue_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_course_id UUID;
  v_total     INTEGER;
  v_completed INTEGER;
BEGIN
  -- find the course for this lesson
  SELECT m.course_id INTO v_course_id
  FROM lessons l JOIN modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;

  SELECT COUNT(*) INTO v_total FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = v_course_id;
  SELECT COUNT(*) INTO v_completed
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id AND lp.student_id = NEW.student_id AND lp.is_completed;

  IF v_total > 0 AND v_completed >= v_total THEN
    INSERT INTO certificates (student_id, course_id)
    VALUES (NEW.student_id, v_course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_certificate
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW WHEN (NEW.is_completed = TRUE)
  EXECUTE FUNCTION maybe_issue_certificate();

-- ─── Auto-audit trigger helper ───────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO system_audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER audit_courses AFTER INSERT OR UPDATE OR DELETE ON courses FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_enrollments AFTER INSERT OR DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_submissions AFTER INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ─── Storage buckets (run via Supabase dashboard or CLI) ──────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-content', 'course-content', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);

-- Storage RLS for course-content (instructors manage own files, students read enrolled)
-- CREATE POLICY "course_content_instructor_write"
--   ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'course-content'
--     AND (storage.foldername(name))[1] = 'courses'
--     AND EXISTS (SELECT 1 FROM courses WHERE id::text = (storage.foldername(name))[2] AND instructor_id = auth.uid())
--   );
-- CREATE POLICY "course_content_student_read"
--   ON storage.objects FOR SELECT USING (
--     bucket_id = 'course-content'
--     AND is_enrolled_in((storage.foldername(name))[2]::uuid)
--   );
