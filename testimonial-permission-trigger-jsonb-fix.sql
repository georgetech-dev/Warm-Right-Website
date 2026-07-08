-- Warm Right testimonial publication trigger JSONB image-list fix
-- Recent change only: fixes the JSONB image-list check
-- when publishing testimonials from submissions.

begin;

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

commit;
