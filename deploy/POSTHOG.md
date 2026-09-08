# Privacy-first PostHog activation

Product analytics is fail-closed. With `PRODUCT_ANALYTICS_ENABLED=false`, or
with a missing host/token, the browser does not download the PostHog SDK and no
product event is sent.

## Activation gate

Before enabling production analytics:

1. Create an EU Cloud PostHog project and use only its public project token.
2. Update and version the Turkish and English privacy/cookie notices so they
   describe the optional analytics processing and EU destination.
3. Verify the consent banner and the preference control under Settings.
4. Keep session replay, autocapture, heatmaps, surveys, exception autocapture,
   and automatic page capture disabled.
5. Set the server-only values shown in `analytics.env.example`, deploy, then
   verify that no request to PostHog occurs before consent.

## Data contract

Only explicitly allowlisted event names and short operational dimensions can
leave the application. Routes are normalized before capture. The client and
server both reject financial values, order/customer data, email/name/phone,
document paths, URLs, credentials, prompts, Mentor messages, AI responses, and
other free text.

Covered flows are page views, signup/onboarding, integration connection and
sync, calculations, decision tools and follow-up, Mentor usage, subscription
checkout/activation, and sanitized runtime errors. Scheduled marketplace sync
results are emitted by the server only when the relevant user has explicitly
granted analytics consent.
