
export function getClientSettings() {
  return {
    authority: 'http://localhost:2000/',
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