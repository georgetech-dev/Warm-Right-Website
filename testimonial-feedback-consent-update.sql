begin;

alter table public.testimonial_submissions
  add column if not exists consent_publish_testimonial boolean not null default false,
  add column if not exists consent_publish_photos boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_share_job_feedback boolean not null default false,
  add column if not exists photo_upload_declaration_accepted boolean not null default false,
  add column if not exists consent_recorded_at timestamptz;

alter table public.feedback_surveys
  add column if not exists consent_publish_testimonial boolean not null default false,
  add column if not exists consent_publish_photos boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_share_job_feedback boolean not null default false,
  add column if not exists consent_recorded_at timestamptz;

alter table public.testimonials
  add column if not exists consent_publish_testimonial boolean not null default false,
  add column if not exists consent_publish_photos boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_share_job_feedback boolean not null default false,
  add column if not exists source_submission_id uuid,
  add column if not exists consent_recorded_at timestamptz;

create index if not exists testimonials_source_submission_id_idx
  on public.testimonials (source_submission_id)
  where source_submission_id is not null;

comment on column public.testimonial_submissions.consent_publish_testimonial is
  'Customer permission to publish their testimonial, display name and rating.';
comment on column public.testimonial_submissions.consent_publish_photos is
  'Customer permission to publish their uploaded photographs on the testimonials page.';
comment on column public.testimonial_submissions.consent_marketing is
  'Customer permission for wider website, social, advertising and printed marketing use.';
comment on column public.testimonial_submissions.consent_share_job_feedback is
  'Customer permission to share relevant job feedback with a connected organisation.';
comment on column public.testimonial_submissions.photo_upload_declaration_accepted is
  'Customer confirmed they may provide uploaded photographs and excluded prohibited content.';

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

  if not source_record.consent_publish_testimonial then
    raise exception 'The customer did not permit publication of this testimonial.';
  end if;

  published_photo_count := case
    when new.image_urls is null then 0
    when jsonb_typeof(new.image_urls) = 'array' then jsonb_array_length(new.image_urls)
    else 0
  end;

  if published_photo_count > 0
     and not source_record.consent_publish_photos then
    raise exception 'The customer did not permit publication of testimonial photographs.';
  end if;

  new.consent_publish_testimonial := source_record.consent_publish_testimonial;
  new.consent_publish_photos := source_record.consent_publish_photos;
  new.consent_marketing := source_record.consent_marketing;
  new.consent_share_job_feedback := source_record.consent_share_job_feedback;
  new.consent_recorded_at := source_record.consent_recorded_at;
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

commit;
