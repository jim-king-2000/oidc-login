import React, { Component } from 'react';
import { UserManager } from 'oidc-client/lib/oidc-client';
import { getClientSettings } from '../lib';

export default class extends Component {
  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    console.log('iframe', window.location.href);
    return manager.signinSilentCallback();
  }

  render() {
    return null;
  }
}
