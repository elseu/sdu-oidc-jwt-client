import React, { useState } from "react";
import { Story, Meta } from "@storybook/react";
import {
    OidcJwtProvider,
    useAuthAccessToken,
    useAuthControls,
    useAuthAccessClaims,
    useAuthUserInfo,
} from "../react-client";

interface TemplateProps {
    url: string;
    shouldRequireLogin: boolean;
    shouldAttemptLogin: boolean;
    shouldMonitorAccessTokens: boolean;
}

const Template: Story<TemplateProps> = (props: TemplateProps) => {
    const {
        url,
        shouldRequireLogin = false,
        shouldAttemptLogin = false,
        shouldMonitorAccessTokens = false,
    } = props;
    return (
        <OidcJwtProvider
            client={{ url }}
            shouldRequireLogin={shouldRequireLogin}
            shouldAttemptLogin={shouldAttemptLogin}
            shouldMonitorAccessTokens={shouldMonitorAccessTokens}
        >
            <Content />
        </OidcJwtProvider>
    );
};

const Content = () => {
    const userInfo = useAuthUserInfo();
    const [token, setToken] = useState<null | string>(null);
    const claims = useAuthAccessClaims();
    const { authorize, logout } = useAuthControls();
    const fetchAccessToken = useAuthAccessToken();
    const onClickFetchToken = React.useCallback(() => {
        fetchAccessToken().then((token) => {
            setToken(token);
        });
    }, [fetchAccessToken, setToken]);
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
                {!claims && <button onClick={onClickLogin}>Log in</button>}
                {token && (
                    <>
                        <h2>Token</h2>
                        <textarea value={token}></textarea>
                    </>
                )}
            </div>
            <hr />
            <h1>User info</h1>
            <pre>{JSON.stringify(userInfo, undefined, 4)}</pre>
            <h1>Access token claims</h1>
            <pre>{JSON.stringify(claims, undefined, 4)}</pre>
        </>
    );
};

export const Login = Template.bind({});
Login.args = {
    url: "http://localhost:3000",
    shouldRequireLogin: false,
    shouldAttemptLogin: true,
    shouldMonitorAccessTokens: true,
};

export default {
    title: "Example/Login",
    component: Login,
} as Meta;
