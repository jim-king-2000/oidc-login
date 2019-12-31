import React, { Component } from 'react';
import { UserManager } from 'oidc-client/lib/oidc-client';
import { getClientSettings } from '../lib';

export default class extends Component {
  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    return manager.signinSilentCallback();
  }

  render() {
    return null;
  }
}
