export default {
  giris: 'This notice explains which personal data LocalKarar processes, why it is processed, who receives it, and the rights you have under Turkish Personal Data Protection Law No. 6698 (KVKK).',
  bolumler: [
    {
      id: 'veri-sorumlusu', baslik: '1. Identity of the data controller',
      paragraflar: ['The data controller under the KVKK is Enes Buğra Aslanhan acting as an individual. LocalKarar is not operated by a separate legal entity.'],
      tanimlar: [['Data controller', 'Enes Buğra Aslanhan (individual)'], ['Location', 'Yenimahalle, Ankara'], ['Application address', 'kvkk@localkarar.com'], ['Application', 'localkarar.com']],
      son: ['A postal address is not published on this page. If you wish to submit a written application, it will be provided in response to a request sent to the email address above.']
    },
    {
      id: 'kapsam', baslik: '2. Scope of this notice',
      paragraflar: ['This notice covers processing connected with your LocalKarar account and the business workspaces you create.', 'Privacy practices on third-party websites linked from the application, such as an official source behind a news item, are outside this notice.']
    },
    {
      id: 'islenen-veriler', baslik: '3. Personal data we process',
      paragraflar: ['Depending on how you use the application, the following categories may be processed.'],
      tanimlar: [
        ['Identity', 'First name and surname.'],
        ['Contact', 'Email address.'],
        ['Account and security', 'A cryptographic password hash—never the password itself—access and refresh tokens, email-verification status, and account creation and update times.'],
        ['Business profile', 'Business name and title, sector, city, stage, employee count, sales channels, goals, challenges, and financial figures you enter, including monthly sales, monthly expenses, cash, and debt.'],
        ['Business records', 'Income, expense, and other tracking records; contacts, reminders, workspace memberships and invitations; uploaded files and extracted text.'],
        ['Calculation and decision data', 'Calculation inputs and results; financial-model runs, assumptions, and traces; Decision Tool sessions, answers, and results; saved practice cards and decision-journal records.'],
        ['Learning data', 'Course enrolments; lesson, knowledge-object, video, and study progress; tasks and in-lesson exercise marks.'],
        ['AI Mentor data', 'Conversations, summaries, manageable memory notes, and context used to generate responses. When relevant, context may include aggregate business tracking figures and marketplace totals plus names of top-selling products. Customer/buyer names, invoice and order numbers, and record titles are excluded.'],
        ['Community and support', 'Posts, replies, likes, saves, follow relationships, blocks, complaints, and the contact and request content submitted through support.'],
        ['Private member messages', 'One-to-one and group message content, timestamps, memberships, and invitations. Messages are stored on the server and are NOT END-TO-END ENCRYPTED. Administrators access content only when necessary to investigate a complaint.'],
        ['Inbound email channel', 'When enabled: sender address, subject, and attachments sent to the dedicated business inbox. Attachments are processed like manual uploads; the email body is not stored.'],
        ['Marketplace store data', 'When you connect Trendyol, Hepsiburada, n11, or Shopify: encrypted store credentials, orders, products, and inventory. Orders include the buyer name and marketplace buyer number, but not the buyer’s address, phone number, or email. The connection is off by default.'],
        ['Image', 'Your profile photo, if you choose to upload one.'],
        ['Transaction security', 'IP address, browser information, and request time in server-access logs. These logs are not stored in the database as account-linked records.']
      ],
      son: ['Community advertising increments only aggregate impression and click counters. LocalKarar does not record who viewed or clicked an advertisement, and these counters cannot be linked to a user.']
    },
    {
      id: 'ucuncu-kisi-verileri', baslik: '4. Third-party data and our role',
      paragraflar: [
        'Business tracking, uploaded invoices, the dedicated inbox, and connected marketplaces may bring personal data about your customers, suppliers, employees, or buyers into the application.',
        'You decide to provide or connect that data and may disable the inbox or marketplace connection at any time.',
        'For this third-party data, you are the data controller under the KVKK. LocalKarar acts only as your data processor, on your instructions and to provide the service.',
        'You are responsible for having a lawful basis and providing the notices required by the KVKK. See the Terms of Use for details.'
      ]
    },
    {
      id: 'amaclar', baslik: '5. Purposes and legal grounds',
      paragraflar: ['Your data is processed for the following purposes and on the legal grounds shown.'],
      tablo: {
        basliklar: ['Purpose', 'Data used', 'Legal ground (KVKK Article 5)'],
        satirlar: [
          ['Create and maintain your account', 'Identity, contact, account, and security', 'Formation and performance of a contract (Art. 5/2-c)'],
          ['Provide courses, Calculations, Decision Tools, and business tracking', 'Business profile and records, learning, calculation, and decision data', 'Performance of a contract (Art. 5/2-c)'],
          ['Provide AI Mentor', 'AI Mentor data and, only where relevant, limited business, course, calculation, and document context', 'Performance of a contract (Art. 5/2-c)'],
          ['Provide community and private messaging', 'Community, support, and private-message data', 'Performance of a contract (Art. 5/2-c)'],
          ['Operate blocking and complaints', 'Block and complaint records', 'Legitimate interest (Art. 5/2-f): protecting users from harassment and unwanted contact'],
          ['Process documents sent to the dedicated inbox', 'Inbound-email data and records extracted from attachments', 'Performance of a contract (Art. 5/2-c), when you enable the channel'],
          ['Protect accounts and prevent misuse', 'Account, security, and transaction-security data', 'Legitimate interest (Art. 5/2-f)'],
          ['Respond to support requests', 'Identity, contact, and support content', 'Legitimate interest (Art. 5/2-f)'],
          ['Meet legal duties and respond to authorities', 'Relevant data', 'Legal obligation (Art. 5/2-ç)']
        ]
      },
      son: ['These activities are necessary to provide the service and do not rely on explicit consent. If a new activity requires explicit consent, it will be requested separately and clearly.']
    },
    {
      id: 'toplama-yontemi', baslik: '6. How data is collected',
      paragraflar: ['Data is collected electronically from information you enter and technical records created automatically, such as access tokens and server logs.', 'Workspace members, invitations, connected services, and uploaded documents may introduce third-party data. Section 4 explains the relevant responsibilities.']
    },
    {
      id: 'yurt-disi', baslik: '7. International transfers',
      paragraflar: ['LocalKarar uses providers located abroad or operating global infrastructure. Depending on the feature you use, personal data may be transferred as follows.'],
      tablo: {
        basliklar: ['Recipient', 'Country', 'Data transferred', 'Purpose'],
        satirlar: [
          ['OVH SAS', 'France', 'All data processed in the application', 'Server and database hosting'],
          ['Mistral AI', 'France', 'AI Mentor messages and only the business, document, course, progress, calculation, and model context needed for a response', 'Generating AI responses'],
          ['Resend', 'United States and global subprocessors', 'Name, email address, email content, and support requests when used', 'Verification, password reset, notifications, invitations, and support email'],
          ['Cloudflare', 'Global infrastructure', 'IP address and connection metadata', 'Attack protection and content delivery'],
          ['Shopify', 'Canada and global infrastructure', 'Store identity and authorisation details; imported order and product data', 'Only when you connect a store: importing orders and products']
        ]
      },
      son: ['Mistral AI retains AI Mentor prompts for 30 days for abuse monitoring; this cannot be disabled under the current service plan.', 'The setting allowing data to be used for model training is disabled on our Mistral AI account. Your conversations are not used for model training.', 'Transfers are assessed under Article 9 of Law No. 6698, including the applicable transfer conditions and safeguards for each provider and transfer.']
    },
    {
      id: 'odeme-verisi', baslik: '7.1. Payment data and the payment institution',
      paragraflar: [
        'Membership fees are collected through PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş., a payment institution established in Türkiye. This is a DOMESTIC transfer and is not part of the international transfer table above.',
        'Your card number, expiry date and security code (CVV) are entered inside PayTR’s own secure payment frame. They never reach LocalKarar servers and are not stored by us.',
        'The payment data we process is limited to the transaction amount, date, order number and status; the masked last digits of the card; and the billing identity required to issue an invoice (name or company title, national ID or tax number, tax office, billing address).',
        'Data retained to meet invoicing obligations is kept for the period required by tax legislation, even after the membership ends, and cannot be deleted before that period expires.',
        'The statement that card details never reach our servers depends on the payment page being hosted in PayTR’s frame. If that method changes, this text changes with it.'
      ]
    },
    {
      id: 'saklama', baslik: '8. Retention and deletion',
      tablo: {
        basliklar: ['Data', 'Retention period'],
        satirlar: [
          ['Account and profile data', 'While your account remains open'],
          ['Business records and documents', 'Until you delete them; deleted with the account'],
          ['Learning, calculation, and decision records', 'While the account is open or until you delete the record'],
          ['AI Mentor conversations, summaries, and notes', 'Until you delete them or the account'],
          ['Private member messages', 'Until the conversation or account is deleted'],
          ['Blocks and complaints', 'Until a block is removed; complaints remain as an audit trail'],
          ['Inbox documents', 'As for manual uploads: until you delete them'],
          ['Marketplace orders and products', 'While the store is connected; imported data is deleted when disconnected'],
          ['Marketplace credentials', 'Encrypted; deleted when the connection is removed'],
          ['Refresh tokens', 'Up to 30 days; invalidated on sign-out'],
          ['Verification and password-reset tokens', 'Short-lived; invalidated after use or expiry'],
          ['Server access logs', 'A limited period, with rotation based on file size'],
          ['AI Mentor prompts held by Mistral AI', '30 days'],
          ['Transaction and audit records', 'For the period required by security and legal obligations']
        ]
      },
      son: ['When you delete your account, it is disabled, identifying information is anonymised, and active sessions end. Records required for security, audit, or legal retention may remain after being disconnected from your identity.']
    },
    {
      id: 'haklar', baslik: '9. Your rights under KVKK Article 11',
      paragraflar: ['You may apply to the data controller to:'],
      liste: ['Learn whether your personal data is processed', 'Request information about processing', 'Learn the purpose of processing and whether data is used accordingly', 'Know the recipients in Turkey or abroad', 'Request correction of incomplete or inaccurate data', 'Request erasure or destruction where the statutory conditions apply', 'Request that correction, erasure, or destruction be notified to recipients', 'Object to an adverse result produced solely by automated analysis', 'Claim compensation for damage caused by unlawful processing']
    },
    {
      id: 'basvuru', baslik: '10. How to exercise your rights',
      paragraflar: ['Send your application to kvkk@localkarar.com. To let us verify your identity and respond, include the information below.'],
      liste: ['Your first name and surname', 'The email address associated with your LocalKarar account', 'The right you wish to exercise and a clear description of your request', 'Any document needed to support your request'],
      son: ['Applications are answered as soon as possible and no later than 30 days. They are normally free of charge; a fee may be charged only where permitted by the official tariff. You may also complain to the Turkish Personal Data Protection Authority under the statutory conditions.']
    },
    {
      id: 'guvenlik', baslik: '11. Security measures',
      liste: ['Passwords are stored only as salted cryptographic hashes.', 'Marketplace credentials and comparable secrets are encrypted at rest.', 'Access tokens expire and refresh tokens can be revoked.', 'Workspace access is limited by membership and role.', 'Rate limits and security logging help prevent misuse.', 'Transport encryption is used in production.', 'Administrative access is restricted and auditable.']
    },
    {
      id: 'degisiklik', baslik: '12. Changes to this notice',
      paragraflar: ['When processing activities change materially, this notice is updated under a new version and consent is requested again where required. The version at the top of the page identifies the notice currently in effect.']
    }
  ]
}
