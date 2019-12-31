import React, { Component } from 'react';
import { UserManager } from 'oidc-client/lib/oidc-client';
import { getClientSettings } from '../lib';

export default class extends Component {

  state = { isLogged: false }

  login = () => {
    this.manager.signinRedirect();
  }

  logout = () => {
    this.manager.signoutRedirect();
  }

  scheduleRenew = async (manager) => {
    const user = await manager.getUser();
    console.log("line 19", user && user.expired);
    this.setState({ isLogged: !!(user && !user.expired) });
    if (!user) return;

    let timeout = user.expires_at * 1000 - Date.now();
    timeout = timeout > 0 ? timeout: 0;

    setTimeout(async () => {
      try {
        await manager.signinSilent();
        this.scheduleRenew(manager);
      } catch (e) {
        console.error(e);
        manager.signoutRedirect();
      }
    }, timeout);
  }

  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    this.manager = manager;
    this.scheduleRenew(manager);
  }

  render() {
    return (
      <div>
        {this.state.isLogged ?
          <button onClick={this.logout}>logout</button> :
          <button onClick={this.login}>login</button>}
      </div>
    );
  }
}