-- Extended self-service / admin profile fields (non-credential).
ALTER TABLE user_profiles
    ADD COLUMN job_title   varchar(120),
    ADD COLUMN department  varchar(120),
    ADD COLUMN organization varchar(160),
    ADD COLUMN city        varchar(100),
    ADD COLUMN country     varchar(100),
    ADD COLUMN bio         text;
