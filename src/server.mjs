/* eslint-disable no-console */

import path from 'path';
import { fileURLToPath } from 'url';
import lodash from 'lodash';
import Koa from 'koa';
import render from 'koa-ejs';
import helmet from 'koa-helmet';
import mount from 'koa-mount';
import cors from '@koa/cors';
import oidcProvider from 'oidc-provider';
import Account from './support/account.mjs';
import configuration from './support/configuration.mjs';
import routes from './routes/koa.mjs';

const { PORT = 7000, ISSUER = `http://localhost:${PORT}` } = process.env;
configuration.findAccount = Account.findAccount;

const app = new Koa();
app.use(cors());
app.use(helmet());
render(app, {
  cache: false,
  viewExt: 'ejs',
  layout: '_layout',
  root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'views'),
});

if (process.env.NODE_ENV === 'production') {
  app.proxy = true;
  lodash.set(configuration, 'cookies.short.secure', true);
  lodash.set(configuration, 'cookies.long.secure', true);

  // app.use(async (ctx, next) => {
  //   if (ctx.secure) {
  //     await next();
  //   } else if (ctx.method === 'GET' || ctx.method === 'HEAD') {
  //     ctx.redirect(ctx.href.replace(/^http:\/\//i, 'https://'));
  //   } else {
  //     ctx.body = {
  //       error: 'invalid_request',
  //       error_description: 'do yourself a favor and only use https',
  //     };
  //     ctx.status = 400;
  //   }
  // });
}

let server;
let adapter;
if (process.env.MONGODB_URI) {
  adapter = require('./adapters/mongodb'); // eslint-disable-line global-require
  await adapter.connect();
}

const provider = new oidcProvider.Provider(ISSUER, { adapter, ...configuration });

const { invalidate: orig } = provider.Client.Schema.prototype;

provider.Client.Schema.prototype.invalidate = function invalidate(message, code) {
  if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') {
    return;
  }

  orig.call(this, message);
};

provider.use(helmet());

app.use(routes(provider).routes());
app.use(mount(provider.app));
server = app.listen(PORT, () => {
  console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
});
