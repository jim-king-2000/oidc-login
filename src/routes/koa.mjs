/* eslint-disable no-console, max-len, camelcase, no-unused-vars */
import assert from 'assert';
import querystring from 'querystring';
import crypto from 'crypto';
import { inspect } from 'util';
import bodyParser from 'koa-body';
import Router from 'koa-router';
import lodash from 'lodash';
import Account from '../support/account.mjs';

// const { renderError } = require('../../lib/helpers/defaults');

const keys = new Set();
const debug = (obj) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key);
  if (lodash.isEmpty(value)) return acc;
  acc[key] = inspect(value, { depth: null });
  return acc;
}, {}), '<br/>', ': ', {
  encodeURIComponent(value) { return keys.has(value) ? `<strong>${value}</strong>` : value; },
});

export default (provider) => {
  const router = new Router();
  const { constructor: { errors: { SessionNotFound } } } = provider;

  router.use(async (ctx, next) => {
    ctx.set('Pragma', 'no-cache');
    ctx.set('Cache-Control', 'no-cache, no-store');
    try {
      await next();
    } catch (err) {
      if (err instanceof SessionNotFound) {
        ctx.status = err.status;
        const { message: error, error_description } = err;
        // renderError(ctx, { error, error_description }, err);
      } else {
        throw err;
      }
    }
  });

  router.get('/interaction/:uid', async (ctx, next) => {
    const {
      uid, prompt, params, session
    } = await provider.interactionDetails(ctx.req, ctx.res);
    const client = await provider.Client.find(params.client_id);
    console.log('/interaction/:uid', prompt.name);

    switch (prompt.name) {
      case 'select_account': {
        if (!session) {
          return provider.interactionFinished(ctx.req, ctx.res, {
            select_account: {},
          }, { mergeWithLastSubmission: false });
        }

        const account = await provider.Account.findAccount(ctx, session.accountId);
        const { email } = await account.claims('prompt', 'email', { email: null }, []);

        return ctx.render('select_account', {
          client,
          uid,
          email,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt),
          },
        });
      }
      case 'login': {
        return ctx.render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          microsoft: ctx.microsoft,
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt),
          },
        });
      }
      case 'consent': {
        return ctx.render('interaction', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Authorize',
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt),
          },
        });
      }
      default:
        return next();
    }
  });

  const body = bodyParser({
    text: false, json: false, patchNode: true, patchKoa: true,
  });

  router.get('/interaction/callback/microsoft', (ctx) => ctx.render('repost', { provider: 'microsoft', layout: false }));

  router.post('/interaction/:uid/login', body, async (ctx) => {
    const { uid, prompt: { name } } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'login');
    console.log('/interaction/:uid/login', ctx.request.body)

    const account = await Account.findByLogin(ctx.request.body.login);
    if (!account || ctx.request.body.password !== account.password) {
      await provider.setProviderSession(ctx.req, ctx.res, {
        account: ctx.request.body.login,
        clients: ['oidcCLIENT'],
        meta: { oidcCLIENT: { error: 'Invalid username or password!' } },
      });
      ctx.redirect(`/interaction/${uid}`);
      return;
    }

    const result = {
      select_account: {}, // make sure its skipped by the interaction policy since we just logged in
      login: {
        account: account.accountId,
      },
    };

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/federated', body, async (ctx) => {
    const { prompt: { name } } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'login');
    console.log('/interaction/:uid/federated');
    
    const path = `/interaction/${ctx.params.uid}/federated`;

    switch (ctx.request.body.provider) {
      case 'microsoft': {
        const callbackParams = ctx.microsoft.callbackParams(ctx.req);
        console.log(callbackParams);

        // init
        if (!Object.keys(callbackParams).length) {
          const state = `${ctx.params.uid}|${crypto.randomBytes(32).toString('hex')}`;
          const nonce = crypto.randomBytes(32).toString('hex');

          ctx.cookies.set('microsoft.state', state, { path, sameSite: 'strict' });
          ctx.cookies.set('microsoft.nonce', nonce, { path, sameSite: 'strict' });

          return ctx.redirect(ctx.microsoft.authorizationUrl({
            state, nonce, scope: 'openid email profile',
          }));
        }

        // callback
        const state = ctx.cookies.get('microsoft.state');
        ctx.cookies.set('microsoft.state', null, { path });
        const nonce = ctx.cookies.get('microsoft.nonce');
        ctx.cookies.set('microsoft.nonce', null, { path });

        const tokenset = await ctx.microsoft.callback(undefined, callbackParams, { state, nonce, response_type: 'id_token' });
        console.log(tokenset.claims());
        const account = await Account.findByFederated('microsoft', tokenset.claims());

        const result = {
          select_account: {}, // make sure its skipped by the interaction policy since we just logged in
          login: {
            account: account.accountId,
          },
        };
        return provider.interactionFinished(ctx.req, ctx.res, result, {
          mergeWithLastSubmission: false,
        });
      }
      default:
        return undefined;
    }
  });

  router.post('/interaction/:uid/continue', body, async (ctx) => {
    const interaction = await provider.interactionDetails(ctx.req, ctx.res);
    const { prompt: { name, details } } = interaction;
    assert.equal(name, 'select_account');
    console.log('/interaction/:uid/continue')

    if (ctx.request.body.switch) {
      if (interaction.params.prompt) {
        const prompts = new Set(interaction.params.prompt.split(' '));
        prompts.add('login');
        interaction.params.prompt = [...prompts].join(' ');
      } else {
        interaction.params.prompt = 'logout';
      }
      await interaction.save();
    }

    const result = { select_account: {} };
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/confirm', body, async (ctx) => {
    const { prompt: { name, details } } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, 'consent');
    console.log('/interaction/:uid/confirm', ctx.request.body)

    const consent = {};

    // any scopes you do not wish to grant go in here
    //   otherwise details.scopes.new.concat(details.scopes.accepted) will be granted
    consent.rejectedScopes = [];

    // any claims you do not wish to grant go in here
    //   otherwise all claims mapped to granted scopes
    //   and details.claims.new.concat(details.claims.accepted) will be granted
    consent.rejectedClaims = [];

    // replace = false means previously rejected scopes and claims remain rejected
    // changing this to true will remove those rejections in favour of just what you rejected above
    consent.replace = false;

    const result = { consent };
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: true,
    });
  });

  router.get('/interaction/:uid/abort', async (ctx) => {
    console.log('/interaction/:uid/abort')
    
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction',
    };

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
};
