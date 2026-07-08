begin;

alter table public.feedback_surveys
  add column if not exists feedback_permission_wording_version text not null default 'feedback-permissions-v1.0-2026-07',
  add column if not exists privacy_notice_accepted boolean not null default false,
  add column if not exists privacy_notice_version text not null default 'privacy-notice-v1.0-2026-07',
  add column if not exists privacy_notice_accepted_at timestamptz;

comment on column public.feedback_surveys.feedback_permission_wording_version is
  'Version of the feedback permission wording shown to the customer.';
comment on column public.feedback_surveys.privacy_notice_accepted is
  'Customer confirmed they had read the Privacy Notice before submitting feedback.';
comment on column public.feedback_surveys.privacy_notice_version is
  'Version of the Privacy Notice referenced when feedback was submitted.';
comment on column public.feedback_surveys.privacy_notice_accepted_at is
  'Timestamp when the customer accepted the Privacy Notice statement.';

commit;
