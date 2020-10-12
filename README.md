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

### Fetch an accessToken
Within the provider we make use of several hooks to use the functionality exposed within the context.

The accessToken is directly returned from the fetchAccessToken function when already present and valid. 
If not it will automatically fetch a new accessToken for you.

To get the accessToken you can do this:

```javascript
const [token, setToken] = useState<null | string>(null);
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

### Get User Info
To get the user info you can do this within the context of the provider:

```javascript
const userInfo = useAuthUserInfo();
console.log('This is the userInfo: ', userInfo)
```

### Get the Claims
To get the claims you can do this within the context of the provider:

```javascript
const claims = useAuthAccessClaims();
console.log('This are the claims: ', claims)
```

### Check session 
To check if there is a session and for example show a loader when there's not yet one:

```javascript
const sessionInfo = useAuthSessionInfo();
console.log('There is a session started: ', sessionInfo.hasSession)
```