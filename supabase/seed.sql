-- 1Elevate — development seed. Synthetic data only.
--
-- ===========================================================================
-- THIS FILE MUST NEVER RUN AGAINST PRODUCTION.
--
-- Nothing in here is destructive on its own — it only inserts — but it inserts
-- fake students into the Community feed, and on production that means real
-- students reading posts from people who do not exist. The npm scripts that
-- reach a remote database refuse to run when the target is the production
-- project ref; see scripts/db-guard.mjs.
-- ===========================================================================
--
-- Run order matters, and it is the reason this file cannot do everything:
--
--   1. `npm run db:seed:auth`  creates the three Auth users. Auth users cannot
--      be made properly from SQL — the password hash and the auth.identities row
--      that email sign-in needs are the Auth service's business, and hand-rolling
--      them with crypt() breaks the moment Supabase changes its internals. So a
--      script calls the Admin API instead.
--   2. this file, which fills in everything else.
--
-- Because of that split, nothing here hardcodes a user id. Every fixture looks
-- its author up by email, so the two halves stay independent and this file is
-- re-runnable without knowing what ids step 1 happened to generate.
--
-- Every address is @1elevate.test. `.test` is reserved by RFC 2606 and can never
-- be a real domain, so no fixture can collide with, or send mail to, a real
-- person.

do $$
declare
  ada    uuid;  -- student A
  bruno  uuid;  -- student B
  olivia uuid;  -- owner / admin
  p_post        uuid;
  p_question    uuid;
  p_progress    uuid;
  p_achievement uuid;
  p_explanation uuid;
  p_study       uuid;
  p_resource    uuid;
  c_reported    uuid;
  day_offset int;
