#!/usr/bin/env node

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log(
  JSON.stringify(
    {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_SUBJECT: "mailto:contato@pododesk.com.br",
    },
    null,
    2,
  ),
);
