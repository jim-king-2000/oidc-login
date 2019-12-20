import React, { Component } from 'react';
import { UserManager } from 'oidc-client';
import Router from 'next/router';
import { getClientSettings } from '../lib';

export default class extends Component {
  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    try {
      const user = await manager.signinRedirectCallback();
      console.log(user);
    } catch(e) {
      console.log(e)
    } finally {
      Router.replace('/');
    }
  }

  render() {
    return null;
  }
}
