import React, { Component } from 'react';
import { UserManager } from 'oidc-client/lib/oidc-client';
import Router from 'next/router';
import { getClientSettings } from '../lib';

export default class extends Component {
  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    await manager.signinRedirectCallback();
    Router.replace('/');
  }

  render() {
    return null;
  }
}