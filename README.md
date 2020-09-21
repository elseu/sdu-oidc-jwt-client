# oidc-jwt-client
Fetch JWTs for API access from oidc-jwt-provider

## Installation
`npm install oidc-jwt-client --save`

## How to use
```javascript
<OidcJwtProvider
  client={{ url: 'https://api-auth.acc.titan.awssdu.nl' }}
  shouldRequireLogin={false}
  shouldAttemptLogin={false}
  shouldMonitorAccessTokens={false}
>
  // Contents of your app
</OidcJwtProvider>
```