import { Meta, Story } from '@storybook/react';
import React, { useState } from 'react';

import {
  OidcJwtProvider,
  useAuthAccessClaims,
  useAuthAccessToken,
  useAuthControls,
  useAuthUserInfo,
} from '../react-client';

interface TemplateProps {
  url: string;
  shouldRequireLogin: boolean;
  shouldAttemptLogin: boolean;
  shouldMonitorAccessTokens: boolean;
  testApiUrl?: string;
}

const Template: Story<TemplateProps> = (props: TemplateProps) => {
  const {
    url,
    shouldRequireLogin = false,
    shouldAttemptLogin = false,
    shouldMonitorAccessTokens = false,
    testApiUrl,
  } = props;
  return (
    <OidcJwtProvider
      client={{ url }}
      shouldRequireLogin={shouldRequireLogin}
      shouldAttemptLogin={shouldAttemptLogin}
      shouldMonitorAccessTokens={shouldMonitorAccessTokens}
    >
      <Content testApiUrl={testApiUrl} />
    </OidcJwtProvider>
  );
};

interface ContentProps {
  testApiUrl?: string;
}

const Content = (props: ContentProps) => {
  const { testApiUrl } = props;
  const userInfo = useAuthUserInfo();
  const [token, setToken] = useState<null | string>(null);
  const [apiResult, setApiResult] = useState<null | string>(null);
  const claims = useAuthAccessClaims();
  const { authorize, logout } = useAuthControls();
  const fetchAccessToken = useAuthAccessToken();

  const onClickFetchToken = React.useCallback(() => {
    fetchAccessToken().then((token) => {
      setToken(token);
    });
  }, [fetchAccessToken, setToken]);

  const onClickCallApi = React.useCallback(() => {
    if (!testApiUrl) {
      alert('No API url');
      setApiResult(null);
      return;
    }

    fetchAccessToken().then((token) => {
      if (!token) {
        alert('No token!');
        setApiResult(null);
        return;
      }
      fetch(testApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((json) => {
          setApiResult(JSON.stringify(json, undefined, 4));
        });
    });
  }, [fetchAccessToken, testApiUrl]);

  const onClickLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  const onClickLogin = React.useCallback(() => {
    authorize();
  }, [authorize]);

  return (
    <>
      <div>
        {claims && <button onClick={onClickLogout}>Log out</button>}
        {claims && (
          <button onClick={onClickFetchToken}>Fetch token</button>
        )}
        {claims && testApiUrl && (
          <button onClick={onClickCallApi}>Call API</button>
        )}
        {!claims && <button onClick={onClickLogin}>Log in</button>}
        {token && (
          <>
            <h2>Token</h2>
            <LargeTextArea value={token}></LargeTextArea>
          </>
        )}
        {apiResult && (
          <>
            <h2>API result</h2>
            <LargeTextArea value={apiResult}></LargeTextArea>
          </>
        )}
      </div>
      <hr />
      <h1>User info</h1>
      <LargeTextArea value={JSON.stringify(userInfo, undefined, 4)}></LargeTextArea>
      <h1>Access token claims</h1>
      <LargeTextArea value={JSON.stringify(claims, undefined, 4)}></LargeTextArea>
    </>
  );
};

interface LargeTextAreaProps {
  value: string;
}

const LargeTextArea = (props: LargeTextAreaProps) => {
  return (
    <textarea
      style={{ height: '250px', width: '100%' }}
      value={props.value}
      onChange={(e) => console.log(e.target.value)}
    />
  );
};

export const Login = Template.bind({});

Login.args = {
  url: 'https://api-auth.acc.titan.awssdu.nl',
  testApiUrl: 'https://api-auth-test.acc.titan.awssdu.nl',
  shouldRequireLogin: false,
  shouldAttemptLogin: true,
  shouldMonitorAccessTokens: true,
};

export default {
  title: 'Example/Login',
  component: Login,
} as Meta;
