const nanoid = require('nanoid');

const store = new Map();

const ValidClaims = [{
  sub: 'auth0|5bfbc35e81125149615b3549',
  nickname: 'testbus',
  name: 'testbus@bytebilling.com',
  email: 'testbus@bytebilling.com',
  email_verified: false,
}, {
  sub: 'test@bytebilling.com',
  nickname: 'test',
  name: 'test@bytebilling.com',
  email: 'test@bytebilling.com',
  email_verified: false,
}];

class Account {
  constructor(id, password) {
    this.accountId = id || nanoid();
    this.password = password;
    store.set(this.accountId, this);
  }

  /**
   * @param use - can either be 'id_token' or 'userinfo', depending on
   *   where the specific claims are intended to be put in.
   * @param scope - the intended scope, while oidc-provider will mask
   *   claims depending on the scope automatically you might want to skip
   *   loading some claims from external resources etc. based on this detail
   *   or not return them in id tokens but only userinfo and so on.
   */
  async claims(use, scope) { // eslint-disable-line no-unused-vars
    const claim = ValidClaims.find(e => e.name === this.accountId);
    if (!claim) {
      return {
        sub: this.accountId,
        updated_at: new Date().toISOString(),
      };
    } else {
      return {
        ...claim,
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async findByFederated(provider, claims) {
    const id = `${provider}.${claims.sub}`;
    if (!logins.get(id)) {
      logins.set(id, new Account(id, claims));
    }
    return logins.get(id);
  }

  static async findByLogin(login) {
    // if (!logins.get(login)) {
    //   logins.set(login, new Account(login));
    // }

    return logins.get(login);
  }

  static async findAccount(ctx, id, token) { // eslint-disable-line no-unused-vars
    // token is a reference to the token used for which a given account is being loaded,
    //   it is undefined in scenarios where account claims are returned from authorization endpoint
    // ctx is the koa request context
    if (!store.get(id)) new Account(id); // eslint-disable-line no-new
    return store.get(id);
  }
}

const logins = new Map(
  [
    ['testbus@bytebilling.com', new Account('testbus@bytebilling.com', 'qwe!@#123')],
    ['test@bytebilling.com', new Account('test@bytebilling.com', 'test')],
  ]
);

module.exports = Account;
