-- Warm Right testimonial permission records update
-- Recent changes only: versioned testimonial permissions, photo-specific permissions,
-- publication status, and withdrawal evidence.

begin;

alter table public.testimonial_submissions
  add column if not exists permission_wording_version text not null default 'testimonial-permissions-v1.0-2026-07',
  add column if not exists permission_recorded_at timestamptz,
  add column if not exists consent_publish_testimonial boolean not null default false,
  add column if not exists consent_publish_photos boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_share_job_feedback boolean not null default false,
  add column if not exists photo_upload_declaration_accepted boolean not null default false,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists publish_testimonial boolean not null default false,
  add column if not exists publish_photos boolean not null default false,
  add column if not exists wider_use_testimonial boolean not null default false,
  add column if not exists wider_use_photos boolean not null default false,
  add column if not exists share_feedback_with_job_organisation boolean not null default false,
  add column if not exists photo_rights_confirmed boolean not null default false,
  add column if not exists publication_status text not null default 'awaiting_review',
  add column if not exists permission_withdrawn text[],
  add column if not exists withdrawal_requested_at timestamptz,
  add column if not exists withdrawal_completed_at timestamptz,
  add column if not exists withdrawal_method text,
  add column if not exists withdrawal_notes text;

alter table public.testimonials
  add column if not exists permission_wording_version text not null default 'testimonial-permissions-v1.0-2026-07',
  add column if not exists permission_recorded_at timestamptz,
  add column if not exists consent_publish_testimonial boolean not null default false,
  add column if not exists consent_publish_photos boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_share_job_feedback boolean not null default false,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists source_submission_id uuid,
  add column if not exists publish_testimonial boolean not null default false,
  add column if not exists publish_photos boolean not null default false,
  add column if not exists wider_use_testimonial boolean not null default false,
  add column if not exists wider_use_photos boolean not null default false,
  add column if not exists share_feedback_with_job_organisation boolean not null default false,
  add column if not exists photo_rights_confirmed boolean not null default false,
  add column if not exists publication_status text not null default 'published',
  add column if not exists permission_withdrawn text[],
  add column if not exists withdrawal_requested_at timestamptz,
  add column if not exists withdrawal_completed_at timestamptz,
  add column if not exists withdrawal_method text,
  add column if not exists withdrawal_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'testimonial_submissions_publication_status_check'
  ) then
    alter table public.testimonial_submissions
      add constraint testimonial_submissions_publication_status_check
      check (publication_status in ('private', 'awaiting_review', 'approved', 'published', 'rejected', 'withdrawn'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'testimonials_publication_status_check'
  ) then
    alter table public.testimonials
      add constraint testimonials_publication_status_check
      check (publication_status in ('private', 'awaiting_review', 'approved', 'published', 'rejected', 'withdrawn'));
  end if;
end $$;

update public.testimonial_submissions
set
  permission_recorded_at = coalesce(permission_recorded_at, consent_recorded_at, created_at, now()),
  publish_testimonial = publish_testimonial or consent_publish_testimonial,
  publish_photos = publish_photos or consent_publish_photos,
  wider_use_testimonial = wider_use_testimonial or consent_marketing,
  wider_use_photos = wider_use_photos or consent_marketing,
  share_feedback_with_job_organisation = share_feedback_with_job_organisation or consent_share_job_feedback,
  photo_rights_confirmed = photo_rights_confirmed or photo_upload_declaration_accepted,
  publication_status = case
    when status = 'approved' then 'published'
    when status = 'rejected' then 'rejected'
    else coalesce(publication_status, 'awaiting_review')
  end;

update public.testimonials
set
  permission_recorded_at = coalesce(permission_recorded_at, consent_recorded_at, review_date::timestamptz, now()),
  publish_testimonial = publish_testimonial or consent_publish_testimonial,
  publish_photos = publish_photos or consent_publish_photos,
  wider_use_testimonial = wider_use_testimonial or consent_marketing,
  wider_use_photos = wider_use_photos or consent_marketing,
  share_feedback_with_job_organisation = share_feedback_with_job_organisation or consent_share_job_feedback,
  publication_status = coalesce(publication_status, 'published');

create table if not exists public.testimonial_permission_withdrawals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.testimonial_submissions(id) on delete set null,
  testimonial_id uuid references public.testimonials(id) on delete set null,
  permission_withdrawn text not null
    check (permission_withdrawn in (
      'publish_testimonial',
      'publish_photos',
      'wider_use_testimonial',
      'wider_use_photos',
      'share_feedback_with_job_organisation',
      'all_publication'
    )),
  withdrawal_requested_at timestamptz not null default now(),
  withdrawal_completed_at timestamptz,
  withdrawal_method text,
  withdrawal_notes text,
  created_at timestamptz not null default now()
);

