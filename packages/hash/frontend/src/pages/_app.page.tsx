/* eslint-disable import/first */
// @todo have webpack polyfill this
require("setimmediate");

import { ApolloProvider } from "@apollo/client/react";
import { TypeSystemInitializer } from "@blockprotocol/type-system";
import { Subgraph, SubgraphRootTypes } from "@hashintel/hash-subgraph";
import { FunctionComponent, useEffect, useState } from "react";
import { ModalProvider } from "react-modal-hook";
import { configureScope } from "@sentry/nextjs";
import { AppProps as NextAppProps } from "next/app";
import { useRouter } from "next/router";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import { theme, createEmotionCache } from "@hashintel/hash-design-system";
import { SnackbarProvider } from "notistack";
import { TypeSystemContextProvider } from "../lib/use-init-type-system";
import { getPlainLayout, NextPageWithLayout } from "../shared/layout";

import "./globals.scss";
import {
  RouteAccountInfoProvider,
  RoutePageInfoProvider,
} from "../shared/routing";
import { WorkspaceContextProvider } from "./shared/workspace-context";
import { apolloClient } from "../lib/apollo-client";
import { MeQuery } from "../graphql/apiTypes.gen";
import { meQuery } from "../graphql/queries/user.queries";
import { AuthenticatedUser, constructAuthenticatedUser } from "../lib/user";
import { fetchKratosSession } from "./shared/ory-kratos";
import { AuthInfoProvider, useAuthInfo } from "./shared/auth-info-context";
import { setSentryUser } from "./shared/sentry";
import { AppPage, redirectInGetInitialProps } from "./shared/_app.util";

const clientSideEmotionCache = createEmotionCache();

type AppInitialProps = {
  initialAuthenticatedUser?: AuthenticatedUser;
};

type AppProps = {
  emotionCache?: EmotionCache;
  Component: NextPageWithLayout;
} & AppInitialProps &
  NextAppProps;

const App: FunctionComponent<AppProps> = ({
  Component,
  pageProps,
  emotionCache = clientSideEmotionCache,
}) => {
  // Helps prevent tree mismatch between server and client on initial render
  const [ssr, setSsr] = useState(true);
  const router = useRouter();

  useEffect(() => {
    configureScope((scope) =>
      // eslint-disable-next-line no-console -- TODO: consider using logger
      console.log(`Build: ${scope.getSession()?.release ?? "not set"}`),
    );
    setSsr(false);
  }, []);

  const { authenticatedUser } = useAuthInfo();

  useEffect(() => {
    setSentryUser({ authenticatedUser });
  }, [authenticatedUser]);

  // App UI often depends on [account-slug] and other query params. However,
  // router.query is empty during server-side rendering for pages that don’t use
  // getServerSideProps. By showing app skeleton on the server, we avoid UI
  // mismatches during rehydration and improve type-safety of param extraction.
  if (ssr || !router.isReady) {
    return null; // Replace with app skeleton
  }

  const getLayout = Component.getLayout ?? getPlainLayout;

  return (
    <>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ModalProvider>
            <RouteAccountInfoProvider>
              <RoutePageInfoProvider>
                <WorkspaceContextProvider>
                  <SnackbarProvider maxSnack={3}>
                    {getLayout(<Component {...pageProps} />)}
                  </SnackbarProvider>
                </WorkspaceContextProvider>
              </RoutePageInfoProvider>
            </RouteAccountInfoProvider>
          </ModalProvider>
        </ThemeProvider>
      </CacheProvider>
      {/* "spin" is used in some inline styles which have been temporarily introduced in https://github.com/hashintel/hash/pull/1471 */}
      {/* @todo remove when inline styles are replaced with MUI styles */}
      <GlobalStyles
        styles={`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        };
      `}
      />
    </>
  );
};

const AppWithTypeSystemContextProvider: AppPage<AppProps, AppInitialProps> = (
  props,
) => {
  const { initialAuthenticatedUser } = props;

  return (
    <TypeSystemContextProvider>
      <ApolloProvider client={apolloClient}>
        <AuthInfoProvider initialAuthenticatedUser={initialAuthenticatedUser}>
          <App {...props} />
        </AuthInfoProvider>
      </ApolloProvider>
    </TypeSystemContextProvider>
  );
};

// The list of page pathnames that should be accessible whether or not the user is authenticated
const publiclyAccessiblePagePathnames = [
  "/[account-slug]/[page-slug]",
  "/login",
  "/signup",
];

AppWithTypeSystemContextProvider.getInitialProps = async (appContext) => {
  const {
    ctx: { req, pathname },
  } = appContext;

  const cookieString = req?.headers.cookie;

  const [subgraph, kratosSession] = await Promise.all([
    apolloClient
      .query<MeQuery>({
        query: meQuery,
        context: { headers: { cookie: cookieString } },
      })
      .then(({ data }) => data.me)
      .catch(() => undefined),
    fetchKratosSession(cookieString),
  ]);

  /** @todo: make additional pages publicly accessible */
  if (!subgraph || !kratosSession) {
    // If the user is logged out and not on a page that should be publicly accessible...
    if (!publiclyAccessiblePagePathnames.includes(pathname)) {
      // ...redirect them to the login page
      redirectInGetInitialProps({ appContext, location: "/login" });
    }

    return {};
  }

  const userEntityEditionId = (
    subgraph as Subgraph<SubgraphRootTypes["entity"]>
  ).roots[0]!;

  // The type system package needs to be initialized before calling `constructAuthenticatedUser`
  await TypeSystemInitializer.initialize();

  const initialAuthenticatedUser = constructAuthenticatedUser({
    userEntityEditionId,
    subgraph,
    kratosSession,
  });

  // If the user is logged in but hasn't completed signup and isn't on the signup page...
  if (
    !initialAuthenticatedUser.accountSignupComplete &&
    !pathname.startsWith("/signup")
  ) {
    // ...then redirect them to the signup page.
    redirectInGetInitialProps({ appContext, location: "/signup" });
  }

  return { initialAuthenticatedUser };
};

export default AppWithTypeSystemContextProvider;