begin
  select id into ada    from auth.users where email = 'ada.dev@1elevate.test';
  select id into bruno  from auth.users where email = 'bruno.dev@1elevate.test';
  select id into olivia from auth.users where email = 'olivia.dev@1elevate.test';

  if ada is null or bruno is null or olivia is null then
    raise exception
      'Seed users missing. Run `npm run db:seed:auth` first — it creates the three @1elevate.test accounts this file attaches fixtures to.';
  end if;

  -- ---------------------------------------------------------------- profiles --
  -- The handle_new_user trigger already made a row for each; this fills in the
  -- parts the sign-up form would have collected, and makes one of them an owner
  -- so admin surfaces (Moderation, People, Sections) can be tested at all.
  update public.profiles set name = 'Ada Dev',    grade = '11', target_score = 1450 where id = ada;
  update public.profiles set name = 'Bruno Dev',  grade = '12', target_score = 1350 where id = bruno;
  update public.profiles set name = 'Olivia Dev', grade = '',   target_score = 1600, role = 'owner' where id = olivia;

  -- ------------------------------------------------------- question bank --
  -- Two items, one per section, so Practice and Review have something to draw
  -- from and the attempts below have real questions to point at. The payload
  -- shape mirrors what /api/questions writes: prompt, choices and explanation
  -- are LocalizedText ({ "en": ... }), skill rides in the payload.
  insert into public.custom_questions (id, exam, subject_id, topic, domain, difficulty, answer, payload, created_by)
  values
    ('sat-math-dev-001', 'sat', 'sat-math', 'Linear equations in one variable',
     'Algebra', 1, 2,
     jsonb_build_object(
       'passage', null,
       'prompt', jsonb_build_object('en', 'If $3x + 6 = 21$, what is the value of $x$?'),
       'choices', jsonb_build_array(
         jsonb_build_object('en', '3'), jsonb_build_object('en', '4'),
         jsonb_build_object('en', '5'), jsonb_build_object('en', '9')),
       'explanation', jsonb_build_object('en', 'Subtract 6 from both sides to get $3x = 15$, then divide by 3.'),
       'skill', 'Linear equations in one variable',
       'generatedBy', null),
     olivia),
    ('sat-rw-dev-001', 'sat', 'sat-rw', 'Words in context',
     'Craft and Structure', 2, 1,
     jsonb_build_object(
       'passage', jsonb_build_object('en', 'The committee''s report was measured, declining to assign blame while still naming every failure it had found.'),
       'prompt', jsonb_build_object('en', 'As used in the sentence, "measured" most nearly means'),
       'choices', jsonb_build_array(
         jsonb_build_object('en', 'timed'), jsonb_build_object('en', 'restrained'),
         jsonb_build_object('en', 'hostile'), jsonb_build_object('en', 'brief')),
       'explanation', jsonb_build_object('en', 'The report avoids blame while still being complete, so "measured" means restrained rather than timed.'),
       'skill', 'Words in context',
       'generatedBy', null),
     olivia)
  on conflict (id) do nothing;

  -- ------------------------------------------------------------- attempts --
  -- Enough history for the Dashboard, the activity heatmap, the streak and the
  -- weak-areas breakdown to have something to draw. Generated rather than
  -- listed: 40 days of answers for Ada, deterministic, with Math weaker than
  -- Reading so "weak areas" has a visible answer.
  --
  -- `at` is offset from now(), so the heatmap is populated relative to whenever
  -- the seed is run rather than around a date that drifts into the past.
  for day_offset in 0..39 loop
    -- Two Math answers a day, wrong roughly every third day.
    insert into public.attempts (account_id, question_id, subject_id, exam, topic, difficulty, chosen, correct, mode, ms, at)
    values
      (ada, 'sat-math-dev-001', 'sat-math', 'sat', 'Linear equations in one variable', 1,
       case when day_offset % 3 = 0 then 0 else 2 end,
       day_offset % 3 <> 0, 'practice', 32000 + day_offset * 40,
       now() - (day_offset || ' days')::interval - interval '3 hours'),
      (ada, 'sat-rw-dev-001', 'sat-rw', 'sat', 'Words in context', 2,
       case when day_offset % 7 = 0 then 3 else 1 end,
       day_offset % 7 <> 0, 'practice', 41000 + day_offset * 25,
       now() - (day_offset || ' days')::interval - interval '2 hours')
    on conflict do nothing;
  end loop;

  -- A shorter history for Bruno, so the two students are distinguishable and
  -- admin usage figures are not one person's data.
  for day_offset in 0..9 loop
    insert into public.attempts (account_id, question_id, subject_id, exam, topic, difficulty, chosen, correct, mode, ms, at)
    values (bruno, 'sat-math-dev-001', 'sat-math', 'sat', 'Linear equations in one variable', 1,
            case when day_offset % 2 = 0 then 1 else 2 end,
            day_offset % 2 <> 0, 'practice', 50000,
            now() - (day_offset || ' days')::interval - interval '5 hours')
    on conflict do nothing;
  end loop;

  -- ---------------------------------------------------------------- mocks --
  insert into public.mocks (id, account_id, exam, score, correct, total, sections, wrong, at)
  values
    ('mock-dev-ada-1', ada, 'sat', 1290, 78, 98,
     jsonb_build_array(
       jsonb_build_object('subjectId', 'sat-rw', 'score', 650, 'correct', 41, 'total', 54),
       jsonb_build_object('subjectId', 'sat-math', 'score', 640, 'correct', 37, 'total', 44)),
     jsonb_build_array('sat-math-dev-001'), now() - interval '18 days'),
    ('mock-dev-ada-2', ada, 'sat', 1380, 85, 98,
     jsonb_build_array(
       jsonb_build_object('subjectId', 'sat-rw', 'score', 700, 'correct', 45, 'total', 54),
       jsonb_build_object('subjectId', 'sat-math', 'score', 680, 'correct', 40, 'total', 44)),
     jsonb_build_array('sat-rw-dev-001'), now() - interval '4 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------ community --
  -- One post of every type the model allows, because the feed renders each
  -- through its own component and a seed that only covers 'post' and 'question'
  -- leaves five card layouts untested. The payload shapes mirror payloadFor()
  -- in src/lib/community-state.tsx.
  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (ada, 'post', 'sat', null,
          'Started doing twenty minutes before school instead of an hour at night. Sticking to it much better.',
          '{}'::jsonb, now() - interval '40 minutes')
  returning id into p_post;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (bruno, 'question', 'sat', 'Linear equations in one variable',
          'I keep getting this one wrong and I cannot see why. Where am I going astray?',
          jsonb_build_object('question', jsonb_build_object(
            'subjectId', 'sat-math',
            'prompt', 'If $3x + 6 = 21$, what is the value of $x$?',
            'myAnswer', 'A', 'correctAnswer', 'C', 'explanationCount', 0)),
          now() - interval '3 hours')
  returning id into p_question;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (ada, 'progress', 'sat', null, 'Four weeks between these two.',
          jsonb_build_object('progress', jsonb_build_object(
            'fromScore', 1290, 'toScore', 1380,
            'mathScore', 680, 'readingWritingScore', 700, 'mockLabel', 'Mock Test #2')),
          now() - interval '9 hours')
  returning id into p_progress;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (ada, 'achievement', 'sat', null, null,
          jsonb_build_object('achievement', jsonb_build_object(
            'emoji', '🔥', 'title', '30-Day Streak',
            'detail', 'Did not miss a day this month.', 'startScore', 1290, 'currentScore', 1380)),
          now() - interval '1 day')
  returning id into p_achievement;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (olivia, 'explanation', 'sat', 'Words in context', null,
          jsonb_build_object('explanation', jsonb_build_object(
            'subjectId', 'sat-rw', 'title', 'Read the sentence before you read the options',
            'body', 'Cover the four choices, decide what word you would put in the blank yourself, then find the option closest to it. It stops the wrong-but-plausible option from anchoring you.')),
          now() - interval '2 days')
  returning id into p_explanation;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (bruno, 'study-update', 'sat', 'Algebra', null,
          jsonb_build_object('studyUpdate', jsonb_build_object(
            'subjectId', 'sat-math', 'questionsCompleted', 24,
            'accuracy', 0.79, 'accuracyDelta', 0.06)),
          now() - interval '3 days')
  returning id into p_study;

  insert into public.community_posts (author_id, type, exam, topic, text, payload, created_at)
  values (olivia, 'resource', 'sat', 'Punctuation', null,
          jsonb_build_object('resource', jsonb_build_object(
            'title', 'One-page comma and semicolon sheet',
            'note', 'Every punctuation rule that actually shows up, on one side of A4.',
            'subjectId', 'sat-rw')),
          now() - interval '5 days')
  returning id into p_resource;

  -- Comments, including one that exists to be reported.
  insert into public.community_comments (post_id, author_id, text, created_at)
  values
    (p_question, ada,    'Subtract 6 first, then divide by 3 — you are dividing before subtracting.', now() - interval '2 hours'),
    (p_question, olivia, 'Ada has it. Do the same operation to both sides and keep the order.',       now() - interval '1 hour'),
    (p_progress, bruno,  'Ninety points in a month is excellent.',                                    now() - interval '7 hours'),
    (p_post,     bruno,  'Mornings work far better for me too.',                                      now() - interval '20 minutes');

  insert into public.community_comments (post_id, author_id, text, created_at)
  values (p_post, bruno, 'BUY CHEAP SAT ANSWERS -- CLICK MY PROFILE', now() - interval '15 minutes')
  returning id into c_reported;

  -- Reactions and a save, so the counters are not all zero.
  insert into public.community_reactions (post_id, account_id, kind) values
    (p_explanation, ada,    'helpful'),
    (p_explanation, bruno,  'helpful'),
    (p_question,    olivia, 'helpful'),
    (p_progress,    bruno,  'congrats'),
    (p_progress,    olivia, 'congrats'),
    (p_achievement, bruno,  'congrats')
  on conflict do nothing;

  insert into public.community_saves (post_id, account_id) values
    (p_explanation, ada),
    (p_resource,    bruno)
  on conflict do nothing;

  -- An open report, so /admin → Moderation has a queue to show on a fresh dev
  -- database rather than an empty state that proves nothing.
  insert into public.community_reports (reporter_id, target_type, target_id, reason, details)
  values (ada, 'comment', c_reported, 'spam', 'Selling answers in the replies.')
  on conflict do nothing;

  -- ---------------------------------------------------------------- feedback --
  insert into public.feedback (account_id, message, category)
  values
    (ada,   'The timer on the Math module keeps its own count when I switch tabs. Is that intended?', 'bug'),
    (bruno, 'Could the review queue show which skill each question belongs to?', 'idea')
  on conflict do nothing;

  raise notice 'Dev seed complete: 3 users, 2 questions, 7 posts, 5 comments, 1 open report.';
end $$;