alter table public.testimonial_permission_withdrawals enable row level security;

drop policy if exists "Authenticated can manage testimonial permission withdrawals"
  on public.testimonial_permission_withdrawals;

create policy "Authenticated can manage testimonial permission withdrawals"
on public.testimonial_permission_withdrawals
for all
to authenticated
using (true)
with check (true);

create or replace function public.enforce_testimonial_publication_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_record public.testimonial_submissions%rowtype;
  published_photo_count integer := 0;
begin
  if new.source_submission_id is null then
    return new;
  end if;

  select *
  into source_record
  from public.testimonial_submissions
  where id = new.source_submission_id;

  if not found then
    raise exception 'The source testimonial submission does not exist.';
  end if;

  if not source_record.publish_testimonial then
    raise exception 'The customer did not permit publication of this testimonial.';
  end if;

  published_photo_count := case
    when new.image_urls is null then 0
    when jsonb_typeof(new.image_urls) = 'array' then jsonb_array_length(new.image_urls)
    else 0
  end;

  if published_photo_count > 0
     and not source_record.publish_photos then
    raise exception 'The customer did not permit publication of testimonial photographs.';
  end if;

  new.permission_wording_version := source_record.permission_wording_version;
  new.permission_recorded_at := source_record.permission_recorded_at;
  new.publish_testimonial := source_record.publish_testimonial;
  new.publish_photos := source_record.publish_photos;
  new.wider_use_testimonial := source_record.wider_use_testimonial;
  new.wider_use_photos := source_record.wider_use_photos;
  new.share_feedback_with_job_organisation := source_record.share_feedback_with_job_organisation;
  new.photo_rights_confirmed := source_record.photo_rights_confirmed;

  -- Keep legacy fields populated for existing screens or reports that still read them.
  new.consent_publish_testimonial := source_record.publish_testimonial;
  new.consent_publish_photos := source_record.publish_photos;
  new.consent_marketing := source_record.wider_use_testimonial or source_record.wider_use_photos;
  new.consent_share_job_feedback := source_record.share_feedback_with_job_organisation;
  new.consent_recorded_at := source_record.permission_recorded_at;

  return new;
end;
$$;

drop trigger if exists enforce_testimonial_publication_consent_trigger
  on public.testimonials;

create trigger enforce_testimonial_publication_consent_trigger
before insert or update of source_submission_id, image_urls
on public.testimonials
for each row
execute function public.enforce_testimonial_publication_consent();

comment on column public.testimonial_submissions.permission_wording_version is
  'Version of the permission wording shown to the customer.';
comment on column public.testimonial_submissions.permission_recorded_at is
  'Timestamp when the permission choices were recorded.';
comment on column public.testimonial_submissions.publish_testimonial is
  'Customer agreed to publish written testimonial, title, chosen display name and star rating on the testimonials page.';
comment on column public.testimonial_submissions.publish_photos is
  'Customer agreed to publish uploaded photographs on the testimonials page.';
comment on column public.testimonial_submissions.wider_use_testimonial is
  'Customer agreed to wider use of written testimonial, title, display name and rating.';
comment on column public.testimonial_submissions.wider_use_photos is
  'Customer agreed to wider use of approved photographs.';
comment on column public.testimonial_submissions.share_feedback_with_job_organisation is
  'Customer agreed to share feedback, rating, job reference and relevant contact information with the connected organisation.';
comment on column public.testimonial_submissions.photo_rights_confirmed is
  'Customer confirmed entitlement and permissions for uploaded photographs.';

commit;
