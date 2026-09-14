This is Supabase's public Root 2021 CA certificate, downloaded over HTTPS from:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

It is a public trust certificate, not a private key or application secret.
The PostgreSQL client combines it with Node's standard trusted roots and verifies
both the certificate chain and database hostname. DATABASE_SSL_CA_FILE can
select a replacement certificate downloaded from your Supabase Database Settings.
