
export function getClientSettings() {
  return {
    // authority: 'http://47.96.126.79:7000/',
    authority: 'http://localhost:7000/',
    client_id: 'oidcCLIENT',
    // client_secret: '...',
    redirect_uri: 'http://localhost:3000/signinRedirectCallback',
    silent_redirect_uri: 'http://localhost:3000/signinSilentCallback',
    post_logout_redirect_uri: 'http://localhost:3000/signoutRedirectCallback',
    response_type:'id_token token',
    scope:'openid profile email',
    filterProtocolClaims: true,
    loadUserInfo: true,
    silentRequestTimeout: 100000,
  };
}
