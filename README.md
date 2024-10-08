> [!WARNING]
> Unmaintained. Deprecated in favor of PKCE flow with https://github.com/authts/react-oidc-context. Preferably you don't use client side authentication at all and move the logic to the server.

# oidc-jwt-client

Fetch JWTs for API access from oidc-jwt-provider

## Installation

`npm install oidc-jwt-client --save`

## How to use

```javascript
<OidcJwtProvider
  client={{ url: 'https://api-auth.acc.titan.awssdu.nl' }}
  shouldAttemptLogin={false}
  shouldMonitorAccessTokens={false}
>
  // Contents of your app
</OidcJwtProvider>
```

When you come back after authorization to your app it will have a token in the url like this `?token=`.
To replace this token we use `window.history.replaceState()` by default.
If you would like to replace this behaviour you could send a custom `removeTokenFromUrlFunction`.

In NextJS you could create a helper function like this:

```tsx
// removeTokenFromUrlFunction.ts
import Router from 'next/router';
import { stripTokenFromUrl } from 'oidc-jwt-client';

const removeTokenFromUrlFunction = (url: string) => {
  const urlWithoutToken = stripTokenFromUrl(url);
  Router.replace(urlWithoutToken, undefined, { shallow: true });
};

export { removeTokenFromUrlFunction };
```

And then use it like this:

```tsx
// App.tsx
<OidcJwtProvider
  client={{ url: 'https://api-auth.ota.titan2.awssdu.nl' }}
  shouldAttemptLogin={false}
  shouldMonitorAccessTokens={false}
  removeTokenFromUrlFunction={removeTokenFromUrlFunction}
>
  // Contents of your app
</OidcJwtProvider>
```

### Fetch an accessToken

Within the provider we make use of several hooks to use the functionality exposed within the context.

The accessToken is directly returned from the fetchAccessToken function when already present and valid.
If not it will automatically fetch a new accessToken for you.

To get the accessToken you can do this:

```javascript
const [token, setToken] = (useState < null) | (string > null);
const fetchAccessToken = useAuthAccessToken();

useEffect(() => {
  fetchAccessToken().then((token) => {
    setToken(token);
  });
}, [fetchAccessToken, setToken]);
```

### Login and Logout functions

To login or logout a user manually you can make use of these two function exposed by the useAuthControls hook:

```javascript
const { authorize, logout } = useAuthControls();

const onClickLogout = React.useCallback(() => {
  logout();
}, [logout]);

const onClickLogin = React.useCallback(() => {
  authorize();
}, [authorize]);
```

### Check if authentication client has initialized

Checks when the loadInitialData function is done executing and will return true when finished. NB! This doesn't mean you're logged in, jsut that the authentication is done initializing.

```javascript
const isInitialized = useAuthInitialized();
console.log('Auth is initialized: ', isInitialized);
```

### Get User Info

To get the user info you can do this within the context of the provider:

```javascript
const { value, loading } = useAuthUserInfo();
console.log('This is the userInfo: ', value);
```

### Get the Claims

To get the claims you can do this within the context of the provider:

```javascript
const { value, loading } = useAuthAccessClaims();
console.log('These are the claims: ', value);
```

### Check if a user is logged in.

Checking if the user is logged in so that you can act on it.

```javascript
const isLoggedIn = useAuthIsLoggedIn();
console.log('Is the user loggedin? ', isLoggedIn);
```

### Check if the users session has expired

Checking if the users session has expired

```javascript
const isSessionExpired = useAuthSessionExpired();
console.log('Is the users session expired? ', isSessionExpired);
```
