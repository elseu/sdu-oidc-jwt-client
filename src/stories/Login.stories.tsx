import React, { useState } from "react";
import { Story, Meta } from "@storybook/react";
import {
    OidcJwtProvider,
    useUserInfo,
    useAccessTokenClaims,
    useOidcJwtClient,
    useAccessTokenProvider,
} from "../react-client";

interface TemplateProps {
    url: string;
    shouldRequireLogin: boolean;
    shouldPerformLogin: boolean;
    shouldMonitorAccessTokens: boolean;
}

const UserInfo = () => {
    const info = useUserInfo();
    return <pre>{JSON.stringify(info, undefined, 4)}</pre>;
};

const AccessTokenClaims = () => {
    const info = useAccessTokenClaims();
    return <pre>{JSON.stringify(info, undefined, 4)}</pre>;
};

const Buttons = () => {
    const [token, setToken] = useState<null | string>(null);
    const claims = useAccessTokenClaims();
    const client = useOidcJwtClient();
    const provider = useAccessTokenProvider();
    const onClickFetchToken = React.useCallback(() => {
        provider.get().then((token) => {
            setToken(token);
        });
    }, [provider, setToken]);
    const onClickLogout = React.useCallback(() => {
        client?.logout();
    }, [client]);
    const onClickLogin = React.useCallback(() => {
        client?.authorize();
    }, [client]);
    return (
        <div>
            {claims && <button onClick={onClickLogout}>Log out</button>}
            {claims && <button onClick={onClickFetchToken}>Fetch token</button>}
            {!claims && <button onClick={onClickLogin}>Log in</button>}
            {token && (
                <>
                    <h2>Token</h2>
                    <textarea value={token}></textarea>
                </>
            )}
        </div>
    );
};

const Template: Story<TemplateProps> = (props: TemplateProps) => {
    const {
        url,
        shouldRequireLogin = false,
        shouldPerformLogin = false,
        shouldMonitorAccessTokens = false,
    } = props;
    return (
        <OidcJwtProvider
            client={{
                url,
                authorizationDefaults: { scope: "openid profile taxvice" },
            }}
            shouldRequireLogin={shouldRequireLogin}
            shouldPerformLogin={shouldPerformLogin}
            shouldMonitorAccessTokens={shouldMonitorAccessTokens}
        >
            <Buttons />
            <hr />
            <h1>User info</h1>
            <UserInfo />
            <h1>Access token claims</h1>
            <AccessTokenClaims />
        </OidcJwtProvider>
    );
};

export const Login = Template.bind({});
Login.args = {
    url: "http://localhost:3000",
    shouldRequireLogin: false,
    shouldPerformLogin: true,
    shouldMonitorAccessTokens: true,
};

export default {
    title: "Example/Login",
    component: Login,
} as Meta;
