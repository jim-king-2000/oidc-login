
export function getClientSettings() {
  return {
    authority: 'http://47.96.126.79:7000/',
    client_id: 'oidcCLIENT',
    // client_secret: '...',
    redirect_uri: 'http://localhost:3000/cb',
    post_logout_redirect_uri: 'http://localhost:3000/logoutcb',
    response_type:'id_token token',
    scope:'openid profile email',
    filterProtocolClaims: true,
    loadUserInfo: true,
  };
}