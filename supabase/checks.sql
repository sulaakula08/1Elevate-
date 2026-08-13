-- Question bank health checks.
--
-- Read-only: every statement here is a SELECT. Nothing is deleted, and nothing
-- is changed — decide what to do after you have looked at the output.
--
-- Run them one block at a time in the Supabase SQL Editor. Each block is
-- independent. To check Math instead of Reading & Writing, change the
-- subject filter from 'sat-rw' to 'sat-math'.
--
-- Where the text lives: prompts, choices and explanations are inside the
-- `payload` jsonb, as `{"en": "…"}`. That is why every query below reaches
-- through `payload -> 'prompt' ->> 'en'` rather than reading a column.

-- ---------------------------------------------------------------- 0. counts --
-- Start here. If this number is not the one you expect, everything below is
-- being run against a different set than you think.

select subject_id, count(*) as items
from public.custom_questions
group by subject_id
order by items desc;

-- --------------------------------------------------- 1. duplicate prompts --
-- The same question asked twice. Compared by words alone — case, punctuation
-- and spacing are stripped — so "Which choice best states the main idea?" and
-- "which choice best states the main idea" count as one.
--
-- This is the check worth running first: a duplicate wastes a student's time
-- and quietly skews their accuracy on whatever topic it belongs to.

with normalised as (
  select
    id,
    topic,
    created_at,
    payload -> 'prompt' ->> 'en' as prompt,
    trim(regexp_replace(lower(payload -> 'prompt' ->> 'en'), '[^[:alnum:]]+', ' ', 'g')) as key
  from public.custom_questions
  where subject_id = 'sat-rw'
)
select
  count(*) as copies,
  min(created_at) as first_written,
  max(created_at) as last_written,
  array_agg(id order by created_at) as ids,
  min(prompt) as prompt
from normalised
group by key
having count(*) > 1
order by copies desc, last_written desc;

-- ------------------------------------------- 2. duplicate passages --------
-- A shared stimulus is legitimate: the real exam asks several questions about
-- one passage. This is here to tell the deliberate case from the accidental
-- one — five questions on a passage is a set, forty is a copy-paste loop.

with normalised as (
  select
    trim(regexp_replace(lower(payload -> 'passage' ->> 'en'), '[^[:alnum:]]+', ' ', 'g')) as key,
    left(payload -> 'passage' ->> 'en', 90) as opening
  from public.custom_questions
  where subject_id = 'sat-rw'
    and coalesce(payload -> 'passage' ->> 'en', '') <> ''
)
select count(*) as questions_sharing_it, min(opening) as passage_opens_with
from normalised
group by key
having count(*) > 1
order by questions_sharing_it desc;

-- ------------------------------------------------- 3. placeholders and junk --
-- Items that look like something typed to see whether the editor works.
-- Deliberately broad: it is a list to eyeball, not a verdict.

select
  id,
  topic,
  created_at,
  payload -> 'prompt' ->> 'en' as prompt
from public.custom_questions
where subject_id = 'sat-rw'
  and (
    -- The usual keyboard-mash and stand-in words, as whole words only, so a
    -- legitimate "the test showed…" is not swept up.
    payload -> 'prompt' ->> 'en' ~* '\m(test|testing|asdf|qwerty|lorem ipsum|placeholder|example question|sample question|todo|tbd|xxx)\M'
    -- Too short to be an SAT item at all.
    or length(coalesce(payload -> 'prompt' ->> 'en', '')) < 25
  )
order by created_at desc;

-- --------------------------------------------------- 4. broken answer keys --
-- These are not style problems. Each one makes the item unanswerable or
-- wrongly marked, so a student loses a point they earned.

select
  id,
  topic,
  answer,
  jsonb_array_length(payload -> 'choices') as choice_count,
  payload -> 'prompt' ->> 'en' as prompt,
  case
    when answer < 0 or answer >= jsonb_array_length(payload -> 'choices')
      then 'answer index points outside the choices'
    when jsonb_array_length(payload -> 'choices') < 2
      then 'fewer than two choices'
    else 'two choices say the same thing'
  end as problem
from public.custom_questions
where subject_id = 'sat-rw'
  and (
    answer < 0
    or answer >= jsonb_array_length(payload -> 'choices')
    or jsonb_array_length(payload -> 'choices') < 2
    -- Two identical options make the key ambiguous even when the index is fine.
    or (
      select count(distinct lower(trim(value ->> 'en')))
      from jsonb_array_elements(payload -> 'choices')
    ) <> jsonb_array_length(payload -> 'choices')
  )
order by created_at desc;

-- ------------------------------------------------------ 5. thin explanations --
-- The explanation is most of the teaching value. One line usually means the
-- item was saved in a hurry rather than finished.

select
  id,
  topic,
  length(coalesce(payload -> 'explanation' ->> 'en', '')) as explanation_chars,
  payload -> 'prompt' ->> 'en' as prompt
from public.custom_questions
where subject_id = 'sat-rw'
  and length(coalesce(payload -> 'explanation' ->> 'en', '')) < 60
order by explanation_chars;

-- ------------------------------------------------------------- 6. coverage --
-- Not a fault, but worth seeing: which domains and skills the bank actually
-- covers, and where it is thin. A section nobody has written for is a section
-- a student cannot practise.

select
  domain,
  payload ->> 'skill' as skill,
  count(*) as items,
  count(*) filter (where difficulty = 1) as easy,
  count(*) filter (where difficulty = 2) as medium,
  count(*) filter (where difficulty = 3) as hard,
  count(*) filter (where payload ->> 'generatedBy' is not null) as ai_drafted
from public.custom_questions
where subject_id = 'sat-rw'
group by domain, payload ->> 'skill'
order by items desc;

-- ------------------------------------ 7. near-duplicates (optional, slower) --
-- Catches rewording that check 1 misses: "Which choice best states the main
-- idea?" against "What is the main idea of the passage?".
--
-- Needs the trigram extension. Creating it is safe and one-off; on a bank of a
-- few hundred items this compares every pair, which is fine here and would not
-- be at ten thousand.

create extension if not exists pg_trgm;

with items as (
  select id, topic, payload -> 'prompt' ->> 'en' as prompt
  from public.custom_questions
  where subject_id = 'sat-rw'
)
select
  a.id as id_a,
  b.id as id_b,
  round(similarity(a.prompt, b.prompt)::numeric, 2) as how_alike,
  a.prompt as prompt_a,
  b.prompt as prompt_b
from items a
join items b on a.id < b.id
where similarity(a.prompt, b.prompt) > 0.75
order by how_alike desc
limit 100;
