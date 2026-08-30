export default {
  giris: 'LocalKarar does not set its own session, analytics, or advertising cookies. Information required for your session and preferences is stored on your device in local or session storage. Cloudflare may set technical cookies when security controls require them. This policy explains those uses separately.',
  bolumler: [
    {
      id: 'cerez-yok',
      baslik: '1. Cookies set by LocalKarar',
      paragraflar: [
        'The LocalKarar application server does not set cookies to sign you in, measure analytics, serve advertising, or track you.',
        'Instead, the application uses your browser’s localStorage or sessionStorage. Unlike cookies, data in these stores is not automatically sent to the server; the application reads it when needed.'
      ]
    },
    {
      id: 'saklananlar',
      baslik: '2. Information stored on your device',
      paragraflar: ['The following list covers every item this version of the application writes to browser storage.'],
      tablo: {
        basliklar: ['Item', 'Purpose', 'When it is removed'],
        satirlar: [
          ['Access token', 'Confirms that you are signed in and authenticates each request', 'When you sign out; it also expires automatically after 8 hours'],
          ['Refresh token', 'Avoids requiring your password again every time the application opens', 'When you sign out; no later than 30 days'],
          ['Theme preference', 'Remembers your light or dark appearance choice', 'Until you clear browser data'],
          ['Menu layout', 'Remembers whether you collapsed the side menu', 'Until you clear browser data'],
          ['Storage-notice status', 'Remembers that you dismissed the browser-storage notice', 'Until you clear browser data'],
          ['Email-verification reminder', 'Keeps a dismissed verification notice hidden for the current tab session', 'When the tab or browser session closes'],
          ['Exercise check marks', 'Keeps your selections in lesson checklists', 'Until you clear browser data'],
          ['Mentor feedback', 'Remembers the helpful or not-helpful mark you gave a response', 'Until you clear browser data']
        ]
      }
    },
    {
      id: 'neden-zorunlu',
      baslik: '3. Why this information is necessary',
      paragraflar: [
        'These items maintain your session, security reminders, preferences, and the exercise or Mentor feedback you choose to save on your device. They are not used for analytics or advertising.',
        'Without access tokens, you would have to sign in again on every page. Without preference storage, your chosen theme and menu layout would reset whenever the application opened.',
        'Access tokens are necessary for the service to work. Other items are written only after you make the relevant choice and can be removed through browser settings. Because LocalKarar uses no analytics, advertising, or third-party tracking storage, it does not request separate consent for tracking cookies.'
      ]
    },
    {
      id: 'izleme-yok',
      baslik: '4. No third-party tracking',
      paragraflar: [
        'The application does not run analytics tools, advertising networks, social-media trackers, or similar third-party tracking code.',
        'Fonts are served from our own server. An external font service used in the past was removed because it disclosed each visitor’s IP address to that provider.',
        'If a tracking feature is introduced later, this policy will be updated, users will be informed, and the required preference controls will be provided. Tracking will not be added silently.'
      ]
    },
    {
      id: 'altyapi',
      baslik: '5. Infrastructure provider',
      paragraflar: [
        'The application is delivered through Cloudflare for attack protection and performance. For security purposes, Cloudflare processes connection data such as your IP address and request time.',
        'Although no Cloudflare cookie has been observed during the normal application flow, Cloudflare may set temporary technical security cookies, such as cf_clearance or __cf_bm, when bot protection, a WAF challenge, load balancing, or a similar security feature is activated. These are not LocalKarar analytics or advertising cookies.'
      ]
    },
    {
      id: 'silme',
      baslik: '6. How to remove this information',
      liste: [
        'Signing out removes access and refresh tokens from your device.',
        'Deleting LocalKarar site data in your browser settings removes local and session storage and any technical security cookies.',
        'When you use a private or incognito window, this data is removed when the window is closed.'
      ],
      son: ['Removing this information signs you out and resets preferences such as theme and menu layout. It does not delete data in your account, which is stored on the server.']
    },
    {
      id: 'degisiklik',
      baslik: '7. Changes',
      paragraflar: ['This policy is updated and published under a new version when the items stored on your device change. The version shown at the top of the page identifies the policy currently in effect.']
    }
  ]
}
