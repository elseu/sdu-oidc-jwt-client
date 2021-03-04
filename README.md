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

### Get the initialized status
Will return loading when authentication is still initializing.
Will return loading false with claims and user when user is successfully authenticated,
Will return loading false with undefined claims and undefined user when logged out or authentication failed.

Checks when the loadInitialData function is done executing and will return with the user and claims.

```javascript
const { isLoading, user, claims } = useAuthInitialized<YourClaimsType, YourUserType>();
console.log('Initialized data is still loading: ', isLoading)
console.log('Initialized data has user: ', user)
console.log('Initialized data has claims: ', claims)
```


### Get User Info
To get the user info you can do this within the context of the provider:

```javascript
const  { value, loading } = useAuthUserInfo();
console.log('This is the userInfo: ', value)
```

### Get the Claims
To get the claims you can do this within the context of the provider:

```javascript
const  { value, loading } = useAuthAccessClaims();
console.log('This are the claims: ', value)
```


### Check if a user is logged in.
Checking if the user is logged in so that you can act on it.

```javascript
const isLoggedIn = useAuthIsLoggedIn();
console.log('Is the user loggedin? ', isLoggedIn)
```

### Check if a user has a session
Checking if the user has an active session

```javascript
const { hasSession } = useAuthSessionInfo();
console.log('Does the user have a session? ', hasSession)
```

